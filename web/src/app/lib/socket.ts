import { io, type Socket } from 'socket.io-client';
import { API_BASE, getAccessToken, ensureFreshAccessToken } from './apiClient';

let socket: Socket | null = null;

/**
 * Connect the marketplace app's realtime socket. Auth is a function (not a
 * static object) so a reconnect after a token rotation re-reads storage
 * instead of replaying the expired token forever — mirrors the admin client.
 */
export function connectSocket(): Socket {
  if (socket) return socket;

  socket = io(API_BASE, {
    auth: (cb) => cb({ token: getAccessToken() ?? '' }),
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  });

  socket.on('connect_error', (err) => {
    if (err.message === 'Invalid token' || err.message === 'No token') {
      ensureFreshAccessToken().catch(() => {});
    }
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
