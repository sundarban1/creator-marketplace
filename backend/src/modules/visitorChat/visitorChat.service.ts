import { AppError } from '../../middleware/error';
import { signVisitorChatToken } from '../../utils/jwt';
import { emitToRoom } from '../../socket';
import { VisitorChatRepository } from './visitorChat.repository';
import type { StartVisitorChatInput } from './visitorChat.schema';
import type { VisitorChatStatus } from '@prisma/client';

export function visitorChatRoom(chatId: string): string {
  return `visitor-chat:${chatId}`;
}

export const ADMIN_VISITOR_CHATS_ROOM = 'admin-visitor-chats';

export class VisitorChatService {
  private repo: VisitorChatRepository;

  constructor() {
    this.repo = new VisitorChatRepository();
  }

  async startChat(input: StartVisitorChatInput) {
    const chat = await this.repo.createChat(input);
    const token = signVisitorChatToken({ chatId: chat.id });
    // Auto-greeting — created as a normal ADMIN-sender message (no adminId,
    // since no specific admin sent it) so it renders in the widget exactly
    // like a real reply, no special-casing needed there. Persisted before
    // the HTTP response returns, so the visitor's own initial GET /messages
    // fetch picks it up even if their socket connects a moment later.
    const greeting = await this.repo.createMessage({
      chatId: chat.id,
      sender: 'ADMIN',
      content: `Hello ${input.name}, How can we help you?`,
    });
    emitToRoom(ADMIN_VISITOR_CHATS_ROOM, 'visitor-chat:new', { chat });
    emitToRoom(visitorChatRoom(chat.id), 'visitor-chat:message', { chatId: chat.id, message: greeting });
    emitToRoom(ADMIN_VISITOR_CHATS_ROOM, 'visitor-chat:message', { chatId: chat.id, message: greeting });
    return { chat, token };
  }

  async getChat(chatId: string) {
    const chat = await this.repo.findChatById(chatId);
    if (!chat) throw new AppError('Chat not found', 404);
    return chat;
  }

  async listMessages(chatId: string) {
    await this.getChat(chatId);
    return this.repo.listMessages(chatId);
  }

  async listChatsForAdmin(params: { status?: VisitorChatStatus; page: number; limit: number }) {
    return this.repo.listChats(params);
  }

  async sendVisitorMessage(chatId: string, content: string) {
    const chat = await this.getChat(chatId);
    if (chat.status === 'CLOSED') throw new AppError('This chat has been closed', 400);
    const message = await this.repo.createMessage({ chatId, sender: 'VISITOR', content });
    emitToRoom(visitorChatRoom(chatId), 'visitor-chat:message', { chatId, message });
    emitToRoom(ADMIN_VISITOR_CHATS_ROOM, 'visitor-chat:message', { chatId, message });
    return message;
  }

  async sendAdminMessage(chatId: string, adminId: string, content: string) {
    await this.getChat(chatId);
    const message = await this.repo.createMessage({ chatId, sender: 'ADMIN', adminId, content });
    emitToRoom(visitorChatRoom(chatId), 'visitor-chat:message', { chatId, message });
    emitToRoom(ADMIN_VISITOR_CHATS_ROOM, 'visitor-chat:message', { chatId, message });
    return message;
  }

  async markSeen(chatId: string, side: 'visitor' | 'admin') {
    await this.getChat(chatId);
    return this.repo.markSeen(chatId, side);
  }

  async updateStatus(chatId: string, status: VisitorChatStatus) {
    await this.getChat(chatId);
    const chat = await this.repo.updateStatus(chatId, status);
    emitToRoom(visitorChatRoom(chatId), 'visitor-chat:status', { chatId, status });
    emitToRoom(ADMIN_VISITOR_CHATS_ROOM, 'visitor-chat:status', { chatId, status });
    return chat;
  }
}
