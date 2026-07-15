import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { campaignService } from '@/services/campaign';
import { TabSlider } from '@/components/TabSlider';
import { EmptyState } from '@/components/EmptyState';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { F } from '@/utilities/constants';
import { TabColors } from '@/utilities/tabColors';

type WS = 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED';
type PS = 'UNPAID' | 'PAID' | 'RELEASED';

type Proposal = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
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
  accepted: number;
  rejected: number;
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
        total: 0, pending: 0, accepted: 0, rejected: 0,
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
function workspaceBtnConfig(ws: WS | null, paymentStatus: PS, t: TFn) {
  if (ws === 'COMPLETED') return { label: t('proposal.business.workspacePaymentReleasedLabel'), sub: t('proposal.business.workspacePaymentReleasedSub'), color: '#0EA5E9', icon: 'cash' as const };
  if (ws === 'APPROVED' && paymentStatus === 'RELEASED')
                          return { label: t('proposal.business.workspacePaymentReleasedLabel'), sub: t('proposal.business.workspacePaymentReleasedSub'), color: '#0EA5E9', icon: 'cash' as const };
  if (ws === 'APPROVED') return { label: t('proposal.business.workspaceAwaitingReleaseLabel'), sub: t('proposal.business.workspaceAwaitingReleaseSub'), color: '#EA580C', icon: 'hourglass-outline' as const };
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

  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      style={[styles.card, { backgroundColor: C.surface, borderLeftColor: accent }]}
      onPress={handlePress}>
      {/* Type + platform row */}
      <View style={styles.cardTopRow}>
        <View style={[styles.typeBadge, { backgroundColor: accentBg }]}>
          <Ionicons name={isFree ? 'gift-outline' : 'cash-outline'} size={12} color={accent} />
          <Text style={[styles.typeBadgeText, { color: accent }]}>
            {isFree ? t('proposal.business.typeFreeEvent') : t('proposal.business.typePaidCampaign')}
          </Text>
        </View>
        {platformLabel ? (
          <View style={[styles.platformPill, { backgroundColor: C.background }]}>
            <Text style={[styles.platformText, { color: C.textSecondary }]}>{platformLabel}</Text>
          </View>
        ) : null}
        <View style={styles.cardTopSpacer} />
        <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />
      </View>

      {/* Title */}
      <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={2}>
        {item.title}
      </Text>

      {/* Stats row */}
      <View style={[styles.statsRow, { borderTopColor: C.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: C.text }]}>{item.total}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('proposal.business.statTotal')}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: C.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: TabColors.warning.color }]}>{item.pending}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('proposal.business.statPending')}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: C.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: TabColors.positive.color }]}>{item.accepted}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>{isFree ? t('proposal.business.statApproved') : t('proposal.business.statAccepted')}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: C.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: TabColors.danger.color }]}>{item.rejected}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t('proposal.business.statDeclined')}</Text>
        </View>
      </View>

      {/* Pending action nudge */}
      {item.pending > 0 && (
        <View style={[styles.nudge, { backgroundColor: TabColors.warning.bg }]}>
          <Ionicons name="time-outline" size={13} color={TabColors.warning.color} />
          <Text style={[styles.nudgeText, { color: TabColors.warning.color }]}>
            {t('proposal.business.nudge', { n: item.pending })}
          </Text>
        </View>
      )}

      {/* Dynamic project status button for accepted campaigns */}
      {item.accepted > 0 && (() => {
        const cfg = workspaceBtnConfig(item.acceptedWorkStatus, item.acceptedPaymentStatus, t);
        return (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={({ pressed }) => [styles.startWorkBtn, { backgroundColor: cfg.color, opacity: pressed ? 0.88 : 1 }]}
            onPress={(e) => {
              e.stopPropagation();
              router.push({
                pathname: '/(business)/campaign-proposals',
                params: {
                  campaignId:    item.id,
                  campaignTitle: item.title,
                  campaignType:  item.campaignType,
                  platform:      platformLabel,
                },
              });
            }}>
            {/* Icon badge */}
            <View style={styles.btnIconBadge}>
              <Ionicons name={cfg.icon} size={20} color="#fff" />
            </View>
            {/* Text */}
            <View style={styles.btnTextBlock}>
              <Text style={styles.startWorkBtnTxt}>{cfg.label}</Text>
              {cfg.sub ? <Text style={styles.startWorkBtnSub}>{cfg.sub}</Text> : null}
            </View>
            {/* Arrow */}
            <View style={styles.btnArrow}>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </View>
          </Pressable>
        );
      })()}
    </Pressable>
  );
}

const PAGE_SIZE = 30;

export default function ProposalsScreen() {
  const C = useAppColors();
  const { t, languageVersion } = useLanguage();
  // These 4 tabs are overlapping categorical views over the SAME set of
  // applications (Paid/Free split by campaign type, Accepted by application
  // status, All = everything) rather than independent partitions — a per-
  // campaign card's stats (total/pending/accepted/rejected) need the full
  // picture for that campaign, so we paginate ONE shared, growing, deduped
  // application list and derive every tab's cards from it client-side,
  // rather than giving each tab its own server cursor (which would starve
  // a card of the sibling-application counts it needs to render correctly).
  const [proposals, setProposals]   = useState<Proposal[]>([]);
  const [page, setPage]             = useState(0);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab]   = useState<TabKey>('all');
  const loadingMoreRef = useRef(false);
  const listRef = useRef<FlatList<CampaignCard>>(null);
  useScrollToTopOnTabPress('proposals', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

  async function loadPage(p: number, replace: boolean) {
    if (!replace) setLoadingMore(true);
    const { proposals: data, total: newTotal } = await campaignService.getBusinessProposals({ page: p, limit: PAGE_SIZE });
    setProposals((prev) => {
      const prevItems = replace ? [] : prev;
      const seen = new Set(prevItems.map((x) => x.id));
      return [...prevItems, ...data.filter((x) => !seen.has(x.id))];
    });
    setTotal(newTotal);
    setPage(p);
  }

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      await loadPage(1, true);
    } catch { /* empty state shows */ }
    finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }

  useEffect(() => { void load(); }, [languageVersion]);
  const onRefresh = useCallback(() => void load(true), []);

  function loadMore() {
    if (loadingMoreRef.current || loadingMore || proposals.length >= total) return;
    loadingMoreRef.current = true;
    void loadPage(page + 1, false).finally(() => { loadingMoreRef.current = false; setLoadingMore(false); });
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
    { key: 'all',      label: t('proposal.business.tabAll'),      icon: 'layers-outline'          as const, count: allCards.length,      color: TabColors.neutral.color },
    { key: 'paid',     label: t('proposal.business.tabPaid'),     icon: 'cash-outline'             as const, count: paidCards.length,     color: PAID_ACCENT },
    { key: 'free',     label: t('proposal.business.tabFree'),     icon: 'gift-outline'             as const, count: freeCards.length,     color: FREE_ACCENT },
    { key: 'accepted', label: t('proposal.business.tabAccepted'), icon: 'checkmark-circle-outline' as const, count: acceptedCards.length, color: TabColors.positive.color },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient
        colors={['#312e81', '#4f46e5', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.pageTitle}>{t('proposal.business.headerTitle')}</Text>
          <Text style={styles.pageSub}>{t('proposal.business.headerSub')}</Text>
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <View style={[styles.filterRow, { backgroundColor: C.surface }]}>
        <TabSlider
          tabs={tabs}
          active={activeTab}
          onChange={(k) => setActiveTab(k as TabKey)}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  gradientHeader: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },
  headerContent:  { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  pageTitle:      { fontSize: 20, color: '#fff', fontFamily: F.bold, lineHeight: 24 },
  pageSub:        { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontFamily: F.regular, marginTop: 2 },

  filterRow: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },

  list:      { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },
  footerLoading: { paddingVertical: 20 },

  card: {
    borderRadius: 16,
    borderLeftWidth: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  cardTopSpacer: { flex: 1 },
  typeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 11, fontFamily: F.bold },
  platformPill:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  platformText:  { fontSize: 11, fontFamily: F.semibold },

  cardTitle: { fontSize: 15, lineHeight: 20, paddingHorizontal: 16, paddingBottom: 10, fontFamily: F.bold },

  statsRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  statItem:    { flex: 1, alignItems: 'center', gap: 2 },
  statNum:     { fontSize: 16, fontFamily: F.bold },
  statLabel:   { fontSize: 11, fontFamily: F.medium },
  statDivider: { width: StyleSheet.hairlineWidth, height: 28 },

  nudge:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
  nudgeText: { fontSize: 12, fontFamily: F.semibold },

  startWorkBtn:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 14, marginTop: 6, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14 },
  btnIconBadge:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  btnTextBlock:     { flex: 1, gap: 2 },
  startWorkBtnTxt:  { fontSize: 14, color: '#fff', fontFamily: F.bold },
  startWorkBtnSub:  { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily: F.regular },
  btnArrow:         { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },

});
