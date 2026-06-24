import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '@/components/BackButton';
import { useAppColors } from '@/context/ThemeContext';
import { campaignService } from '@/services/campaign';
import { F } from '@/utilities/constants';

type Proposal = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  proposedRate: string;
  coverLetter: string;
  createdAt: string;
  creator: { id: string; fullName: string; avatarUrl: string | null; location: string | null };
};

type StatusFilter = 'all' | 'pending' | 'accepted' | 'rejected';

const PAID_ACCENT = '#4F46E5';
const FREE_ACCENT = '#059669';
const PAID_LIGHT  = '#EEF2FF';
const FREE_LIGHT  = '#F0FDF4';

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

function ProposalCard({
  proposal: p,
  isFree,
  acceptLabel,
  onAccept,
  onReject,
  acting,
}: {
  proposal: Proposal;
  isFree: boolean;
  acceptLabel: string;
  onAccept: (p: Proposal) => void;
  onReject: (p: Proposal) => void;
  acting: boolean;
}) {
  const C = useAppColors();
  const accent   = isFree ? FREE_ACCENT : PAID_ACCENT;
  const accentBg = isFree ? FREE_LIGHT  : PAID_LIGHT;
  const st = STATUS_CFG[p.status];

  return (
    <Pressable
      style={[styles.card, { backgroundColor: C.surface, borderLeftColor: accent }]}
      onPress={() =>
        router.push({ pathname: '/(business)/creator-detail', params: { id: p.creator.id } })
      }>
      {/* Creator header */}
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: accentBg }]}>
          <Text style={[styles.avatarText, { color: accent }]}>{initials(p.creator.fullName)}</Text>
        </View>
        <View style={styles.creatorMeta}>
          <Text style={[styles.creatorName, { color: C.text }]}>{p.creator.fullName}</Text>
          {p.creator.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={C.textSecondary} />
              <Text style={[styles.locationText, { color: C.textSecondary }]}>{p.creator.location}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <Ionicons name={st.icon} size={12} color={st.color} />
            <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
          <Text style={[styles.timeText, { color: C.textSecondary }]}>{timeAgo(p.createdAt)}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.cardDivider, { backgroundColor: C.border }]} />

      {/* Cover letter */}
      {p.coverLetter ? (
        <View style={[styles.coverWrap, { backgroundColor: C.background }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={C.textSecondary} style={{ marginTop: 1 }} />
          <Text style={[styles.coverLetter, { color: C.textSecondary }]} numberOfLines={3}>
            {p.coverLetter}
          </Text>
        </View>
      ) : null}

      {/* Rate row */}
      {isFree ? (
        <View style={[styles.freeTag, { backgroundColor: FREE_LIGHT }]}>
          <Ionicons name="gift-outline" size={14} color={FREE_ACCENT} />
          <Text style={[styles.freeTagText, { color: FREE_ACCENT }]}>Free Participation</Text>
        </View>
      ) : (
        <View style={styles.rateRow}>
          <View style={[styles.ratePill, { backgroundColor: PAID_LIGHT }]}>
            <Ionicons name="cash-outline" size={14} color={PAID_ACCENT} />
            <Text style={[styles.rateAmount, { color: PAID_ACCENT }]}>{p.proposedRate}</Text>
          </View>
          <Text style={[styles.rateLabel, { color: C.textSecondary }]}>proposed rate</Text>
        </View>
      )}

      {/* Actions for pending */}
      {p.status === 'pending' && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.declineBtn, { borderColor: C.border, backgroundColor: C.background }]}
            disabled={acting}
            onPress={() => onReject(p)}>
            {acting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                <Text style={[styles.actionText, { color: '#EF4444' }]}>Decline</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={[styles.acceptBtn, { backgroundColor: accent }]}
            disabled={acting}
            onPress={() => onAccept(p)}>
            {acting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={[styles.actionText, { color: '#fff' }]}>{acceptLabel}</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

export default function CampaignProposalsScreen() {
  const C = useAppColors();
  const params = useLocalSearchParams<{
    campaignId: string;
    campaignTitle: string;
    campaignType: string;
    platform: string;
  }>();

  const { campaignId, campaignTitle, platform } = params;
  const isFree     = params.campaignType === 'OPEN_EVENT';
  const accent     = isFree ? FREE_ACCENT : PAID_ACCENT;
  const accentBg   = isFree ? FREE_LIGHT  : PAID_LIGHT;
  const acceptLabel = isFree ? 'Approve' : 'Accept';

  const [proposals, setProposals]       = useState<Proposal[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actingId, setActingId]         = useState<string | null>(null);

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await campaignService.getApplications(campaignId);
      setProposals(data);
    } catch { /* empty state */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { void load(); }, [campaignId]);
  const onRefresh = useCallback(() => void load(true), [campaignId]);

  async function handleAccept(p: Proposal) {
    Alert.alert(
      isFree ? 'Approve Attendance' : 'Accept Proposal',
      isFree
        ? `Approve ${p.creator.fullName} for this event?`
        : `Accept ${p.creator.fullName}'s proposal?\n\nOther pending applicants will be notified that the campaign is closed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: acceptLabel,
          onPress: async () => {
            setActingId(p.id);
            try {
              await campaignService.acceptProposal(campaignId, p.id);
              setProposals((prev) =>
                prev.map((x) => (x.id === p.id ? { ...x, status: 'accepted' } : x)),
              );
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
            } finally {
              setActingId(null);
            }
          },
        },
      ],
    );
  }

  async function handleReject(p: Proposal) {
    Alert.alert(
      'Decline Application',
      `Decline ${p.creator.fullName}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActingId(p.id);
            try {
              await campaignService.rejectProposal(campaignId, p.id);
              setProposals((prev) =>
                prev.map((x) => (x.id === p.id ? { ...x, status: 'rejected' } : x)),
              );
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed');
            } finally {
              setActingId(null);
            }
          },
        },
      ],
    );
  }

  const counts = {
    all:      proposals.length,
    pending:  proposals.filter((p) => p.status === 'pending').length,
    accepted: proposals.filter((p) => p.status === 'accepted').length,
    rejected: proposals.filter((p) => p.status === 'rejected').length,
  };

  const filtered =
    statusFilter === 'all' ? proposals : proposals.filter((p) => p.status === statusFilter);

  type FilterOpt = { key: StatusFilter; label: string; count: number; color: string };
  const FILTERS: FilterOpt[] = [
    { key: 'all',      label: 'All',                                count: counts.all,      color: accent       },
    { key: 'pending',  label: 'Pending',                            count: counts.pending,  color: '#D97706'    },
    { key: 'accepted', label: isFree ? 'Approved' : 'Accepted',     count: counts.accepted, color: '#16A34A'    },
    { key: 'rejected', label: 'Declined',                           count: counts.rejected, color: '#EF4444'    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* Gradient header */}
      <LinearGradient
        colors={['#1e1b4b', '#4338ca', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}>
        <View style={[styles.decCircle1, { backgroundColor: 'rgba(255,255,255,0.07)' }]} />
        <View style={[styles.decCircle2, { backgroundColor: 'rgba(255,255,255,0.04)' }]} />

        {/* Back button row */}
        <View style={styles.headerTopRow}>
          <BackButton />
          {/* Total count pill */}
          <View style={styles.totalPill}>
            <Text style={styles.totalPillText}>
              {proposals.length} application{proposals.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Title + meta */}
        <View style={styles.headerBody}>
          <Text style={styles.headerTitle} numberOfLines={2}>{campaignTitle}</Text>
          <View style={styles.headerBadgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: accentBg }]}>
              <Ionicons name={isFree ? 'gift-outline' : 'cash-outline'} size={12} color={accent} />
              <Text style={[styles.typeBadgeText, { color: accent }]}>
                {isFree ? 'Free Event' : 'Paid Event'}
              </Text>
            </View>
            {platform ? (
              <View style={styles.platformPill}>
                <Text style={styles.platformText}>{platform}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Summary stat pills */}
        <View style={styles.statStrip}>
          <View style={styles.statStripItem}>
            <Text style={styles.statStripNum}>{counts.pending}</Text>
            <Text style={styles.statStripLabel}>Pending</Text>
          </View>
          <View style={[styles.statStripDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.statStripItem}>
            <Text style={[styles.statStripNum, { color: '#6EE7B7' }]}>{counts.accepted}</Text>
            <Text style={styles.statStripLabel}>{isFree ? 'Approved' : 'Accepted'}</Text>
          </View>
          <View style={[styles.statStripDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.statStripItem}>
            <Text style={[styles.statStripNum, { color: '#FCA5A5' }]}>{counts.rejected}</Text>
            <Text style={styles.statStripLabel}>Declined</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter chips */}
      <View style={[styles.filterBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => {
            const active = statusFilter === f.key;
            return (
              <Pressable
                key={f.key}
                style={[
                  styles.filterChip,
                  { borderColor: active ? f.color : C.border },
                  active && { backgroundColor: f.color },
                ]}
                onPress={() => setStatusFilter(f.key)}>
                <Text style={[styles.filterChipText, { color: active ? '#fff' : C.textSecondary }]}>
                  {f.label}
                </Text>
                {f.count > 0 && (
                  <View style={[styles.filterChipBadge, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : C.background }]}>
                    <Text style={[styles.filterChipBadgeText, { color: active ? '#fff' : C.textSecondary }]}>
                      {f.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmpty]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />
          }
          renderItem={({ item }) => (
            <ProposalCard
              proposal={item}
              isFree={isFree}
              acceptLabel={acceptLabel}
              onAccept={handleAccept}
              onReject={handleReject}
              acting={actingId === item.id}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={56} color={C.textSecondary} />
              <Text style={[styles.emptyTitle, { color: C.text }]}>
                {statusFilter === 'all'
                  ? 'No applications yet'
                  : `No ${FILTERS.find((f) => f.key === statusFilter)?.label.toLowerCase()} applications`}
              </Text>
              <Text style={[styles.emptySub, { color: C.textSecondary }]}>
                {statusFilter === 'all'
                  ? 'Creators who apply to this event will appear here.'
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

  // ── Gradient header ──────────────────────────────────────────────────────────
  gradientHeader: {
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  decCircle1: { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -60, right: -30 },
  decCircle2: { position: 'absolute', width: 100, height: 100, borderRadius: 50, bottom: -30, left: 10 },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  totalPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  totalPillText: { fontSize: 12, fontWeight: '600', color: '#fff', fontFamily: F.semibold },

  headerBody: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', fontFamily: F.extrabold, lineHeight: 26 },
  headerBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  platformPill:  { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  platformText:  { fontSize: 11, fontWeight: '600', color: '#fff', fontFamily: F.semibold },

  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 10,
  },
  statStripItem:    { flex: 1, alignItems: 'center', gap: 2 },
  statStripNum:     { fontSize: 18, fontWeight: '800', color: '#fff', fontFamily: F.extrabold },
  statStripLabel:   { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontFamily: F.semibold },
  statStripDivider: { width: 1, height: 32 },

  // ── Filter bar ───────────────────────────────────────────────────────────────
  filterBar:    { borderBottomWidth: StyleSheet.hairlineWidth },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  filterChipText:      { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  filterChipBadge:     { borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  filterChipBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: F.bold },

  // ── List ─────────────────────────────────────────────────────────────────────
  list:      { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },

  // ── Proposal card ─────────────────────────────────────────────────────────────
  card: {
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardHeader:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar:         { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText:     { fontSize: 15, fontWeight: '800', fontFamily: F.extrabold },
  creatorMeta:    { flex: 1, gap: 3 },
  creatorName:    { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  locationRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText:   { fontSize: 11, fontFamily: F.regular },
  cardHeaderRight:{ alignItems: 'flex-end', gap: 4 },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText:     { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  timeText:       { fontSize: 10, fontFamily: F.regular },

  cardDivider: { height: StyleSheet.hairlineWidth },

  coverWrap:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 10 },
  coverLetter: { flex: 1, fontSize: 12, lineHeight: 18, fontStyle: 'italic', fontFamily: F.regular },

  rateRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratePill:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  rateAmount: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  rateLabel:  { fontSize: 11, fontFamily: F.regular },

  freeTag:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  freeTagText: { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  actions:    { flexDirection: 'row', gap: 10 },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5 },
  acceptBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12 },
  actionText: { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  // ── Empty state ───────────────────────────────────────────────────────────────
  empty:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', fontFamily: F.bold },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
});
