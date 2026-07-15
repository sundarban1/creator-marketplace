import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { verifyAccessToken } from './utils/jwt';
import { MessagingService } from './modules/messaging/messaging.service';
import prisma from './prisma';
import type { Role } from '@prisma/client';

const messagingService = new MessagingService();

let io: Server | null = null;

async function isUserOnline(userId: string): Promise<boolean> {
  const sockets = await io?.in(`user:${userId}`).fetchSockets() ?? [];
  return sockets.length > 0;
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: '*', credentials: true },
    // Polling fallback matters on physical devices — a raw WebSocket upgrade
    // is commonly blocked by mobile-carrier NAT/firewalls or restrictive
    // WiFi, and without this the client silently never connects (chat then
    // only "works" via the REST send fallback, never receiving in real time).
    transports: ['websocket', 'polling'],
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

    // Tell anyone currently watching this user's presence that they just came online.
    // (No DB write here — lastSeenAt only matters once the user goes offline.)
    socket.to(`presence:${userId}`).emit('presence:update', { userId, online: true, lastSeenAt: null });

    // Conversation presence — join/leave a per-conversation room for typing relay
    socket.on('join:conversation', ({ conversationId }: { conversationId: string }) => {
      void socket.join(`conv:${conversationId}`);
    });
    socket.on('leave:conversation', ({ conversationId }: { conversationId: string }) => {
      void socket.leave(`conv:${conversationId}`);
    });

    // Online/last-seen presence for a chat partner — mirrors the join/leave:conversation
    // pattern above. On subscribe we reply immediately with the current snapshot so the
    // chat header doesn't have to wait for a future connect/disconnect event to render.
    socket.on('presence:subscribe', async ({ userId: targetId }: { userId: string }) => {
      if (!targetId) return;
      void socket.join(`presence:${targetId}`);
      const online = await isUserOnline(targetId);
      let lastSeenAt: string | null = null;
      if (!online) {
        const target = await prisma.user.findUnique({ where: { id: targetId }, select: { lastSeenAt: true } });
        lastSeenAt = target?.lastSeenAt?.toISOString() ?? null;
      }
      socket.emit('presence:update', { userId: targetId, online, lastSeenAt });
    });
    socket.on('presence:unsubscribe', ({ userId: targetId }: { userId: string }) => {
      if (!targetId) return;
      void socket.leave(`presence:${targetId}`);
    });

    socket.on('disconnect', () => {
      void (async () => {
        // Another tab/device for the same user may still be connected — only
        // mark them offline once every socket for this user has disconnected.
        if (await isUserOnline(userId)) return;
        const updated = await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() }, select: { lastSeenAt: true } });
        io?.to(`presence:${userId}`).emit('presence:update', { userId, online: false, lastSeenAt: updated.lastSeenAt?.toISOString() ?? null });
      })();
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
