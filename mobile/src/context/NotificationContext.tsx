import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { notificationService } from '@/services/notifications';
import { chatService } from '@/services/chat';
import { messagingEvents } from '@/lib/messagingEvents';
import { incomingMessageEvents } from '@/lib/incomingMessageEvents';
import type { ApiMessage } from '@/lib/api';
import { storage } from '@/utilities/storage';
import { ACCESS_TOKEN_KEY } from '@/utilities/constants';

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

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [badgeCount, setBadgeCount]         = useState(0);
  const [chatBadgeCount, setChatBadgeCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const clearBadge       = useCallback(() => setBadgeCount(0), []);
  const decrementBadge   = useCallback(() => setBadgeCount((n) => Math.max(0, n - 1)), []);

  function refreshBadge() {
    notificationService.getBadge().then((r) => setBadgeCount(r.count)).catch(() => {});
  }

  function refreshChatBadge() {
    chatService.getBadgeCount().then((r) => setChatBadgeCount(r.count)).catch(() => {});
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
    notificationService.registerPushToken().catch(() => {});

    const socket = connectSocket(token);
    socketRef.current = socket;

    // ── Notification badge — only non-message notifications go to bell ─────────
    const onNotificationNew = (notif: { type?: string }) => {
      if (notif?.type !== 'new_message') {
        setBadgeCount((n) => n + 1);
      }
    };
    socket.on('notification:new', onNotificationNew);

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
    const unsubMessaging = messagingEvents.subscribe(refreshChatBadge);

    // ── App foreground refresh ───────────────────────────────────────────────
    // Also re-attempts push token registration here: if the user denied the
    // permission prompt at first launch then granted it later via system
    // Settings, registerPushToken() was otherwise never called again and
    // User.pushToken stayed null forever — pushes silently no-op for that
    // user indefinitely. Re-checking on every foreground fixes that cheaply
    // (the call is a no-op if the token/permission state hasn't changed).
    const handleAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        refreshBadge();
        refreshChatBadge();
        notificationService.registerPushToken().catch(() => {});

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

    return () => {
      socket.off('notification:new', onNotificationNew);
      socket.off('message:new',         onMessageNew);
      socket.off('conversation:update', onConvUpdate);
      unsubMessaging();
      disconnectSocket();
      socketRef.current = null;
      sub.remove();
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
