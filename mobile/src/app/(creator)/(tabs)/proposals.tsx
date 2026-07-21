import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useRef, useState } from 'react';
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
import { EmptyState } from '@/components/EmptyState';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { TabSlider } from '@/components/TabSlider';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { campaignService } from '@/services/campaign';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { TabColors } from '@/utilities/tabColors';

// ─── Types ───────────────────────────────────────────────────────────────────

type WS = 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED';
type AppStatus = 'pending' | 'accepted' | 'rejected';
type TabKey = 'all' | AppStatus;

type Proposal = {
  id:              string;
  campaignId:      string;
  campaignTitle:   string;
  brand:           string;
  businessId:      string;
  status:          AppStatus;
  submittedAt:     string;
  coverLetter:     string;
  proposedRate:    string;
  proposedRateRaw: number;
  workStatus:      WS;
  campaignType:    'PAID_CAMPAIGN' | 'OPEN_EVENT';
  paymentStatus:   'UNPAID' | 'PAID' | 'RELEASED';
  featureImageUrl: string | undefined;
};

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:  { labelKey: 'proposal.creator.statusPending'  as const, icon: 'time'             as const, color: TabColors.warning.color,  bg: TabColors.warning.bg },
  accepted: { labelKey: 'proposal.creator.statusAccepted' as const, icon: 'checkmark-circle' as const, color: TabColors.positive.color, bg: TabColors.positive.bg },
  rejected: { labelKey: 'proposal.creator.statusRejected' as const, icon: 'close-circle'     as const, color: TabColors.danger.color,   bg: TabColors.danger.bg },
};

const TRACK_CFG: Record<WS, { labelKey: string; icon: keyof typeof Ionicons.glyphMap; color: string; subKey: string }> = {
  NONE:        { labelKey: 'proposal.creator.trackNoneLabel',        icon: 'navigate',       color: '#C2410C', subKey: 'proposal.creator.trackNoneSub'        },
  IN_PROGRESS: { labelKey: 'proposal.creator.trackInProgressLabel',  icon: 'brush',          color: '#C2410C', subKey: 'proposal.creator.trackInProgressSub'  },
  SUBMITTED:   { labelKey: 'proposal.creator.trackSubmittedLabel',   icon: 'hourglass',      color: '#B45309', subKey: 'proposal.creator.trackSubmittedSub'   },
  // Approval no longer releases payment automatically — an admin releases it
  // manually, so ProposalCard overrides this "sub" based on paymentStatus
  // (pending release, awaiting verification, or fully complete).
  APPROVED:    { labelKey: 'proposal.creator.trackApprovedLabel',    icon: 'trophy',         color: '#16A34A', subKey: 'proposal.creator.trackApprovedSub'    },
  COMPLETED:   { labelKey: 'proposal.creator.trackCompletedLabel',   icon: 'checkmark-done', color: '#16A34A', subKey: 'proposal.creator.trackCompletedSub'   },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string, t: TFn): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return t('proposal.creator.timeToday');
  if (d === 1) return t('proposal.creator.timeYesterday');
  if (d < 7)  return t('proposal.creator.timeDaysAgo', { n: d });
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function brandInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

// ─── Proposal Card ────────────────────────────────────────────────────────────

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const cfg        = STATUS_CFG[proposal.status];
  const trackCfg   = proposal.workStatus === 'APPROVED' && proposal.paymentStatus === 'RELEASED'
    ? { ...TRACK_CFG.APPROVED, labelKey: 'proposal.creator.trackApprovedReleasedLabel', subKey: 'proposal.creator.trackApprovedReleasedSub' }
    : proposal.workStatus === 'APPROVED'
    ? { ...TRACK_CFG.APPROVED, labelKey: 'proposal.creator.trackApprovedPendingLabel', subKey: 'proposal.creator.trackApprovedPendingSub' }
    : TRACK_CFG[proposal.workStatus];
  const isFree     = proposal.campaignType === 'OPEN_EVENT';
  const accentColor = cfg.color;

  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
      onPress={() => router.push({ pathname: '/campaign-detail', params: { campaignId: proposal.campaignId } } as never)}>

      {/* Left accent strip */}
      <View style={[styles.leftStrip, { backgroundColor: accentColor }]} />

      <View style={styles.cardBody}>

        {/* ── Top: brand avatar + names + status pill ── */}
        <View style={styles.topRow}>
          <View style={[styles.brandAvatar, { backgroundColor: `${accentColor}18` }]}>
            <Text style={[styles.brandInitials, { color: accentColor }]}>{brandInitials(proposal.brand)}</Text>
            {proposal.featureImageUrl && (
              <Image source={{ uri: proposal.featureImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            )}
          </View>
          <View style={styles.brandBlock}>
            <Text style={[styles.brandName, { color: C.text }]} numberOfLines={1}>{proposal.brand}</Text>
            <Text style={[styles.campaignTitle, { color: C.textSecondary }]} numberOfLines={1}>{proposal.campaignTitle}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={11} color={cfg.color} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{t(cfg.labelKey)}</Text>
          </View>
        </View>

        {/* ── Cover letter preview ── */}
        {!!proposal.coverLetter && (
          <View style={[styles.coverRow, { backgroundColor: C.background, borderColor: C.border }]}>
            <Ionicons name="chatbox-ellipses-outline" size={13} color={C.textSecondary} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.coverText, { color: C.textSecondary }]} numberOfLines={expanded ? undefined : 2}>
                {proposal.coverLetter}
              </Text>
              {proposal.coverLetter.length > 100 && (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} hitSlop={8} onPress={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}>
                  <Text style={[styles.seeMore, { color: accentColor }]}>
                    {expanded ? t('proposal.creator.seeLess') : t('proposal.creator.seeMore')}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* ── Meta row ── */}
        <View style={styles.metaRow}>
          <View style={[styles.metaChip, { backgroundColor: C.background }]}>
            <Ionicons name={isFree ? 'gift-outline' : 'cash-outline'} size={12} color={accentColor} />
            {isFree ? (
              <Text style={[styles.metaChipTxt, { color: accentColor }]}>{t('proposal.creator.freeEventTag')}</Text>
            ) : (
              <Text style={[styles.metaChipTxt, { color: accentColor }]}>{proposal.proposedRate}</Text>
            )}
          </View>
          <View style={[styles.metaChip, { backgroundColor: C.background }]}>
            <Ionicons name="calendar-outline" size={12} color={C.textSecondary} />
            <Text style={[styles.metaChipTxt, { color: C.textSecondary }]}>{timeAgo(proposal.submittedAt, t)}</Text>
          </View>
        </View>

        {/* ── Accepted: workspace CTA or invited banner ── */}
        {proposal.status === 'accepted' && (
          isFree ? (
            <View style={[styles.invitedBanner, { borderColor: `${accentColor}40` }]}>
              <View style={[styles.invitedIcon, { backgroundColor: `${accentColor}18` }]}>
                <Ionicons name="checkmark-circle" size={20} color={accentColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.invitedTitle, { color: accentColor }]}>{t('proposal.creator.invitedTitle')}</Text>
                <Text style={[styles.invitedSub, { color: C.textSecondary }]}>{t('proposal.creator.invitedSub')}</Text>
              </View>
            </View>
          ) : (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.trackBtn, { backgroundColor: trackCfg.color }]}
              onPress={(e) => {
                e.stopPropagation();
                router.push({
                  pathname: '/(business)/activity-timeline',
                  params: {
                    campaignId:    proposal.campaignId,
                    campaignTitle: proposal.campaignTitle,
                    role:          'CREATOR',
                    businessId:    proposal.businessId,
                    brand:         proposal.brand,
                  },
                });
              }}>
              <View style={styles.trackBtnIcon}>
                <Ionicons name={trackCfg.icon} size={17} color="#fff" />
              </View>
              <View style={styles.trackBtnText}>
                <Text style={styles.trackBtnLabel}>{t(trackCfg.labelKey)}</Text>
                <Text style={styles.trackBtnSub}>{t(trackCfg.subKey)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.6)" />
            </Pressable>
          )
        )}

        {/* ── Pending / rejected footer ── */}
        {proposal.status !== 'accepted' && (
          <View style={[styles.footerRow, { borderTopColor: C.border }]}>
            <Text style={[styles.footerTxt, { color: cfg.color }]}>
              {proposal.status === 'pending' ? 'Awaiting business response' : 'Application was not accepted'}
            </Text>
            <Ionicons name="chevron-forward" size={13} color={C.textSecondary} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type TabState = { items: Proposal[]; page: number; total: number; loadingMore: boolean; loaded: boolean };
const emptyTabState = (): TabState => ({ items: [], page: 0, total: 0, loadingMore: false, loaded: false });

const STATUS_PARAM: Record<TabKey, 'PENDING' | 'ACCEPTED' | 'REJECTED' | undefined> = {
  all: undefined, pending: 'PENDING', accepted: 'ACCEPTED', rejected: 'REJECTED',
};

export default function ProposalsScreen() {
  const { t } = useLanguage();
  const C = useAppColors();
  const [tabData, setTabData] = useState<Record<TabKey, TabState>>({
    all: emptyTabState(), pending: emptyTabState(), accepted: emptyTabState(), rejected: emptyTabState(),
  });
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const loadingMoreRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const listRef = useRef<FlatList<Proposal>>(null);
  useScrollToTopOnTabPress('proposals', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

  async function loadTab(tab: TabKey, page: number, replace: boolean) {
    if (replace) { setError(''); } else { setTabData((prev) => ({ ...prev, [tab]: { ...prev[tab], loadingMore: true } })); }
    try {
      const { proposals, total } = await campaignService.getMyApplications({
        page, limit: PAGE_SIZE, status: STATUS_PARAM[tab],
      });
      setTabData((prev) => {
        const prevItems = replace ? [] : prev[tab].items;
        const seen = new Set(prevItems.map((p) => p.id));
        const merged = [...prevItems, ...proposals.filter((p) => !seen.has(p.id))];
        return { ...prev, [tab]: { items: merged, page, total, loadingMore: false, loaded: true } };
      });
    } catch (e) {
      if (replace) setError(e instanceof Error ? e.message : 'Failed to load proposals');
    } finally {
      loadingMoreRef.current = false;
      if (replace) setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => {
    // Only show the full-screen skeleton on the very first load. Later
    // focuses (e.g. coming back from campaign-detail) refresh the "all" tab
    // silently in the background instead of flashing the skeleton again —
    // on a slow connection (production API vs. local LAN) that reload was
    // visible as a jarring flicker/reload every time you navigated back.
    if (!hasLoadedOnceRef.current) {
      hasLoadedOnceRef.current = true;
      setLoading(true);
    }
    void loadTab('all', 1, true);
  }, []));

  function selectTab(tab: TabKey) {
    setActiveTab(tab);
    if (!tabData[tab].loaded) {
      setLoading(true);
      void loadTab(tab, 1, true);
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadTab(activeTab, 1, true);
  }, [activeTab]);

  function loadMore() {
    const state = tabData[activeTab];
    if (loadingMoreRef.current || state.loadingMore || state.items.length >= state.total) return;
    loadingMoreRef.current = true;
    void loadTab(activeTab, state.page + 1, false);
  }

  const tabs = [
    { key: 'all',      label: t('proposal.creator.tabAll'),      icon: 'documents-outline'       as const, color: TabColors.neutral.color,  count: tabData.all.total },
    { key: 'pending',  label: t('proposal.creator.tabPending'),  icon: 'time-outline'             as const, color: TabColors.warning.color,  count: tabData.pending.total },
    { key: 'accepted', label: t('proposal.creator.tabAccepted'), icon: 'checkmark-circle-outline' as const, color: TabColors.positive.color, count: tabData.accepted.total },
    { key: 'rejected', label: t('proposal.creator.tabRejected'), icon: 'close-circle-outline'     as const, color: TabColors.danger.color,   count: tabData.rejected.total },
  ];

  const current = tabData[activeTab];

  const emptyMessages: Record<TabKey, { faIcon: string; title: string; sub: string }> = {
    all:      { faIcon: 'inbox',          title: t('proposal.creator.emptyTitle'),        sub: t('proposal.creator.emptySub')        },
    pending:  { faIcon: 'hourglass-half', title: t('proposal.creator.emptyPendingTitle'), sub: t('proposal.creator.emptyPendingSub') },
    accepted: { faIcon: 'check-circle',   title: t('proposal.creator.emptyAcceptedTitle'),sub: t('proposal.creator.emptyAcceptedSub')},
    rejected: { faIcon: 'times-circle',   title: t('proposal.creator.emptyRejectedTitle'),sub: t('proposal.creator.emptyRejectedSub')},
  };
  const emptyMsg = emptyMessages[activeTab];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        <TabSlider tabs={tabs} active={activeTab} onChange={(k) => selectTab(k as TabKey)} />
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3, 4].map((i) => <ListRowSkeleton key={i} withBadge />)}
        </View>
      ) : error ? (
        <EmptyState
          faIcon="exclamation-triangle"
          title={t('proposal.creator.loadError')}
          subtitle={error}
          action={{ label: t('proposal.creator.retry'), onPress: () => loadTab(activeTab, 1, true) }}
        />
      ) : (
        <FlatList
          ref={listRef}
          data={current.items}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <ProposalCard proposal={item} />}
          contentContainerStyle={[styles.list, current.items.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={current.loadingMore ? (
            <View style={styles.footerLoading}><ActivityIndicator size="small" color={C.brinjal1} /></View>
          ) : null}
          ListEmptyComponent={
            <EmptyState
              faIcon={emptyMsg.faIcon}
              title={emptyMsg.title}
              subtitle={emptyMsg.sub}
              action={activeTab === 'all' ? { label: t('proposal.creator.browseEvents'), onPress: () => router.push('/(creator)' as never) } : undefined}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:      { flex: 1 },

  // Header

  // Tab bar — flush with the page, same as the home hero header: no
  // background or shadow of its own, just spacing.
  tabBar: { marginTop: 14 },

  // List
  list:      { paddingHorizontal: 16, paddingBottom: 80, gap: 12, paddingTop: 14 },
  listEmpty: { flexGrow: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: F.regular },
  footerLoading: { paddingVertical: 20 },

  // Card
  card:        { borderRadius: RADIUS.md, flexDirection: 'row', borderWidth: 1, ...SHADOW.card, overflow: 'hidden' },
  leftStrip:   { width: 4 },
  cardBody:    { flex: 1, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12, gap: 10 },

  // Top row
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandAvatar:  { width: 42, height: 42, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0, overflow: 'hidden' },
  brandInitials:{ fontSize: 15, fontFamily: F.bold },
  brandBlock:   { flex: 1, gap: 2 },
  brandName:    { fontSize: 14, fontFamily: F.bold },
  campaignTitle:{ fontSize: 12, fontFamily: F.regular },
  statusPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0 },
  statusText:   { fontSize: 11, fontFamily: F.bold },

  // Cover letter
  coverRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderRadius: RADIUS.sm, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  coverText: { fontSize: 12, fontFamily: F.regular, lineHeight: 17 },
  seeMore:   { fontSize: 12, fontFamily: F.semibold, marginTop: 3 },

  // Meta chips
  metaRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.sm, paddingHorizontal: 9, paddingVertical: 5 },
  metaChipTxt:  { fontSize: 12, fontFamily: F.semibold },

  // Track button
  trackBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: RADIUS.md, paddingVertical: 11, paddingHorizontal: 12 },
  trackBtnIcon: { width: 34, height: 34, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  trackBtnText: { flex: 1, gap: 1 },
  trackBtnLabel:{ fontSize: 13, color: '#fff', fontFamily: F.bold },
  trackBtnSub:  { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily: F.regular },

  // Invited banner
  invitedBanner:{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 11 },
  invitedIcon:  { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  invitedTitle: { fontSize: 13, fontFamily: F.bold },
  invitedSub:   { fontSize: 11, fontFamily: F.regular, marginTop: 1 },

  // Footer row
  footerRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  footerTxt:  { flex: 1, fontSize: 12, fontFamily: F.semibold },
});
