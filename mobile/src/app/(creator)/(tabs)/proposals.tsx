import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { campaignService } from '@/services/campaign';
import { F } from '@/utilities/constants';

type WS = 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED';

type Proposal = {
  id:              string;
  campaignId:      string;
  campaignTitle:   string;
  brand:           string;
  businessId:      string;
  status:          'pending' | 'accepted' | 'rejected';
  submittedAt:     string;
  coverLetter:     string;
  proposedRate:    string;
  proposedRateRaw: number;
  workStatus:      WS;
  campaignType:    'PAID_CAMPAIGN' | 'OPEN_EVENT';
};

const STATUS_CFG = {
  pending:  { labelKey: 'proposal.creator.statusPending'  as const, icon: 'time'           as const, color: '#B45309', bg: '#FFF8E1' },
  accepted: { labelKey: 'proposal.creator.statusAccepted' as const, icon: 'checkmark-circle' as const, color: '#15803D', bg: '#F0FDF4' },
  rejected: { labelKey: 'proposal.creator.statusRejected' as const, icon: 'close-circle'   as const, color: '#DC2626', bg: '#FEF2F2' },
};


const TRACK_CFG: Record<WS, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; sub: string }> = {
  NONE:        { label: 'Track Project',    icon: 'navigate',      color: '#7C3AED', sub: 'Waiting to start'          },
  IN_PROGRESS: { label: 'View My Work',     icon: 'brush',         color: '#6D28D9', sub: 'Work in progress'          },
  SUBMITTED:   { label: 'Awaiting Review',  icon: 'hourglass',     color: '#D97706', sub: 'Brand reviewing your work' },
  APPROVED:    { label: 'Project Complete', icon: 'trophy',        color: '#16A34A', sub: 'Payment released!'         },
};

function timeAgo(iso: string, t: TFn): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return t('proposal.creator.timeToday');
  if (d === 1) return t('proposal.creator.timeYesterday');
  if (d < 7)  return t('proposal.creator.timeDaysAgo', { n: d });
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}


function ProposalCard({ proposal }: { proposal: Proposal }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const cfg    = STATUS_CFG[proposal.status];
  const trackCfg = TRACK_CFG[proposal.workStatus];
  const isFree = proposal.campaignType === 'OPEN_EVENT';
  const stripeColor =
    proposal.status === 'accepted' ? '#4F46E5' :
    proposal.status === 'rejected' ? C.error    : '#D97706';

  return (
    <Pressable
      style={[styles.card, { backgroundColor: C.surface }]}
      onPress={() => router.push({ pathname: '/campaign-detail', params: { campaignId: proposal.campaignId } } as never)}>
      {/* Left accent stripe */}
      <View style={[styles.stripe, { backgroundColor: stripeColor }]} />

      <View style={styles.cardBody}>
        {/* ── Top row: brand + status badge ── */}
        <View style={styles.topRow}>
          <View style={[styles.brandAvatar, { backgroundColor: `${stripeColor}18` }]}>
            <Ionicons name="business" size={18} color={stripeColor} />
          </View>
          <View style={styles.brandBlock}>
            <Text style={[styles.brand, { color: C.text }]} numberOfLines={1}>{proposal.brand}</Text>
            <Text style={[styles.campaign, { color: C.textSecondary }]} numberOfLines={1}>{proposal.campaignTitle}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={13} color={cfg.color} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{t(cfg.labelKey)}</Text>
          </View>
        </View>

        {/* ── Meta row: type/rate + submitted ── */}
        <View style={[styles.metaRow, { borderTopColor: C.border, borderBottomColor: C.border }]}>
          <View style={styles.metaItem}>
            <Ionicons name={isFree ? 'gift-outline' : 'cash-outline'} size={13} color={C.textSecondary} />
            <View>
              <Text style={[styles.metaLabel, { color: C.textSecondary }]}>{isFree ? 'Type' : t('proposal.creator.metaRate')}</Text>
              {isFree ? (
                <View style={styles.freeTag}><Text style={styles.freeTagTxt}>{t('proposal.creator.freeEventTag')}</Text></View>
              ) : (
                <Text style={[styles.metaValue, { color: '#4F46E5' }]}>{proposal.proposedRate}</Text>
              )}
            </View>
          </View>
          <View style={[styles.metaDivider, { backgroundColor: C.border }]} />
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={C.textSecondary} />
            <View>
              <Text style={[styles.metaLabel, { color: C.textSecondary }]}>{t('proposal.creator.metaSubmitted')}</Text>
              <Text style={[styles.metaValue, { color: C.text }]}>{timeAgo(proposal.submittedAt, t)}</Text>
            </View>
          </View>
        </View>

        {/* ── Work progress tracker (accepted only) ── */}
        {proposal.status === 'accepted' && (
          <>
            <Pressable
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
                <Ionicons name={trackCfg.icon} size={18} color="#fff" />
              </View>
              <View style={styles.trackBtnText}>
                <Text style={styles.trackBtnLabel}>{trackCfg.label}</Text>
                <Text style={styles.trackBtnSub}>{trackCfg.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </>
        )}

        {/* Pending/rejected subtle footer */}
        {proposal.status !== 'accepted' && (
          <View style={styles.footerRow}>
            <Ionicons
              name={proposal.status === 'pending' ? 'time-outline' : 'close-circle-outline'}
              size={13}
              color={cfg.color}
            />
            <Text style={[styles.footerTxt, { color: cfg.color }]}>
              {proposal.status === 'pending' ? 'Awaiting brand response' : 'Application was declined'}
            </Text>
            <Ionicons name="chevron-forward" size={13} color={C.textSecondary} style={{ marginLeft: 'auto' }} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function ProposalsScreen() {
  const { t } = useLanguage();
  const C = useAppColors();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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

  const pending  = proposals.filter((p) => p.status === 'pending').length;
  const accepted = proposals.filter((p) => p.status === 'accepted').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={['#312e81', '#4f46e5', '#8b5cf6']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientHeader}>
        <View style={[styles.decCircle1, { backgroundColor: 'rgba(255,255,255,0.1)' }]} />
        <View style={[styles.decCircle2, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />
        <View style={styles.header}>
          <Text style={[styles.heading, { color: '#fff' }]}>{t('creator.proposals.heading')}</Text>
          <Text style={[styles.subheading, { color: 'rgba(255,255,255,0.8)' }]}>{t('proposal.creator.subheading')}</Text>
        </View>
      </LinearGradient>

      {proposals.length > 0 && (
        <View style={styles.statsRow}>
          {[
            { label: t('proposal.creator.statSubmitted'), val: proposals.length, color: C.brinjal1,  icon: 'documents-outline'    as const },
            { label: t('proposal.creator.statPending'),   val: pending,          color: '#D97706',   icon: 'time-outline'         as const },
            { label: t('proposal.creator.statAccepted'),  val: accepted,         color: '#15803D',   icon: 'checkmark-circle-outline' as const },
            { label: t('proposal.creator.statRejected'),  val: proposals.filter((p) => p.status === 'rejected').length, color: '#DC2626', icon: 'close-circle-outline' as const },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: C.surface }]}>
              <Ionicons name={s.icon} size={16} color={s.color} />
              <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>{t('proposal.creator.loading')}</Text>
        </View>
      ) : error ? (
        <EmptyState
          emoji="⚠️"
          title={t('proposal.creator.loadError')}
          subtitle={error}
          action={{ label: t('proposal.creator.retry'), onPress: () => fetchProposals() }}
        />
      ) : (
        <FlatList
          data={proposals}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <ProposalCard proposal={item} />}
          contentContainerStyle={[styles.list, proposals.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
          ListEmptyComponent={
            <EmptyState
              emoji="📋"
              title={t('proposal.creator.emptyTitle')}
              subtitle={t('proposal.creator.emptySub')}
              action={{ label: t('proposal.creator.browseEvents'), onPress: () => router.push('/(creator)' as never) }}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container:      { flex: 1 },
  gradientHeader: { paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  decCircle1:     { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -60, right: -30 },
  decCircle2:     { position: 'absolute', width: 110, height: 110, borderRadius: 55, bottom: -30, left: 20 },
  header:         { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4, gap: 3 },
  heading:        { fontSize: 22, fontWeight: '800', fontFamily: F.extrabold },
  subheading:     { fontSize: 13, fontFamily: F.regular },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 16, marginBottom: 10 },
  statCard: { flex: 1, borderRadius: 14, padding: 10, alignItems: 'center', gap: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statVal:  { fontSize: 18, fontWeight: '800', fontFamily: F.extrabold },
  statLabel:{ fontSize: 9, fontWeight: '600', textTransform: 'uppercase', fontFamily: F.semibold, textAlign: 'center' },

  list:     { paddingHorizontal: 16, paddingBottom: 80, gap: 12, paddingTop: 4 },
  listEmpty:{ flexGrow: 1 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, fontFamily: F.regular },

  card:     { borderRadius: 16, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  stripe:   { width: 4 },
  cardBody: { flex: 1, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12, gap: 0 },

  // Top row
  topRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  brandAvatar:  { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  brandBlock:   { flex: 1, gap: 2 },
  brand:        { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  campaign:     { fontSize: 12, fontFamily: F.regular },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, flexShrink: 0 },
  statusText:   { fontSize: 11, fontWeight: '700', fontFamily: F.bold },

  // Meta row
  metaRow:     { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10, marginBottom: 2 },
  metaItem:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaLabel:   { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', fontFamily: F.semibold },
  metaValue:   { fontSize: 13, fontWeight: '700', fontFamily: F.bold },
  metaDivider: { width: StyleSheet.hairlineWidth, height: 32, marginHorizontal: 8 },
  freeTag:     { backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  freeTagTxt:  { fontSize: 11, fontWeight: '700', color: '#059669', fontFamily: F.bold },

  // Track button
  trackBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12, marginTop: 8 },
  trackBtnIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  trackBtnText: { flex: 1, gap: 1 },
  trackBtnLabel:{ fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: F.bold },
  trackBtnSub:  { fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily: F.regular },

  // Footer for non-accepted
  footerRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F3F4F6' },
  footerTxt:  { fontSize: 12, fontWeight: '600', fontFamily: F.semibold },
});
