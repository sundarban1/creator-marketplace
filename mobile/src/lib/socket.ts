import { io, type Socket } from 'socket.io-client';
import { API_BASE } from './api';

let _socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }

  _socket = io(API_BASE, {
    auth: { token },
    // Falls back to HTTP long-polling when a raw WebSocket upgrade is
    // blocked (common on cellular/carrier NAT or restrictive WiFi) — without
    // this a physical device can silently fail to connect at all, so chat
    // never receives in real time even though sending still works via REST.
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  });

  // Connection failures here were previously invisible on-device — this is
  // the only signal we get on a physical device without a debugger attached.
  _socket.on('connect', () => console.log('[socket] connected', _socket?.id));
  _socket.on('connect_error', (err) => console.warn('[socket] connect_error:', err.message));
  _socket.on('disconnect', (reason) => console.log('[socket] disconnected:', reason));

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
