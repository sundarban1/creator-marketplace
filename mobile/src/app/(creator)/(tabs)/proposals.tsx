import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { EmptyState } from '@/components/EmptyState';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { TabSlider } from '@/components/TabSlider';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { campaignService } from '@/services/campaign';
import { F, lineHeightFor, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { TabColors } from '@/utilities/tabColors';

// ─── Types ───────────────────────────────────────────────────────────────────

type WS = 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED' | 'DISPUTED';
type AppStatus = 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired';
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
  pending:     { labelKey: 'proposal.creator.statusPending'     as const, icon: 'clock'         as const, color: TabColors.brand.color,    bg: TabColors.brand.bg },
  shortlisted: { labelKey: 'proposal.creator.statusShortlisted' as const, icon: 'star'          as const, color: TabColors.info.color,     bg: TabColors.info.bg },
  accepted:    { labelKey: 'proposal.creator.statusAccepted'    as const, icon: 'check-circle'  as const, color: TabColors.positive.color, bg: TabColors.positive.bg },
  rejected:    { labelKey: 'proposal.creator.statusRejected'    as const, icon: 'times-circle'  as const, color: TabColors.danger.color,   bg: TabColors.danger.bg },
  expired:     { labelKey: 'proposal.creator.statusExpired'     as const, icon: 'hourglass-end' as const, color: TabColors.closed.color,   bg: TabColors.closed.bg },
};

// Colors match the business side's equivalent workspace stages
// ((business)/(tabs)/proposals.tsx's workspaceBtnConfig) for the same
// underlying `workStatus` value — NONE/IN_PROGRESS/SUBMITTED used to all
// render as the identical indigo here, giving three different stages no
// visual distinction from one another (business's tracker already
// distinguishes every stage). APPROVED/COMPLETED deliberately stay green
// rather than also matching business 1:1 — the creator side collapses
// "awaiting release" vs "released" into one reassuring "you're done" color,
// since unlike the business, the creator has no further action either way.
const TRACK_CFG: Record<WS, { labelKey: string; icon: keyof typeof FontAwesome5.glyphMap; color: string; subKey: string }> = {
  NONE:        { labelKey: 'proposal.creator.trackNoneLabel',        icon: 'location-arrow',       color: '#6366F1', subKey: 'proposal.creator.trackNoneSub'        },
  IN_PROGRESS: { labelKey: 'proposal.creator.trackInProgressLabel',  icon: 'brush',          color: '#7C3AED', subKey: 'proposal.creator.trackInProgressSub'  },
  SUBMITTED:   { labelKey: 'proposal.creator.trackSubmittedLabel',   icon: 'hourglass',      color: '#D97706', subKey: 'proposal.creator.trackSubmittedSub'   },
  // Approval no longer releases payment automatically — an admin releases it
  // manually, so ProposalCard overrides this "sub" based on paymentStatus
  // (pending release, awaiting verification, or fully complete).
  APPROVED:    { labelKey: 'proposal.creator.trackApprovedLabel',    icon: 'trophy',         color: '#16A34A', subKey: 'proposal.creator.trackApprovedSub'    },
  COMPLETED:   { labelKey: 'proposal.creator.trackCompletedLabel',   icon: 'check-double', color: '#16A34A', subKey: 'proposal.creator.trackCompletedSub'   },
  // A reported issue (see reportIssue) parks the job until Kolab support
  // resolves it — nothing for the creator to do but open it and read the note.
  DISPUTED:    { labelKey: 'proposal.creator.trackDisputedLabel',     icon: 'exclamation-triangle', color: '#EF4444', subKey: 'proposal.creator.trackDisputedSub' },
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

function ProposalCard({ proposal }: {
  proposal: Proposal;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const cfg        = STATUS_CFG[proposal.status];
  // Mirrors the same stage logic as activity-timeline.tsx's statusLabel() and
  // campaign-proposals.tsx's projectBtnConfig() — the NONE stage alone doesn't
  // say whether the creator is still waiting on payment or free to start, so
  // pull that from paymentStatus the same way those screens do. Paid campaigns
  // only: a free event's accepted card is terminal and shows no workspace CTA.
  const isFree     = proposal.campaignType === 'OPEN_EVENT';
  const trackCfg   = (() => {
    if (proposal.workStatus === 'APPROVED' && proposal.paymentStatus === 'RELEASED')
      return { ...TRACK_CFG.APPROVED, labelKey: 'proposal.creator.trackApprovedReleasedLabel', subKey: 'proposal.creator.trackApprovedReleasedSub' };
    if (proposal.workStatus === 'APPROVED')
      return { ...TRACK_CFG.APPROVED, labelKey: 'proposal.creator.trackApprovedPendingLabel', subKey: 'proposal.creator.trackApprovedPendingSub' };
    if (proposal.workStatus === 'NONE' && proposal.paymentStatus !== 'UNPAID')
      return { ...TRACK_CFG.NONE, labelKey: 'proposal.creator.trackReadyToStartLabel', subKey: 'proposal.creator.trackReadyToStartSub' };
    if (proposal.workStatus === 'NONE')
      return { ...TRACK_CFG.NONE, labelKey: 'proposal.creator.trackWaitingPaymentLabel', subKey: 'proposal.creator.trackWaitingPaymentSub' };
    return TRACK_CFG[proposal.workStatus];
  })();
  const accentColor = cfg.color;

  return (
    <View style={[styles.cardWrap, { backgroundColor: C.surface }]}>
      <Pressable
        style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
        onPress={() => router.push({ pathname: '/campaign-detail', params: { campaignId: proposal.campaignId } } as never)}>

        {/* ── Top: brand thumbnail + name/title + status & type badges —
            mirrors the home feed's CampaignListItem header (thumb left,
            title block right, tag badges under the title) instead of the
            old cramped single-row avatar + pill. ── */}
        <View style={styles.cardHeader}>
          {/* Avatar column — the submitted-time sits directly under the thumb
              so the title block keeps its full width for title + badges. */}
          <View style={styles.thumbColumn}>
            <View style={[styles.thumb, { backgroundColor: `${accentColor}18` }]}>
              <Text style={[styles.thumbInitials, { color: accentColor }]}>{brandInitials(proposal.brand)}</Text>
              {proposal.featureImageUrl && (
                <Image source={{ uri: proposal.featureImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              )}
            </View>
            <Text style={[styles.submittedText, { color: C.textSecondary }]}>{timeAgo(proposal.submittedAt, t)}</Text>
          </View>
          {/* The event is what the creator applied to, so it leads; the
              business name is the supporting line under it. */}
          <View style={styles.titleSection}>
            <Text style={[styles.eventTitle, { color: C.text }]} numberOfLines={2}>{proposal.campaignTitle}</Text>
            <Text style={[styles.brandName, { color: C.textSecondary }]} numberOfLines={1}>{proposal.brand}</Text>
            <View style={styles.tagContainer}>
              {/* Money leads the badge row — a free event's "free" tag is the
                  same slot, since that IS its rate. */}
              {isFree ? (
                <View style={[styles.tagBadge, { backgroundColor: '#F0FDF4' }]}>
                  <FontAwesome5 name="gift" solid size={9} color="#059669" />
                  <Text style={[styles.tagBadgeText, { color: '#059669' }]}>{t('proposal.creator.freeEventTag')}</Text>
                </View>
              ) : (
                <View style={[styles.tagBadge, { backgroundColor: `${accentColor}14` }]}>
                  <FontAwesome5 name="money-bill-alt" solid size={9} color={accentColor} />
                  <Text style={[styles.tagBadgeText, { color: accentColor }]}>{proposal.proposedRate}</Text>
                </View>
              )}
              {/* Status sits hard right, opposite the amount. */}
              <View style={[styles.tagBadge, styles.statusBadge, { backgroundColor: cfg.bg }]}>
                <FontAwesome5 name={cfg.icon} size={9} color={cfg.color} />
                <Text style={[styles.tagBadgeText, { color: cfg.color }]}>{t(cfg.labelKey)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Cover letter preview ── */}
        {!!proposal.coverLetter && (
          <View style={[styles.coverRow, { backgroundColor: C.background, borderColor: C.border }]}>
            <FontAwesome5 name="comment-alt" size={13} color={C.textSecondary} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.coverText, { color: C.textSecondary }]} numberOfLines={expanded ? undefined : 2}>
                {proposal.coverLetter}
              </Text>
              {proposal.coverLetter.length > 100 && (
                <Pressable hitSlop={8} onPress={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}>
                  <Text style={[styles.seeMore, { color: accentColor }]}>
                    {expanded ? t('proposal.creator.seeLess') : t('proposal.creator.seeMore')}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* ── Accepted ──
            A free event ends here: being accepted is itself the final step,
            with nothing to start and no deliverable to submit, so the banner
            stands alone and no workspace CTA follows it. Paid campaigns keep
            the start → complete → confirm workspace flow below. ── */}
        {proposal.status === 'accepted' && isFree && (
          <View style={{ gap: 8 }}>
            {/* Same row design as the "Have a question? Ask the organizer" entry
                below — trophy + title with an inline "View" CTA + chevron. Own
                tap target (opens the invitation PNG screen), so it doesn't
                trigger the card's campaign-detail navigation. */}
            <Pressable
              style={[styles.invitedRow, { borderColor: `${accentColor}40`, backgroundColor: `${accentColor}0D` }]}
              onPress={(e) => {
                e.stopPropagation();
                router.push({ pathname: '/event-invitation', params: { campaignId: proposal.campaignId } } as never);
              }}>
              <FontAwesome5 name="trophy" solid size={14} color={accentColor} />
              <Text style={[styles.invitedRowText, { color: C.text, flex: 1 }]}>
                {t('proposal.creator.invitedTitle')}{' '}
                <Text style={{ color: C.brinjal1, fontFamily: F.bold }}>{t('eventInvitation.view')}</Text>
              </Text>
              <FontAwesome5 name="chevron-right" size={12} color={C.textPlaceholder} />
            </Pressable>

            {/* Free events never open a chat — the shared Q&A page is how the
                creator reaches the organizer. Its own tap target, so it
                doesn't trigger the card's campaign-detail navigation. */}
            <Pressable
              style={[styles.askRow, { borderColor: C.border, backgroundColor: C.background }]}
              onPress={(e) => {
                e.stopPropagation();
                router.push({ pathname: '/event-questions', params: { campaignId: proposal.campaignId, campaignTitle: proposal.campaignTitle } } as never);
              }}>
              <FontAwesome5 name="comments" solid size={14} color={C.brinjal1} />
              <Text style={[styles.askTitle, { color: C.text, flex: 1 }]}>
                {t('eventQuestions.askRowPrompt')}{' '}
                <Text style={{ color: C.brinjal1, fontFamily: F.bold }}>{t('eventQuestions.askRowCta')}</Text>
              </Text>
              <FontAwesome5 name="chevron-right" size={12} color={C.textPlaceholder} />
            </Pressable>
          </View>
        )}

        {proposal.status === 'accepted' && !isFree && (<>
          <Pressable
            style={[styles.trackBtn, { backgroundColor: `${trackCfg.color}14`, borderWidth: 1, borderColor: `${trackCfg.color}30` }]}
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
            <View style={[styles.trackBtnIcon, { backgroundColor: `${trackCfg.color}1F` }]}>
              <FontAwesome5 name={trackCfg.icon} size={17} color={trackCfg.color} />
            </View>
            <View style={styles.trackBtnText}>
              <Text style={[styles.trackBtnLabel, { color: trackCfg.color }]}>{t(trackCfg.labelKey)}</Text>
              <Text style={[styles.trackBtnSub, { color: C.textSecondary }]}>{t(trackCfg.subKey)}</Text>
            </View>
            <FontAwesome5 name="chevron-right" solid size={15} color={trackCfg.color} />
          </Pressable>
        </>)}

        {/* ── Pending: awaiting-response — same icon-box + title + sub shape
            as the accepted/rejected footers below, not a CTA (there's
            nothing to tap into yet). ── */}
        {proposal.status === 'pending' && (
          <View style={[styles.awaitingBanner, { borderColor: `${accentColor}40` }]}>
            <View style={[styles.awaitingIcon, { backgroundColor: `${accentColor}18` }]}>
              <FontAwesome5 name={cfg.icon} size={16} color={accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.awaitingTitle, { color: accentColor }]}>{t('proposal.creator.awaitingResponseLabel')}</Text>
              <Text style={[styles.awaitingSub, { color: C.textSecondary }]}>{t('proposal.creator.awaitingResponseSub')}</Text>
            </View>
          </View>
        )}

        {/* ── Rejected footer ── */}
        {proposal.status === 'rejected' && (
          <View style={[styles.rejectedBanner, { borderColor: `${accentColor}40` }]}>
            <View style={[styles.rejectedIcon, { backgroundColor: `${accentColor}18` }]}>
              <FontAwesome5 name="times-circle" solid size={16} color={accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rejectedTitle, { color: accentColor }]}>{t('proposal.creator.rejectedLabel')}</Text>
              <Text style={[styles.rejectedSub, { color: C.textSecondary }]}>{t('proposal.creator.rejectedSub')}</Text>
            </View>
          </View>
        )}

        {/* ── Expired footer — distinct from rejected: nobody declined this,
            the event just closed before a decision was made. ── */}
        {proposal.status === 'expired' && (
          <View style={[styles.rejectedBanner, { borderColor: `${accentColor}40` }]}>
            <View style={[styles.rejectedIcon, { backgroundColor: `${accentColor}18` }]}>
              <FontAwesome5 name="hourglass-end" solid size={16} color={accentColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rejectedTitle, { color: accentColor }]}>{t('proposal.creator.expiredLabel')}</Text>
              <Text style={[styles.rejectedSub, { color: C.textSecondary }]}>{t('proposal.creator.expiredSub')}</Text>
            </View>
          </View>
        )}
      </Pressable>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type TabState = { items: Proposal[]; page: number; total: number; loadingMore: boolean; loaded: boolean };
const emptyTabState = (): TabState => ({ items: [], page: 0, total: 0, loadingMore: false, loaded: false });

const STATUS_PARAM: Record<TabKey, 'PENDING' | 'SHORTLISTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | undefined> = {
  all: undefined, pending: 'PENDING', shortlisted: 'SHORTLISTED', accepted: 'ACCEPTED', rejected: 'REJECTED', expired: 'EXPIRED',
};

export default function ProposalsScreen() {
  const { t } = useLanguage();
  const C = useAppColors();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tabData, setTabData] = useState<Record<TabKey, TabState>>({
    all: emptyTabState(), pending: emptyTabState(), shortlisted: emptyTabState(), accepted: emptyTabState(), rejected: emptyTabState(), expired: emptyTabState(),
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

  // Lets other screens (e.g. Home's "My Campaigns" quick action) land directly
  // on a specific tab via ?tab=accepted instead of always opening on "all".
  useEffect(() => {
    if (params.tab && params.tab in STATUS_PARAM && params.tab !== activeTab) {
      selectTab(params.tab as TabKey);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tab]);

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
    { key: 'all',         label: t('proposal.creator.tabAll'),         icon: 'copy'          as const, color: TabColors.neutral.color,  count: tabData.all.total },
    { key: 'pending',     label: t('proposal.creator.tabPending'),     icon: 'clock'          as const, color: TabColors.brand.color,    count: tabData.pending.total },
    { key: 'shortlisted', label: t('proposal.creator.tabShortlisted'), icon: 'star'           as const, color: TabColors.info.color,     count: tabData.shortlisted.total },
    { key: 'accepted',    label: t('proposal.creator.tabAccepted'),    icon: 'check-circle'   as const, color: TabColors.positive.color, count: tabData.accepted.total },
    { key: 'rejected',    label: t('proposal.creator.tabRejected'),    icon: 'times-circle'   as const, color: TabColors.danger.color,   count: tabData.rejected.total },
    { key: 'expired',     label: t('proposal.creator.tabExpired'),     icon: 'hourglass-end'  as const, color: TabColors.closed.color,   count: tabData.expired.total },
  ];

  const current = tabData[activeTab];

  const emptyMessages: Record<TabKey, { faIcon: string; title: string; sub: string }> = {
    all:         { faIcon: 'inbox',          title: t('proposal.creator.emptyTitle'),            sub: t('proposal.creator.emptySub')            },
    pending:     { faIcon: 'hourglass-half', title: t('proposal.creator.emptyPendingTitle'),     sub: t('proposal.creator.emptyPendingSub')     },
    shortlisted: { faIcon: 'star',           title: t('proposal.creator.emptyShortlistedTitle'), sub: t('proposal.creator.emptyShortlistedSub') },
    accepted:    { faIcon: 'check-circle',   title: t('proposal.creator.emptyAcceptedTitle'),    sub: t('proposal.creator.emptyAcceptedSub')    },
    rejected:    { faIcon: 'times-circle',   title: t('proposal.creator.emptyRejectedTitle'),    sub: t('proposal.creator.emptyRejectedSub')    },
    expired:     { faIcon: 'hourglass-end',  title: t('proposal.creator.emptyExpiredTitle'),     sub: t('proposal.creator.emptyExpiredSub')     },
  };
  const emptyMsg = emptyMessages[activeTab];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>

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
          renderItem={({ item }) => (
            <ProposalCard proposal={item} />
          )}
          contentContainerStyle={[styles.list, current.items.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          ListFooterComponent={current.loadingMore ? (
            <View style={styles.footerLoading}><ActivityIndicator size="small" color={C.brinjal1} /></View>
          ) : null}
          ListEmptyComponent={
            <EmptyState
              faIcon={emptyMsg.faIcon}
              title={emptyMsg.title}
              subtitle={emptyMsg.sub}
              // Every empty tab — not just "All" — dead-ends unless the creator
              // goes and applies to something, so all of them offer the same way
              // out: straight to the Find Work tab.
              action={{ label: t('proposal.creator.browseWork'), onPress: () => router.push('/(creator)/(tabs)/discover') }}
            />
          }
        />
      )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:      { flex: 1 },

  // Tab bar — flush with the page, same as the home hero header: no
  // background or shadow of its own, just spacing.
  tabBar: { marginTop: 14 },

  // List — 20px horizontal gutter matches the home feed and the business
  // proposals list (was 16, an unexplained one-off on this screen).
  list:      { paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxxl, gap: SPACING.md, paddingTop: SPACING.lg },
  listEmpty: { flexGrow: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: F.regular },
  footerLoading: { paddingVertical: 20 },

  // Card
  cardWrap: { borderRadius: RADIUS.lg, ...SHADOW.raised },
  card:     { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden', padding: SPACING.lg, gap: 12 },

  // Card header — thumbnail + title block + tag badges, mirrors
  // CampaignListItem's cardHeader/thumb/titleSection/tagContainer/tagBadge
  // (the home feed's card) instead of the old cramped single-row layout.
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  thumbColumn:  { width: 60, alignItems: 'center', gap: 5, flexShrink: 0 },
  thumb:        { width: 60, height: 60, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0, overflow: 'hidden' },
  thumbInitials:{ fontSize: 18, fontFamily: F.bold },
  submittedText:{ fontSize: 10, fontFamily: F.semibold, lineHeight: lineHeightFor(10), textAlign: 'center' },
  titleSection: { flex: 1, gap: 4 },
  eventTitle:   { fontSize: 15, fontFamily: F.bold, lineHeight: lineHeightFor(15) },
  brandName:    { fontSize: 12, fontFamily: F.regular, lineHeight: lineHeightFor(12) },
  tagContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, gap: 6, marginTop: 2 },
  tagBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadge:  { marginLeft: 'auto' },
  tagBadgeText: { fontSize: 11, fontFamily: F.bold },

  // Cover letter
  coverRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderRadius: RADIUS.sm, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  coverText: { fontSize: 12, fontFamily: F.regular, lineHeight: 18 },
  seeMore:   { fontSize: 12, fontFamily: F.semibold, marginTop: 3 },

  // Track button
  trackBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: RADIUS.md, paddingVertical: 11, paddingHorizontal: 12 },
  trackBtnIcon: { width: 34, height: 34, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  trackBtnText: { flex: 1, gap: 1 },
  trackBtnLabel:{ fontSize: 13, fontFamily: F.bold },
  trackBtnSub:  { fontSize: 11, fontFamily: F.regular },

  // Invited banner — mirrors `askRow` (same paddings/gap/text/icon sizes)
  invitedRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10 },
  invitedRowText: { fontSize: 12.5, fontFamily: F.semibold },

  // "Ask Organizer" Q&A entry — sits under the invited banner on a free event
  askRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10 },
  askTitle: { fontSize: 12.5, fontFamily: F.semibold },

  // Awaiting-response banner (pending) — same icon-box + title + sub shape
  // as invitedBanner/rejectedBanner for a consistent footer across all
  // three end states.
  awaitingBanner:{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 11 },
  awaitingIcon:  { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  awaitingTitle: { fontSize: 13, fontFamily: F.bold },
  awaitingSub:   { fontSize: 11, fontFamily: F.regular, marginTop: 1 },

  // Rejected banner
  rejectedBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 11 },
  rejectedIcon:   { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  rejectedTitle:  { fontSize: 13, fontFamily: F.bold },
  rejectedSub:    { fontSize: 11, fontFamily: F.regular, marginTop: 1 },
});
