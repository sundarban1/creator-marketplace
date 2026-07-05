import { request }                          from '@/lib/api';
import type { ApiConversation, ApiMessage } from '@/lib/api';
import type { Conversation, Message }       from '@/types';

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

  return {
    id:              api.id,
    participantId:   isCreator ? api.businessId : api.creatorId,
    participantName,
    participantAvatar,
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
  };
}

// ── Service ─────────────────────────────────────────────────────────────────────

export const chatService = {
  async getConversations(
    currentUserRole: 'CREATOR' | 'BUSINESS',
    status?: 'PENDING' | 'ACCEPTED' | 'DECLINED',
  ): Promise<Conversation[]> {
    const res = await request<ApiConversation[]>(
      'GET', '/api/messaging/conversations',
      undefined,
      status ? { status } : undefined,
    );
    return res.data.map((c) => toConversation(c, currentUserRole));
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

  async markSeen(conversationId: string): Promise<void> {
    await request('PUT', `/api/messaging/conversations/${conversationId}/seen`);
  },

  async getBadgeCount(): Promise<{ count: number; pendingRequests: number; unread: number }> {
    const res = await request<{ count: number; pendingRequests: number; unread: number }>(
      'GET', '/api/messaging/badge-count',
    );
    return res.data;
  },
};
