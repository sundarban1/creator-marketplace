import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/utilities/constants';

const MOCK_PROPOSALS = [
  {
    id: '1',
    creatorName: 'Sarah Johnson',
    creatorHandle: '@sarahjcreates',
    followers: '28.4K',
    platform: 'Instagram',
    campaignTitle: 'Winter Menu Promotion',
    proposedRate: 'NZ$200',
    status: 'pending',
    submittedAt: '2 hours ago',
    avatar: 'SJ',
    avatarBg: '#EDE9FE',
    avatarColor: COLORS.brinjal1,
  },
  {
    id: '2',
    creatorName: 'Mike Chen',
    creatorHandle: '@mikechen.tv',
    followers: '52.1K',
    platform: 'TikTok',
    campaignTitle: 'New Collection Launch',
    proposedRate: 'NZ$380',
    status: 'pending',
    submittedAt: '5 hours ago',
    avatar: 'MC',
    avatarBg: '#DCFCE7',
    avatarColor: COLORS.active,
  },
  {
    id: '3',
    creatorName: 'Priya Patel',
    creatorHandle: '@priyalifestyle',
    followers: '14.9K',
    platform: 'Instagram',
    campaignTitle: 'Winter Menu Promotion',
    proposedRate: 'NZ$175',
    status: 'pending',
    submittedAt: '1 day ago',
    avatar: 'PP',
    avatarBg: '#FEE2E2',
    avatarColor: COLORS.error,
  },
  {
    id: '4',
    creatorName: 'James Liu',
    creatorHandle: '@jamesliu_nz',
    followers: '63.2K',
    platform: 'TikTok',
    campaignTitle: 'New Collection Launch',
    proposedRate: 'NZ$450',
    status: 'accepted',
    submittedAt: '2 days ago',
    avatar: 'JL',
    avatarBg: '#FFF7ED',
    avatarColor: COLORS.draft,
  },
  {
    id: '5',
    creatorName: 'Emma Wilson',
    creatorHandle: '@emmawilson',
    followers: '9.8K',
    platform: 'Instagram',
    campaignTitle: 'Skincare Product Review',
    proposedRate: 'NZ$120',
    status: 'rejected',
    submittedAt: '3 days ago',
    avatar: 'EW',
    avatarBg: '#F3F4F6',
    avatarColor: COLORS.textSecondary,
  },
];

const FILTERS = ['All', 'Pending', 'Accepted', 'Rejected'];

const STATUS_STYLE = {
  pending:  { bg: '#FFF7ED', color: COLORS.draft,  label: 'Pending' },
  accepted: { bg: '#EEF9F3', color: COLORS.active, label: 'Accepted' },
  rejected: { bg: '#F4F4F4', color: COLORS.closed, label: 'Rejected' },
};

export default function ProposalsScreen() {
  const [activeFilter, setActiveFilter] = useState('All');

  const shown = MOCK_PROPOSALS.filter(
    (p) => activeFilter === 'All' || p.status === activeFilter.toLowerCase(),
  );

  const pendingCount = MOCK_PROPOSALS.filter((p) => p.status === 'pending').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.pageTitle}>Proposals</Text>
          {pendingCount > 0 && (
            <Text style={styles.pendingHint}>{pendingCount} pending review</Text>
          )}
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}>
            <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
              {f}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {shown.map((p) => {
          const st = STATUS_STYLE[p.status] ?? STATUS_STYLE.pending;
          return (
            <Pressable
              key={p.id}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}>
              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: p.avatarBg }]}>
                <Text style={[styles.avatarText, { color: p.avatarColor }]}>{p.avatar}</Text>
              </View>

              {/* Info */}
              <View style={styles.body}>
                <View style={styles.topRow}>
                  <Text style={styles.creatorName}>{p.creatorName}</Text>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <Text style={styles.handle}>{p.creatorHandle} · {p.followers} followers</Text>
                <Text style={styles.campaign} numberOfLines={1}>📋 {p.campaignTitle}</Text>
                <View style={styles.bottomRow}>
                  <Text style={styles.rate}>{p.proposedRate}</Text>
                  <Text style={styles.platform}>{p.platform}</Text>
                  <Text style={styles.time}>{p.submittedAt}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        {shown.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No proposals here</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  pendingHint: { fontSize: 12, color: COLORS.draft, fontWeight: '500', marginTop: 2 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: { backgroundColor: COLORS.brinjal1, borderColor: COLORS.brinjal1 },
  filterChipText: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },
  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  avatarText: { fontSize: 15, fontWeight: '800' },
  body: { flex: 1, gap: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  creatorName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  handle: { fontSize: 12, color: COLORS.textSecondary },
  campaign: { fontSize: 12, color: COLORS.textSecondary },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  rate: { fontSize: 13, fontWeight: '700', color: COLORS.brinjal1 },
  platform: {
    fontSize: 11, color: COLORS.brinjal1, fontWeight: '600',
    backgroundColor: COLORS.primaryLight, borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  time: { fontSize: 11, color: COLORS.textSecondary, marginLeft: 'auto' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500' },
});
