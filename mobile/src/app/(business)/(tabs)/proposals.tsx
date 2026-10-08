import { useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { campaignService } from '@/services/campaign';
import { TabSlider } from '@/components/TabSlider';
import { EmptyState } from '@/components/EmptyState';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { useRefetchOnFocusIfStale } from '@/hooks/useRefetchOnFocusIfStale';
import { STALE } from '@/lib/queryClient';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { TabColors } from '@/utilities/tabColors';

type WS =
  | 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED'
  | 'DISPUTED' | 'REVISION' | 'CONTENT_OVERDUE' | 'CREATOR_FAILED';
type PS = 'UNPAID' | 'PAID' | 'RELEASED';

type Proposal = {
  id: string;
  status: 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired';
  workStatus: WS;
  // The application's own payment status — distinct from campaign.paymentStatus below,
  // which tracks the campaign record and is never updated by the pay/release flow.
  paymentStatus: PS;
  proposedRate: string;
  coverLetter: string;
  createdAt: string;
  campaign: {
    id: string; title: string; platforms: string[];
    campaignType: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
    paymentStatus: PS;
  };
  creator: { id: string; fullName: string; avatarUrl: string | null; location: string | null };
};

type CampaignCard = {
  id: string;
  title: string;
  platforms: string[];
  campaignType: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
  total: number;
  pending: number;
  shortlisted: number;
  accepted: number;
  rejected: number;
  expired: number;
  latestAt: string;
  acceptedWorkStatus: WS | null;
  acceptedPaymentStatus: PS;
  campaignPaid: boolean;
};

type TabKey = 'all' | 'paid' | 'free' | 'accepted';

const PAID_ACCENT = TabColors.brand.color;
const FREE_ACCENT = TabColors.info.color;
const PAID_LIGHT  = TabColors.brand.bg;
const FREE_LIGHT  = TabColors.info.bg;

function buildCampaignCards(proposals: Proposal[]): CampaignCard[] {
  const map = new Map<string, CampaignCard>();
  for (const p of proposals) {
    const { id, title, platforms, campaignType, paymentStatus } = p.campaign;
    if (!map.has(id)) {
      map.set(id, {
        id, title, platforms, campaignType,
        total: 0, pending: 0, shortlisted: 0, accepted: 0, rejected: 0, expired: 0,
        latestAt: p.createdAt,
        acceptedWorkStatus: null,
        acceptedPaymentStatus: 'UNPAID',
        campaignPaid: paymentStatus === 'PAID' || paymentStatus === 'RELEASED',
      });
    }
    const c = map.get(id)!;
    c.total++;
    c[p.status]++;
    if (p.createdAt > c.latestAt) c.latestAt = p.createdAt;
    if (p.status === 'accepted') {
      c.acceptedWorkStatus = p.workStatus;
      c.acceptedPaymentStatus = p.paymentStatus;
      c.campaignPaid = paymentStatus === 'PAID' || paymentStatus === 'RELEASED';
    }
  }
  return Array.from(map.values()).sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

// Mirrors the stage logic in activity-timeline.tsx so the card's status always
// agrees with the timeline (workStatus alone isn't enough — APPROVED needs
// paymentStatus to tell "awaiting release" from "released" from "completed").
function workspaceBtnConfig(ws: WS | null, paymentStatus: PS, t: TFn, isFree: boolean) {
  // A reported issue (see reportIssue) parks the job outside the normal flow
  // until Kolab support resolves it.
  if (ws === 'DISPUTED') return { label: t('proposal.business.workspaceIssueLabel'), sub: t('proposal.business.workspaceIssueSub'), color: '#EF4444', icon: 'exclamation-triangle' as const };
  // A free event has no work stage at all — approving a creator is the whole
  // flow — so it never reaches any of the progress/payment stages below. The
  // button is just a way into the approved list.
  if (isFree) return { label: t('proposal.business.workspaceFreeApprovedLabel'), sub: t('proposal.business.workspaceFreeApprovedSub'), color: '#16A34A', icon: 'users' as const };
  if (ws === 'COMPLETED') return { label: t('proposal.business.workspacePaymentReleasedLabel'), sub: t('proposal.business.workspacePaymentReleasedSub'), color: '#0EA5E9', icon: 'money-bill-alt' as const };
  if (ws === 'APPROVED' && paymentStatus === 'RELEASED')
                          return { label: t('proposal.business.workspacePaymentReleasedLabel'), sub: t('proposal.business.workspacePaymentReleasedSub'), color: '#0EA5E9', icon: 'money-bill-alt' as const };
  if (ws === 'APPROVED') return { label: t('proposal.business.workspaceAwaitingReleaseLabel'), sub: t('proposal.business.workspaceAwaitingReleaseSub'), color: '#EA580C', icon: 'hourglass' as const };
  if (ws === 'SUBMITTED') return { label: t('proposal.business.workspaceReviewLabel'), sub: t('proposal.business.workspaceReviewSub'), color: '#D97706', icon: 'eye' as const };
  if (ws === 'IN_PROGRESS') return { label: t('proposal.business.workspaceInProgressLabel'), sub: t('proposal.business.workspaceInProgressSub'), color: '#7C3AED', icon: 'brush' as const };
  return { label: t('proposal.business.workspaceDefaultLabel'), sub: '', color: '#6366F1', icon: 'folder-open' as const };
}

function CampaignEventCard({ item }: { item: CampaignCard }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const isFree   = item.campaignType === 'OPEN_EVENT';
  const accent   = isFree ? FREE_ACCENT : PAID_ACCENT;
  const accentBg = isFree ? FREE_LIGHT  : PAID_LIGHT;

  const platformLabel = item.platforms.join(', ');

  function handlePress() {
    router.push({
      pathname: '/(business)/campaign-proposals',
      params: {
        campaignId:    item.id,
        campaignTitle: item.title,
        campaignType:  item.campaignType,
        platform:      platformLabel,
      },
    });
  }

  // Same chip-card language as the My Work tab (campaigns.tsx): hairline-bordered
  // raised card, title on its own row, tag/stat chips, square footer buttons.
  const workspace = item.accepted > 0
    ? workspaceBtnConfig(item.acceptedWorkStatus, item.acceptedPaymentStatus, t, isFree)
    : null;

  return (
    <View style={styles.cardWrap}>
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Pressable
          style={({ pressed }) => [styles.cardContent, pressed && { opacity: 0.92 }]}
          onPress={handlePress}>
          <View style={styles.titleRow}>
            <Text style={[styles.eventTitle, { color: C.text }]} numberOfLines={2}>{item.title}</Text>
            <FontAwesome5 name="chevron-right" solid size={14} color={C.textSecondary} style={styles.titleChevron} />
          </View>

          <View style={styles.tagContainer}>
            <View style={[styles.tagBadge, { backgroundColor: accentBg }]}>
              <FontAwesome5 name={isFree ? 'gift' : 'money-bill-wave'} size={9} color={accent} solid />
              <Text style={[styles.tagBadgeText, { color: accent }]}>
                {isFree ? t('proposal.business.typeFreeEvent') : t('proposal.business.typePaidCampaign')}
              </Text>
            </View>
            {platformLabel ? (
              <View style={[styles.tagBadge, { backgroundColor: C.background }]}>
                <Text style={[styles.tagBadgeText, { color: C.textSecondary }]} numberOfLines={1}>{platformLabel}</Text>
              </View>
            ) : null}
            <View style={[styles.tagBadge, { backgroundColor: C.background }]}>
              <FontAwesome5 name="clock" size={9} color={C.textSecondary} />
              <Text style={[styles.tagBadgeText, { color: C.textSecondary }]}>{timeAgo(item.latestAt)}</Text>
            </View>
          </View>

          <View style={[styles.tagContainer, styles.statsRow]}>
            <View style={[styles.statChip, { backgroundColor: C.background }]}>
              <FontAwesome5 name="users" solid size={12} color={C.textSecondary} />
              <Text style={[styles.statText, { color: C.textSecondary }]} numberOfLines={1}>
                <Text style={[styles.statNum, { color: C.text }]}>{item.total}</Text> {t('proposal.business.statTotal')}
              </Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: TabColors.warning.bg }]}>
              <Text style={[styles.statText, { color: TabColors.warning.color }]} numberOfLines={1}>
                <Text style={styles.statNum}>{item.pending}</Text> {t('proposal.business.statPending')}
              </Text>
            </View>
            <View style={[styles.statChip, { backgroundColor: TabColors.positive.bg }]}>
              <Text style={[styles.statText, { color: TabColors.positive.color }]} numberOfLines={1}>
                <Text style={styles.statNum}>{item.accepted}</Text> {isFree ? t('proposal.business.statApproved') : t('proposal.business.statAccepted')}
              </Text>
            </View>
            {item.rejected > 0 && (
              <View style={[styles.statChip, { backgroundColor: TabColors.danger.bg }]}>
                <Text style={[styles.statText, { color: TabColors.danger.color }]} numberOfLines={1}>
                  <Text style={styles.statNum}>{item.rejected}</Text> {t('proposal.business.statDeclined')}
                </Text>
              </View>
            )}
          </View>

          {/* Pending action nudge */}
          {item.pending > 0 && (
            <View style={[styles.tagBadge, styles.nudge, { backgroundColor: TabColors.warning.bg }]}>
              <FontAwesome5 name="clock" size={11} color={TabColors.warning.color} />
              <Text style={[styles.tagBadgeText, { color: TabColors.warning.color }]}>
                {t('proposal.business.nudge', { n: item.pending })}
              </Text>
            </View>
          )}
        </Pressable>

        {/* Footer — project status once someone is accepted, otherwise a plain
            way into the proposal list. */}
        <View style={styles.buttonContainer}>
          {workspace ? (
            <Pressable
              style={({ pressed }) => [styles.buttonPrimary, { backgroundColor: workspace.color }, pressed && { opacity: 0.88 }]}
              onPress={handlePress}>
              <FontAwesome5 name={workspace.icon} size={13} color="#fff" />
              <View style={styles.btnTextBlock}>
                <Text style={styles.buttonTextPrimary} numberOfLines={1}>{workspace.label}</Text>
                {workspace.sub ? <Text style={styles.buttonSubPrimary} numberOfLines={1}>{workspace.sub}</Text> : null}
              </View>
              <FontAwesome5 name="chevron-right" solid size={12} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.buttonPrimary, { backgroundColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
              onPress={handlePress}>
              <Text style={styles.buttonTextPrimary} numberOfLines={1}>
                {t(item.total === 1 ? 'campaigns.viewProposalsBtn' : 'campaigns.viewProposalsBtnPlural', { n: item.total })}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const PAGE_SIZE = 30;

type ProposalsPage = Awaited<ReturnType<typeof campaignService.getBusinessProposals>>;
const EMPTY_PROPOSALS: Proposal[] = [];

function flattenProposals(pages: ProposalsPage[] | undefined): Proposal[] {
  if (!pages) return EMPTY_PROPOSALS;
  const seen = new Set<string>();
  const out: Proposal[] = [];
  for (const page of pages) for (const p of page.proposals) {
    if (!seen.has(p.id)) { seen.add(p.id); out.push(p); }
  }
  return out;
}

export default function ProposalsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<CampaignCard>>(null);
  useScrollToTopOnTabPress('proposals', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

  // These 4 tabs are overlapping categorical views over the SAME set of
  // applications (Paid/Free split by campaign type, Accepted by application
  // status, All = everything) rather than independent partitions — a per-
  // campaign card's stats (total/pending/accepted/rejected) need the full
  // picture for that campaign, so this is ONE shared, growing, deduped cache
  // that every tab's cards are derived from client-side, rather than giving
  // each tab its own server cursor (which would starve a card of the
  // sibling-application counts it needs to render correctly).
  const proposalsQuery = useInfiniteQuery({
    queryKey: ['proposals', 'business', 'paginated'],
    queryFn: ({ pageParam }) => campaignService.getBusinessProposals({ page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.proposals.length, 0);
      return loaded < last.total ? all.length + 1 : undefined;
    },
    staleTime: STALE.list,
  });
  useRefetchOnFocusIfStale(proposalsQuery);

  const proposals = flattenProposals(proposalsQuery.data?.pages);
  const loading = proposalsQuery.isPending;
  const loadingMore = proposalsQuery.isFetchingNextPage;

  async function onRefresh() {
    setRefreshing(true);
    try { await proposalsQuery.refetch(); } finally { setRefreshing(false); }
  }

  function loadMore() {
    if (proposalsQuery.hasNextPage && !proposalsQuery.isFetchingNextPage) void proposalsQuery.fetchNextPage();
  }

  const allCards      = buildCampaignCards(proposals);
  const paidCards     = allCards.filter((c) => c.campaignType === 'PAID_CAMPAIGN');
  const freeCards     = allCards.filter((c) => c.campaignType === 'OPEN_EVENT');
  const acceptedCards = allCards.filter((c) => c.accepted > 0);

  const cards =
    activeTab === 'paid'     ? paidCards     :
    activeTab === 'free'     ? freeCards     :
    activeTab === 'accepted' ? acceptedCards :
    allCards;

  const tabs = [
    { key: 'all',      label: t('proposal.business.tabAll'),      icon: 'layer-group'          as const, count: allCards.length,      color: TabColors.neutral.color },
    { key: 'paid',     label: t('proposal.business.tabPaid'),     icon: 'money-bill-alt'             as const, count: paidCards.length,     color: PAID_ACCENT },
    { key: 'free',     label: t('proposal.business.tabFree'),     icon: 'gift'             as const, count: freeCards.length,     color: FREE_ACCENT },
    { key: 'accepted', label: t('proposal.business.tabAccepted'), icon: 'check-circle' as const, count: acceptedCards.length, color: TabColors.positive.color },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      <View style={styles.headerContent}>
        <Text style={[styles.pageTitle, { color: C.text }]}>{t('proposal.business.headerTitle')}</Text>
        <Text style={[styles.pageSub, { color: C.textSecondary }]}>{t('proposal.business.headerSub')}</Text>
      </View>

      {/* Tab bar */}
      <View style={[styles.filterRow, { backgroundColor: C.surface }]}>
        <TabSlider
          tabs={tabs}
          active={activeTab}
          onChange={(k) => setActiveTab(k as TabKey)}
        />
      </View>

      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3, 4].map((i) => <ListRowSkeleton key={i} avatarRadius={RADIUS.md} withBadge />)}
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={cards}
          keyExtractor={(c) => c.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, cards.length === 0 && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
          renderItem={({ item }) => <CampaignEventCard item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          ListFooterComponent={loadingMore ? <View style={styles.footerLoading}><ActivityIndicator size="small" color={C.brinjal1} /></View> : null}
          ListEmptyComponent={
            <EmptyState
              faIcon={activeTab === 'accepted' ? 'check-circle' :
                      activeTab === 'paid'     ? 'money-bill-wave' :
                      activeTab === 'free'     ? 'gift' :
                      'clipboard-list'}
              title={t('proposal.business.emptyTitle')}
              subtitle={
                activeTab === 'paid'     ? t('proposal.business.emptyPaidSub')     :
                activeTab === 'free'     ? t('proposal.business.emptyFreeSub')     :
                activeTab === 'accepted' ? t('proposal.business.emptyAcceptedSub') :
                t('proposal.business.emptyAllSub')
              }
            />
          }
        />
      )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  headerContent:  { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md, paddingBottom: SPACING.md },
  pageTitle:      { fontSize: 20, fontFamily: F.bold, lineHeight: 30 },
  pageSub:        { fontSize: 13, fontFamily: F.regular, marginTop: 2 },

  filterRow: { ...SHADOW.card },

  list:      { paddingTop: SPACING.lg, paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxxl },
  listEmpty: { flexGrow: 1 },
  footerLoading: { paddingVertical: 20 },

  // Card — mirrors the My Work card in campaigns.tsx.
  cardWrap: { borderRadius: RADIUS.lg, ...SHADOW.raised },
  card:     { borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1 },
  cardContent: { padding: SPACING.lg, paddingBottom: SPACING.sm, gap: SPACING.sm },

  titleRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  titleChevron: { marginTop: 6 },
  eventTitle:   { flex: 1, fontSize: FONT_SIZE.lg, fontFamily: F.bold, lineHeight: 26 },

  tagContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, gap: 6 },
  tagBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 4, flexShrink: 1 },
  tagBadgeText: { fontSize: FONT_SIZE.xs, fontFamily: F.bold },

  statsRow: { marginTop: 2 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 7, flexShrink: 1, minWidth: 0 },
  statText: { fontSize: FONT_SIZE.sm, fontFamily: F.medium },
  statNum:  { fontFamily: F.bold },

  nudge: { alignSelf: 'flex-start' },

  buttonContainer:   { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingTop: SPACING.xs, paddingBottom: SPACING.md },
  buttonPrimary:     { flex: 1, flexDirection: 'row', minHeight: 42, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  btnTextBlock:      { flexShrink: 1, alignItems: 'center' },
  buttonTextPrimary: { color: '#fff', fontSize: FONT_SIZE.sm, fontFamily: F.bold },
  buttonSubPrimary:  { color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZE.xs, fontFamily: F.regular },

});
