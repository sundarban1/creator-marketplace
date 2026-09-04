import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { useRefetchOnFocusIfStale } from '@/hooks/useRefetchOnFocusIfStale';
import { STALE } from '@/lib/queryClient';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { useAuth } from '@/context/AuthContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { useNotificationBadge } from '@/context/NotificationContext';
import { notificationService } from '@/services/notifications';
import { getSocket } from '@/lib/socket';
import { F, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';
import { resolveNotificationRoute } from '@/utilities/notificationRouting';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import type { AppNotification } from '@/types';

const EMPTY_NOTIFICATIONS: AppNotification[] = [];

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
  project_completed:        { icon: 'flag-checkered',  iconColor: '#10B981', iconBg: '#ECFDF5', accentColor: '#10B981', labelKey: 'notifications.typeProjectComplete' },
  review_received:          { icon: 'star',            iconColor: '#F59E0B', iconBg: '#FFFBEB', accentColor: '#F59E0B', labelKey: 'notifications.typeReviewReceived' },
  message_request_accepted: { icon: 'comment-dots', iconColor: '#3B82F6', iconBg: '#EFF6FF', accentColor: '#3B82F6', labelKey: 'notifications.typeConnected'     },
  business_favorited:       { icon: 'heart',               iconColor: '#EF4444', iconBg: '#FFF1F2', accentColor: '#EF4444', labelKey: 'notifications.typeFavorited'     },
  creator_saved:            { icon: 'bookmark',            iconColor: '#7C3AED', iconBg: '#F5F3FF', accentColor: '#7C3AED', labelKey: 'notifications.typeSaved'         },
  campaign_invitation:      { icon: 'envelope',                iconColor: '#0891B2', iconBg: '#E0F2FE', accentColor: '#0891B2', labelKey: 'notifications.typeInvited'       },
  invitation_response:      { icon: 'envelope-open-text',      iconColor: '#0891B2', iconBg: '#E0F2FE', accentColor: '#0891B2', labelKey: 'notifications.typeInvitationResponse' },
  account_verified:         { icon: 'shield-alt',    iconColor: '#10B981', iconBg: '#ECFDF5', accentColor: '#10B981', labelKey: 'notifications.typeVerified'      },
  verification_rejected:    { icon: 'shield-alt',      iconColor: '#EF4444', iconBg: '#FEF2F2', accentColor: '#EF4444', labelKey: 'notifications.typeVerificationRejected' },
  proposal_expired:         { icon: 'hourglass-end',   iconColor: '#6B7280', iconBg: '#F3F4F6', accentColor: '#6B7280', labelKey: 'notifications.typeProposalExpired' },
  event_expired:            { icon: 'hourglass-end',   iconColor: '#6B7280', iconBg: '#F3F4F6', accentColor: '#6B7280', labelKey: 'notifications.typeEventExpired'  },
  team_invitation:          { icon: 'user-plus',       iconColor: '#0D9488', iconBg: '#F0FDFA', accentColor: '#0D9488', labelKey: 'notifications.typeTeamInvitation' },
  team_invitation_response: { icon: 'users',           iconColor: '#0D9488', iconBg: '#F0FDFA', accentColor: '#0D9488', labelKey: 'notifications.typeTeamInvitationResponse' },
  withdrawal_processing:    { icon: 'sync-alt',        iconColor: '#F59E0B', iconBg: '#FFFBEB', accentColor: '#F59E0B', labelKey: 'notifications.typeWithdrawalProcessing' },
  withdrawal_paid:          { icon: 'money-check-alt',  iconColor: '#10B981', iconBg: '#ECFDF5', accentColor: '#10B981', labelKey: 'notifications.typeWithdrawalPaid' },
  withdrawal_rejected:      { icon: 'times-circle',     iconColor: '#EF4444', iconBg: '#FEF2F2', accentColor: '#EF4444', labelKey: 'notifications.typeWithdrawalRejected' },
  event_question_asked:     { icon: 'question-circle',  iconColor: '#0891B2', iconBg: '#E0F2FE', accentColor: '#0891B2', labelKey: 'notifications.typeEventQuestionAsked' },
  event_question_answered:  { icon: 'comment-dots',     iconColor: '#10B981', iconBg: '#ECFDF5', accentColor: '#10B981', labelKey: 'notifications.typeEventQuestionAnswered' },
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
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<{ group: string; items: AppNotification[] }>>(null);
  useScrollToTopOnTabPress('bell', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

  // ── Server state — cache-first, background refresh (see queryClient.ts) ────
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications(),
    staleTime: STALE.frequent,
  });
  useRefetchOnFocusIfStale(notificationsQuery);

  // A pushed notification's socket payload isn't reliably shaped (a fanned-out
  // batch — e.g. "new campaign" to a whole cohort — sends just { userId }, not
  // the full row; see notification.service.ts's createMany), so this can't
  // safely splice the cache — it invalidates and lets the query refetch.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => { void queryClient.invalidateQueries({ queryKey: ['notifications'] }); };
    socket.on('notification:new', handler);
    return () => { socket.off('notification:new', handler); };
  }, [queryClient]);

  const notifications = notificationsQuery.data ?? EMPTY_NOTIFICATIONS;
  const loading = notificationsQuery.isPending;
  const error = notificationsQuery.isError && notifications.length === 0
    ? (notificationsQuery.error instanceof Error ? notificationsQuery.error.message : t('notifications.loadFailedSub'))
    : '';

  async function handleMarkAll() {
    await notificationService.markAllRead();
    queryClient.setQueryData<AppNotification[]>(['notifications'], (prev) => prev?.map((n) => ({ ...n, isRead: true })));
    clearBadge(); // zero out the bell badge
  }

  async function handlePress(id: string) {
    const n = notifications.find((n) => n.id === id);
    const wasUnread = !!n && !n.isRead;
    await notificationService.markAsRead(id);
    queryClient.setQueryData<AppNotification[]>(['notifications'], (prev) => prev?.map((row) => (row.id === id ? { ...row, isRead: true } : row)));
    if (wasUnread) decrementBadge();
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
          action={{ label: t('notifications.retry'), onPress: () => notificationsQuery.refetch() }}
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
  headerRow:  { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md, paddingBottom: SPACING.md },
  markAllBtn: { paddingHorizontal: 14, paddingVertical: 7, minHeight: 32, justifyContent: 'center', borderRadius: RADIUS.sm, borderWidth: 1 },
  markAllText:{ fontSize: 12, fontFamily: F.semibold },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:       { paddingBottom: SPACING.xxxl },
  listEmpty:  { flexGrow: 1 },

  groupLabel: { fontSize: 12, paddingTop: 20, paddingBottom: 8, paddingHorizontal: SCREEN_GUTTER, textTransform: 'uppercase', letterSpacing: 0, fontFamily: F.bold },

  // Instagram-style: flat full-width row, no card border/radius/shadow
  item:       { flexDirection: 'row', paddingHorizontal: SCREEN_GUTTER, paddingVertical: 12, gap: 12, alignItems: 'flex-start' },
  sep:        { borderTopWidth: StyleSheet.hairlineWidth },

  iconWrap:   { width: 44, height: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 1 },

  itemContent:{ flex: 1, gap: 4 },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemTitle:  { fontSize: 14, flex: 1, fontFamily: F.bold, lineHeight: 21 },
  unreadDot:  { width: 7, height: 7, borderRadius: RADIUS.full, flexShrink: 0 },

  itemBody:   { fontSize: 13, lineHeight: 20, fontFamily: F.regular },
  itemTime:   { fontSize: 11, opacity: 0.55, fontFamily: F.regular, marginTop: 1 },
});
