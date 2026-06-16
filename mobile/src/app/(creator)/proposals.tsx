import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '@/components/EmptyState';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { campaignService } from '@/services/campaign';

type Proposal = {
  id: string;
  campaignId: string;
  campaignTitle: string;
  brand: string;
  status: 'pending' | 'accepted' | 'rejected';
  submittedAt: string;
  coverLetter: string;
  proposedRate: string;
};

const STATUS_CFG = {
  pending:  { label: 'Pending',  icon: '⏳', bgLight: '#FFF8E1', bgDark: '#292000', textLight: '#B45309', textDark: '#FCD34D' },
  accepted: { label: 'Accepted', icon: '✅', bgLight: '#F0FDF4', bgDark: '#052E16', textLight: '#15803D', textDark: '#4ADE80' },
  rejected: { label: 'Rejected', icon: '❌', bgLight: '#FEF2F2', bgDark: '#2D1010', textLight: '#DC2626', textDark: '#F87171' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const C = useAppColors();
  const cfg = STATUS_CFG[proposal.status];

  return (
    <Pressable
      style={[styles.card, { backgroundColor: C.surface, shadowColor: C.brinjal1 }]}
      onPress={() => router.push({ pathname: '/campaign-detail', params: { id: proposal.campaignId } })}>
      {/* Status stripe */}
      <View style={[styles.stripe, { backgroundColor: proposal.status === 'accepted' ? C.active : proposal.status === 'rejected' ? C.error : C.draft }]} />

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <View style={styles.brandInfo}>
            <Text style={[styles.brand, { color: C.text }]} numberOfLines={1}>{proposal.brand}</Text>
            <Text style={[styles.campaign, { color: C.textSecondary }]} numberOfLines={1}>{proposal.campaignTitle}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.bgLight }]}>
            <Text style={styles.badgeIcon}>{cfg.icon}</Text>
            <Text style={[styles.badgeText, { color: cfg.textLight }]}>{cfg.label}</Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: C.border }]} />

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: C.textSecondary }]}>Rate</Text>
            <Text style={[styles.metaValue, { color: C.brinjal1 }]}>Rs {proposal.proposedRate}</Text>
          </View>
          <View style={[styles.metaDivider, { backgroundColor: C.border }]} />
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: C.textSecondary }]}>Submitted</Text>
            <Text style={[styles.metaValue, { color: C.text }]}>{timeAgo(proposal.submittedAt)}</Text>
          </View>
          <View style={styles.metaArrow}>
            <Text style={[styles.arrow, { color: C.textSecondary }]}>›</Text>
          </View>
        </View>
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.heading, { color: C.text }]}>{t('creator.proposals.heading')}</Text>
          {proposals.length > 0 && (
            <Text style={[styles.subheading, { color: C.textSecondary }]}>
              {proposals.length} total · {pending} pending · {accepted} accepted
            </Text>
          )}
        </View>
      </View>

      {/* Stats row */}
      {proposals.length > 0 && (
        <View style={styles.statsRow}>
          {[
            { label: 'Submitted', val: proposals.length,                          color: C.brinjal1 },
            { label: 'Pending',   val: pending,                                   color: C.draft    },
            { label: 'Accepted',  val: accepted,                                  color: C.active   },
            { label: 'Rejected',  val: proposals.filter((p) => p.status === 'rejected').length, color: C.error },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: C.surface }]}>
              <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
              <Text style={[styles.statLabel, { color: C.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading proposals…</Text>
        </View>
      ) : error ? (
        <EmptyState
          emoji="⚠️"
          title="Couldn't load proposals"
          subtitle={error}
          action={{ label: 'Retry', onPress: () => fetchProposals() }}
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
              title="No proposals yet"
              subtitle="Browse campaigns and apply to ones that match your content style and audience."
              action={{ label: 'Browse Campaigns', onPress: () => router.push('/(creator)' as never) }}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  heading:    { fontSize: 22, fontWeight: '800' },
  subheading: { fontSize: 13, marginTop: 3 },
  statsRow:   { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  statCard:   { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', gap: 3, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statVal:    { fontSize: 20, fontWeight: '800' },
  statLabel:  { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  list:       { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  listEmpty:  { flexGrow: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:{ fontSize: 14 },
  card:       { borderRadius: 16, flexDirection: 'row', overflow: 'hidden', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  stripe:     { width: 4 },
  cardBody:   { flex: 1, padding: 14, gap: 10 },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  brandInfo:  { flex: 1 },
  brand:      { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  campaign:   { fontSize: 13 },
  badge:      { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  badgeIcon:  { fontSize: 11 },
  badgeText:  { fontSize: 11, fontWeight: '700' },
  divider:    { height: 1 },
  cardMeta:   { flexDirection: 'row', alignItems: 'center' },
  metaItem:   { flex: 1, gap: 2 },
  metaLabel:  { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  metaValue:  { fontSize: 13, fontWeight: '700' },
  metaDivider:{ width: 1, height: 32, marginHorizontal: 12 },
  metaArrow:  { paddingLeft: 4 },
  arrow:      { fontSize: 22 },
});
