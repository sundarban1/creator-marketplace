import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { useNotificationBadge } from '@/context/NotificationContext';
import { notificationService } from '@/services/notifications';
import { getSocket } from '@/lib/socket';
import { F } from '@/utilities/constants';
import type { AppNotification } from '@/types';

type IoniconName = keyof typeof Ionicons.glyphMap;

type TypeConfig = {
  icon: IoniconName;
  iconColor: string;
  iconBg: string;
  accentColor: string;
  label: string;
};

const TYPE_CONFIG: Record<AppNotification['type'], TypeConfig> = {
  proposal_received:        { icon: 'document-text',        iconColor: '#6366F1', iconBg: '#EEF2FF', accentColor: '#6366F1', label: 'New Proposal'  },
  proposal_accepted:        { icon: 'checkmark-circle',     iconColor: '#10B981', iconBg: '#ECFDF5', accentColor: '#10B981', label: 'Accepted'      },
  proposal_rejected:        { icon: 'close-circle',         iconColor: '#EF4444', iconBg: '#FEF2F2', accentColor: '#EF4444', label: 'Rejected'      },
  new_message:              { icon: 'chatbubble',           iconColor: '#3B82F6', iconBg: '#EFF6FF', accentColor: '#3B82F6', label: 'Message'       },
  campaign_deadline:        { icon: 'time',                 iconColor: '#F59E0B', iconBg: '#FFFBEB', accentColor: '#F59E0B', label: 'Deadline'      },
  campaign_closed:          { icon: 'lock-closed',          iconColor: '#6B7280', iconBg: '#F3F4F6', accentColor: '#6B7280', label: 'Closed'        },
  new_campaign:             { icon: 'megaphone',            iconColor: '#8B5CF6', iconBg: '#F5F3FF', accentColor: '#8B5CF6', label: 'New Campaign'  },
  payment_released:         { icon: 'cash',                 iconColor: '#10B981', iconBg: '#ECFDF5', accentColor: '#10B981', label: 'Payment'       },
  message_request_accepted: { icon: 'chatbubble-ellipses', iconColor: '#3B82F6', iconBg: '#EFF6FF', accentColor: '#3B82F6', label: 'Connected'     },
  business_favorited:       { icon: 'heart',               iconColor: '#EF4444', iconBg: '#FFF1F2', accentColor: '#EF4444', label: 'Favorited'     },
};

const FALLBACK: TypeConfig = { icon: 'notifications', iconColor: '#6B7280', iconBg: '#F3F4F6', accentColor: '#6B7280', label: 'Notification' };

function getGroup(timestamp: string): 'Today' | 'This Week' | 'Earlier' {
  const diffDays = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return 'Today';
  if (diffDays < 7) return 'This Week';
  return 'Earlier';
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationItem({ item, onPress }: { item: AppNotification; onPress: (id: string) => void }) {
  const C = useAppColors();
  const cfg = TYPE_CONFIG[item.type] ?? FALLBACK;

  return (
    <Pressable
      style={[
        styles.item,
        { backgroundColor: item.isRead ? C.surface : C.primaryLight, borderBottomColor: C.border },
      ]}
      onPress={() => onPress(item.id)}>

      {/* Type-coloured left accent bar */}
      {!item.isRead && (
        <View style={[styles.accentBar, { backgroundColor: cfg.accentColor }]} />
      )}

      {/* Type icon in a coloured circle */}
      <View style={[styles.iconWrap, { backgroundColor: cfg.iconBg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} />
      </View>

      {/* Content */}
      <View style={styles.itemContent}>
        <View style={styles.titleRow}>
          <Text style={[styles.itemTitle, { color: C.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.isRead && (
            <View style={[styles.unreadDot, { backgroundColor: cfg.accentColor }]} />
          )}
        </View>

        {/* Type label chip */}
        <View style={[styles.labelChip, { backgroundColor: cfg.iconBg }]}>
          <Text style={[styles.labelChipText, { color: cfg.iconColor }]}>{cfg.label}</Text>
        </View>

        <Text style={[styles.itemBody, { color: C.textSecondary }]} numberOfLines={2}>
          {item.body}
        </Text>

        <Text style={[styles.itemTime, { color: C.textSecondary }]}>{timeAgo(item.timestamp)}</Text>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const C = useAppColors();
  const { clearBadge, decrementBadge } = useNotificationBadge();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  function loadNotifications(showLoader = true) {
    if (showLoader) setLoading(true);
    notificationService.getNotifications()
      .then((data) => setNotifications(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  // Reload every time the screen gains focus so new notifications always appear
  useFocusEffect(useCallback(() => {
    loadNotifications();
  }, []));

  // Also listen for real-time socket events to prepend new notifications instantly
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => loadNotifications(false);
    socket.on('notification:new', handler);
    return () => { socket.off('notification:new', handler); };
  }, []);

  async function handleMarkAll() {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    clearBadge(); // zero out the bell badge
  }

  async function handlePress(id: string) {
    const wasUnread = !notifications.find((n) => n.id === id)?.isRead;
    await notificationService.markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    if (wasUnread) decrementBadge();
    const n = notifications.find((n) => n.id === id);
    if (!n) return;
    const isCreator = user?.role === 'CREATOR';

    if (n.type === 'message_request_accepted' || n.type === 'business_favorited') {
      if (n.refId) {
        router.push({ pathname: '/(business)/creator-detail', params: { id: n.refId } });
      }
    } else if (n.type === 'new_campaign') {
      if (n.refId) {
        router.push({ pathname: '/campaign-detail', params: { id: n.refId } });
      } else if (isCreator) {
        router.push('/(creator)/');
      }
    } else if (n.type === 'new_message') {
      router.push(isCreator ? '/(creator)/messages/' : '/(business)/messages/');
    } else if (['proposal_accepted', 'proposal_rejected', 'campaign_deadline', 'campaign_closed', 'payment_released'].includes(n.type)) {
      if (isCreator) router.push('/(creator)/proposals');
    } else if (n.type === 'proposal_received') {
      if (!isCreator) router.push('/(business)/proposals');
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const groups = ['Today', 'This Week', 'Earlier'] as const;
  const grouped = groups
    .map((g) => ({ group: g, items: notifications.filter((n) => getGroup(n.timestamp) === g) }))
    .filter((g) => g.items.length > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={['#059669', '#0D9488', '#0891B2']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientHeader}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.heading, { color: '#fff' }]}>{t('notifications.heading')}</Text>
            {unreadCount > 0 && (
              <Text style={[styles.subheading, { color: 'rgba(255,255,255,0.8)' }]}>
                {t('notifications.unread', { count: unreadCount })}
              </Text>
            )}
          </View>
          {unreadCount > 0 && (
            <Pressable onPress={handleMarkAll} style={[styles.markAllBtn, { borderColor: 'rgba(255,255,255,0.7)' }]}>
              <Text style={[styles.markAllText, { color: '#fff' }]}>{t('notifications.markAllRead')}</Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(g) => g.group}
          renderItem={({ item: g }) => (
            <View>
              <Text style={[styles.groupLabel, { color: C.textSecondary }]}>{g.group}</Text>
              {g.items.map((n) => (
                <NotificationItem key={n.id} item={n} onPress={handlePress} />
              ))}
            </View>
          )}
          contentContainerStyle={[styles.list, grouped.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              emoji="🔔"
              title="All caught up!"
              subtitle="You have no notifications right now. We'll let you know when something new happens."
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  gradientHeader: { paddingBottom: 4, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  heading:    { fontSize: 22, fontWeight: '700', fontFamily: F.extrabold },
  subheading: { fontSize: 13, marginTop: 2, fontFamily: F.regular },
  markAllBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  markAllText:{ fontSize: 12, fontWeight: '600', fontFamily: F.semibold },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { paddingBottom: 32 },
  listEmpty:  { flexGrow: 1 },

  groupLabel: { fontSize: 11, fontWeight: '700', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: F.bold },

  item:       { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, gap: 12, alignItems: 'flex-start' },
  accentBar:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },

  iconWrap:   { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2 },

  itemContent:{ flex: 1, gap: 4 },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemTitle:  { fontSize: 14, fontWeight: '700', flex: 1, fontFamily: F.bold },
  unreadDot:  { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },

  labelChip:     { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  labelChipText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, fontFamily: F.bold },

  itemBody:   { fontSize: 13, lineHeight: 18, fontFamily: F.regular },
  itemTime:   { fontSize: 11, opacity: 0.6, fontFamily: F.regular },
});
