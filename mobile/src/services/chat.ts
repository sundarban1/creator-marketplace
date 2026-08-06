import { request, API_BASE }                from '@/lib/api';
import type { ApiConversation, ApiMessage } from '@/lib/api';
import type { Conversation, Message }       from '@/types';
import { storage }           from '@/utilities/storage';
import { ACCESS_TOKEN_KEY }  from '@/utilities/constants';
import { requestVideoUploadSignature } from '@/services/cloudinaryVideoUpload';
import { startBackgroundChunkedUpload } from '@/services/backgroundVideoUploadManager';
import { requestVoiceUploadSignature, uploadVoiceToCloudinary } from '@/services/cloudinaryVoiceUpload';
import {
  registerActiveVoiceUpload, unregisterActiveVoiceUpload, reportVoiceUploadProgress,
  subscribeToVoiceUploadProgress, setActiveVoiceUploadResult,
} from '@/services/voiceUploadRegistry';

// ── Transformers ────────────────────────────────────────────────────────────────

function toConversation(api: ApiConversation): Conversation {
  const lastMsg = api.messages?.[0];

  return {
    id:              api.id,
    participantId:   api.otherPartyProfileId,
    participantName:   api.otherParty?.fullName ?? (api.otherPartyRole === 'BUSINESS' ? 'Business' : 'Creator'),
    participantAvatar: api.otherParty?.avatarUrl ?? undefined,
    participantUserId: api.otherParty?.userId,
    participantRole: api.otherPartyRole,
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
    attachmentStatus:       api.attachmentStatus ?? null,
    attachmentWaveform:     api.attachmentWaveform ?? null,
    isDeleted:      api.isDeleted ?? false,
    editedAt:       api.editedAt,
  };
}

// ── Video upload task ───────────────────────────────────────────────────────────

// Orchestrates: fetch a fresh signed signature (always re-fetched on every
// start(), including retries, so a stale/expired signature is never reused),
// then hand off to backgroundVideoUploadManager, which chunks the file,
// uploads each chunk via react-native-background-upload (survives the app
// backgrounding/closing), and calls the backend's "complete" endpoint itself
// once all chunks land — see that module for why it owns the complete call
// rather than this function doing it after an awaited upload finishes.
// Keeps the same external shape as before so the two chat screens don't change.
export function createVideoUploadTask(
  conversationId: string,
  fileUri: string,
  mimeType: string,
  caption: string | undefined,
  onProgress: (fraction: number) => void,
  onFinalizing?: () => void,
  durationSec?: number,
): { start: () => Promise<Message>; cancel: () => void } {
  let cancelled = false;
  let innerTask: ReturnType<typeof startBackgroundChunkedUpload> | null = null;

  return {
    start: async () => {
      if (cancelled) throw new Error('Video upload cancelled');
      const signature = await requestVideoUploadSignature(conversationId);
      if (cancelled) throw new Error('Video upload cancelled');

      innerTask = startBackgroundChunkedUpload(
        { targetType: 'chat', conversationId, caption, durationSec },
        fileUri, mimeType, signature, onProgress, onFinalizing,
      );
      const apiMessage = await innerTask.result as ApiMessage;
      return toMessage(apiMessage);
    },
    cancel: () => { cancelled = true; innerTask?.cancel(); },
  };
}

// ── Voice upload task ───────────────────────────────────────────────────────────

// Same direct-to-Cloudinary shape as createVideoUploadTask above (signature →
// upload → complete), but a single-shot upload instead of chunked — a voice
// clip is capped at 15MB/2min, nowhere near the size that justifies video's
// chunked/background-survival upload manager. Still registers with
// voiceUploadRegistry (a much lighter analogue of backgroundVideoUploadManager)
// so a chat screen that unmounts mid-upload and remounts later — the user
// navigating away and back — can reconstruct its pending/sent state instead
// of losing track of it (see attachToActiveVoiceUpload in the chat screens).
export function createVoiceUploadTask(
  conversationId: string,
  fileUri: string,
  durationSec: number,
  waveform: number[],
  onProgress?: (fraction: number) => void,
): { start: () => Promise<Message>; cancel: () => void } {
  let cancelled = false;
  let currentLocalUploadId: string | undefined;

  const cancel = () => {
    cancelled = true;
    if (currentLocalUploadId) unregisterActiveVoiceUpload(currentLocalUploadId);
  };

  return {
    start: () => {
      const localUploadId = registerActiveVoiceUpload(conversationId, fileUri, durationSec, waveform, cancel);
      currentLocalUploadId = localUploadId;
      const unsubscribeProgress = onProgress ? subscribeToVoiceUploadProgress(localUploadId, onProgress) : undefined;

      const result = (async (): Promise<Message> => {
        try {
          if (cancelled) throw new Error('Voice upload cancelled');
          const signature = await requestVoiceUploadSignature(conversationId);
          if (cancelled) throw new Error('Voice upload cancelled');
          await uploadVoiceToCloudinary(fileUri, signature, (p) => reportVoiceUploadProgress(localUploadId, p));
          if (cancelled) throw new Error('Voice upload cancelled');
          const res = await request<ApiMessage>(
            'POST', `/api/messaging/conversations/${conversationId}/attachments/voice/complete`,
            { publicId: signature.publicId, clientDurationSec: durationSec, waveform: waveform.map((v) => v.toFixed(2)).join(',') },
          );
          return toMessage(res.data);
        } finally {
          unsubscribeProgress?.();
          unregisterActiveVoiceUpload(localUploadId);
        }
      })();

      setActiveVoiceUploadResult(localUploadId, result);
      return result;
    },
    cancel,
  };
}

// ── Service ─────────────────────────────────────────────────────────────────────

export const chatService = {
  async getConversations(
    status?: 'PENDING' | 'ACCEPTED' | 'DECLINED',
    params?: { page?: number; limit?: number },
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const res = await request<ApiConversation[]>(
      'GET', '/api/messaging/conversations',
      undefined,
      { status, page: params?.page ?? 1, limit: params?.limit ?? 100 },
    );
    return {
      conversations: res.data.map(toConversation),
      total: res.pagination?.total ?? res.data.length,
    };
  },

  async sendMessageRequest(
    otherUserId: string,
    requestMessage?: string,
    campaignId?: string,
  ): Promise<Conversation> {
    const res = await request<ApiConversation>(
      'POST', '/api/messaging/conversations',
      { otherUserId, requestMessage, campaignId },
    );
    return toConversation(res.data);
  },

  async checkConversation(
    creatorProfileId: string,
  ): Promise<{ id: string; status: 'PENDING' | 'ACCEPTED' | 'DECLINED' } | null> {
    const res = await request<{ id: string; status: 'PENDING' | 'ACCEPTED' | 'DECLINED' } | null>(
      'GET', `/api/messaging/conversations/check/${creatorProfileId}`,
    );
    return res.data;
  },

  // ── Creator <-> creator (parallel to the above, not merged — the backend
  // route/logic genuinely differs, see messaging.service.ts) ─────────────────

  async sendCreatorMessageRequest(otherUserId: string, requestMessage?: string): Promise<Conversation> {
    const res = await request<ApiConversation>(
      'POST', '/api/messaging/conversations/creator',
      { otherUserId, requestMessage },
    );
    return toConversation(res.data);
  },

  async checkCreatorConversation(
    creatorProfileId: string,
  ): Promise<{ id: string; status: 'PENDING' | 'ACCEPTED' | 'DECLINED' } | null> {
    const res = await request<{ id: string; status: 'PENDING' | 'ACCEPTED' | 'DECLINED' } | null>(
      'GET', `/api/messaging/conversations/check-creator/${creatorProfileId}`,
    );
    return res.data;
  },

  async blockConversation(conversationId: string): Promise<void> {
    await request('POST', `/api/messaging/conversations/${conversationId}/block`);
  },

  async unblockConversation(conversationId: string): Promise<void> {
    await request('DELETE', `/api/messaging/conversations/${conversationId}/block`);
  },

  async getBlockStatus(conversationId: string): Promise<{ blockedByMe: boolean; blockedByOther: boolean }> {
    const res = await request<{ blockedByMe: boolean; blockedByOther: boolean }>(
      'GET', `/api/messaging/conversations/${conversationId}/block-status`,
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

  async editMessage(conversationId: string, messageId: string, content: string): Promise<Message> {
    const res = await request<ApiMessage>(
      'PATCH', `/api/messaging/conversations/${conversationId}/messages/${messageId}`,
      { content },
    );
    return toMessage(res.data);
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await request('DELETE', `/api/messaging/conversations/${conversationId}`);
  },
};
