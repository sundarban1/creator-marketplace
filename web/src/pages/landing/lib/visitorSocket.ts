import { io, type Socket } from 'socket.io-client';

const API_BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3000';

let _socket: Socket | null = null;

/** Separate singleton from the admin dashboard's lib/socket.ts — visitors
 *  authenticate with a long-lived visitor-chat token, not a user access token. */
export function connectVisitorSocket(visitorToken: string): Socket {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
  _socket = io(API_BASE, {
    auth: { visitorToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  });
  return _socket;
}

export function disconnectVisitorSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

export function getVisitorSocket(): Socket | null {
  return _socket;
}
