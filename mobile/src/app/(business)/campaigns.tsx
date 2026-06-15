import { useState } from 'react';
import { router } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/utilities/constants';

const ALL_CAMPAIGNS = [
  {
    id: '1', title: 'Winter Menu Promotion', platform: 'Instagram Reel',
    budget: 'NZ$150 – NZ$250', status: 'active', proposals: 12,
    inProgress: 2, emoji: '🍽️', cardBg: '#F2E6DC',
  },
  {
    id: '2', title: 'New Collection Launch', platform: 'TikTok Video',
    budget: 'NZ$300 – NZ$500', status: 'active', proposals: 8,
    inProgress: 1, emoji: '👗', cardBg: '#F2DCF0',
  },
  {
    id: '3', title: 'Skincare Product Review', platform: 'Instagram Post',
    budget: 'NZ$100 – NZ$150', status: 'draft', proposals: 0,
    inProgress: 0, emoji: '✨', cardBg: '#DCF2E6',
  },
  {
    id: '4', title: 'Summer Brand Awareness', platform: 'YouTube Short',
    budget: 'NZ$500 – NZ$800', status: 'closed', proposals: 21,
    inProgress: 0, emoji: '☀️', cardBg: '#FFF7ED',
  },
];

// Proposals keyed by campaign id
const PROPOSALS_BY_CAMPAIGN = {
  '1': [
    { id: 'p1', name: 'Sarah Johnson', handle: '@sarahjcreates', followers: '28.4K', rate: 'NZ$200', status: 'pending',     avatar: 'SJ', avatarBg: '#EDE9FE', avatarColor: COLORS.brinjal1 },
    { id: 'p2', name: 'Priya Patel',   handle: '@priyalifestyle', followers: '14.9K', rate: 'NZ$175', status: 'pending',     avatar: 'PP', avatarBg: '#FEE2E2', avatarColor: COLORS.error },
    { id: 'p3', name: 'Tom Baker',     handle: '@tombakes',       followers: '31.2K', rate: 'NZ$220', status: 'pending',     avatar: 'TB', avatarBg: '#EEF9F3', avatarColor: COLORS.active },
  ],
  '2': [
    { id: 'p4', name: 'Mike Chen',     handle: '@mikechen.tv',    followers: '52.1K', rate: 'NZ$380', status: 'pending',    avatar: 'MC', avatarBg: '#DCFCE7', avatarColor: COLORS.active },
    { id: 'p5', name: 'James Liu',     handle: '@jamesliu_nz',    followers: '63.2K', rate: 'NZ$450', status: 'accepted',    avatar: 'JL', avatarBg: '#FFF7ED', avatarColor: COLORS.draft },
  ],
  '3': [],
  '4': [
    { id: 'p6', name: 'Emma Wilson',   handle: '@emmawilson',     followers: '9.8K',  rate: 'NZ$120', status: 'rejected',    avatar: 'EW', avatarBg: '#F3F4F6', avatarColor: COLORS.textSecondary },
    { id: 'p7', name: 'Lena Park',     handle: '@lenapark',       followers: '45.0K', rate: 'NZ$550', status: 'accepted',    avatar: 'LP', avatarBg: '#EDE9FE', avatarColor: COLORS.brinjal1 },
    { id: 'p8', name: 'Chris Ray',     handle: '@chrisray',       followers: '22.5K', rate: 'NZ$480', status: 'accepted',    avatar: 'CR', avatarBg: '#DCFCE7', avatarColor: COLORS.active },
  ],
};

const FILTERS = ['All', 'Active', 'Draft', 'Closed'];

const CAMPAIGN_STATUS = {
  active: { bg: '#EEF9F3', color: COLORS.active,        label: 'Active' },
  draft:  { bg: '#F4F4F4', color: COLORS.closed,        label: 'Draft' },
  closed: { bg: '#FEF3C7', color: COLORS.draft,         label: 'Closed' },
};

const PROPOSAL_STATUS = {
  pending:  { bg: '#FFF7ED', color: COLORS.draft,  label: 'Pending' },
  accepted: { bg: '#EEF9F3', color: COLORS.active, label: 'Accepted' },
  rejected: { bg: '#F4F4F4', color: COLORS.closed, label: 'Rejected' },
};

export default function CampaignsScreen() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const shown = ALL_CAMPAIGNS.filter(
    (c) => activeFilter === 'All' || c.status === activeFilter.toLowerCase(),
  );

  const modalProposals = selectedCampaign
    ? (PROPOSALS_BY_CAMPAIGN[selectedCampaign.id] ?? [])
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Campaigns</Text>
        <Pressable style={styles.newBtn} onPress={() => router.push('/create-campaign')}>
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
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

      {/* Campaign list */}
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {shown.map((c) => {
          const st = CAMPAIGN_STATUS[c.status] ?? CAMPAIGN_STATUS.draft;
          const hasProposals = c.proposals > 0;
          return (
            <View key={c.id} style={styles.card}>
              {/* Main row — tapping edits the campaign */}
              <Pressable
                style={({ pressed }) => [styles.cardMain, pressed && { opacity: 0.88 }]}
                onPress={() =>
                  router.push({ pathname: '/create-campaign', params: { editId: c.id } })
                }>
                <View style={[styles.thumb, { backgroundColor: c.cardBg }]}>
                  <Text style={styles.thumbEmoji}>{c.emoji}</Text>
                </View>
                <View style={styles.body}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>{c.title}</Text>
                    <View style={[styles.badge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.meta}>{c.platform} · {c.budget}</Text>
                  {c.status !== 'draft' ? (
                    <View style={styles.statsRow}>
                      <Text style={styles.stat}>👥 {c.proposals} Proposals</Text>
                      <Text style={styles.stat}>▶ {c.inProgress} In Progress</Text>
                    </View>
                  ) : (
                    <Text style={styles.draftNote}>Draft — tap to edit & publish</Text>
                  )}
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>

              {/* View proposals link */}
              {hasProposals && (
                <>
                  <View style={styles.footerDivider} />
                  <Pressable
                    style={({ pressed }) => [styles.viewProposalsRow, pressed && { opacity: 0.7 }]}
                    onPress={() => setSelectedCampaign(c)}>
                    <Text style={styles.viewProposalsText}>View proposals</Text>
                    <Text style={styles.viewProposalsArrow}>→</Text>
                  </Pressable>
                </>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* ── Proposals bottom sheet ── */}
      <Modal
        visible={!!selectedCampaign}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCampaign(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedCampaign(null)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />

          {/* Modal header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>Proposals</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {selectedCampaign?.title}
              </Text>
            </View>
            <Pressable style={styles.modalClose} onPress={() => setSelectedCampaign(null)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          {/* Proposal list */}
          <ScrollView
            contentContainerStyle={styles.modalList}
            showsVerticalScrollIndicator={false}>
            {modalProposals.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyIcon}>📭</Text>
                <Text style={styles.modalEmptyText}>No proposals yet</Text>
              </View>
            ) : (
              modalProposals.map((p) => {
                const ps = PROPOSAL_STATUS[p.status] ?? PROPOSAL_STATUS.pending;
                return (
                  <View key={p.id} style={styles.proposalCard}>
                    <View style={[styles.proposalAvatar, { backgroundColor: p.avatarBg }]}>
                      <Text style={[styles.proposalAvatarText, { color: p.avatarColor }]}>
                        {p.avatar}
                      </Text>
                    </View>
                    <View style={styles.proposalBody}>
                      <View style={styles.proposalTopRow}>
                        <Text style={styles.proposalName}>{p.name}</Text>
                        <View style={[styles.proposalBadge, { backgroundColor: ps.bg }]}>
                          <Text style={[styles.proposalBadgeText, { color: ps.color }]}>
                            {ps.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.proposalHandle}>{p.handle} · {p.followers} followers</Text>
                      <Text style={styles.proposalRate}>{p.rate}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  newBtn: {
    backgroundColor: COLORS.brinjal1, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, paddingBottom: 16 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  filterChipActive: { backgroundColor: COLORS.brinjal1, borderColor: COLORS.brinjal1 },
  filterChipText: { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },

  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 40 },

  /* Card */
  card: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
    overflow: 'hidden',
  },
  cardMain: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, gap: 12,
  },
  thumb: {
    width: 72, height: 72, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  thumbEmoji: { fontSize: 28 },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.text, flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 12, color: COLORS.textSecondary },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 },
  stat: { fontSize: 11, color: COLORS.textSecondary },
  draftNote: { fontSize: 11, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 2 },
  chevron: { fontSize: 22, color: COLORS.border, flexShrink: 0 },

  /* View proposals footer */
  footerDivider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 12 },
  viewProposalsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 4, paddingHorizontal: 14, paddingVertical: 9,
  },
  viewProposalsText: { fontSize: 12, fontWeight: '700', color: COLORS.brinjal1 },
  viewProposalsArrow: { fontSize: 13, color: COLORS.brinjal1 },

  /* Modal */
  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '75%',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 }, elevation: 20,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalHeaderText: { flex: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  modalClose: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.background,
    justifyContent: 'center', alignItems: 'center',
  },
  modalCloseText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },
  modalList: { padding: 16, gap: 12, paddingBottom: 40 },
  modalEmpty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  modalEmptyIcon: { fontSize: 40 },
  modalEmptyText: { fontSize: 14, color: COLORS.textSecondary },

  /* Proposal row inside modal */
  proposalCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: 14,
    padding: 12, gap: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  proposalAvatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  proposalAvatarText: { fontSize: 14, fontWeight: '800' },
  proposalBody: { flex: 1, gap: 3 },
  proposalTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proposalName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  proposalBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  proposalBadgeText: { fontSize: 11, fontWeight: '700' },
  proposalHandle: { fontSize: 12, color: COLORS.textSecondary },
  proposalRate: { fontSize: 13, fontWeight: '700', color: COLORS.brinjal1, marginTop: 2 },
});
