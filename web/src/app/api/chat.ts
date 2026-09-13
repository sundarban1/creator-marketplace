/**
 * Messaging — shared by both business and creator (same `/api/messaging`
 * endpoints, role-agnostic responses via `otherParty`/`otherPartyRole`). Chat
 * unlocks once escrow is funded (or immediately for a free/open event) —
 * conversations for a paid campaign are created automatically server-side
 * when payment lands (see campaign.service.ts's sendProposalAcceptedMessage),
 * not by an explicit "start conversation" call from this client.
 */
import { apiRequest, apiUpload, type ApiPagination } from '../lib/apiClient';

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'VIDEO' | 'VOICE' | 'SYSTEM';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentThumbnailUrl: string | null;
  attachmentSize: number | null;
  attachmentFormat: string | null;
  attachmentStatus: 'PROCESSING' | 'READY' | 'FAILED' | null;
  createdAt: string;
  isDeleted?: boolean;
  editedAt?: string;
}

export interface Conversation {
  id: string;
  campaignId: string | null;
  status: string;
  requestMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  unreadCount: number;
  campaign?: { title: string } | null;
  messages?: ChatMessage[];
  otherPartyRole: 'CREATOR' | 'BUSINESS';
  otherPartyProfileId: string;
  otherParty: { fullName: string | null; avatarUrl: string | null; userId?: string } | null;
}

export function fetchConversations(
  opts: { status?: 'PENDING' | 'ACCEPTED' | 'DECLINED'; page?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<{ items: Conversation[]; pagination?: ApiPagination }> {
  return apiRequest<Conversation[]>('GET', '/api/messaging/conversations', undefined, {
    signal,
    params: { status: opts.status, page: opts.page ?? 1, limit: opts.limit ?? 50 },
  }).then((r) => ({ items: r.data, pagination: r.pagination }));
}

export function fetchMessages(
  conversationId: string,
  opts: { page?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<{ items: ChatMessage[]; pagination?: ApiPagination }> {
  return apiRequest<ChatMessage[]>('GET', `/api/messaging/conversations/${conversationId}/messages`, undefined, {
    signal,
    params: { page: opts.page ?? 1, limit: opts.limit ?? 100 },
  }).then((r) => ({ items: r.data, pagination: r.pagination }));
}

export function sendMessage(conversationId: string, content: string): Promise<ChatMessage> {
  return apiRequest<ChatMessage>('POST', `/api/messaging/conversations/${conversationId}/messages`, { content }).then(
    (r) => r.data,
  );
}

export function sendAttachment(conversationId: string, file: File, caption?: string): Promise<ChatMessage> {
  const form = new FormData();
  form.append('file', file);
  if (caption) form.append('caption', caption);
  return apiUpload<ChatMessage>(`/api/messaging/conversations/${conversationId}/attachments`, form);
}

export function markSeen(conversationId: string): Promise<void> {
  return apiRequest('PUT', `/api/messaging/conversations/${conversationId}/seen`).then(() => undefined);
}

export function respondToRequest(conversationId: string, action: 'accept' | 'decline'): Promise<Conversation> {
  return apiRequest<Conversation>('POST', `/api/messaging/conversations/${conversationId}/${action}`).then((r) => r.data);
}

export function getBadgeCount(signal?: AbortSignal): Promise<{ count: number; pendingRequests: number; unread: number }> {
  return apiRequest<{ count: number; pendingRequests: number; unread: number }>('GET', '/api/messaging/badge-count', undefined, {
    signal,
  }).then((r) => r.data);
}
