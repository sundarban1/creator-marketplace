import { request }                                from '@/lib/api';
import type { ApiConversation, ApiMessage }       from '@/lib/api';
import type { Conversation, Message }             from '@/types';

// ── Transformers ────────────────────────────────────────────────────────────────

function toConversation(api: ApiConversation, currentUserRole: 'CREATOR' | 'BUSINESS'): Conversation {
  const lastMsg   = api.messages[0];
  const isCreator = currentUserRole === 'CREATOR';

  // From a creator's perspective the "participant" is the business, and vice-versa
  const participantId     = isCreator ? api.businessId : api.creatorId;
  const participantName   = isCreator
    ? (api.business?.businessName ?? 'Business')
    : (api.creator?.fullName ?? 'Creator');
  const participantAvatar = isCreator
    ? (api.business?.logoUrl ?? undefined)
    : (api.creator?.avatarUrl ?? undefined);
  const participantRole: 'CREATOR' | 'BUSINESS' = isCreator ? 'BUSINESS' : 'CREATOR';

  return {
    id:              api.id,
    participantId,
    participantName,
    participantAvatar,
    participantRole,
    lastMessage:     lastMsg?.content ?? '',
    lastMessageTime: lastMsg?.createdAt ?? api.createdAt,
    unreadCount:     0,    // not tracked by backend; default to 0
    campaignTitle:   api.campaign?.title,
    isOnline:        false, // real-time presence not implemented
  };
}

function toMessage(api: ApiMessage): Message {
  return {
    id:             api.id,
    conversationId: api.conversationId,
    senderId:       api.senderId,
    text:           api.content,       // backend: content  → mobile: text
    timestamp:      api.createdAt,     // backend: createdAt → mobile: timestamp
    status:         'sent',            // backend doesn't track delivery/read
  };
}

// ── Service ─────────────────────────────────────────────────────────────────────

export const chatService = {
  async getConversations(currentUserRole: 'CREATOR' | 'BUSINESS'): Promise<Conversation[]> {
    const res = await request<ApiConversation[]>('GET', '/api/messaging/conversations');
    const sorted = [...res.data].sort(
      (a, b) => {
        const at = a.messages[0]?.createdAt ?? a.createdAt;
        const bt = b.messages[0]?.createdAt ?? b.createdAt;
        return new Date(bt).getTime() - new Date(at).getTime();
      }
    );
    return sorted.map((c) => toConversation(c, currentUserRole));
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const res = await request<ApiMessage[]>(
      'GET', `/api/messaging/conversations/${conversationId}/messages`
    );
    return res.data.map(toMessage);
  },

  async sendMessage(conversationId: string, text: string, _senderId: string): Promise<Message> {
    const res = await request<ApiMessage>(
      'POST',
      `/api/messaging/conversations/${conversationId}/messages`,
      { content: text }    // backend expects "content", not "text"
    );
    return toMessage(res.data);
  },

  async startConversation(creatorId: string, businessId: string, campaignId?: string): Promise<Conversation> {
    const res = await request<ApiConversation>(
      'POST',
      '/api/messaging/conversations',
      { creatorId, businessId, campaignId }
    );
    // derive currentUserRole from which id matches the auth user
    const role: 'CREATOR' | 'BUSINESS' = res.data.creatorId === creatorId ? 'CREATOR' : 'BUSINESS';
    return toConversation(res.data, role);
  },

  // Kept for backward compat with UI that reads a single conversation synchronously
  getConversationSync(conversations: Conversation[], id: string): Conversation | undefined {
    return conversations.find((c) => c.id === id);
  },
};
