import { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { campaignService } from '@/services/campaign';
import { F } from '@/utilities/constants';

type Proposal = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  proposedRate: string;
  coverLetter: string;
  createdAt: string;
  campaign: { id: string; title: string; platform: string };
  creator: { id: string; fullName: string; avatarUrl: string | null; location: string | null };
};

type CampaignSection = {
  campaign: { id: string; title: string; platform: string };
  latestAt: string;
  data: Proposal[];
};

type Filter = 'All' | 'Pending' | 'Accepted' | 'Rejected';

const STATUS_CFG = {
  pending:  { bg: '#FFF7ED', color: '#D97706', icon: 'time-outline'         as const, label: 'Pending'  },
  accepted: { bg: '#ECFDF5', color: '#16A34A', icon: 'checkmark-circle'     as const, label: 'Accepted' },
  rejected: { bg: '#FEF2F2', color: '#EF4444', icon: 'close-circle-outline' as const, label: 'Rejected' },
};

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

function groupByCampaign(proposals: Proposal[]): CampaignSection[] {
  const map = new Map<string, CampaignSection>();
  for (const p of proposals) {
    const key = p.campaign.id;
    if (!map.has(key)) {
      map.set(key, { campaign: p.campaign, latestAt: p.createdAt, data: [] });
    }
    const g = map.get(key)!;
    g.data.push(p);
    if (p.createdAt > g.latestAt) g.latestAt = p.createdAt;
  }
  return Array.from(map.values())
    .sort((a, b) => b.latestAt.localeCompare(a.latestAt))
    .map((g) => ({ ...g, data: [...g.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }));
}

function ProposalCard({
  proposal: p,
  onAccept,
  onReject,
  acting,
}: {
  proposal: Proposal;
  onAccept: (p: Proposal) => void;
  onReject: (p: Proposal) => void;
  acting: boolean;
}) {
  const C = useAppColors();
  const st = STATUS_CFG[p.status];

  return (
    <Pressable
      style={[styles.card, { backgroundColor: C.surface }]}
      onPress={() => router.push({ pathname: '/(business)/creator-detail', params: { id: p.creator.id } })}>

      {/* Creator row */}
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: C.primaryLight }]}>
          <Text style={[styles.avatarText, { color: C.brinjal1 }]}>{initials(p.creator.fullName)}</Text>
        </View>
        <View style={styles.creatorInfo}>
          <Text style={[styles.creatorName, { color: C.text }]}>{p.creator.fullName}</Text>
          {p.creator.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={11} color={C.textSecondary} />
              <Text style={[styles.locationText, { color: C.textSecondary }]}>{p.creator.location}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
          <Ionicons name={st.icon} size={12} color={st.color} />
          <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      {/* Cover letter */}
      {p.coverLetter ? (
        <Text style={[styles.coverLetter, { color: C.textSecondary }]} numberOfLines={2}>
          {p.coverLetter}
        </Text>
      ) : null}

      {/* Rate + time */}
      <View style={styles.metaRow}>
        <View style={styles.rateWrap}>
          <Ionicons name="cash-outline" size={13} color={C.brinjal1} />
          <Text style={[styles.rate, { color: C.brinjal1 }]}>{p.proposedRate}</Text>
        </View>
        <Text style={[styles.time, { color: C.textSecondary }]}>{timeAgo(p.createdAt)}</Text>
      </View>

      {/* Actions — pending only */}
      {p.status === 'pending' && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.actionBtn, styles.rejectBtn, { borderColor: C.border }]}
            disabled={acting}
            onPress={() => onReject(p)}>
            {acting
              ? <ActivityIndicator size="small" color="#EF4444" />
              : <><Ionicons name="close" size={15} color="#EF4444" /><Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Reject</Text></>}
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: C.brinjal1 }]}
            disabled={acting}
            onPress={() => onAccept(p)}>
            {acting
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="checkmark" size={15} color="#fff" /><Text style={[styles.actionBtnText, { color: '#fff' }]}>Accept</Text></>}
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

export default function ProposalsScreen() {
  const C = useAppColors();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [actingId, setActingId] = useState<string | null>(null);

  async function loadProposals(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { proposals: data } = await campaignService.getBusinessProposals({ limit: 200 });
      setProposals(data);
    } catch { /* empty state handles it */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { void loadProposals(); }, []);
  const onRefresh = useCallback(() => void loadProposals(true), []);

  async function handleAccept(p: Proposal) {
    Alert.alert(
      'Accept Proposal',
      `Accept ${p.creator.fullName}'s proposal for "${p.campaign.title}"?\n\nOther pending applicants will be notified that the campaign is closed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setActingId(p.id);
            try {
              await campaignService.acceptProposal(p.campaign.id, p.id);
              setProposals((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: 'accepted' } : x)));
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to accept proposal');
            } finally { setActingId(null); }
          },
        },
      ],
    );
  }

  async function handleReject(p: Proposal) {
    Alert.alert(
      'Reject Proposal',
      `Reject ${p.creator.fullName}'s proposal for "${p.campaign.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActingId(p.id);
            try {
              await campaignService.rejectProposal(p.campaign.id, p.id);
              setProposals((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: 'rejected' } : x)));
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to reject proposal');
            } finally { setActingId(null); }
          },
        },
      ],
    );
  }

  const filtered = proposals.filter(
    (p) => activeFilter === 'All' || p.status === activeFilter.toLowerCase(),
  );
  const sections = groupByCampaign(filtered);

  const counts = {
    pending:  proposals.filter((p) => p.status === 'pending').length,
    accepted: proposals.filter((p) => p.status === 'accepted').length,
    rejected: proposals.filter((p) => p.status === 'rejected').length,
  };

  const STAT_TABS: { label: string; val: number; color: string; filter: Filter }[] = [
    { label: 'Total',    val: proposals.length, color: C.brinjal1, filter: 'All'      },
    { label: 'Pending',  val: counts.pending,   color: '#D97706',  filter: 'Pending'  },
    { label: 'Accepted', val: counts.accepted,  color: '#16A34A',  filter: 'Accepted' },
    { label: 'Rejected', val: counts.rejected,  color: '#EF4444',  filter: 'Rejected' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={['#1e1b4b', '#4338ca', '#7c3aed']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientHeader}>
        <View style={[styles.decCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[styles.decCircle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
        <View style={styles.header}>
          <Text style={[styles.pageTitle, { color: '#fff' }]}>Proposals</Text>
          <Text style={[styles.pageSub, { color: 'rgba(255,255,255,0.75)' }]}>Review and manage creator applications</Text>
        </View>
      </LinearGradient>

      {/* Stat filter cards */}
      <View style={styles.statsRow}>
        {STAT_TABS.map((s) => {
          const active = activeFilter === s.filter;
          return (
            <Pressable
              key={s.label}
              style={[styles.statCard, { backgroundColor: C.surface }, active && { backgroundColor: s.color }]}
              onPress={() => setActiveFilter(s.filter)}>
              <Text style={[styles.statVal, { color: active ? '#fff' : s.color }]}>{s.val}</Text>
              <Text style={[styles.statLabel, { color: active ? 'rgba(255,255,255,0.8)' : C.textSecondary }]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(p) => p.id}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, sections.length === 0 && styles.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
          renderSectionHeader={({ section }) => {
            const pending  = section.data.filter((p) => p.status === 'pending').length;
            const accepted = section.data.filter((p) => p.status === 'accepted').length;
            return (
              <View style={[styles.sectionHeader, { backgroundColor: C.background }]}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={[styles.platformPill, { backgroundColor: C.primaryLight }]}>
                    <Text style={[styles.platformText, { color: C.brinjal1 }]}>{section.campaign.platform}</Text>
                  </View>
                  <Text style={[styles.sectionTitle, { color: C.text }]} numberOfLines={1}>
                    {section.campaign.title}
                  </Text>
                </View>
                <View style={styles.sectionMeta}>
                  <Text style={[styles.sectionCount, { color: C.textSecondary }]}>
                    {section.data.length} proposal{section.data.length !== 1 ? 's' : ''}
                  </Text>
                  {pending > 0 && (
                    <View style={styles.pendingDot}>
                      <Text style={styles.pendingDotText}>{pending} pending</Text>
                    </View>
                  )}
                  {accepted > 0 && (
                    <View style={styles.acceptedDot}>
                      <Text style={styles.acceptedDotText}>✓ selected</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <ProposalCard
                proposal={item}
                onAccept={handleAccept}
                onReject={handleReject}
                acting={actingId === item.id}
              />
            </View>
          )}
          SectionSeparatorComponent={() => <View style={styles.sectionSep} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={52} color={C.textSecondary} />
              <Text style={[styles.emptyTitle, { color: C.text }]}>
                {activeFilter === 'All' ? 'No proposals yet' : `No ${activeFilter.toLowerCase()} proposals`}
              </Text>
              <Text style={[styles.emptySub, { color: C.textSecondary }]}>
                {activeFilter === 'All'
                  ? 'Proposals from creators will appear here when they apply to your campaigns.'
                  : 'Try a different filter above.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gradientHeader: { paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  decCircle1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, top: -70, right: -40 },
  decCircle2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, bottom: -35, left: 15 },

  header:    { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, gap: 3 },
  pageTitle: { fontSize: 22, fontWeight: '800', fontFamily: F.extrabold },
  pageSub:   { fontSize: 13, fontFamily: F.regular },

  statsRow:  { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 16, marginBottom: 8 },
  statCard:  { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', gap: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  statVal:   { fontSize: 20, fontWeight: '800', fontFamily: F.extrabold },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', fontFamily: F.semibold },

  list:      { paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },

  sectionHeader:     { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle:      { fontSize: 15, fontWeight: '700', flex: 1, fontFamily: F.bold },
  platformPill:      { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  platformText:      { fontSize: 10, fontWeight: '700', fontFamily: F.bold },
  sectionMeta:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionCount:      { fontSize: 12, fontFamily: F.regular },
  pendingDot:        { backgroundColor: '#FFF7ED', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  pendingDotText:    { fontSize: 11, fontWeight: '700', color: '#D97706', fontFamily: F.bold },
  acceptedDot:       { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  acceptedDotText:   { fontSize: 11, fontWeight: '700', color: '#16A34A', fontFamily: F.bold },
  sectionSep:        { height: 8 },

  cardWrap: { paddingHorizontal: 20, marginBottom: 8 },
  card: {
    borderRadius: 16, padding: 14, gap: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar:      { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText:  { fontSize: 14, fontWeight: '800', fontFamily: F.extrabold },
  creatorInfo: { flex: 1, gap: 2 },
  creatorName: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText:{ fontSize: 11, fontFamily: F.regular },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText:  { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  coverLetter: { fontSize: 12, lineHeight: 17, fontStyle: 'italic', fontFamily: F.regular },
  metaRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rateWrap:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rate:        { fontSize: 13, fontWeight: '700', fontFamily: F.bold },
  time:        { fontSize: 11, fontFamily: F.regular },
  actions:     { flexDirection: 'row', gap: 10, marginTop: 2 },
  actionBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 10 },
  rejectBtn:   { borderWidth: 1.5 },
  actionBtnText: { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  empty:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', fontFamily: F.bold },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
});
