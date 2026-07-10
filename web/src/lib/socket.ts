import { io, type Socket } from 'socket.io-client';

const API_BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3000';

let _socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }

  _socket = io(API_BASE, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  });

  return _socket;
}

export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

export function getSocket(): Socket | null {
  return _socket;
}
