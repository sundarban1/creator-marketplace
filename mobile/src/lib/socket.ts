import { io, type Socket } from 'socket.io-client';
import { API_BASE } from './api';

let _socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (_socket) {
    // Remove all JS listeners before closing so the native 'websocketClosed'
    // event that fires after disconnect() has no dangling socket.io handlers
    // to miss — this silences the "no listeners registered" RN warning.
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
  }

  _socket = io(API_BASE, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
    timeout: 10000,
  });

  return _socket;
}

export function disconnectSocket(): void {
  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
  }
}

export function getSocket(): Socket | null {
  return _socket;
}
