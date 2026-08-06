import { io, type Socket } from 'socket.io-client';
import { getAccessToken, ensureFreshAccessToken } from './api';

const API_BASE = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:3000';

let _socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }

  _socket = io(API_BASE, {
    // A function, not a static object — access tokens rotate periodically,
    // and socket.io-client calls this on every (re)connection attempt.
    // Reading storage fresh here means a reconnect after the initial token
    // has expired still authenticates, instead of replaying the same
    // rejected token forever (previously a static `{ token }` object, which
    // meant a socket that outlived one token rotation never recovered — see
    // connect_error handling below). Mirrors mobile's lib/socket.ts.
    auth: (cb) => cb({ token: getAccessToken() ?? token }),
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  });

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
