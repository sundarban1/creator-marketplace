import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
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
import { CATEGORY_META, DEFAULT_META, cardBg } from '@/features/creator/data/filterOptions';
import type { Campaign } from '@/types';

type Application = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  proposedRate: string;
  createdAt: string;
  creator: { fullName: string; avatarUrl: string | null; location: string | null };
};

const FILTERS = ['All', 'Active', 'Draft', 'Closed'] as const;

const STATUS_CFG = {
  active: { bg: '#EEF9F3', color: '#16A34A', label: 'Active' },
  draft:  { bg: '#F4F4F4', color: '#6B7280', label: 'Draft' },
  closed: { bg: '#FEF3C7', color: '#D97706', label: 'Closed' },
} as const;

const PROPOSAL_STATUS_CFG = {
  pending:  { bg: '#FFF7ED', color: '#D97706', label: 'Pending' },
  accepted: { bg: '#EEF9F3', color: '#16A34A', label: 'Accepted' },
  rejected: { bg: '#F3F4F6', color: '#6B7280', label: 'Rejected' },
} as const;

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function CampaignsScreen() {
  const C = useAppColors();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<typeof FILTERS[number]>('All');

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  async function loadCampaigns(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { campaigns: data } = await campaignService.listMy({ limit: 50 });
      setCampaigns(data);
    } catch {
      // silently fail — empty state handles it
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { loadCampaigns(); }, []);

  const onRefresh = useCallback(() => loadCampaigns(true), []);

  async function openProposals(c: Campaign) {
    setSelectedCampaign(c);
    setApplications([]);
    setAppsLoading(true);
    try {
      const data = await campaignService.getApplications(c.id);
      setApplications(data);
    } catch {
      setApplications([]);
    } finally {
      setAppsLoading(false);
    }
  }

  const shown = campaigns.filter((c) =>
    activeFilter === 'All' || c.status === activeFilter.toLowerCase()
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: C.text }]}>Campaigns</Text>
        <Pressable
          style={[styles.newBtn, { backgroundColor: C.brinjal1 }]}
          onPress={() => router.push('/create-campaign')}>
          <Text style={styles.newBtnText}>+ New</Text>
        </Pressable>
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

      {/* Campaign list */}
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
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyTitle, { color: C.text }]}>
                {activeFilter === 'All' ? 'No campaigns yet' : `No ${activeFilter.toLowerCase()} campaigns`}
              </Text>
              <Text style={[styles.emptySub, { color: C.textSecondary }]}>
                {activeFilter === 'All' ? 'Create your first campaign to find creators.' : 'Try a different filter.'}
              </Text>
              {activeFilter === 'All' && (
                <Pressable
                  style={[styles.emptyBtn, { backgroundColor: C.brinjal1 }]}
                  onPress={() => router.push('/create-campaign')}>
                  <Text style={styles.emptyBtnText}>Create Campaign</Text>
                </Pressable>
              )}
            </View>
          ) : (
            shown.map((c) => {
              const st = STATUS_CFG[c.status ?? 'draft'];
              const meta = CATEGORY_META[c.category] ?? DEFAULT_META;
              const bg = cardBg(c.category);
              return (
                <View key={c.id} style={[styles.card, { backgroundColor: C.surface }]}>
                  <Pressable
                    style={({ pressed }) => [styles.cardMain, pressed && { opacity: 0.88 }]}
                    onPress={() => router.push({ pathname: '/campaign-detail', params: { campaignId: c.id } })}>
                    <View style={[styles.thumb, { backgroundColor: bg }]}>
                      <Text style={styles.thumbEmoji}>{meta.emoji}</Text>
                    </View>
                    <View style={styles.body}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>{c.title}</Text>
                        <View style={[styles.badge, { backgroundColor: st.bg }]}>
                          <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                        </View>
                      </View>
                      <Text style={[styles.meta, { color: C.textSecondary }]}>
                        {c.platform} · {c.budget}
                      </Text>
                      {(c.status === 'draft') ? (
                        <Text style={[styles.draftNote, { color: C.textSecondary }]}>
                          Draft — tap to view & edit
                        </Text>
                      ) : (
                        <Text style={[styles.stat, { color: C.textSecondary }]}>
                          👥 {c.proposals} {c.proposals === 1 ? 'Proposal' : 'Proposals'}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.chevron, { color: C.border }]}>›</Text>
                  </Pressable>

                  {c.proposals > 0 && (
                    <>
                      <View style={[styles.footerDivider, { backgroundColor: C.border }]} />
                      <Pressable
                        style={({ pressed }) => [styles.viewProposalsRow, pressed && { opacity: 0.7 }]}
                        onPress={() => openProposals(c)}>
                        <Text style={[styles.viewProposalsText, { color: C.brinjal1 }]}>
                          View proposals
                        </Text>
                        <Text style={[styles.viewProposalsArrow, { color: C.brinjal1 }]}>→</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Proposals bottom sheet */}
      <Modal
        visible={!!selectedCampaign}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCampaign(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedCampaign(null)} />
        <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
          <View style={[styles.modalHandle, { backgroundColor: C.border }]} />

          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <View style={styles.modalHeaderText}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Proposals</Text>
              <Text style={[styles.modalSubtitle, { color: C.textSecondary }]} numberOfLines={1}>
                {selectedCampaign?.title}
              </Text>
            </View>
            <Pressable
              style={[styles.modalClose, { backgroundColor: C.background }]}
              onPress={() => setSelectedCampaign(null)}>
              <Text style={[styles.modalCloseText, { color: C.textSecondary }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
            {appsLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color={C.brinjal1} />
              </View>
            ) : applications.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyIcon}>📭</Text>
                <Text style={[styles.modalEmptyText, { color: C.textSecondary }]}>No proposals yet</Text>
              </View>
            ) : (
              applications.map((a) => {
                const ps = PROPOSAL_STATUS_CFG[a.status];
                const abbr = initials(a.creator.fullName);
                return (
                  <View key={a.id} style={[styles.proposalCard, { backgroundColor: C.background, borderColor: C.border }]}>
                    <View style={[styles.proposalAvatar, { backgroundColor: C.primaryLight }]}>
                      <Text style={[styles.proposalAvatarText, { color: C.brinjal1 }]}>{abbr}</Text>
                    </View>
                    <View style={styles.proposalBody}>
                      <View style={styles.proposalTopRow}>
                        <Text style={[styles.proposalName, { color: C.text }]}>{a.creator.fullName}</Text>
                        <View style={[styles.proposalBadge, { backgroundColor: ps.bg }]}>
                          <Text style={[styles.proposalBadgeText, { color: ps.color }]}>{ps.label}</Text>
                        </View>
                      </View>
                      {a.creator.location ? (
                        <Text style={[styles.proposalSub, { color: C.textSecondary }]}>📍 {a.creator.location}</Text>
                      ) : null}
                      <Text style={[styles.proposalRate, { color: C.brinjal1 }]}>{a.proposedRate}</Text>
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
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '800' },
  newBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, paddingBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  filterChipText: { fontSize: 12, fontWeight: '500' },

  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 12, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  card: {
    borderRadius: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3, overflow: 'hidden',
  },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  thumb: { width: 72, height: 72, borderRadius: 12, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  thumbEmoji: { fontSize: 28 },
  body: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontSize: 14, fontWeight: '700', flex: 1 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 12 },
  stat: { fontSize: 11, marginTop: 2 },
  draftNote: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  chevron: { fontSize: 22, flexShrink: 0 },

  footerDivider: { height: 1, marginHorizontal: 12 },
  viewProposalsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 4, paddingHorizontal: 14, paddingVertical: 9,
  },
  viewProposalsText: { fontSize: 12, fontWeight: '700' },
  viewProposalsArrow: { fontSize: 13 },

  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 }, elevation: 20,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  modalHeaderText: { flex: 1 },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  modalSubtitle: { fontSize: 13, marginTop: 2 },
  modalClose: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { fontSize: 12, fontWeight: '700' },
  modalList: { padding: 16, gap: 12, paddingBottom: 40 },
  modalEmpty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  modalEmptyIcon: { fontSize: 40 },
  modalEmptyText: { fontSize: 14 },

  proposalCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 12, gap: 12, borderWidth: 1,
  },
  proposalAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  proposalAvatarText: { fontSize: 14, fontWeight: '800' },
  proposalBody: { flex: 1, gap: 3 },
  proposalTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proposalName: { fontSize: 14, fontWeight: '700' },
  proposalBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  proposalBadgeText: { fontSize: 11, fontWeight: '700' },
  proposalSub: { fontSize: 12 },
  proposalRate: { fontSize: 13, fontWeight: '700', marginTop: 2 },
});
