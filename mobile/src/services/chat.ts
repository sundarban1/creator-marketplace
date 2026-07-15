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
    isDeleted:      api.isDeleted ?? false,
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
