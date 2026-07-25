import { io, type Socket } from 'socket.io-client';
import { API_BASE, ensureFreshAccessToken } from './api';
import { storage } from '@/utilities/storage';
import { ACCESS_TOKEN_KEY } from '@/utilities/constants';

let _socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }

  _socket = io(API_BASE, {
    // A function, not a static object — access tokens rotate every 15 min
    // (see REQUEST_TIMEOUT_MS comment in api.ts), and socket.io-client calls
    // this on every (re)connection attempt. Reading storage fresh here means
    // a reconnect after the initial token has expired still authenticates,
    // instead of retrying forever with the same rejected token.
    auth: (cb) => cb({ token: storage.get(ACCESS_TOKEN_KEY) ?? token }),
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
  _socket.on('connect_error', (err) => {
    console.warn('[socket] connect_error:', err.message);
    // The auth middleware rejects with this exact message on an expired/invalid
    // JWT (backend/src/socket.ts). Proactively refresh now rather than waiting
    // for the next unrelated REST call to 401 — otherwise every reconnection
    // attempt keeps retrying with the same stale token and never recovers.
    if (err.message === 'Invalid token') {
      ensureFreshAccessToken().catch(() => {});
    }
  });
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
