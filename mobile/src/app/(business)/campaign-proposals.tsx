import { useCallback, useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
import { useLanguage } from '@/context/LanguageContext';
import { campaignService } from '@/services/campaign';
import { F } from '@/utilities/constants';

type WS = 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED';

type Proposal = {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  workStatus: WS;
  proposedRate: string;
  coverLetter: string;
  createdAt: string;
  paymentStatus: 'UNPAID' | 'PAID' | 'RELEASED';
  paidAt: string | null;
  creator: { id: string; fullName: string; avatarUrl: string | null; location: string | null };
};

type TFn = (key: string) => string;
function projectBtnConfig(ws: WS, t: TFn) {
  if (ws === 'APPROVED')    return { label: t('campaignProposals.projectCompleted'),   icon: 'checkmark-done-circle' as const, color: '#16A34A' };
  if (ws === 'SUBMITTED')   return { label: t('campaignProposals.reviewDeliverables'), icon: 'eye'                   as const, color: '#D97706' };
  if (ws === 'IN_PROGRESS') return { label: t('campaignProposals.creatorIsWorking'),   icon: 'brush'                 as const, color: '#7C3AED' };
  return                           { label: t('campaignProposals.startTheProject'),    icon: 'rocket'                as const, color: '#4F46E5' };
}

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
  onStartProject,
}: {
  proposal: Proposal;
  isFree: boolean;
  acceptLabel: string;
  onAccept: (p: Proposal) => void;
  onReject: (p: Proposal) => void;
  acting: boolean;
  onStartProject?: (p: Proposal) => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const accent   = isFree ? FREE_ACCENT : PAID_ACCENT;
  const accentBg = isFree ? FREE_LIGHT  : PAID_LIGHT;
  const st = STATUS_CFG[p.status];
  const [coverExpanded, setCoverExpanded] = useState(false);

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
            <Text style={[styles.statusText, { color: st.color }]}>
              {p.status === 'pending' ? t('campaignProposals.statusPending') : p.status === 'accepted' ? t('campaignProposals.statusAccepted') : t('campaignProposals.statusRejected')}
            </Text>
          </View>
          <Text style={[styles.timeText, { color: C.textSecondary }]}>{timeAgo(p.createdAt)}</Text>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.cardDivider, { backgroundColor: C.border }]} />

      {/* Cover letter */}
      {p.coverLetter ? (
        <View style={[styles.coverWrap, { backgroundColor: C.background }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={C.textSecondary} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.coverLetter, { color: C.textSecondary }]}
              numberOfLines={coverExpanded ? undefined : 3}>
              {p.coverLetter}
            </Text>
            {p.coverLetter.length > 120 && (
              <Pressable
                onPress={(e) => { e.stopPropagation(); setCoverExpanded((v) => !v); }}
                style={styles.seeMoreBtn}>
                <Text style={[styles.seeMoreText, { color: accent }]}>
                  {coverExpanded ? 'See less' : 'See more'}
                </Text>
                <Ionicons
                  name={coverExpanded ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={accent}
                />
              </Pressable>
            )}
          </View>
        </View>
      ) : null}

      {/* Rate row */}
      {isFree ? (
        <View style={[styles.freeTag, { backgroundColor: FREE_LIGHT }]}>
          <Ionicons name="gift-outline" size={14} color={FREE_ACCENT} />
          <Text style={[styles.freeTagText, { color: FREE_ACCENT }]}>{t('campaignProposals.freeParticipation')}</Text>
        </View>
      ) : (
        <View style={styles.rateRow}>
          <View style={[styles.ratePill, { backgroundColor: PAID_LIGHT }]}>
            <Ionicons name="cash-outline" size={14} color={PAID_ACCENT} />
            <Text style={[styles.rateAmount, { color: PAID_ACCENT }]}>{p.proposedRate}</Text>
          </View>
          <Text style={[styles.rateLabel, { color: C.textSecondary }]}>{t('campaignProposals.proposedRate')}</Text>
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
                <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('campaignProposals.declineBtn')}</Text>
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

      {/* Dynamic project action button — paid campaigns only */}
      {p.status === 'accepted' && !isFree && (() => {
        const cfg = projectBtnConfig(p.workStatus, t);
        return (
          <Pressable
            style={({ pressed }) => [styles.startProjectBtn, { backgroundColor: cfg.color, opacity: pressed ? 0.88 : 1 }]}
            onPress={() => onStartProject && onStartProject(p)}>
            <Ionicons name={cfg.icon} size={16} color="#fff" />
            <Text style={styles.startProjectBtnTxt}>{cfg.label}</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' }} />
          </Pressable>
        );
      })()}
    </Pressable>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

type ModalState = {
  visible:  boolean;
  type:     'accept' | 'reject';
  proposal: Proposal | null;
  loading:  boolean;
};

function ConfirmModal({
  state,
  isFree,
  capacity,
  acceptedCount,
  onConfirm,
  onCancel,
}: {
  state:         ModalState;
  isFree:        boolean;
  capacity:      number | null;
  acceptedCount: number;
  onConfirm:     () => void;
  onCancel:      () => void;
}) {
  const C = useAppColors();
  const p = state.proposal;
  if (!p) return null;

  const isAccept      = state.type === 'accept';
  const slotsAfter    = capacity != null ? acceptedCount + 1 : null;
  const willFill      = capacity != null && slotsAfter === capacity;
  const remainPending = willFill; // backend will auto-decline the rest

  const iconName  = isAccept ? 'checkmark-circle' : 'close-circle';
  const iconColor = isAccept ? (isFree ? FREE_ACCENT : PAID_ACCENT) : '#EF4444';
  const iconBg    = isAccept ? (isFree ? FREE_LIGHT  : PAID_LIGHT)  : '#FEF2F2';

  return (
    <Modal
      visible={state.visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={cm.backdrop}>
        <View style={[cm.sheet, { backgroundColor: C.surface }]}>

          {/* Icon */}
          <View style={[cm.iconCircle, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={36} color={iconColor} />
          </View>

          {/* Title */}
          <Text style={[cm.title, { color: C.text }]}>
            {isAccept
              ? (isFree ? 'Approve Creator?' : 'Accept Proposal?')
              : 'Decline Proposal?'}
          </Text>

          {/* Creator name */}
          <Text style={[cm.creatorName, { color: C.textSecondary }]}>
            {p.creator.fullName}
          </Text>

          {/* Body */}
          <Text style={[cm.body, { color: C.textSecondary }]}>
            {isAccept
              ? (isFree
                  ? `You are about to approve ${p.creator.fullName} for this free event. They will be notified immediately.`
                  : `You are about to accept ${p.creator.fullName}'s proposal${!isFree ? ` for ${p.proposedRate}` : ''}.`)
              : `You are about to decline ${p.creator.fullName}'s application. They will be notified.`}
          </Text>

          {/* Paid: irreversible warning */}
          {isAccept && !isFree && (
            <View style={[cm.warningBox, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
              <Ionicons name="warning-outline" size={16} color="#C2410C" />
              <Text style={[cm.warningText, { color: '#C2410C' }]}>
                Once accepted, this decision cannot be reversed. Please review carefully before confirming.
              </Text>
            </View>
          )}

          {/* Threshold warning */}
          {isAccept && willFill && capacity != null && (
            <View style={[cm.warningBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <Ionicons name="people-outline" size={16} color="#1D4ED8" />
              <Text style={[cm.warningText, { color: '#1D4ED8' }]}>
                This fills the last slot ({slotsAfter}/{capacity}). All other pending applications will be automatically declined.
              </Text>
            </View>
          )}

          {/* Capacity progress if available */}
          {isAccept && capacity != null && !willFill && (
            <View style={[cm.capacityRow, { backgroundColor: C.background }]}>
              <Ionicons name="people-outline" size={14} color={C.textSecondary} />
              <Text style={[cm.capacityText, { color: C.textSecondary }]}>
                Slots: {slotsAfter}/{capacity} after accepting
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={cm.actions}>
            <Pressable
              style={[cm.cancelBtn, { borderColor: C.border, backgroundColor: C.background }]}
              onPress={onCancel}
              disabled={state.loading}>
              <Text style={[cm.cancelText, { color: C.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[cm.confirmBtn, { backgroundColor: isAccept ? iconColor : '#EF4444', opacity: state.loading ? 0.7 : 1 }]}
              onPress={onConfirm}
              disabled={state.loading}>
              {state.loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name={iconName} size={16} color="#fff" />
                  <Text style={cm.confirmText}>
                    {isAccept ? (isFree ? 'Approve' : 'Accept') : 'Decline'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const cm = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  sheet:        { width: '100%', borderRadius: 24, padding: 24, alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  iconCircle:   { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  title:        { fontSize: 20, fontWeight: '700', fontFamily: F.bold, textAlign: 'center' },
  creatorName:  { fontSize: 14, fontFamily: F.semibold, textAlign: 'center', marginTop: -4 },
  body:         { fontSize: 13, fontFamily: F.regular, textAlign: 'center', lineHeight: 20 },
  warningBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, width: '100%' },
  warningText:  { flex: 1, fontSize: 12, fontFamily: F.medium, lineHeight: 18 },
  capacityRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, width: '100%' },
  capacityText: { fontSize: 12, fontFamily: F.semibold },
  actions:      { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  cancelBtn:    { flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  cancelText:   { fontSize: 14, fontWeight: '600', fontFamily: F.semibold },
  confirmBtn:   { flex: 1, height: 46, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  confirmText:  { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: F.bold },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CampaignProposalsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
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
  const acceptLabel = isFree ? t('campaignProposals.approveBtn') : t('campaignProposals.acceptBtn');

  const [proposals, setProposals]       = useState<Proposal[]>([]);
  const [capacity, setCapacity]         = useState<number | null>(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actingId, setActingId]         = useState<string | null>(null);
  const [modal, setModal]               = useState<ModalState>({ visible: false, type: 'accept', proposal: null, loading: false });

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [data, campaign] = await Promise.all([
        campaignService.getApplications(campaignId),
        campaignService.getById(campaignId),
      ]);
      setCapacity((campaign as any).capacity ?? null);
      setProposals(data.map((a) => ({
        ...a,
        workStatus: (a.workStatus ?? 'NONE') as WS,
        paymentStatus: a.paymentStatus ?? 'UNPAID',
        paidAt: a.paidAt ?? null,
      })));
    } catch { /* empty state */ }
    finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { void load(); }, [campaignId]);
  const onRefresh = useCallback(() => void load(true), [campaignId]);

  function handleAccept(p: Proposal) {
    setModal({ visible: true, type: 'accept', proposal: p, loading: false });
  }

  function handleReject(p: Proposal) {
    setModal({ visible: true, type: 'reject', proposal: p, loading: false });
  }

  function closeModal() {
    setModal((m) => ({ ...m, visible: false, loading: false }));
  }

  async function confirmModal() {
    const p = modal.proposal;
    if (!p) return;
    setModal((m) => ({ ...m, loading: true }));
    setActingId(p.id);
    try {
      if (modal.type === 'accept') {
        await campaignService.acceptProposal(campaignId, p.id);
        const newAcceptedCount = proposals.filter((x) => x.status === 'accepted').length + 1;
        const willFill = capacity != null && newAcceptedCount >= capacity;
        setProposals((prev) =>
          prev.map((x) => {
            if (x.id === p.id) return { ...x, status: 'accepted' as const };
            // optimistically auto-decline remaining pending if threshold hit
            if (willFill && x.status === 'pending') return { ...x, status: 'rejected' as const };
            return x;
          }),
        );
      } else {
        await campaignService.rejectProposal(campaignId, p.id);
        setProposals((prev) =>
          prev.map((x) => (x.id === p.id ? { ...x, status: 'rejected' as const } : x)),
        );
      }
      closeModal();
    } catch {
      closeModal();
    } finally {
      setActingId(null);
    }
  }

  function handleStartProject(p: Proposal) {
    router.push({
      pathname: '/(business)/activity-timeline',
      params: {
        campaignId,
        campaignTitle,
        applicationId: p.id,
      },
    });
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
    { key: 'all',      label: t('campaignProposals.filterAll'),                                                    count: counts.all,      color: accent    },
    { key: 'pending',  label: t('campaignProposals.filterPending'),                                                count: counts.pending,  color: '#D97706' },
    { key: 'accepted', label: isFree ? t('campaignProposals.filterApproved') : t('campaignProposals.filterApproved'), count: counts.accepted, color: '#16A34A' },
    { key: 'rejected', label: t('campaignProposals.filterDeclined'),                                               count: counts.rejected, color: '#EF4444' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* Gradient header */}
      <LinearGradient
        colors={['#1e1b4b', '#4338ca', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}>

        {/* Back button row */}
        <View style={styles.headerTopRow}>
          <BackButton />
          {/* Total count pill */}
          <View style={styles.totalPill}>
            <Text style={styles.totalPillText}>
              {t('campaignProposals.applicationCount', { n: proposals.length })}
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
                {isFree ? t('campaignProposals.badgeFreeEvent') : t('campaignProposals.badgePaidEvent')}
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
            <Text style={styles.statStripLabel}>{t('campaignProposals.statPending')}</Text>
          </View>
          <View style={[styles.statStripDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.statStripItem}>
            <Text style={[styles.statStripNum, { color: '#6EE7B7' }]}>{counts.accepted}</Text>
            <Text style={styles.statStripLabel}>{isFree ? t('campaignProposals.statApproved') : t('campaignProposals.statApproved')}</Text>
          </View>
          <View style={[styles.statStripDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
          <View style={styles.statStripItem}>
            <Text style={[styles.statStripNum, { color: '#FCA5A5' }]}>{counts.rejected}</Text>
            <Text style={styles.statStripLabel}>{t('campaignProposals.statDeclined')}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Section label */}
      <View style={styles.sectionLabelRow}>
        <Text style={[styles.sectionLabel, { color: C.text }]}>View Creator Status on Project</Text>
      </View>

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

      <ConfirmModal
        state={modal}
        isFree={isFree}
        capacity={capacity}
        acceptedCount={proposals.filter((p) => p.status === 'accepted').length}
        onConfirm={confirmModal}
        onCancel={closeModal}
      />

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
              onStartProject={handleStartProject}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={56} color={C.textSecondary} />
              <Text style={[styles.emptyTitle, { color: C.text }]}>
                {statusFilter === 'all'
                  ? t('campaignProposals.emptyNoApplications')
                  : t('campaignProposals.emptyNoFiltered', { filter: FILTERS.find((f) => f.key === statusFilter)?.label ?? statusFilter })}
              </Text>
              <Text style={[styles.emptySub, { color: C.textSecondary }]}>
                {statusFilter === 'all'
                  ? t('campaignProposals.emptyAllHint')
                  : t('campaignProposals.emptyFilterHint')}
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
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },

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
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', fontFamily: F.bold, lineHeight: 24 },
  headerBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  platformPill:  { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
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
  statStripNum:     { fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: F.bold },
  statStripLabel:   { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontFamily: F.semibold },
  statStripDivider: { width: 1, height: 32 },

  sectionLabelRow: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  sectionLabel:    { fontSize: 16, fontFamily: F.bold },

  // ── Filter bar ───────────────────────────────────────────────────────────────
  filterBar:    { borderBottomWidth: StyleSheet.hairlineWidth },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
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
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  cardHeader:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar:         { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText:     { fontSize: 15, fontWeight: '700', fontFamily: F.bold },
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
  coverLetter: { fontSize: 12, lineHeight: 18, fontStyle: 'italic', fontFamily: F.regular },
  seeMoreBtn:  { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  seeMoreText: { fontSize: 12, fontWeight: '700', fontFamily: F.bold },

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

  startProjectBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, marginTop: 10 },
  startProjectBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: F.bold },

  // ── Empty state ───────────────────────────────────────────────────────────────
  empty:      { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center', fontFamily: F.bold },
  emptySub:   { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
});
