import { request, API_BASE }                from '@/lib/api';
import type { ApiConversation, ApiMessage } from '@/lib/api';
import type { Conversation, Message }       from '@/types';
import { storage }           from '@/utilities/storage';
import { ACCESS_TOKEN_KEY }  from '@/utilities/constants';

// ── Transformers ────────────────────────────────────────────────────────────────

function toConversation(api: ApiConversation, currentUserRole: 'CREATOR' | 'BUSINESS'): Conversation {
  const lastMsg   = api.messages?.[0];
  const isCreator = currentUserRole === 'CREATOR';

  const participantName   = isCreator
    ? (api.business?.businessName ?? 'Business')
    : (api.creator?.fullName      ?? 'Creator');
  const participantAvatar = isCreator
    ? (api.business?.logoUrl  ?? undefined)
    : (api.creator?.avatarUrl ?? undefined);
  const participantUserId = isCreator ? api.business?.userId : api.creator?.userId;

  return {
    id:              api.id,
    participantId:   isCreator ? api.businessId : api.creatorId,
    participantName,
    participantAvatar,
    participantUserId,
    participantRole: isCreator ? 'BUSINESS' : 'CREATOR',
    status:          api.status ?? 'ACCEPTED',
    requestMessage:  api.requestMessage,
    lastMessage:     lastMsg?.content ?? api.requestMessage ?? '',
    lastMessageTime: api.lastMessageAt ?? lastMsg?.createdAt ?? api.createdAt,
    unreadCount:     api.unreadCount ?? 0,
    campaignTitle:   api.campaign?.title,
    isOnline:        false,
  };
}

export function toMessage(api: ApiMessage): Message {
  return {
    id:             api.id,
    conversationId: api.conversationId,
    senderId:       api.senderId,
    text:           api.content,
    timestamp:      api.createdAt,
    status:         'sent',
    type:           api.type ?? 'TEXT',
    attachmentUrl:  api.attachmentUrl,
    attachmentName: api.attachmentName,
    attachmentThumbnailUrl: api.attachmentThumbnailUrl ?? null,
    attachmentDurationSec:  api.attachmentDurationSec ?? null,
    attachmentWidth:        api.attachmentWidth ?? null,
    attachmentHeight:       api.attachmentHeight ?? null,
    attachmentSize:         api.attachmentSize ?? null,
    attachmentFormat:       api.attachmentFormat ?? null,
    isDeleted:      api.isDeleted ?? false,
  };
}

// ── Video upload task ───────────────────────────────────────────────────────────

// Uses XMLHttpRequest (real upload-progress reporting via xhr.upload.onprogress,
// same as the fetch-based multipart uploads elsewhere in the app) rather than
// expo-file-system's native background upload task. The native task is a
// separate OS-level uploader (okhttp on Android) that sends `Expect:
// 100-continue` by default — through Render's/Cloudflare's proxy chain that
// consistently got the connection killed mid-upload ("Request aborted" on the
// server) even for small files, while every other JS-fetch-based upload in
// this app worked fine. XHR keeps the same request path as those.
export function createVideoUploadTask(
  conversationId: string,
  fileUri: string,
  mimeType: string,
  caption: string | undefined,
  onProgress: (fraction: number) => void,
): { start: () => Promise<Message>; cancel: () => void } {
  const token = storage.get(ACCESS_TOKEN_KEY) ?? '';
  let xhr: XMLHttpRequest | null = null;

  return {
    start: () => new Promise<Message>((resolve, reject) => {
      xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/api/messaging/conversations/${conversationId}/attachments/video`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
      };

      xhr.onload = () => {
        let parsed: { data?: ApiMessage; message?: string } = {};
        try { parsed = JSON.parse(xhr!.responseText); } catch { /* falls through to generic error below */ }
        if (xhr!.status >= 200 && xhr!.status < 300 && parsed.data) {
          resolve(toMessage(parsed.data));
        } else {
          reject(new Error(parsed.message ?? 'Video upload failed'));
        }
      };
      xhr.onerror   = () => reject(new Error('Video upload failed'));
      xhr.onabort   = () => reject(new Error('Video upload cancelled'));
      xhr.ontimeout = () => reject(new Error('Video upload timed out'));

      const form = new FormData();
      form.append('file', { uri: fileUri, name: `video_${Date.now()}.mp4`, type: mimeType } as unknown as Blob);
      if (caption?.trim()) form.append('caption', caption.trim());
      xhr.send(form);
    }),
    cancel: () => { xhr?.abort(); },
  };
}

// ── Service ─────────────────────────────────────────────────────────────────────

export const chatService = {
  async getConversations(
    currentUserRole: 'CREATOR' | 'BUSINESS',
    status?: 'PENDING' | 'ACCEPTED' | 'DECLINED',
    params?: { page?: number; limit?: number },
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const res = await request<ApiConversation[]>(
      'GET', '/api/messaging/conversations',
      undefined,
      { status, page: params?.page ?? 1, limit: params?.limit ?? 100 },
    );
    return {
      conversations: res.data.map((c) => toConversation(c, currentUserRole)),
      total: res.pagination?.total ?? res.data.length,
    };
  },

  async sendMessageRequest(
    otherUserId: string,
    requestMessage?: string,
    campaignId?: string,
    currentUserRole: 'CREATOR' | 'BUSINESS' = 'BUSINESS',
  ): Promise<Conversation> {
    const res = await request<ApiConversation>(
      'POST', '/api/messaging/conversations',
      { otherUserId, requestMessage, campaignId },
    );
    return toConversation(res.data, currentUserRole);
  },

  async checkConversation(
    creatorProfileId: string,
  ): Promise<{ id: string; status: 'PENDING' | 'ACCEPTED' | 'DECLINED' } | null> {
    const res = await request<{ id: string; status: 'PENDING' | 'ACCEPTED' | 'DECLINED' } | null>(
      'GET', `/api/messaging/conversations/check/${creatorProfileId}`,
    );
    return res.data;
  },

  async respondToRequest(conversationId: string, action: 'accept' | 'decline'): Promise<void> {
    await request('POST', `/api/messaging/conversations/${conversationId}/${action}`);
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const res = await request<ApiMessage[]>(
      'GET', `/api/messaging/conversations/${conversationId}/messages`,
      undefined,
      { limit: 100 },
    );
    return res.data.map(toMessage);
  },

  async sendMessage(conversationId: string, text: string): Promise<Message> {
    const res = await request<ApiMessage>(
      'POST', `/api/messaging/conversations/${conversationId}/messages`,
      { content: text },
    );
    return toMessage(res.data);
  },

  async sendAttachment(
    conversationId: string,
    file: { uri: string; name: string; mimeType: string },
    caption?: string,
  ): Promise<Message> {
    const token = storage.get(ACCESS_TOKEN_KEY) ?? '';
    const form  = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    if (caption?.trim()) form.append('caption', caption.trim());

    const res  = await fetch(`${API_BASE}/api/messaging/conversations/${conversationId}/attachments`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body:    form,
    });
    const json = await res.json() as { success: boolean; data: ApiMessage; message?: string };
    if (!res.ok) throw new Error(json.message ?? 'Failed to send attachment');
    return toMessage(json.data);
  },

  async markSeen(conversationId: string): Promise<void> {
    await request('PUT', `/api/messaging/conversations/${conversationId}/seen`);
  },

  async getBadgeCount(): Promise<{ count: number; pendingRequests: number; unread: number }> {
    const res = await request<{ count: number; pendingRequests: number; unread: number }>(
      'GET', '/api/messaging/badge-count',
    );
    return res.data;
  },

  async deleteMessage(conversationId: string, messageId: string, forEveryone: boolean): Promise<void> {
    await request('DELETE', `/api/messaging/conversations/${conversationId}/messages/${messageId}`, { forEveryone });
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await request('DELETE', `/api/messaging/conversations/${conversationId}`);
  },
};
