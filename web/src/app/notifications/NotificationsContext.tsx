import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { apiRequest } from '../lib/apiClient';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { fetchNotifications, markNotificationRead, type AppNotification } from '../api/creator';
import { useAppAuth } from '../auth/AppAuthContext';

interface NotificationsValue {
  items: AppNotification[];
  unread: number;
  loading: boolean;
  reload: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { status } = useAppAuth();
  const authed = status === 'authenticated';

  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const nonce = useRef(0);

  const load = useCallback(async () => {
    if (!authed) return;
    const id = ++nonce.current;
    try {
      const [list, badge] = await Promise.all([
        fetchNotifications(20),
        apiRequest<{ count: number }>('GET', '/api/notifications/badge').then((r) => r.data.count).catch(() => 0),
      ]);
      if (id !== nonce.current) return;
      setItems(list);
      setUnread(badge);
    } catch {
      /* keep whatever we have */
    } finally {
      if (id === nonce.current) setLoading(false);
    }
  }, [authed]);

  // Initial load + on auth change.
  useEffect(() => {
    if (!authed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems([]);
      setUnread(0);
      return;
    }
    void load();
  }, [authed, load]);

  // Realtime: refresh on a new notification, and on window focus.
  useEffect(() => {
    if (!authed) return;
    const socket = connectSocket();
    const onNew = () => load();
    socket.on('notification:new', onNew);

    const onFocus = () => load();
    window.addEventListener('focus', onFocus);

    return () => {
      socket.off('notification:new', onNew);
      window.removeEventListener('focus', onFocus);
    };
  }, [authed, load]);

  useEffect(() => () => disconnectSocket(), []);

  const markRead = useCallback((id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    markNotificationRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    apiRequest('PATCH', '/api/notifications/read-all').catch(() => {});
  }, []);

  const value = useMemo<NotificationsValue>(
    () => ({ items, unread, loading, reload: load, markRead, markAllRead }),
    [items, unread, loading, load, markRead, markAllRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within <NotificationsProvider>');
  return ctx;
}
