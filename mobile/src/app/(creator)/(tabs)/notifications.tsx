import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { useAuth } from '@/context/AuthContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { useNotificationBadge } from '@/context/NotificationContext';
import { notificationService } from '@/services/notifications';
import { getSocket } from '@/lib/socket';
import { F, RADIUS } from '@/utilities/constants';
import { resolveNotificationRoute } from '@/utilities/notificationRouting';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import type { AppNotification } from '@/types';

type IoniconName = keyof typeof FontAwesome5.glyphMap;

type TypeConfig = {
  icon: IoniconName;
  iconColor: string;
  iconBg: string;
  accentColor: string;
  labelKey: string;
};

const TYPE_CONFIG: Record<AppNotification['type'], TypeConfig> = {
  proposal_received:        { icon: 'paper-plane',      iconColor: '#6366F1', iconBg: '#EEF2FF', accentColor: '#6366F1', labelKey: 'notifications.typeNewProposal'  },
  work_started:             { icon: 'play-circle',      iconColor: '#14B8A6', iconBg: '#F0FDFA', accentColor: '#14B8A6', labelKey: 'notifications.typeWorkStarted'   },
  work_submitted:           { icon: 'cloud-upload-alt', iconColor: '#A855F7', iconBg: '#FAF5FF', accentColor: '#A855F7', labelKey: 'notifications.typeWorkSubmitted' },
  revision_requested:       { icon: 'edit',             iconColor: '#F97316', iconBg: '#FFF7ED', accentColor: '#F97316', labelKey: 'notifications.typeRevisionRequested' },
  proposal_accepted:        { icon: 'check-circle',     iconColor: '#10B981', iconBg: '#ECFDF5', accentColor: '#10B981', labelKey: 'notifications.typeAccepted'      },
  proposal_rejected:        { icon: 'times-circle',         iconColor: '#EF4444', iconBg: '#FEF2F2', accentColor: '#EF4444', labelKey: 'notifications.typeRejected'      },
  new_message:              { icon: 'comment',           iconColor: '#3B82F6', iconBg: '#EFF6FF', accentColor: '#3B82F6', labelKey: 'notifications.typeMessage'       },
  campaign_deadline:        { icon: 'clock',                 iconColor: '#F59E0B', iconBg: '#FFFBEB', accentColor: '#F59E0B', labelKey: 'notifications.typeDeadline'      },
  campaign_closed:          { icon: 'lock',          iconColor: '#6B7280', iconBg: '#F3F4F6', accentColor: '#6B7280', labelKey: 'notifications.typeClosed'        },
  new_campaign:             { icon: 'bullhorn',            iconColor: '#8B5CF6', iconBg: '#F5F3FF', accentColor: '#8B5CF6', labelKey: 'notifications.typeNewEvent'     },
  work_approved:            { icon: 'trophy',               iconColor: '#10B981', iconBg: '#ECFDF5', accentColor: '#10B981', labelKey: 'notifications.typeWorkApproved'  },
  payment_released:         { icon: 'money-bill-alt',                 iconColor: '#10B981', iconBg: '#ECFDF5', accentColor: '#10B981', labelKey: 'notifications.typePayment'       },
  message_request_accepted: { icon: 'comment-dots', iconColor: '#3B82F6', iconBg: '#EFF6FF', accentColor: '#3B82F6', labelKey: 'notifications.typeConnected'     },
  business_favorited:       { icon: 'heart',               iconColor: '#EF4444', iconBg: '#FFF1F2', accentColor: '#EF4444', labelKey: 'notifications.typeFavorited'     },
  creator_saved:            { icon: 'bookmark',            iconColor: '#7C3AED', iconBg: '#F5F3FF', accentColor: '#7C3AED', labelKey: 'notifications.typeSaved'         },
  campaign_invitation:      { icon: 'envelope',                iconColor: '#0891B2', iconBg: '#E0F2FE', accentColor: '#0891B2', labelKey: 'notifications.typeInvited'       },
  account_verified:         { icon: 'shield-alt',    iconColor: '#10B981', iconBg: '#ECFDF5', accentColor: '#10B981', labelKey: 'notifications.typeVerified'      },
  verification_rejected:    { icon: 'shield-alt',      iconColor: '#EF4444', iconBg: '#FEF2F2', accentColor: '#EF4444', labelKey: 'notifications.typeVerificationRejected' },
  proposal_expired:         { icon: 'hourglass-end',   iconColor: '#6B7280', iconBg: '#F3F4F6', accentColor: '#6B7280', labelKey: 'notifications.typeProposalExpired' },
  event_expired:            { icon: 'hourglass-end',   iconColor: '#6B7280', iconBg: '#F3F4F6', accentColor: '#6B7280', labelKey: 'notifications.typeEventExpired'  },
  team_invitation:          { icon: 'user-plus',       iconColor: '#0D9488', iconBg: '#F0FDFA', accentColor: '#0D9488', labelKey: 'notifications.typeTeamInvitation' },
  team_invitation_response: { icon: 'users',           iconColor: '#0D9488', iconBg: '#F0FDFA', accentColor: '#0D9488', labelKey: 'notifications.typeTeamInvitationResponse' },
};

const FALLBACK: TypeConfig = { icon: 'bell', iconColor: '#6B7280', iconBg: '#F3F4F6', accentColor: '#6B7280', labelKey: 'notifications.typeNotification' };

// Rows persisted before work_started/work_submitted/revision_requested existed
// as their own types are still stuck in the DB with type: 'proposal_received'
// (the old shared bucket) — disambiguate those legacy rows by title so they
// don't all render the proposal icon.
function resolveTypeConfig(item: AppNotification): TypeConfig {
  if (item.type === 'proposal_received') {
    if (item.title.startsWith('Creator Started Working')) return TYPE_CONFIG.work_started;
    if (item.title.startsWith('Work Submitted for Review')) return TYPE_CONFIG.work_submitted;
    if (item.title.startsWith('Revision Requested')) return TYPE_CONFIG.revision_requested;
  }
  return TYPE_CONFIG[item.type] ?? FALLBACK;
}

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

// Some notification titles still come from the backend with a leading emoji
// (older rows already persisted in the DB, or code paths that weren't caught
// by the copy cleanup) — strip it here so the row never shows one, regardless
// of what the API sends.
function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function NotificationItem({ item, onPress }: { item: AppNotification; onPress: (id: string) => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const cfg = resolveTypeConfig(item);

  return (
    <Pressable
      style={[styles.item, { backgroundColor: item.isRead ? 'transparent' : C.primaryLight }]}
      onPress={() => onPress(item.id)}>

      {/* Type icon in a coloured circle */}
      <View style={[styles.iconWrap, { backgroundColor: cfg.iconBg }]}>
        <FontAwesome5 name={cfg.icon} solid size={20} color={cfg.iconColor} />
      </View>

      {/* Content */}
      <View style={styles.itemContent}>
        <View style={styles.titleRow}>
          <Text style={[styles.itemTitle, { color: C.text }]} numberOfLines={1}>
            {stripEmoji(item.title)}
          </Text>
          {!item.isRead && (
            <View style={[styles.unreadDot, { backgroundColor: cfg.accentColor }]} />
          )}
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
  const [error, setError] = useState('');
  const listRef = useRef<FlatList<{ group: string; items: AppNotification[] }>>(null);
  const hasLoadedOnceRef = useRef(false);
  useScrollToTopOnTabPress('bell', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

  function loadNotifications(showLoader = true) {
    if (showLoader) setLoading(true);
    notificationService.getNotifications()
      .then((data) => { setNotifications(data); setError(''); })
      .catch((e) => {
        // Only surface errors from the user-visible (loader-shown) path — the
        // silent background refresh (socket-triggered) shouldn't blow away an
        // already-populated, still-valid list on a transient failure.
        if (showLoader) setError(e instanceof Error ? e.message : t('notifications.loadFailedSub'));
      })
      .finally(() => setLoading(false));
  }

  // Reload every time the screen gains focus so new notifications always appear.
  // Only the very first load shows the skeleton — later refocuses (tab switch,
  // back from a notification's detail screen) reload silently in the
  // background so the list doesn't flash/blank on every navigation.
  useFocusEffect(useCallback(() => {
    const showLoader = !hasLoadedOnceRef.current;
    hasLoadedOnceRef.current = true;
    loadNotifications(showLoader);
  }, []));

  // Auto-refresh the moment connectivity is restored after being offline.
  const { reconnectedAt } = useNetworkStatus();
  useEffect(() => {
    if (reconnectedAt) loadNotifications(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconnectedAt]);

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

    const route = resolveNotificationRoute(n, isCreator);
    if (route) router.push(route);
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const groups = ['groupToday', 'groupThisWeek', 'groupEarlier'] as const;
  const grouped = groups
    .map((g) => ({ group: g, items: notifications.filter((n) => getGroup(n.timestamp) === g) }))
    .filter((g) => g.items.length > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      {unreadCount > 0 && (
        <View style={styles.headerRow}>
          <Pressable hitSlop={6} onPress={handleMarkAll} style={[styles.markAllBtn, { borderColor: C.brinjal1 }]}>
            <Text style={[styles.markAllText, { color: C.brinjal1 }]}>{t('notifications.markAllRead')}</Text>
          </Pressable>
        </View>
      )}

      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2, 3, 4, 5].map((i) => <ListRowSkeleton key={i} avatarSize={44} />)}
        </View>
      ) : error ? (
        <EmptyState
          faIcon="exclamation-triangle"
          title={t('notifications.loadFailedTitle')}
          subtitle={error}
          action={{ label: t('notifications.retry'), onPress: () => loadNotifications() }}
        />
      ) : (
        <FlatList
          ref={listRef}
          data={grouped}
          keyExtractor={(g) => g.group}
          renderItem={({ item: g }) => (
            <View>
              <Text style={[styles.groupLabel, { color: C.textSecondary }]}>{t(`notifications.${g.group}`)}</Text>
              <View>
                {g.items.map((n, idx) => (
                  <View key={n.id} style={idx > 0 && [styles.sep, { borderTopColor: C.border }]}>
                    <NotificationItem item={n} onPress={handlePress} />
                  </View>
                ))}
              </View>
            </View>
          )}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          contentContainerStyle={[styles.list, grouped.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              faIcon="bell"
              title={t('notifications.emptyTitle')}
              subtitle={t('notifications.emptySub')}
            />
          }
        />
      )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  headerRow:  { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  markAllBtn: { paddingHorizontal: 14, paddingVertical: 7, minHeight: 32, justifyContent: 'center', borderRadius: RADIUS.sm, borderWidth: 1 },
  markAllText:{ fontSize: 12, fontFamily: F.semibold },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { paddingBottom: 32 },
  listEmpty:  { flexGrow: 1 },

  groupLabel: { fontSize: 12, paddingTop: 20, paddingBottom: 8, paddingHorizontal: 16, textTransform: 'uppercase', letterSpacing: 0, fontFamily: F.bold },

  // Instagram-style: flat full-width row, no card border/radius/shadow
  item:       { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12, alignItems: 'flex-start' },
  sep:        { borderTopWidth: StyleSheet.hairlineWidth },

  iconWrap:   { width: 44, height: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },

  itemContent:{ flex: 1, gap: 4 },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle:  { fontSize: 14, flex: 1, fontFamily: F.bold, lineHeight: 21 },
  unreadDot:  { width: 7, height: 7, borderRadius: RADIUS.full, flexShrink: 0 },

  itemBody:   { fontSize: 13, lineHeight: 20, fontFamily: F.regular },
  itemTime:   { fontSize: 11, opacity: 0.55, fontFamily: F.regular, marginTop: 1 },
});
