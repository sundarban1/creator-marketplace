import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { notificationService } from '@/services/notifications';
import { storage } from '@/utilities/storage';
import { ACCESS_TOKEN_KEY } from '@/utilities/constants';

type NotificationContextValue = {
  badgeCount: number;
  setBadgeCount: (n: number) => void;
  decrementBadge: () => void;
  clearBadge: () => void;
};

const NotificationContext = createContext<NotificationContextValue>({
  badgeCount: 0,
  setBadgeCount: () => {},
  decrementBadge: () => {},
  clearBadge: () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [badgeCount, setBadgeCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const clearBadge = useCallback(() => setBadgeCount(0), []);
  const decrementBadge = useCallback(() => setBadgeCount((n) => Math.max(0, n - 1)), []);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setBadgeCount(0);
      return;
    }

    // Fetch initial badge count
    notificationService.getBadge().then((r) => setBadgeCount(r.count)).catch(() => {});

    // Connect WebSocket using stored access token
    const token = storage.get(ACCESS_TOKEN_KEY);
    if (!token) return;

    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on('notification:new', () => {
      setBadgeCount((n) => n + 1);
    });

    return () => {
      socket.off('notification:new');
      disconnectSocket();
      socketRef.current = null;
    };
  }, [user?.id]);

  return (
    <NotificationContext.Provider value={{ badgeCount, setBadgeCount, decrementBadge, clearBadge }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationBadge() {
  return useContext(NotificationContext);
}
