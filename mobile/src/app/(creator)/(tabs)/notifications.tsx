import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
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
  labelKey: string;
};

const TYPE_CONFIG: Record<AppNotification['type'], TypeConfig> = {
  proposal_received:        { icon: 'document-text',        iconColor: '#6366F1', iconBg: '#EEF2FF', accentColor: '#6366F1', labelKey: 'notifications.typeNewProposal'  },
  proposal_accepted:        { icon: 'checkmark-circle',     iconColor: '#10B981', iconBg: '#ECFDF5', accentColor: '#10B981', labelKey: 'notifications.typeAccepted'      },
  proposal_rejected:        { icon: 'close-circle',         iconColor: '#EF4444', iconBg: '#FEF2F2', accentColor: '#EF4444', labelKey: 'notifications.typeRejected'      },
  new_message:              { icon: 'chatbubble',           iconColor: '#3B82F6', iconBg: '#EFF6FF', accentColor: '#3B82F6', labelKey: 'notifications.typeMessage'       },
  campaign_deadline:        { icon: 'time',                 iconColor: '#F59E0B', iconBg: '#FFFBEB', accentColor: '#F59E0B', labelKey: 'notifications.typeDeadline'      },
  campaign_closed:          { icon: 'lock-closed',          iconColor: '#6B7280', iconBg: '#F3F4F6', accentColor: '#6B7280', labelKey: 'notifications.typeClosed'        },
  new_campaign:             { icon: 'megaphone',            iconColor: '#8B5CF6', iconBg: '#F5F3FF', accentColor: '#8B5CF6', labelKey: 'notifications.typeNewEvent'     },
  payment_released:         { icon: 'cash',                 iconColor: '#10B981', iconBg: '#ECFDF5', accentColor: '#10B981', labelKey: 'notifications.typePayment'       },
  message_request_accepted: { icon: 'chatbubble-ellipses', iconColor: '#3B82F6', iconBg: '#EFF6FF', accentColor: '#3B82F6', labelKey: 'notifications.typeConnected'     },
  business_favorited:       { icon: 'heart',               iconColor: '#EF4444', iconBg: '#FFF1F2', accentColor: '#EF4444', labelKey: 'notifications.typeFavorited'     },
  creator_saved:            { icon: 'bookmark',            iconColor: '#7C3AED', iconBg: '#F5F3FF', accentColor: '#7C3AED', labelKey: 'notifications.typeSaved'         },
  campaign_invitation:      { icon: 'mail',                iconColor: '#0891B2', iconBg: '#E0F2FE', accentColor: '#0891B2', labelKey: 'notifications.typeInvited'       },
};

const FALLBACK: TypeConfig = { icon: 'notifications', iconColor: '#6B7280', iconBg: '#F3F4F6', accentColor: '#6B7280', labelKey: 'notifications.typeNotification' };

function getGroup(timestamp: string): 'groupToday' | 'groupThisWeek' | 'groupEarlier' {
  const diffDays = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return 'groupToday';
  if (diffDays < 7) return 'groupThisWeek';
  return 'groupEarlier';
}

function timeAgo(timestamp: string, t: TFn): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('notifications.timeJustNow');
  if (mins < 60) return t('notifications.timeMinutesAgo', { n: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('notifications.timeHoursAgo', { n: hrs });
  return t('notifications.timeDaysAgo', { n: Math.floor(hrs / 24) });
}

function NotificationItem({ item, onPress }: { item: AppNotification; onPress: (id: string) => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
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
          <Text style={[styles.labelChipText, { color: cfg.iconColor }]}>{t(cfg.labelKey)}</Text>
        </View>

        <Text style={[styles.itemBody, { color: C.textSecondary }]} numberOfLines={2}>
          {item.body}
        </Text>

        <Text style={[styles.itemTime, { color: C.textSecondary }]}>{timeAgo(item.timestamp, t)}</Text>
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

    // Free event notifications
    if (n.refType === 'event' && n.refId) {
      if (isCreator) {
        // Creator got accepted → view event details
        router.push({ pathname: '/campaign-detail', params: { campaignId: n.refId } });
      } else {
        // Business got a new participation request → view proposals list
        router.push({
          pathname: '/(business)/campaign-proposals',
          params: { campaignId: n.refId, campaignType: 'OPEN_EVENT', campaignTitle: '' },
        });
      }
      return;
    }

    // proposal_received → show the proposals list (business only)
    if (n.type === 'proposal_received' && n.refId && !isCreator) {
      router.push({
        pathname: '/(business)/campaign-proposals',
        params: { campaignId: n.refId, campaignTitle: '', campaignType: '' },
      });
      return;
    }

    // workspace status notifications → activity timeline
    if (n.refType === 'campaign' && n.refId &&
      ['payment_released', 'campaign_closed'].includes(n.type)) {
      router.push({
        pathname: '/(business)/activity-timeline',
        params: {
          campaignId: n.refId,
          ...(isCreator ? { role: 'CREATOR' } : {}),
        },
      });
      return;
    }

    if (n.type === 'campaign_invitation') {
      if (n.refId) {
        router.push({ pathname: '/campaign-detail', params: { campaignId: n.refId } });
      }
    } else if (n.type === 'creator_saved') {
      // just acknowledge — no deep link needed
    } else if (n.type === 'message_request_accepted' || n.type === 'business_favorited') {
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
    } else if (['proposal_accepted', 'proposal_rejected', 'campaign_deadline'].includes(n.type)) {
      if (isCreator) router.push('/(creator)/proposals');
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const groups = ['groupToday', 'groupThisWeek', 'groupEarlier'] as const;
  const grouped = groups
    .map((g) => ({ group: g, items: notifications.filter((n) => getGroup(n.timestamp) === g) }))
    .filter((g) => g.items.length > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={['#312e81', '#4f46e5', '#8b5cf6']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientHeader}>
        <View style={[styles.decCircle1, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
        <View style={[styles.decCircle2, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => { if (router.canGoBack()) router.back(); }}
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
            hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
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
              <Text style={[styles.groupLabel, { color: C.textSecondary }]}>{t(`notifications.${g.group}`)}</Text>
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
              title={t('notifications.emptyTitle')}
              subtitle={t('notifications.emptySub')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  gradientHeader: { paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  decCircle1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -60, right: -30 },
  decCircle2: { position: 'absolute', width: 110, height: 110, borderRadius: 55, bottom: -30, left: 20 },
  headerRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backBtn:    { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', justifyContent: 'center', alignItems: 'center' },
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
