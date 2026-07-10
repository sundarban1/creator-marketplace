import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getAccessToken, type ApiNotification } from '../lib/api';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import { useAuth } from './AuthContext';

interface NotificationContextValue {
  notifications: ApiNotification[];
  unreadCount:   number;
  markRead:      (id: string) => Promise<void>;
  markAllRead:   () => Promise<void>;
  refresh:       () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  function load() {
    api.notifications.list().then((res) => setNotifications(res.data)).catch(() => {});
    api.notifications.badge().then((res) => setUnreadCount(res.data.count)).catch(() => {});
  }

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    load();

    const token = getAccessToken();
    if (!token) return;
    const socket = connectSocket(token);

    function handleNew() {
      load();
    }
    socket.on('notification:new', handleNew);

    return () => {
      getSocket()?.off('notification:new', handleNew);
    };
  }, [user]);

  async function markRead(id: string) {
    await api.notifications.markRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await api.notifications.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, refresh: load }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
