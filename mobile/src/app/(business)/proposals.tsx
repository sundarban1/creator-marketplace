import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { campaignService } from '@/services/campaign';

type Proposal = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  proposedRate: string;
  createdAt: string;
  campaign: { id: string; title: string; platform: string };
  creator: { fullName: string; avatarUrl: string | null; location: string | null };
};

const FILTERS = ['All', 'Pending', 'Accepted', 'Rejected'] as const;

const STATUS_CFG = {
  pending:  { bg: '#FFF7ED', color: '#D97706', label: 'Pending' },
  accepted: { bg: '#EEF9F3', color: '#16A34A', label: 'Accepted' },
  rejected: { bg: '#F3F4F6', color: '#6B7280', label: 'Rejected' },
} as const;

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
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

export default function ProposalsScreen() {
  const C = useAppColors();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<typeof FILTERS[number]>('All');

  async function loadProposals(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { proposals: data } = await campaignService.getBusinessProposals({ limit: 100 });
      setProposals(data);
    } catch {
      // silently fail — empty state handles it
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadProposals(); }, []);

  const onRefresh = useCallback(() => loadProposals(true), []);

  const shown = proposals.filter(
    (p) => activeFilter === 'All' || p.status === activeFilter.toLowerCase()
  );

  const pendingCount = proposals.filter((p) => p.status === 'pending').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: C.text }]}>Proposals</Text>
        {pendingCount > 0 && (
          <Text style={[styles.pendingHint, { color: '#D97706' }]}>{pendingCount} pending review</Text>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[
              styles.filterChip,
              { borderColor: C.border, backgroundColor: C.surface },
              activeFilter === f && { backgroundColor: C.brinjal1, borderColor: C.brinjal1 },
            ]}
            onPress={() => setActiveFilter(f)}>
            <Text style={[
              styles.filterChipText,
              { color: C.textSecondary },
              activeFilter === f && { color: '#fff', fontWeight: '700' },
            ]}>
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, shown.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}>
          {shown.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={[styles.emptyTitle, { color: C.text }]}>
                {activeFilter === 'All' ? 'No proposals yet' : `No ${activeFilter.toLowerCase()} proposals`}
              </Text>
              <Text style={[styles.emptySub, { color: C.textSecondary }]}>
                {activeFilter === 'All'
                  ? 'Proposals will appear here when creators apply to your campaigns.'
                  : 'Try a different filter.'}
              </Text>
            </View>
          ) : (
            shown.map((p) => {
              const st = STATUS_CFG[p.status];
              const abbr = initials(p.creator.fullName);
              return (
                <Pressable
                  key={p.id}
                  style={({ pressed }) => [styles.card, { backgroundColor: C.surface }, pressed && { opacity: 0.92 }]}
                  onPress={() => router.push({ pathname: '/campaign-detail', params: { campaignId: p.campaign.id } })}>
                  <View style={[styles.avatar, { backgroundColor: C.primaryLight }]}>
                    <Text style={[styles.avatarText, { color: C.brinjal1 }]}>{abbr}</Text>
                  </View>

                  <View style={styles.body}>
                    <View style={styles.topRow}>
                      <Text style={[styles.creatorName, { color: C.text }]}>{p.creator.fullName}</Text>
                      <View style={[styles.badge, { backgroundColor: st.bg }]}>
                        <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>

                    {p.creator.location ? (
                      <Text style={[styles.sub, { color: C.textSecondary }]}>📍 {p.creator.location}</Text>
                    ) : null}

                    <Text style={[styles.campaign, { color: C.textSecondary }]} numberOfLines={1}>
                      📋 {p.campaign.title}
                    </Text>

                    <View style={styles.bottomRow}>
                      <Text style={[styles.rate, { color: C.brinjal1 }]}>{p.proposedRate}</Text>
                      <View style={[styles.platformPill, { backgroundColor: C.primaryLight }]}>
                        <Text style={[styles.platformText, { color: C.brinjal1 }]}>{p.campaign.platform}</Text>
                      </View>
                      <Text style={[styles.time, { color: C.textSecondary }]}>{timeAgo(p.createdAt)}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  pageTitle: { fontSize: 22, fontWeight: '800' },
  pendingHint: { fontSize: 12, fontWeight: '500', marginTop: 2, marginBottom: 8 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8, paddingVertical: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
  filterChipText: { fontSize: 12, fontWeight: '500' },

  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 32, paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  card: {
    flexDirection: 'row', borderRadius: 16, padding: 14, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { fontSize: 15, fontWeight: '800' },
  body: { flex: 1, gap: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  creatorName: { fontSize: 14, fontWeight: '700' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sub: { fontSize: 12 },
  campaign: { fontSize: 12 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  rate: { fontSize: 13, fontWeight: '700' },
  platformPill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  platformText: { fontSize: 11, fontWeight: '600' },
  time: { fontSize: 11, marginLeft: 'auto' },
});
