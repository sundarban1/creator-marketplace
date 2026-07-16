// Deliberately separate from ../../../lib/api's `request()` helper — that one
// is wired to the ADMIN login/refresh-token flow (Authorization: Bearer +
// automatic token refresh on 401). An anonymous website visitor has no
// account at all, so this talks to the visitor-chat endpoints directly with
// its own long-lived token carried in a custom header.

const BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3000';

export interface VisitorMessage {
  id: string;
  chatId: string;
  sender: 'VISITOR' | 'ADMIN';
  content: string;
  createdAt: string;
}

export interface VisitorChat {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: 'OPEN' | 'CLOSED';
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

async function request<T>(method: string, path: string, body?: unknown, visitorToken?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (visitorToken) headers['x-visitor-token'] = visitorToken;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok) throw new Error(json.message ?? `Request failed (${res.status})`);
  return json.data;
}

export const visitorChatApi = {
  start: (data: { name: string; email?: string; phone?: string }) =>
    request<{ chat: VisitorChat; token: string }>('POST', '/api/visitor-chat/start', data),

  getMessages: (chatId: string, token: string) =>
    request<VisitorMessage[]>('GET', `/api/visitor-chat/${chatId}/messages`, undefined, token),

  sendMessage: (chatId: string, token: string, content: string) =>
    request<VisitorMessage>('POST', `/api/visitor-chat/${chatId}/messages`, { content }, token),

  markSeen: (chatId: string, token: string) =>
    request<VisitorChat>('PUT', `/api/visitor-chat/${chatId}/seen`, undefined, token),
};
