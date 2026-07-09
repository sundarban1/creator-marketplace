import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  FlatList,
  LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { campaignService } from '@/services/campaign';
import { F } from '@/utilities/constants';

// ─── Types ───────────────────────────────────────────────────────────────────

type WS = 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED';
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
};

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:  { labelKey: 'proposal.creator.statusPending'  as const, icon: 'time'             as const, color: '#B45309', bg: '#FFF7ED' },
  accepted: { labelKey: 'proposal.creator.statusAccepted' as const, icon: 'checkmark-circle' as const, color: '#16A34A', bg: '#F0FDF4' },
  rejected: { labelKey: 'proposal.creator.statusRejected' as const, icon: 'close-circle'     as const, color: '#B91C1C', bg: '#FEF2F2' },
};

const TRACK_CFG: Record<WS, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; sub: string }> = {
  NONE:        { label: 'Track Project',    icon: 'navigate',   color: '#C2410C', sub: 'Waiting to start'          },
  IN_PROGRESS: { label: 'View My Work',     icon: 'brush',      color: '#C2410C', sub: 'Work in progress'          },
  SUBMITTED:   { label: 'Awaiting Review',  icon: 'hourglass',  color: '#B45309', sub: 'Brand reviewing your work' },
  APPROVED:    { label: 'Project Complete', icon: 'trophy',     color: '#16A34A', sub: 'Payment released!'         },
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

// ─── Tab Slider ───────────────────────────────────────────────────────────────

type TabDef = { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; count: number };

function TabSlider({ tabs, active, onChange }: {
  tabs: TabDef[];
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  const C = useAppColors();
  const scrollRef = useRef<ScrollView>(null);
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorW = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef<{ x: number; width: number }[]>([]);

  function handleLayout(idx: number, e: LayoutChangeEvent) {
    const { x, width } = e.nativeEvent.layout;
    tabLayouts.current[idx] = { x, width };
    if (tabs[idx].key === active) {
      indicatorX.setValue(x + 8);
      indicatorW.setValue(width - 16);
    }
  }

  function handlePress(tab: TabDef, idx: number) {
    onChange(tab.key);
    const layout = tabLayouts.current[idx];
    if (layout) {
      Animated.spring(indicatorX, { toValue: layout.x + 8, useNativeDriver: false, speed: 20, bounciness: 4 }).start();
      Animated.spring(indicatorW, { toValue: layout.width - 16, useNativeDriver: false, speed: 20, bounciness: 4 }).start();
      scrollRef.current?.scrollTo({ x: Math.max(0, layout.x - 40), animated: true });
    }
  }

  const activeTab = tabs.find((tb) => tb.key === active)!;

  return (
    <View style={ts.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ts.scroll}
        bounces={false}
      >
        {tabs.map((tab, idx) => {
          const isActive = tab.key === active;
          return (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={tab.key}
              onLayout={(e) => handleLayout(idx, e)}
              onPress={() => handlePress(tab, idx)}
              style={ts.tab}
            >
              <View style={[ts.tabInner, isActive && { backgroundColor: `${activeTab.color}14` }]}>
                <Ionicons name={tab.icon} size={14} color={isActive ? tab.color : C.textSecondary} />
                <Text style={[ts.tabLabel, { color: isActive ? tab.color : C.textSecondary }]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[ts.badge, { backgroundColor: isActive ? tab.color : C.border }]}>
                    <Text style={[ts.badgeTxt, { color: isActive ? '#fff' : C.textSecondary }]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
        <Animated.View
          style={[ts.indicator, { backgroundColor: activeTab.color, left: indicatorX, width: indicatorW }]}
          pointerEvents="none"
        />
      </ScrollView>
      <View style={[ts.bottomBorder, { backgroundColor: C.border }]} />
    </View>
  );
}

const ts = StyleSheet.create({
  wrapper:      { backgroundColor: 'transparent' },
  scroll:       { paddingHorizontal: 12, paddingBottom: 0, position: 'relative' },
  tab:          { paddingHorizontal: 4, paddingVertical: 10 },
  tabInner:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  tabLabel:     { fontSize: 13, fontFamily: F.bold },
  badge:        { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, justifyContent: 'center', alignItems: 'center' },
  badgeTxt:     { fontSize: 10, fontFamily: F.bold },
  indicator:    { position: 'absolute', bottom: 0, height: 3, borderRadius: 2 },
  bottomBorder: { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
});

// ─── Proposal Card ────────────────────────────────────────────────────────────

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const cfg        = STATUS_CFG[proposal.status];
  const trackCfg   = TRACK_CFG[proposal.workStatus];
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
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}>
                  <Text style={[styles.seeMore, { color: accentColor }]}>
                    {expanded ? 'See less' : 'See more'}
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
                <Text style={[styles.invitedTitle, { color: accentColor }]}>You're invited!</Text>
                <Text style={[styles.invitedSub, { color: C.textSecondary }]}>The brand accepted your application</Text>
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
                <Text style={styles.trackBtnLabel}>{trackCfg.label}</Text>
                <Text style={styles.trackBtnSub}>{trackCfg.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.6)" />
            </Pressable>
          )
        )}

        {/* ── Pending / rejected footer ── */}
        {proposal.status !== 'accepted' && (
          <View style={[styles.footerRow, { borderTopColor: C.border }]}>
            <Text style={[styles.footerTxt, { color: cfg.color }]}>
              {proposal.status === 'pending' ? 'Awaiting brand response' : 'Application was not accepted'}
            </Text>
            <Ionicons name="chevron-forward" size={13} color={C.textSecondary} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProposalsScreen() {
  const { t } = useLanguage();
  const C = useAppColors();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  async function fetchProposals(silent = false) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await campaignService.getMyApplications();
      setProposals(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load proposals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { void fetchProposals(); }, []));
  const onRefresh = useCallback(() => { setRefreshing(true); void fetchProposals(true); }, []);

  const counts = {
    all:      proposals.length,
    pending:  proposals.filter((p) => p.status === 'pending').length,
    accepted: proposals.filter((p) => p.status === 'accepted').length,
    rejected: proposals.filter((p) => p.status === 'rejected').length,
  };

  const tabs: TabDef[] = [
    { key: 'all',      label: t('proposal.creator.tabAll'),      icon: 'documents-outline',       color: '#C2410C', count: counts.all      },
    { key: 'pending',  label: t('proposal.creator.tabPending'),  icon: 'time-outline',             color: '#B45309', count: counts.pending  },
    { key: 'accepted', label: t('proposal.creator.tabAccepted'), icon: 'checkmark-circle-outline', color: '#16A34A', count: counts.accepted },
    { key: 'rejected', label: t('proposal.creator.tabRejected'), icon: 'close-circle-outline',     color: '#B91C1C', count: counts.rejected },
  ];

  const filtered = activeTab === 'all'
    ? proposals
    : proposals.filter((p) => p.status === activeTab);

  const emptyMessages: Record<TabKey, { faIcon: string; title: string; sub: string }> = {
    all:      { faIcon: 'inbox',          title: t('proposal.creator.emptyTitle'),        sub: t('proposal.creator.emptySub')        },
    pending:  { faIcon: 'hourglass-half', title: t('proposal.creator.emptyPendingTitle'), sub: t('proposal.creator.emptyPendingSub') },
    accepted: { faIcon: 'check-circle',   title: t('proposal.creator.emptyAcceptedTitle'),sub: t('proposal.creator.emptyAcceptedSub')},
    rejected: { faIcon: 'times-circle',   title: t('proposal.creator.emptyRejectedTitle'),sub: t('proposal.creator.emptyRejectedSub')},
  };
  const emptyMsg = emptyMessages[activeTab];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>

      {/* ── Gradient header ── */}
      <LinearGradient colors={['#312e81', '#4f46e5', '#8b5cf6']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientHeader}>

        <View style={styles.headerContent}>
          <Text style={styles.heading}>{t('creator.proposals.heading')}</Text>
          <Text style={styles.subheading}>{t('proposal.creator.subheading')}</Text>
        </View>

      </LinearGradient>

      {/* ── Tab bar ── */}
      <View style={[styles.tabBar, { backgroundColor: C.surface }]}>
        <TabSlider tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>{t('proposal.creator.loading')}</Text>
        </View>
      ) : error ? (
        <EmptyState
          faIcon="exclamation-triangle"
          title={t('proposal.creator.loadError')}
          subtitle={error}
          action={{ label: t('proposal.creator.retry'), onPress: () => fetchProposals() }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <ProposalCard proposal={item} />}
          contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
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
  gradientHeader: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },
  headerContent:  { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  heading:        { fontSize: 20, fontWeight: '700', fontFamily: F.bold, color: '#fff', lineHeight: 24 },
  subheading:     { fontSize: 13, fontFamily: F.regular, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Tab bar
  tabBar: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },

  // List
  list:      { paddingHorizontal: 16, paddingBottom: 80, gap: 12, paddingTop: 14 },
  listEmpty: { flexGrow: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: F.regular },

  // Card
  card:        { borderRadius: 14, flexDirection: 'row', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3, overflow: 'hidden' },
  leftStrip:   { width: 4 },
  cardBody:    { flex: 1, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12, gap: 10 },

  // Top row
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandAvatar:  { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  brandInitials:{ fontSize: 15, fontFamily: F.bold },
  brandBlock:   { flex: 1, gap: 2 },
  brandName:    { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  campaignTitle:{ fontSize: 12, fontFamily: F.regular },
  statusPill:   { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0 },
  statusText:   { fontSize: 11, fontWeight: '700', fontFamily: F.bold },

  // Cover letter
  coverRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 7, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  coverText: { fontSize: 12, fontFamily: F.regular, lineHeight: 17 },
  seeMore:   { fontSize: 12, fontFamily: F.semibold, marginTop: 3 },

  // Meta chips
  metaRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  metaChipTxt:  { fontSize: 12, fontWeight: '600', fontFamily: F.semibold },

  // Track button
  trackBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12 },
  trackBtnIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  trackBtnText: { flex: 1, gap: 1 },
  trackBtnLabel:{ fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: F.bold },
  trackBtnSub:  { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily: F.regular },

  // Invited banner
  invitedBanner:{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  invitedIcon:  { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  invitedTitle: { fontSize: 13, fontWeight: '700', fontFamily: F.bold },
  invitedSub:   { fontSize: 11, fontFamily: F.regular, marginTop: 1 },

  // Footer row
  footerRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  footerTxt:  { flex: 1, fontSize: 12, fontWeight: '600', fontFamily: F.semibold },
});
