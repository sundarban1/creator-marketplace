import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyAccessToken } from './utils/jwt';
import { MessagingService } from './modules/messaging/messaging.service';
import type { Role } from '@prisma/client';

const messagingService = new MessagingService();

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: '*', credentials: true },
    transports: ['websocket'],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('No token'));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.id;
      socket.data.role   = payload.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    const role   = socket.data.role   as string;
    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);   // 'role:CREATOR' | 'role:BUSINESS'

    // Conversation presence — join/leave a per-conversation room for typing relay
    socket.on('join:conversation', ({ conversationId }: { conversationId: string }) => {
      void socket.join(`conv:${conversationId}`);
    });
    socket.on('leave:conversation', ({ conversationId }: { conversationId: string }) => {
      void socket.leave(`conv:${conversationId}`);
    });

    // Relay typing events to everyone else in the conversation room
    socket.on('typing:start', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit('typing:start', { conversationId });
    });
    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      socket.to(`conv:${conversationId}`).emit('typing:stop', { conversationId });
    });

    // Send a message via WebSocket — saves to DB and emits message:new to both participants
    socket.on('message:send', ({ conversationId, content }: { conversationId: string; content: string }) => {
      if (!conversationId?.trim() || !content?.trim()) return;
      void messagingService
        .sendMessage(conversationId, userId, role as Role, { content: content.trim() })
        .catch(() => {
          socket.emit('message:error', { conversationId });
        });
    });
  });

  return io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  io?.to(`user:${userId}`).emit(event, data);
}

export function emitToRole(role: string, event: string, data: unknown): void {
  io?.to(`role:${role}`).emit(event, data);
}
