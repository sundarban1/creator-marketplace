import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
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

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setBadgeCount(0);
      setChatBadgeCount(0);
      return;
    }

    // Fetch initial badge counts and register push token
    refreshBadge();
    refreshChatBadge();
    void notificationService.registerPushToken();

    const token = storage.get(ACCESS_TOKEN_KEY);
    if (!token) return;

    const socket = connectSocket(token);
    socketRef.current = socket;

    // ── Notification badge — only non-message notifications go to bell ─────────
    socket.on('notification:new', (notif: { type?: string }) => {
      if (notif?.type !== 'new_message') {
        setBadgeCount((n) => n + 1);
      }
    });

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
    const handleAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        refreshBadge();
        refreshChatBadge();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      socket.off('notification:new');
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
