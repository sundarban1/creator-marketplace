import { Server } from 'socket.io';
import type { Server as HttpServer } from 'http';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { AppError } from './middleware/error';
import { verifyAccessToken, verifyVisitorChatToken } from './utils/jwt';
import { MessagingService } from './modules/messaging/messaging.service';
import { VisitorChatService, visitorChatRoom, ADMIN_VISITOR_CHATS_ROOM } from './modules/visitorChat/visitorChat.service';
import prisma from './prisma';
import { env } from './config/env';
import { logger } from './config/logger';
import { isUserOnlineCached, invalidatePresence } from './utils/presence';
import * as Sentry from '@sentry/node';
import type { Role } from '@prisma/client';

const messagingService = new MessagingService();
const visitorChatService = new VisitorChatService();

let io: Server | null = null;

async function isUserOnline(userId: string): Promise<boolean> {
  return isUserOnlineCached(userId, async () => {
    const sockets = await io?.in(`user:${userId}`).fetchSockets() ?? [];
    return sockets.length > 0;
  });
}

export async function initSocket(httpServer: HttpServer): Promise<Server> {
  io = new Server(httpServer, {
    cors: { origin: '*', credentials: true },
    // Polling fallback matters on physical devices — a raw WebSocket upgrade
    // is commonly blocked by mobile-carrier NAT/firewalls or restrictive
    // WiFi, and without this the client silently never connects (chat then
    // only "works" via the REST send fallback, never receiving in real time).
    transports: ['websocket', 'polling'],
  });

  // Cross-instance broadcast — without this, rooms (conv:{id}, user:{id}, etc.)
  // only exist in the memory of whichever single process a socket happened to
  // connect to. With more than one backend instance running (e.g. autoscaling),
  // that silently breaks typing indicators and real-time message delivery for
  // any two users who land on different instances — everything still works
  // locally/single-instance because there's only ever one process to broadcast
  // within.
  if (env.REDIS_URL) {
    const pubClient = createClient({ url: env.REDIS_URL });
    const subClient = pubClient.duplicate();
    pubClient.on('error', (err) => logger.error({ err }, 'Redis pub client error'));
    subClient.on('error', (err) => logger.error({ err }, 'Redis sub client error'));
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.IO Redis adapter connected — cross-instance broadcast enabled');
  } else {
    logger.warn('REDIS_URL not set — Socket.IO is using the default in-memory adapter. ' +
      'This only broadcasts within a single process; if this backend ever runs more than ' +
      'one instance, chat typing/real-time delivery will silently break across instances.');
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const visitorToken = socket.handshake.auth?.visitorToken as string | undefined;

    if (visitorToken) {
      try {
        const payload = verifyVisitorChatToken(visitorToken);
        socket.data.isVisitor = true;
        socket.data.visitorChatId = payload.chatId;
        return next();
      } catch {
        return next(new Error('Invalid visitor token'));
      }
    }

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
    // Anonymous landing-page visitor chat — a completely separate connection
    // type from the authenticated-user flow below (no userId/role at all).
    if (socket.data.isVisitor) {
      const chatId = socket.data.visitorChatId as string;
      logger.debug({ socketId: socket.id, chatId }, 'Socket connected (visitor)');
      void socket.join(visitorChatRoom(chatId));

      socket.on('visitor-message:send', ({ content }: { content: string }) => {
        if (!content?.trim()) return;
        void visitorChatService.sendVisitorMessage(chatId, content.trim()).catch(() => {
          socket.emit('visitor-chat:error', { chatId });
        });
      });
      return;
    }

    const userId = socket.data.userId as string;
    const role   = socket.data.role   as string;
    logger.debug({ socketId: socket.id, userId, role }, 'Socket connected');
    socket.join(`user:${userId}`);
    socket.join(`role:${role}`);   // 'role:CREATOR' | 'role:BUSINESS'
    // This user's online state just changed — drop the cached presence bool so
    // the next lookup recomputes from the adapter.
    void invalidatePresence(userId);

    // Admins also join the shared visitor-chats room so every admin dashboard
    // sees new website-visitor chats/messages live, and can reply to any of them.
    if (role === 'ADMIN') {
      void socket.join(ADMIN_VISITOR_CHATS_ROOM);
      socket.on('admin-message:send', ({ chatId, content }: { chatId: string; content: string }) => {
        if (!chatId?.trim() || !content?.trim()) return;
        void visitorChatService.sendAdminMessage(chatId, userId, content.trim()).catch(() => {
          socket.emit('visitor-chat:error', { chatId });
        });
      });
    }

    // Tell anyone currently watching this user's presence that they just came online.
    // (No DB write here — lastSeenAt only matters once the user goes offline.)
    socket.to(`presence:${userId}`).emit('presence:update', { userId, online: true, lastSeenAt: null });

    // Conversation presence — join/leave a per-conversation room for typing relay.
    // Access is verified here (not just at send time) because this room also
    // fans out typing:start/stop to everyone in it — without this check, any
    // authenticated user could join an arbitrary conversationId and both see
    // and spoof typing into a conversation they're not a participant of.
    socket.on('join:conversation', ({ conversationId }: { conversationId: string }) => {
      if (!conversationId?.trim()) return;
      void messagingService.canAccessConversation(conversationId, userId, role as Role).then((allowed) => {
        if (!allowed) {
          logger.warn({ socketId: socket.id, userId, conversationId }, 'Rejected join:conversation — not a participant');
          return;
        }
        void socket.join(`conv:${conversationId}`);
      });
    });
    socket.on('leave:conversation', ({ conversationId }: { conversationId: string }) => {
      void socket.leave(`conv:${conversationId}`);
    });

    // Online/last-seen presence for a chat partner — mirrors the join/leave:conversation
    // pattern above. On subscribe we reply immediately with the current snapshot so the
    // chat header doesn't have to wait for a future connect/disconnect event to render.
    // Gated by canViewPresence so any authenticated user can't enumerate an
    // arbitrary other user's online/last-seen state (only shared-conversation
    // partners and admins can).
    socket.on('presence:subscribe', async ({ userId: targetId }: { userId: string }) => {
      if (!targetId) return;
      const allowed = await messagingService.canViewPresence(userId, role as Role, targetId);
      if (!allowed) {
        logger.warn({ socketId: socket.id, userId, targetId }, 'Rejected presence:subscribe — no shared conversation');
        return;
      }
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

    // 'disconnecting' (not 'disconnect') fires while socket.rooms is still
    // populated — Socket.IO auto-leaves every room by the time 'disconnect'
    // fires below, so this is the only point where the conv:{id} rooms this
    // socket was in are still known. Without this, a client that crashes or
    // loses connection mid-typing leaves its "typing…" indicator stuck on
    // forever for the other participant.
    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (!room.startsWith('conv:')) continue;
        const conversationId = room.slice('conv:'.length);
        socket.to(room).emit('typing:stop', { conversationId });
      }
    });

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id, userId, role }, 'Socket disconnected');
      void (async () => {
        // Presence changed — clear the cache before the recompute below (and so
        // any concurrent lookup doesn't keep serving a stale "online").
        await invalidatePresence(userId);
        // Another tab/device for the same user may still be connected — only
        // mark them offline once every socket for this user has disconnected.
        if (await isUserOnline(userId)) return;
        const updated = await prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() }, select: { lastSeenAt: true } });
        io?.to(`presence:${userId}`).emit('presence:update', { userId, online: false, lastSeenAt: updated.lastSeenAt?.toISOString() ?? null });
      })();
    });

    // Relay typing events to everyone else in the conversation room. Requires
    // the socket to have actually joined conv:{id} first (join:conversation
    // above already verified conversation access) — a cheap in-memory
    // membership check, not a repeat DB round trip on every keystroke —
    // otherwise any authenticated user could spoof typing into a conversation
    // they were never a participant of.
    socket.on('typing:start', ({ conversationId }: { conversationId: string }) => {
      if (!socket.rooms.has(`conv:${conversationId}`)) return;
      socket.to(`conv:${conversationId}`).emit('typing:start', { conversationId });
    });
    socket.on('typing:stop', ({ conversationId }: { conversationId: string }) => {
      if (!socket.rooms.has(`conv:${conversationId}`)) return;
      socket.to(`conv:${conversationId}`).emit('typing:stop', { conversationId });
    });

    // Send a message via WebSocket — saves to DB and emits message:new to both participants
    socket.on('message:send', ({ conversationId, content }: { conversationId: string; content: string }) => {
      if (!conversationId?.trim() || !content?.trim()) return;
      void messagingService
        .sendMessage(conversationId, userId, role as Role, { content: content.trim() })
        .catch((err) => {
          // Rate-limit/duplicate-message rejections carry a real message the
          // client should show (see MessagingService.sendMessage/persistAndBroadcast)
          // — previously this only sent a bare signal with no explanation, and the
          // failure itself was never logged server-side (only visible to the client).
          const message = err instanceof AppError ? err.message : 'Failed to send message';
          if (!(err instanceof AppError) || !err.isOperational) {
            logger.error({ err, conversationId, userId }, 'Socket message:send failed');
            Sentry.captureException(err);
          }
          socket.emit('message:error', { conversationId, message });
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

export function emitToRoom(room: string, event: string, data: unknown): void {
  io?.to(room).emit(event, data);
}
