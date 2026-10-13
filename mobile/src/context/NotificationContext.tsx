import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import type { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { usePlatformFlags } from './PlatformSettingsContext';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { notificationService } from '@/services/notifications';
import { chatService } from '@/services/chat';
import { messagingEvents } from '@/lib/messagingEvents';
import { incomingMessageEvents } from '@/lib/incomingMessageEvents';
import { ensureFreshAccessToken, warmUpBackend, type ApiMessage } from '@/lib/api';
import { storage } from '@/utilities/storage';
import { ACCESS_TOKEN_KEY } from '@/utilities/constants';
import { logger } from '@/utilities/logger';
import { resolveNotificationRoute } from '@/utilities/notificationRouting';
import { queryClient } from '@/lib/queryClient';
import { getString, translations } from '@/i18n';

function navigateFromPushData(data: unknown, isCreator: boolean) {
  const d = data as { type?: string; refId?: string; refType?: string; applicationId?: string } | undefined;
  if (!d?.type) return;
  const route = resolveNotificationRoute({ type: d.type, refId: d.refId, refType: d.refType, applicationId: d.applicationId }, isCreator);
  if (route) router.push(route);
}

type NotificationContextValue = {
  badgeCount:     number;   // notification tab badge
  chatBadgeCount: number;   // messages tab badge
  setBadgeCount:     (n: number) => void;
  decrementBadge:    () => void;
  clearBadge:        () => void;
  refreshChatBadge:  () => void;
};

const NotificationContext = createContext<NotificationContextValue>({
  badgeCount:     0,
  chatBadgeCount: 0,
  setBadgeCount:     () => {},
  decrementBadge:    () => {},
  clearBadge:        () => {},
  refreshChatBadge:  () => {},
});

// Admin-side changes that reach the user only as a bell notification — which
// cached screens each one makes stale, so they refetch instead of waiting out
// their staleTime (or, for persisted roots, surviving an app restart).
const NOTIFICATION_INVALIDATES: Record<string, string[][]> = {
  account_verified:      [['profile']],
  verification_rejected: [['profile']],
  withdrawal_processing: [['wallet']],
  withdrawal_paid:       [['wallet']],
  withdrawal_rejected:   [['wallet']],
  referral_reward:       [['wallet']],
  dispute_resolved:      [['applications'], ['wallet'], ['campaign']],
  campaign_deleted:      [['applications'], ['campaigns'], ['campaign']],
};

// Outside LanguageProvider, so read the stored language the same way it does.
function tStored(key: string): string {
  const lang = storage.get('app_language') === 'ne' ? 'ne' : 'en';
  return getString(translations[lang], key) ?? key;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, forceLogout } = useAuth();
  const forceLogoutRef = useRef(forceLogout);
  forceLogoutRef.current = forceLogout;
  const { refetch: refetchPlatformFlags } = usePlatformFlags();
  const refetchPlatformFlagsRef = useRef(refetchPlatformFlags);
  refetchPlatformFlagsRef.current = refetchPlatformFlags;
  const [badgeCount, setBadgeCount]         = useState(0);
  const [chatBadgeCount, setChatBadgeCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const chatBadgeDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearBadge       = useCallback(() => setBadgeCount(0), []);
  const decrementBadge   = useCallback(() => setBadgeCount((n) => Math.max(0, n - 1)), []);

  function refreshBadge() {
    notificationService.getBadge().then((r) => setBadgeCount(r.count)).catch((err) => logger.warn('[notifications] refreshBadge failed', { err }));
  }

  function refreshChatBadge() {
    chatService.getBadgeCount().then((r) => setChatBadgeCount(r.count)).catch((err) => logger.warn('[notifications] refreshChatBadge failed', { err }));
  }

  // markSeen() (see useChatConversation.ts) fires messagingEvents.refresh() ~800ms
  // after every single chat screen open — opening several chats in a short span
  // (e.g. scrolling through a conversation list) previously fired one
  // refreshChatBadge() REST call per chat, back to back, which the backend's
  // rate limiter started rejecting with 429s, and each one's setChatBadgeCount
  // re-renders every still-mounted tab screen (Tabs keeps them all mounted).
  // Debouncing collapses a burst of these into a single trailing call.
  function debouncedRefreshChatBadge() {
    if (chatBadgeDebounceTimer.current) clearTimeout(chatBadgeDebounceTimer.current);
    chatBadgeDebounceTimer.current = setTimeout(refreshChatBadge, 500);
  }

  // The OS app-icon badge is otherwise only ever set by an incoming push's payload
  // (see notificationService.getBadge()/setNotificationHandler's shouldSetBadge) —
  // nothing clears or updates it as the user reads notifications/messages in-app,
  // so it silently gets stuck at whatever number the last push happened to carry
  // (previously always 1 — the backend hardcoded it). Syncing it here on every
  // change to the in-app counts keeps it accurate, including clearing to 0.
  useEffect(() => {
    void Notifications.setBadgeCountAsync(badgeCount + chatBadgeCount);
  }, [badgeCount, chatBadgeCount]);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setBadgeCount(0);
      setChatBadgeCount(0);
      return;
    }

    const token = storage.get(ACCESS_TOKEN_KEY);
    if (!token) return;

    // Fetch initial badge counts and register push token
    refreshBadge();
    refreshChatBadge();
    notificationService.registerPushToken().catch((err) => logger.warn('[notifications] registerPushToken failed', { err }));

    const socket = connectSocket(token);
    socketRef.current = socket;

    // ── Notification badge — only non-message notifications go to bell ─────────
    const onNotificationNew = (notif: { type?: string }) => {
      if (notif?.type !== 'new_message') {
        setBadgeCount((n) => n + 1);
      }
      for (const queryKey of NOTIFICATION_INVALIDATES[notif?.type ?? ''] ?? []) {
        void queryClient.invalidateQueries({ queryKey });
      }
    };
    socket.on('notification:new', onNotificationNew);

    // ── Admin-pushed state ──────────────────────────────────────────────────
    // Suspended or deleted by an admin: the server already revoked every
    // session, so sign out now instead of on the next token refresh.
    const onSessionRevoked = (data: { reason?: string }) => {
      void forceLogoutRef.current();
      if (data?.reason === 'suspended') {
        Alert.alert(tStored('auth.login.suspendedTitle'), tStored('auth.login.suspendedMessage'));
      }
    };
    // Category/platform catalogs are persisted to disk, so an admin edit would
    // otherwise linger for the 5-min staleTime and across restarts.
    const onCatalogUpdated = (data: { kind?: 'categories' | 'platforms' }) => {
      if (data?.kind) void queryClient.invalidateQueries({ queryKey: [data.kind] });
    };
    // An event edited/featured/deleted: refresh its detail page if cached.
    // Broadcast to every creator, so keep this to the one event — a deletion
    // that touches someone's applications arrives as campaign_deleted above.
    const onCampaignUpdated = (data: { id?: string }) => {
      if (data?.id) void queryClient.invalidateQueries({ queryKey: ['campaign', data.id] });
    };
    // Admin saved platform settings (e.g. payment fee/tax %) — re-pull the
    // flags so open screens like the pay sheet show the new values live.
    const onSettingsUpdated = () => {
      void refetchPlatformFlagsRef.current();
      // Support phone/WhatsApp/email shown in the Contact Support sheet.
      void queryClient.invalidateQueries({ queryKey: ['siteInfo'] });
    };
    socket.on('session:revoked',  onSessionRevoked);
    socket.on('catalog:updated',  onCatalogUpdated);
    socket.on('settings:updated', onSettingsUpdated);
    socket.on('campaign:updated', onCampaignUpdated);

    // ── Chat badge + message forwarding ─────────────────────────────────────
    // The server includes chatBadgeCount in the message:new payload so we can
    // update the badge without a REST round-trip. Falls back to REST on conv:update.
    const onConvUpdate = () => { refreshChatBadge(); };
    const onMessageNew = (data: { conversationId: string; message: ApiMessage; chatBadgeCount?: number }) => {
      if (typeof data.chatBadgeCount === 'number') {
        setChatBadgeCount(data.chatBadgeCount);
      } else {
        refreshChatBadge();
      }
      incomingMessageEvents.emit(data);
    };
    socket.on('message:new',         onMessageNew);
    socket.on('conversation:update', onConvUpdate);

    // Also wire to messaging events (fired by markSeen, respondToRequest, etc.)
    const unsubMessaging = messagingEvents.subscribe(debouncedRefreshChatBadge);

    // ── App foreground refresh ───────────────────────────────────────────────
    // Also re-attempts push token registration here: if the user denied the
    // permission prompt at first launch then granted it later via system
    // Settings, registerPushToken() was otherwise never called again and
    // User.pushToken stayed null forever — pushes silently no-op for that
    // user indefinitely. Re-checking on every foreground fixes that cheaply
    // (the call is a no-op if the token/permission state hasn't changed).
    const handleAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        // Wake a possibly-just-restarted instance and renew a stale access
        // token *before* the badge fetches (and whatever the user taps next)
        // go out — otherwise the first action after a long background sits
        // through request → 401 → refresh → retry against a cold instance.
        warmUpBackend();
        void ensureFreshAccessToken();
        refreshBadge();
        refreshChatBadge();
        notificationService.registerPushToken().catch((err) => logger.warn('[notifications] registerPushToken failed', { err }));

        // A backgrounded app's socket connection is commonly torn down by the
        // OS without ever firing a 'disconnect' the client reacts to, so it
        // can sit "connected" per its own stale internal state while actually
        // dead — nothing then kicks off socket.io's reconnection loop, and
        // real-time events (chat, notifications) silently stop arriving until
        // the app is killed and reopened. Reusing the same socket (not
        // reconnectSocket()) keeps its already-attached listeners intact;
        // .connect() is a no-op if it's already connected, and its `auth`
        // callback re-reads the token fresh, so this also recovers a session
        // that's been sitting long enough for the access token to have
        // rotated (see the 'Invalid token' handling in socket.ts).
        if (socketRef.current && !socketRef.current.connected) {
          socketRef.current.connect();
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);

    // ── Notification tap → deep link ─────────────────────────────────────────
    // Fires while the app is foregrounded/backgrounded-but-alive. Cold-start
    // (app launched *by* tapping a notification) is handled separately below
    // since this listener alone never fires for that case.
    const isCreator = user.role === 'CREATOR';
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromPushData(response.notification.request.content.data, isCreator);
    });
    // Small delay so this runs after RootNavigator's own initial auth-gate
    // redirect has settled, instead of racing it.
    const coldStartTimer = setTimeout(() => {
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (response) navigateFromPushData(response.notification.request.content.data, isCreator);
      });
    }, 500);

    return () => {
      socket.off('notification:new', onNotificationNew);
      socket.off('session:revoked',  onSessionRevoked);
      socket.off('catalog:updated',  onCatalogUpdated);
      socket.off('settings:updated', onSettingsUpdated);
      socket.off('campaign:updated', onCampaignUpdated);
      socket.off('message:new',         onMessageNew);
      socket.off('conversation:update', onConvUpdate);
      unsubMessaging();
      if (chatBadgeDebounceTimer.current) clearTimeout(chatBadgeDebounceTimer.current);
      disconnectSocket();
      socketRef.current = null;
      sub.remove();
      responseSub.remove();
      clearTimeout(coldStartTimer);
    };
  }, [user?.id]);

  return (
    <NotificationContext.Provider value={{ badgeCount, chatBadgeCount, setBadgeCount, decrementBadge, clearBadge, refreshChatBadge }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationBadge() {
  return useContext(NotificationContext);
}
