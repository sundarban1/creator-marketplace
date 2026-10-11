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
import { apiRequest, endSessionNow } from '../lib/apiClient';
import { publishLive, type LiveTopic } from '../lib/liveUpdates';
import { useToast } from '../ui/Toast';
import { useT } from '../i18n';
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

// Admin-side changes that reach the user only as a bell notification — which
// open pages each one makes stale (mirrors mobile's NotificationContext).
const NOTIFICATION_TOPICS: Record<string, LiveTopic[]> = {
  account_verified:      ['profile'],
  verification_rejected: ['profile'],
  withdrawal_processing: ['wallet'],
  withdrawal_paid:       ['wallet'],
  withdrawal_rejected:   ['wallet'],
  referral_reward:       ['wallet', 'referrals'],
  dispute_resolved:      ['applications', 'wallet'],
  campaign_deleted:      ['applications', 'campaigns'],
};

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { status } = useAppAuth();
  const toast = useToast();
  const t = useT();
  // Read through refs so the socket subscriptions don't churn on re-render.
  const toastRef = useRef(toast);
  const tRef = useRef(t);
  useEffect(() => {
    toastRef.current = toast;
    tRef.current = t;
  });
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
    const onNew = (notif?: { type?: string; refId?: string }) => {
      load();
      const topics = [...(NOTIFICATION_TOPICS[notif?.type ?? ''] ?? [])];
      if (notif?.type === 'campaign_deleted' && notif.refId) topics.push(`campaign:${notif.refId}`);
      publishLive(...topics);
    };
    socket.on('notification:new', onNew);

    // ── Admin-pushed state ────────────────────────────────────────────────
    // Suspended/deleted: the server already revoked every session — sign out
    // now rather than on the next token refresh.
    const onSessionRevoked = (data?: { reason?: string }) => {
      if (data?.reason === 'suspended') toastRef.current.error(tRef.current('auth.accountSuspended'), 8000);
      endSessionNow();
    };
    // An event edited/featured/deleted/re-approved by admin or its business.
    const onCampaignNew = () => publishLive('campaigns');
    const onCampaignUpdated = (data?: { id?: string }) => {
      publishLive('campaigns');
      if (data?.id) publishLive(`campaign:${data.id}`);
    };
    const onCatalogUpdated = (data?: { kind?: 'categories' | 'platforms' }) => {
      if (data?.kind) publishLive(data.kind);
    };
    const onConversationUpdate = () => publishLive('conversations');
    socket.on('session:revoked',     onSessionRevoked);
    socket.on('campaign:new',        onCampaignNew);
    socket.on('campaign:updated',    onCampaignUpdated);
    socket.on('catalog:updated',     onCatalogUpdated);
    socket.on('conversation:update', onConversationUpdate);

    const onFocus = () => load();
    window.addEventListener('focus', onFocus);

    return () => {
      socket.off('notification:new', onNew);
      socket.off('session:revoked',     onSessionRevoked);
      socket.off('campaign:new',        onCampaignNew);
      socket.off('campaign:updated',    onCampaignUpdated);
      socket.off('catalog:updated',     onCatalogUpdated);
      socket.off('conversation:update', onConversationUpdate);
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
