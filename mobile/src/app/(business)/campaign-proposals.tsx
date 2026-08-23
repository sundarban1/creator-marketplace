import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { FontAwesome5 } from '@expo/vector-icons';
import { BackButton } from '@/components/BackButton';
import { EmptyState } from '@/components/EmptyState';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { campaignService } from '@/services/campaign';
import { creatorService, type CampaignInvitee } from '@/services/creator';
import { contractService, type Contract } from '@/services/contract';
import { ContractModal } from '@/components/ContractModal';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';

type WS = 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED' | 'DISPUTED';
type PS = 'UNPAID' | 'PAID' | 'RELEASED';

type Proposal = {
  id: string;
  status: 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired';
  workStatus: WS;
  proposedRate: string;
  coverLetter: string;
  createdAt: string;
  paymentStatus: PS;
  paidAt: string | null;
  creator: { id: string; fullName: string; avatarUrl: string | null; location: string | null };
};

type TFn = (key: string) => string;
// Mirrors the stage logic in activity-timeline.tsx so the card's status always
// agrees with the timeline (workStatus alone isn't enough — APPROVED needs
// paymentStatus to tell "awaiting release" from "released" from "completed").
// Paid campaigns only — a free event's accepted card is terminal and never
// opens a project workspace (see ProposalCard).
function projectBtnConfig(ws: WS, paymentStatus: PS, t: TFn) {
  // A reported issue parks the job outside the normal flow for both sides
  // until Kolab support resolves it (see reportIssue) — checked first, since
  // it can only be reached from SUBMITTED.
  if (ws === 'DISPUTED')   return { label: t('campaignProposals.issueReported'),          icon: 'exclamation-triangle' as const, color: '#EF4444' };
  if (ws === 'COMPLETED') return { label: t('campaignProposals.paymentReleased'),        icon: 'money-bill-alt'                  as const, color: '#0EA5E9' };
  if (ws === 'APPROVED' && paymentStatus === 'RELEASED')
                           return { label: t('campaignProposals.paymentReleased'),        icon: 'money-bill-alt'                  as const, color: '#0EA5E9' };
  if (ws === 'APPROVED')   return { label: t('campaignProposals.awaitingPaymentRelease'), icon: 'hourglass'     as const, color: '#EA580C' };
  if (ws === 'SUBMITTED')  return { label: t('campaignProposals.reviewDeliverables'),     icon: 'eye'                   as const, color: '#D97706' };
  if (ws === 'IN_PROGRESS')return { label: t('campaignProposals.creatorIsWorking'),       icon: 'brush'                 as const, color: '#7C3AED' };
  if (paymentStatus === 'PAID')
                           return { label: t('activityTimeline.statusWaitingOnCreator'),   icon: 'hourglass'     as const, color: '#0EA5E9' };
  return                          { label: t('activityTimeline.statusWaitingPayment'),     icon: 'credit-card'          as const, color: '#EF4444' };
}

// 'invited' exists only for free events, whose tabs are
// Request / Approved / Declined / Invited — it lists CampaignInvitation rows
// (creators the business reached out to) rather than applications.
type StatusFilter = 'all' | 'pending' | 'shortlisted' | 'accepted' | 'rejected' | 'expired' | 'invited';

const PAID_ACCENT = '#4F46E5';
const FREE_ACCENT = '#059669';
const PAID_LIGHT  = '#EEF2FF';
const FREE_LIGHT  = '#F0FDF4';

const STATUS_CFG = {
  pending:     { bg: '#FFF7ED', color: '#D97706', icon: 'clock'         as const, label: 'Pending'     },
  shortlisted: { bg: '#EFF6FF', color: '#0369A1', icon: 'star'          as const, label: 'Shortlisted' },
  accepted:    { bg: '#ECFDF5', color: '#16A34A', icon: 'check-circle'  as const, label: 'Accepted'    },
  rejected:    { bg: '#FEF2F2', color: '#EF4444', icon: 'times-circle'  as const, label: 'Rejected'    },
  expired:     { bg: '#F3F4F6', color: '#6B7280', icon: 'hourglass-end' as const, label: 'Expired'     },
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
  onShortlist,
  acting,
  onStartProject,
  campaignInactive,
}: {
  proposal: Proposal;
  isFree: boolean;
  acceptLabel: string;
  onAccept: (p: Proposal) => void;
  onReject: (p: Proposal) => void;
  onShortlist: (p: Proposal) => void;
  acting: boolean;
  onStartProject?: (p: Proposal) => void;
  campaignInactive: boolean;
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
          {p.creator.avatarUrl ? (
            <Image source={{ uri: p.creator.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <Text style={[styles.avatarText, { color: accent }]}>{initials(p.creator.fullName)}</Text>
          )}
        </View>
        <View style={styles.creatorMeta}>
          <Text style={[styles.creatorName, { color: C.text }]}>{p.creator.fullName}</Text>
          {p.creator.location ? (
            <View style={styles.locationRow}>
              <FontAwesome5 name="map-marker-alt" solid size={12} color={C.textSecondary} />
              <Text style={[styles.locationText, { color: C.textSecondary }]}>{p.creator.location}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
            <FontAwesome5 name={st.icon} size={12} color={st.color} />
            <Text style={[styles.statusText, { color: st.color }]}>
              {p.status === 'pending' ? t('campaignProposals.statusPending')
                : p.status === 'shortlisted' ? t('campaignProposals.statusShortlisted')
                : p.status === 'accepted' ? t('campaignProposals.statusAccepted')
                : p.status === 'expired' ? t('campaignProposals.statusExpired')
                : t('campaignProposals.statusRejected')}
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
          <FontAwesome5 name="comment-alt" size={13} color={C.textSecondary} style={{ marginTop: 2 }} />
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
                <FontAwesome5
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
          <FontAwesome5 name="gift" size={12} color={FREE_ACCENT} solid />
          <Text style={[styles.freeTagText, { color: FREE_ACCENT }]}>{t('campaignProposals.freeParticipation')}</Text>
        </View>
      ) : (
        <View style={styles.rateRow}>
          <View style={[styles.ratePill, { backgroundColor: PAID_LIGHT }]}>
            <FontAwesome5 name="money-bill-wave" size={12} color={PAID_ACCENT} solid />
            <Text style={[styles.rateAmount, { color: PAID_ACCENT }]}>{p.proposedRate}</Text>
          </View>
          <Text style={[styles.rateLabel, { color: C.textSecondary }]}>{t('campaignProposals.proposedRate')}</Text>
        </View>
      )}

      {/* Actions for pending/shortlisted — shortlist toggles between the two,
          accept/reject work from either (backend never checked prior status). */}
      {(p.status === 'pending' || p.status === 'shortlisted') && (
        <>
          <View style={styles.actions}>
            {/* Shortlisting is a paid-campaign shortlist-then-decide step. A
                free event only ever answers a request with approve/decline,
                so the star is hidden there entirely. */}
            {!isFree && (
              <Pressable
                style={[
                  styles.shortlistBtn,
                  { borderColor: p.status === 'shortlisted' ? '#0369A1' : C.border, backgroundColor: p.status === 'shortlisted' ? '#EFF6FF' : C.background },
                  campaignInactive && styles.actionBtnDisabled,
                ]}
                disabled={acting || campaignInactive}
                hitSlop={4}
                onPress={() => onShortlist(p)}
                accessibilityLabel={t('campaignProposals.shortlistBtn')}>
                <FontAwesome5 name="star" solid={p.status === 'shortlisted'} size={16} color={p.status === 'shortlisted' ? '#0369A1' : C.textSecondary} />
              </Pressable>
            )}
            <Pressable
              style={[styles.declineBtn, { borderColor: C.border, backgroundColor: C.background }, campaignInactive && styles.actionBtnDisabled]}
              disabled={acting || campaignInactive}
              onPress={() => onReject(p)}>
              {acting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <FontAwesome5 name="times-circle" solid size={16} color="#EF4444" />
                  <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('campaignProposals.declineBtn')}</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.acceptBtn, { backgroundColor: accent }, campaignInactive && styles.actionBtnDisabled]}
              disabled={acting || campaignInactive}
              onPress={() => onAccept(p)}>
              {acting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome5 name="check-circle" solid size={16} color="#fff" />
                  <Text style={[styles.actionText, { color: '#fff' }]}>{acceptLabel}</Text>
                </>
              )}
            </Pressable>
          </View>
          {campaignInactive && (
            <View style={styles.readOnlyNotice}>
              <FontAwesome5 name="info-circle" size={12} color={C.textSecondary} />
              <Text style={[styles.readOnlyNoticeText, { color: C.textSecondary }]}>
                {t('campaignProposals.readOnlyEventEnded')}
              </Text>
            </View>
          )}
        </>
      )}

      {/* Approving a creator for a free event is the end of the flow — there
          is no payment, no deliverable to submit and no work to start — so
          the card just states that instead of opening a project workspace. */}
      {p.status === 'accepted' && isFree && (
        <View style={[styles.confirmedRow, { backgroundColor: FREE_LIGHT, borderColor: '#A7F3D0' }]}>
          <FontAwesome5 name="check-circle" solid size={16} color={FREE_ACCENT} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.confirmedTitle, { color: FREE_ACCENT }]}>{t('campaignProposals.freeConfirmedTitle')}</Text>
            <Text style={[styles.confirmedSub, { color: C.textSecondary }]}>{t('campaignProposals.freeConfirmedSub')}</Text>
          </View>
        </View>
      )}

      {/* Dynamic project action button — paid campaigns only; the free-event
          branch above replaces it. */}
      {p.status === 'accepted' && !isFree && (() => {
        const cfg = projectBtnConfig(p.workStatus, p.paymentStatus, t);
        return (
          <Pressable
            style={({ pressed }) => [
              styles.startProjectBtn,
              {
                backgroundColor: cfg.color, opacity: pressed ? 0.88 : 1, shadowColor: cfg.color,
                shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
              },
            ]}
            onPress={() => onStartProject && onStartProject(p)}>
            <FontAwesome5 name={cfg.icon} size={16} color="#fff" />
            <Text style={styles.startProjectBtnTxt}>{cfg.label}</Text>
            <FontAwesome5 name="chevron-right" solid size={14} color="rgba(255,255,255,0.7)" style={{ marginLeft: 'auto' }} />
          </Pressable>
        );
      })()}
    </Pressable>
  );
}

// ─── Invited Card ─────────────────────────────────────────────────────────────

const INVITE_CFG = {
  PENDING:  { bg: '#FFF7ED', color: '#D97706', icon: 'paper-plane'  as const, labelKey: 'campaignProposals.inviteStatusPending'  },
  ACCEPTED: { bg: '#ECFDF5', color: '#16A34A', icon: 'check-circle' as const, labelKey: 'campaignProposals.inviteStatusAccepted' },
  DECLINED: { bg: '#FEF2F2', color: '#EF4444', icon: 'times-circle' as const, labelKey: 'campaignProposals.inviteStatusDeclined' },
};

// One creator the business invited to this event. Read-only: the response is
// the creator's to give, and for a free event their acceptance is already
// final — there is nothing for the business to approve afterwards.
function InviteeCard({ invitee }: { invitee: CampaignInvitee }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const cfg = INVITE_CFG[invitee.status];

  return (
    <Pressable
      style={[styles.card, { backgroundColor: C.surface, borderLeftColor: FREE_ACCENT }]}
      onPress={() =>
        router.push({ pathname: '/(business)/creator-detail', params: { id: invitee.creator.id } })
      }>
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: FREE_LIGHT }]}>
          {invitee.creator.avatarUrl ? (
            <Image source={{ uri: invitee.creator.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <Text style={[styles.avatarText, { color: FREE_ACCENT }]}>{initials(invitee.creator.fullName)}</Text>
          )}
        </View>
        <View style={styles.creatorMeta}>
          <Text style={[styles.creatorName, { color: C.text }]}>{invitee.creator.fullName}</Text>
          {invitee.creator.location ? (
            <View style={styles.locationRow}>
              <FontAwesome5 name="map-marker-alt" solid size={12} color={C.textSecondary} />
              <Text style={[styles.locationText, { color: C.textSecondary }]}>{invitee.creator.location}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cardHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <FontAwesome5 name={cfg.icon} size={12} color={cfg.color} solid />
            <Text style={[styles.statusText, { color: cfg.color }]}>{t(cfg.labelKey)}</Text>
          </View>
          <Text style={[styles.timeText, { color: C.textSecondary }]}>
            {timeAgo(invitee.respondedAt ?? invitee.createdAt)}
          </Text>
        </View>
      </View>

      {invitee.message ? (
        <>
          <View style={[styles.cardDivider, { backgroundColor: C.border }]} />
          <View style={[styles.coverWrap, { backgroundColor: C.background }]}>
            <FontAwesome5 name="comment-alt" size={13} color={C.textSecondary} style={{ marginTop: 2 }} />
            <Text style={[styles.coverLetter, { color: C.textSecondary, flex: 1 }]} numberOfLines={3}>
              {invitee.message}
            </Text>
          </View>
        </>
      ) : null}

      {invitee.status === 'ACCEPTED' && (
        <View style={[styles.confirmedRow, { backgroundColor: FREE_LIGHT, borderColor: '#A7F3D0' }]}>
          <FontAwesome5 name="check-circle" solid size={16} color={FREE_ACCENT} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.confirmedTitle, { color: FREE_ACCENT }]}>{t('campaignProposals.freeConfirmedTitle')}</Text>
            <Text style={[styles.confirmedSub, { color: C.textSecondary }]}>{t('campaignProposals.freeConfirmedSub')}</Text>
          </View>
        </View>
      )}
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

  const iconName  = isAccept ? 'check-circle' : 'times-circle';
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
          <View
            style={[
              cm.iconCircle,
              {
                backgroundColor: iconBg, shadowColor: iconColor,
                shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
              },
            ]}
          >
            <FontAwesome5 name={iconName} solid size={36} color={iconColor} />
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
                  : `You are about to accept ${p.creator.fullName}'s proposal for ${p.proposedRate}.`)
              : `You are about to decline ${p.creator.fullName}'s application. They will be notified.`}
          </Text>

          {/* Free: approving is the whole flow — say so, since there is no
              follow-up step for the business to expect afterwards. */}
          {isAccept && isFree && (
            <View style={[cm.warningBox, { backgroundColor: FREE_LIGHT, borderColor: '#A7F3D0' }]}>
              <FontAwesome5 name="check-circle" solid size={16} color={FREE_ACCENT} />
              <Text style={[cm.warningText, { color: '#047857' }]}>
                Approving is final for a free event — the creator is confirmed to attend. There are no deliverables to submit and no work to start afterwards.
              </Text>
            </View>
          )}

          {/* Paid: irreversible warning */}
          {isAccept && !isFree && (
            <View style={[cm.warningBox, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
              <FontAwesome5 name="exclamation-triangle" solid size={16} color="#C2410C" />
              <Text style={[cm.warningText, { color: '#C2410C' }]}>
                Once accepted, this decision cannot be reversed. Please review carefully before confirming.
              </Text>
            </View>
          )}

          {/* Threshold warning */}
          {isAccept && willFill && capacity != null && (
            <View style={[cm.warningBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
              <FontAwesome5 name="users" solid size={16} color="#1D4ED8" />
              <Text style={[cm.warningText, { color: '#1D4ED8' }]}>
                This fills the last slot ({slotsAfter}/{capacity}). All other pending applications will be automatically declined.
              </Text>
            </View>
          )}

          {/* Capacity progress if available */}
          {isAccept && capacity != null && !willFill && (
            <View style={[cm.capacityRow, { backgroundColor: C.background }]}>
              <FontAwesome5 name="users" solid size={14} color={C.textSecondary} />
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
                  <FontAwesome5 name={iconName} solid size={16} color="#fff" />
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
  sheet:        { width: '100%', borderRadius: RADIUS.xl, padding: 24, alignItems: 'center', gap: 12, ...SHADOW.floating },
  iconCircle:   { width: 72, height: 72, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  title:        { fontSize: 20, fontFamily: F.bold, textAlign: 'center' },
  creatorName:  { fontSize: 14, fontFamily: F.semibold, textAlign: 'center', marginTop: -4 },
  body:         { fontSize: 13, fontFamily: F.regular, textAlign: 'center', lineHeight: 20 },
  warningBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, width: '100%' },
  warningText:  { flex: 1, fontSize: 12, fontFamily: F.medium, lineHeight: 18 },
  capacityRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 8, width: '100%' },
  capacityText: { fontSize: 12, fontFamily: F.semibold },
  actions:      { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  cancelBtn:    { flex: 1, height: 46, borderRadius: RADIUS.md, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  cancelText:   { fontSize: 14, fontFamily: F.semibold },
  confirmBtn:   { flex: 1, height: 46, borderRadius: RADIUS.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  confirmText:  { fontSize: 14, color: '#fff', fontFamily: F.bold },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function CampaignProposalsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{
    campaignId: string;
    campaignTitle: string;
    campaignType: string;
  }>();

  const { campaignId, campaignTitle } = params;
  const isFree     = params.campaignType === 'OPEN_EVENT';
  const accent     = isFree ? FREE_ACCENT : PAID_ACCENT;
  const accentBg   = isFree ? FREE_LIGHT  : PAID_LIGHT;
  const acceptLabel = isFree ? t('campaignProposals.approveBtn') : t('campaignProposals.acceptBtn');

  const [proposals, setProposals]       = useState<Proposal[]>([]);
  const [capacity, setCapacity]         = useState<number | null>(null);
  // Falls back to the fetched campaign's real title when the nav param arrives
  // empty (e.g. tapping a notification that doesn't carry a clean title).
  const [fetchedTitle, setFetchedTitle] = useState('');
  const [campaignStatus, setCampaignStatus] = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  // A free event opens on its Request tab (there is no "All" tab for it);
  // paid campaigns keep the existing all-proposals default.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(isFree ? 'pending' : 'all');
  const [invitees, setInvitees]         = useState<CampaignInvitee[]>([]);
  const [actingId, setActingId]         = useState<string | null>(null);
  const [closing, setClosing]           = useState(false);
  const [modal, setModal]               = useState<ModalState>({ visible: false, type: 'accept', proposal: null, loading: false });

  // Contract agreement — paid campaigns only (a free event has no
  // price/deliverable-for-payment exchange to put under agreement).
  const [contractModal, setContractModal] = useState<{
    visible:  boolean;
    contract: Contract | null;
    proposal: Proposal | null;
    agreeing: boolean;
  }>({ visible: false, contract: null, proposal: null, agreeing: false });

  async function load(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [data, campaign, invitations] = await Promise.all([
        campaignService.getApplications(campaignId),
        campaignService.getById(campaignId),
        // Only free events surface an Invited tab — don't spend the request
        // on a paid campaign that has nowhere to show the result.
        isFree ? creatorService.listCampaignInvitations(campaignId).catch(() => []) : Promise.resolve([]),
      ]);
      setInvitees(invitations);
      setCapacity((campaign as any).capacity ?? null);
      setFetchedTitle(campaign.title ?? '');
      setCampaignStatus(campaign.status ?? null);
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

  // The mount/campaignId effect above won't re-fire when returning to this
  // same campaign from activity-timeline (e.g. after marking work complete
  // or releasing payment) — refetch silently on every later focus so those
  // status changes actually show up here.
  const hasFocusedOnceRef = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!hasFocusedOnceRef.current) {
      hasFocusedOnceRef.current = true;
      return;
    }
    void load(true);
  }, [campaignId]));

  const onRefresh = useCallback(() => void load(true), [campaignId]);

  async function handleAccept(p: Proposal) {
    if (campaignInactive) return;
    // Free events skip the contract step entirely — same confirm-and-approve
    // flow as before.
    if (isFree) {
      setModal({ visible: true, type: 'accept', proposal: p, loading: false });
      return;
    }
    setActingId(p.id);
    try {
      // Backend lazily creates the contract on first access if the application
      // predates the contract feature (or a rare mid-flight failure left it
      // missing) — so this always returns a contract to agree to, rather than
      // ever needing to skip the agreement step.
      const contract = await contractService.getContractForApplication(p.id);
      setContractModal({ visible: true, contract, proposal: p, agreeing: false });
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : 'Could not load the contract for this proposal.');
    } finally {
      setActingId(null);
    }
  }

  function closeContractModal() {
    setContractModal((m) => ({ ...m, visible: false }));
  }

  async function handleAgreeAndAccept() {
    const p = contractModal.proposal;
    if (!p) return;
    setContractModal((m) => ({ ...m, agreeing: true }));
    setActingId(p.id);
    try {
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
      setContractModal({ visible: false, contract: null, proposal: null, agreeing: false });
      // Straight into the project's activity timeline — no separate "Start
      // Project" tap needed right after accepting.
      router.push({
        pathname: '/(business)/activity-timeline',
        params: { campaignId, campaignTitle: fetchedTitle || campaignTitle, applicationId: p.id },
      });
    } catch {
      setContractModal((m) => ({ ...m, agreeing: false }));
    } finally {
      setActingId(null);
    }
  }

  function handleReject(p: Proposal) {
    if (campaignInactive) return;
    setModal({ visible: true, type: 'reject', proposal: p, loading: false });
  }

  // §49 — instant toggle, no confirmation modal (low-stakes, reversible,
  // unlike accept/reject above which commit to something real).
  async function handleShortlist(p: Proposal) {
    if (campaignInactive || actingId) return;
    setActingId(p.id);
    try {
      const { status } = await campaignService.shortlistProposal(campaignId, p.id);
      const nextStatus = status.toLowerCase() as Proposal['status'];
      setProposals((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: nextStatus } : x)));
    } catch {
      // silently no-op — proposal stays in its current status on screen
    } finally {
      setActingId(null);
    }
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
            // A free-event accept lands terminal server-side (workStatus
            // COMPLETED, see CampaignService.updateApplicationStatus) — mirror
            // that here so "Close Event" unlocks without waiting for a refetch.
            if (x.id === p.id) return { ...x, status: 'accepted' as const, ...(isFree ? { workStatus: 'COMPLETED' as WS } : {}) };
            // optimistically auto-decline remaining pending if threshold hit
            if (willFill && x.status === 'pending') return { ...x, status: 'rejected' as const };
            return x;
          }),
        );
        closeModal();
        // Approving into a free event is terminal — there's no workspace to
        // open, so stay on the list where the creator has just moved into the
        // Approved tab. Paid campaigns still jump into the activity timeline.
        if (!isFree) {
          router.push({
            pathname: '/(business)/activity-timeline',
            params: { campaignId, campaignTitle: fetchedTitle || campaignTitle, applicationId: p.id },
          });
        }
        return;
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
        campaignTitle: fetchedTitle || campaignTitle,
        applicationId: p.id,
      },
    });
  }

  const counts = {
    all:         proposals.length,
    pending:     proposals.filter((p) => p.status === 'pending').length,
    shortlisted: proposals.filter((p) => p.status === 'shortlisted').length,
    accepted:    proposals.filter((p) => p.status === 'accepted').length,
    rejected:    proposals.filter((p) => p.status === 'rejected').length,
    expired:     proposals.filter((p) => p.status === 'expired').length,
    invited:     invitees.length,
  };
  // A free event has no shortlist step, but rows shortlisted before that was
  // true still exist — they belong under Request, which is simply "everyone
  // still waiting on an answer".
  const requestCount = counts.pending + counts.shortlisted;
  // The event's four tabs have nowhere else to put an application that expired
  // (the event closed before anyone decided), so it sits with the declined —
  // both mean "didn't get in". Each card still shows its own Expired badge, so
  // the distinction isn't lost, just not given a tab of its own.
  const declinedCount = counts.rejected + counts.expired;

  // Every proposal must be resolved — declined, expired (the event closed
  // before a decision was made — nobody actively rejected it, but it's just
  // as terminal), or accepted with the work marked COMPLETED — before the
  // event can be manually closed. Once closed it drops out of the
  // creator-facing (ACTIVE-only) browse listing.
  // Once an event has expired or been closed, a brand can no longer act on
  // pending proposals — the backend already rejects accept/reject in this
  // state (400 "no longer active"), so the buttons must reflect that up
  // front instead of failing silently after a tap.
  const campaignInactive = campaignStatus === 'expired' || campaignStatus === 'closed';

  const canClose =
    campaignStatus === 'active' &&
    proposals.length > 0 &&
    proposals.every((p) => p.status === 'rejected' || p.status === 'expired' || (p.status === 'accepted' && p.workStatus === 'COMPLETED'));

  function handleCloseCampaign() {
    Alert.alert(
      t('campaignProposals.closeCampaignTitle'),
      t('campaignProposals.closeCampaignBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('campaignProposals.closeCampaignConfirm'),
          style: 'destructive',
          onPress: async () => {
            setClosing(true);
            try {
              await campaignService.update(campaignId, { status: 'closed' });
              setCampaignStatus('closed');
            } catch (e) {
              Alert.alert(t('common.error'), e instanceof Error ? e.message : t('campaignProposals.closeCampaignFailed'));
            } finally {
              setClosing(false);
            }
          },
        },
      ],
    );
  }

  const showingInvites = isFree && statusFilter === 'invited';

  const filtered = showingInvites
    ? []
    : statusFilter === 'all'
      ? proposals
      // Free events fold shortlisted rows into Request (see requestCount) and
      // expired ones into Declined (see declinedCount).
      : isFree && statusFilter === 'pending'
        ? proposals.filter((p) => p.status === 'pending' || p.status === 'shortlisted')
        : isFree && statusFilter === 'rejected'
          ? proposals.filter((p) => p.status === 'rejected' || p.status === 'expired')
          : proposals.filter((p) => p.status === statusFilter);

  type FilterOpt = { key: StatusFilter; label: string; count: number; color: string };
  // Free events get the four-tab model the event flow actually has —
  // Request / Approved / Declined / Invited. No All, no Shortlisted (never
  // offered for events) and no Expired stage in between.
  const FILTERS: FilterOpt[] = isFree
    ? [
        { key: 'pending',  label: t('campaignProposals.filterRequest'),  count: requestCount,   color: '#D97706' },
        { key: 'accepted', label: t('campaignProposals.filterApproved'), count: counts.accepted, color: '#16A34A' },
        { key: 'rejected', label: t('campaignProposals.filterDeclined'), count: declinedCount,   color: '#EF4444' },
        { key: 'invited',  label: t('campaignProposals.filterInvited'),  count: counts.invited,  color: accent    },
      ]
    : [
    { key: 'all',      label: t('campaignProposals.filterAll'),                                                    count: counts.all,      color: accent    },
    { key: 'pending',     label: t('campaignProposals.filterPending'),                                                count: counts.pending,     color: '#D97706' },
    { key: 'shortlisted', label: t('campaignProposals.filterShortlisted'),                                            count: counts.shortlisted, color: '#0369A1' },
    { key: 'accepted',    label: t('campaignProposals.filterApproved'),                                              count: counts.accepted, color: '#16A34A' },
    { key: 'rejected', label: t('campaignProposals.filterDeclined'),                                               count: counts.rejected, color: '#EF4444' },
    { key: 'expired',  label: t('campaignProposals.filterExpired'),                                                count: counts.expired,  color: '#6B7280' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      {/* Header */}
      <View style={{ backgroundColor: C.surface }}>
        <View style={styles.gradientHeader}>

          {/* Back button row — title centered between the back button and a
              same-width spacer on the right, so it's truly centered rather
              than just centered in the leftover space next to the button. */}
          <View style={styles.headerTopRow}>
            <BackButton />
            <Text style={[styles.headerTitle, { color: C.text }]} numberOfLines={1}>{fetchedTitle || campaignTitle}</Text>
            <View style={styles.headerTopRowSpacer} />
          </View>

          {/* Count pill on the left, type/platform badges pushed to the right */}
          <View style={styles.headerBody}>
            <View style={[styles.totalPill, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}>
              <Text style={[styles.totalPillText, { color: C.text }]}>
                {t(proposals.length === 1 ? 'campaignProposals.applicationCount' : 'campaignProposals.applicationCountPlural', { n: proposals.length })}
              </Text>
            </View>
            <View style={styles.headerBadgeRow}>
              <View style={[styles.typeBadge, { backgroundColor: accentBg }]}>
                <FontAwesome5 name={isFree ? 'gift' : 'money-bill-wave'} size={10} color={accent} solid />
                <Text style={[styles.typeBadgeText, { color: accent }]}>
                  {isFree ? t('campaignProposals.badgeFreeEvent') : t('campaignProposals.badgePaidEvent')}
                </Text>
              </View>
            </View>
          </View>

          {/* Summary stat pills */}
          <View style={[styles.statStrip, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }, SHADOW.card]}>
            <View style={styles.statStripItem}>
              <Text style={[styles.statStripNum, { color: C.text }]}>{isFree ? requestCount : counts.pending}</Text>
              <Text style={[styles.statStripLabel, { color: C.textSecondary }]}>
                {isFree ? t('campaignProposals.statRequest') : t('campaignProposals.statPending')}
              </Text>
            </View>
            <View style={[styles.statStripDivider, { backgroundColor: C.border }]} />
            <View style={styles.statStripItem}>
              <Text style={[styles.statStripNum, { color: C.active }]}>{counts.accepted}</Text>
              <Text style={[styles.statStripLabel, { color: C.textSecondary }]}>{t('campaignProposals.statApproved')}</Text>
            </View>
            <View style={[styles.statStripDivider, { backgroundColor: C.border }]} />
            <View style={styles.statStripItem}>
              <Text style={[styles.statStripNum, { color: C.error }]}>{isFree ? declinedCount : counts.rejected}</Text>
              <Text style={[styles.statStripLabel, { color: C.textSecondary }]}>{t('campaignProposals.statDeclined')}</Text>
            </View>
            {isFree && (
              <>
                <View style={[styles.statStripDivider, { backgroundColor: C.border }]} />
                <View style={styles.statStripItem}>
                  <Text style={[styles.statStripNum, { color: FREE_ACCENT }]}>{counts.invited}</Text>
                  <Text style={[styles.statStripLabel, { color: C.textSecondary }]}>{t('campaignProposals.statInvited')}</Text>
                </View>
              </>
            )}
          </View>

          {canClose && (
            <Pressable
              style={[styles.closeCampaignBtn, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}
              onPress={handleCloseCampaign}
              disabled={closing}>
              {closing ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <FontAwesome5 name="check-double" solid size={16} color="#EF4444" />
                  <Text style={[styles.closeCampaignBtnTxt, { color: '#EF4444' }]}>{t('campaignProposals.closeCampaignBtn')}</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
        <View style={[styles.headerSeparator, { backgroundColor: C.border }]} />
      </View>

      {/* Section label */}
      <View style={styles.sectionLabelRow}>
        <Text style={[styles.sectionLabel, { color: C.text }]}>
          {isFree ? t('campaignProposals.sectionLabelFree') : 'View Creator Status on Project'}
        </Text>
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

      {contractModal.contract && (
        <ContractModal
          visible={contractModal.visible}
          title={contractModal.contract.title}
          subtitle={`Review and agree to accept ${contractModal.proposal?.creator.fullName ?? 'this creator'}'s proposal.`}
          filledBody={contractModal.contract.filledBody}
          terms={contractModal.contract.terms}
          contractId={contractModal.contract.id}
          agreeLabel="I Agree & Accept"
          agreeing={contractModal.agreeing}
          onAgree={handleAgreeAndAccept}
          onClose={closeContractModal}
        />
      )}

      {loading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3, 4].map((i) => <ListRowSkeleton key={i} />)}
        </View>
      ) : showingInvites ? (
        <FlatList
          data={invitees}
          keyExtractor={(i) => i.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, invitees.length === 0 && styles.listEmpty]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accent} />
          }
          renderItem={({ item }) => <InviteeCard invitee={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <EmptyState
              faIcon="paper-plane"
              title={t('campaignProposals.emptyNoInvites')}
              subtitle={t('campaignProposals.emptyNoInvitesHint')}
            />
          }
        />
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
              onShortlist={handleShortlist}
              acting={actingId === item.id}
              onStartProject={handleStartProject}
              campaignInactive={campaignInactive}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <EmptyState
              faIcon="users"
              title={
                statusFilter === 'all'
                  ? t('campaignProposals.emptyNoApplications')
                  : isFree
                    ? t('campaignProposals.emptyNoFilteredFree', { filter: FILTERS.find((f) => f.key === statusFilter)?.label ?? statusFilter })
                    : t('campaignProposals.emptyNoFiltered', { filter: FILTERS.find((f) => f.key === statusFilter)?.label ?? statusFilter })
              }
              subtitle={
                statusFilter === 'all'
                  ? t('campaignProposals.emptyAllHint')
                  : t('campaignProposals.emptyFilterHint')
              }
            />
          }
        />
      )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header ──────────────────────────────────────────────────────────
  gradientHeader: {
    paddingBottom: 16,
  },
  headerSeparator: { height: StyleSheet.hairlineWidth, marginHorizontal: SCREEN_GUTTER },

  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: SCREEN_GUTTER,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerTopRowSpacer: { width: 40 },
  totalPill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  totalPillText: { fontSize: 12, fontFamily: F.semibold },

  headerBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, gap: 8 },
  closeCampaignBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderRadius: RADIUS.md,
    paddingVertical: 10,
  },
  closeCampaignBtnTxt: { fontSize: 13, fontFamily: F.semibold },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: F.bold, lineHeight: 27, textAlign: 'center' },
  headerBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 11, fontFamily: F.bold },

  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
  },
  statStripItem:    { flex: 1, alignItems: 'center', gap: 2 },
  statStripNum:     { fontSize: 16, fontFamily: F.bold },
  statStripLabel:   { fontSize: 10, textTransform: 'uppercase', fontFamily: F.semibold },
  statStripDivider: { width: 1, height: 32 },

  sectionLabelRow: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 16, paddingBottom: 4 },
  sectionLabel:    { fontSize: 16, fontFamily: F.bold },

  // ── Filter bar ───────────────────────────────────────────────────────────────
  filterBar:    { borderBottomWidth: StyleSheet.hairlineWidth },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 7 },
  filterChipText:      { fontSize: 13, fontFamily: F.semibold },
  filterChipBadge:     { borderRadius: RADIUS.full, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  filterChipBadgeText: { fontSize: 11, fontFamily: F.bold },

  // ── List ─────────────────────────────────────────────────────────────────────
  list:      { paddingTop: SPACING.lg, paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxxl },
  listEmpty: { flexGrow: 1 },

  // ── Proposal card ─────────────────────────────────────────────────────────────
  card: {
    borderRadius: RADIUS.lg,
    borderLeftWidth: 4,
    padding: SPACING.lg,
    gap: 10,
    ...SHADOW.card,
  },
  cardHeader:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  avatar:         { width: 46, height: 46, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarImg:      { width: 46, height: 46, borderRadius: RADIUS.full },
  avatarText:     { fontSize: 15, fontFamily: F.bold },
  creatorMeta:    { flex: 1, gap: 3 },
  creatorName:    { fontSize: 14, fontFamily: F.bold },
  locationRow:    { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locationText:   { fontSize: 11, fontFamily: F.regular },
  cardHeaderRight:{ alignItems: 'flex-end', gap: 4 },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  statusText:     { fontSize: 11, fontFamily: F.bold },
  timeText:       { fontSize: 10, fontFamily: F.regular },

  cardDivider: { height: StyleSheet.hairlineWidth },

  coverWrap:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: RADIUS.sm, padding: 10 },
  coverLetter: { fontSize: 12, lineHeight: 18, fontStyle: 'italic', fontFamily: F.regular },
  seeMoreBtn:  { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  seeMoreText: { fontSize: 12, fontFamily: F.bold },

  rateRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratePill:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6 },
  rateAmount: { fontSize: 14, fontFamily: F.bold },
  rateLabel:  { fontSize: 11, fontFamily: F.regular },

  freeTag:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 7 },
  freeTagText: { fontSize: 13, fontFamily: F.bold },

  actions:    { flexDirection: 'row', gap: 10 },
  shortlistBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, borderWidth: 1.5 },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: RADIUS.md, borderWidth: 1.5 },
  acceptBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: RADIUS.md },
  actionBtnDisabled: { opacity: 0.45 },
  actionText: { fontSize: 13, fontFamily: F.bold },
  readOnlyNotice:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 },
  readOnlyNoticeText: { flex: 1, fontSize: 11, fontFamily: F.regular, lineHeight: 17 },

  startProjectBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.full, paddingVertical: 11, paddingHorizontal: 14, marginTop: 10 },
  startProjectBtnTxt: { fontSize: 13, color: '#fff', fontFamily: F.bold },

  // Free events: the terminal "confirmed, nothing further" state that stands
  // in for the paid campaign's project-workspace button.
  confirmedRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 12, marginTop: 10 },
  confirmedTitle:     { fontSize: 13, fontFamily: F.bold },
  confirmedSub:       { fontSize: 11, fontFamily: F.regular, lineHeight: 17, marginTop: 2 },

});
