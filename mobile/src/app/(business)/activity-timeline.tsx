import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '@/components/BackButton';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { campaignService } from '@/services/campaign';
import { chatService } from '@/services/chat';
import type { Campaign } from '@/types';
import { F } from '@/utilities/constants';

// ─── Types ─────────────────────────────────────────────────────────────────────

type WS = 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED';

type AppInfo = {
  id: string;
  workStatus: WS;
  paymentStatus: 'UNPAID' | 'PAID' | 'RELEASED';
  proposedRateRaw: number;
  submittedAt: string | null;
  deliverableUrls: string | null;
  creatorProfileId: string;
  creatorUserId: string;
  creatorName: string;
  creatorAvatar: string | null;
  creatorLocation: string | null;
};

// ─── Progress steps ────────────────────────────────────────────────────────────
// idx: 0=Accepted 1=Payment 2=Secured 3=Waiting 4=Started 5=Submitted 6=Review 7=Approved 8=Released 9=Completed

type TFn = (key: string, params?: Record<string, string | number>) => string;

function getProgressLabels(t: TFn): string[] {
  return [
    t('activityTimeline.progressAccepted'),
    t('activityTimeline.progressPayment'),
    t('activityTimeline.progressSecured'),
    t('activityTimeline.progressWaiting'),
    t('activityTimeline.progressStarted'),
    t('activityTimeline.progressSubmitted'),
    t('activityTimeline.progressReview'),
    t('activityTimeline.progressApproved'),
    t('activityTimeline.progressReleased'),
    t('activityTimeline.progressCompleted'),
  ];
}

function progressIdx(ws: WS, paid: boolean): number {
  if (ws === 'APPROVED')   return 7;
  if (ws === 'SUBMITTED')  return 5;
  if (ws === 'IN_PROGRESS') return 4;
  if (paid)                return 3;
  return 1;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtNPT(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + (5 * 60 + 45) * 60000);
  const date = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${date}\n${time}`;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function parseDeliverables(raw?: string): string[] {
  if (!raw) return [];
  return raw.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
}

function parseUrls(raw?: string | null): string[] {
  if (!raw) return [];
  return raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateUrls(raw: string, t: TFn): string {
  const lines = parseUrls(raw);
  if (lines.length === 0) return t('activityTimeline.urlValidationAtLeastOne');
  const invalid = lines.filter(u => !isValidUrl(u));
  if (invalid.length === 1) return t('activityTimeline.urlValidationInvalidOne', { url: invalid[0] });
  if (invalid.length > 1)  return t('activityTimeline.urlValidationInvalidMany', { count: invalid.length });
  return '';
}

function statusLabel(ws: WS, paid: boolean, t: TFn) {
  if (ws === 'APPROVED')    return t('activityTimeline.statusCompleted');
  if (ws === 'SUBMITTED')   return t('activityTimeline.statusUnderReview');
  if (ws === 'IN_PROGRESS') return t('activityTimeline.statusInProgress');
  if (paid)                 return t('activityTimeline.statusWaitingOnCreator');
  return t('activityTimeline.statusWaitingPayment');
}
function statusColor(ws: WS, paid: boolean) {
  if (ws === 'APPROVED')    return '#16A34A';
  if (ws === 'SUBMITTED')   return '#D97706';
  if (ws === 'IN_PROGRESS') return '#7C3AED';
  if (paid)                 return '#0EA5E9';
  return '#EF4444';
}

type TLEvent = { icon: string; title: string; desc: string; time: string; done: boolean; isCurrent: boolean };

function buildTimeline(ws: WS, paid: boolean, campaign: Campaign | null, app: AppInfo | null, isCreator: boolean, t: TFn): TLEvent[] {
  const base = campaign?.createdAt ?? new Date().toISOString();
  const events: TLEvent[] = [];

  events.push({
    icon: 'checkmark-circle', title: t('activityTimeline.tlProposalAccepted'),
    desc: isCreator ? t('activityTimeline.tlProposalAcceptedDescCreator') : t('activityTimeline.tlProposalAcceptedDescBusiness'),
    time: fmtNPT(base), done: true, isCurrent: false,
  });

  if (!paid && ws === 'NONE') {
    events.unshift({
      icon: 'card', title: t('activityTimeline.tlWaitingPayment'),
      desc: isCreator
        ? t('activityTimeline.tlWaitingPaymentDescCreator')
        : t('activityTimeline.tlWaitingPaymentDescBusiness'),
      time: '', done: false, isCurrent: true,
    });
  }

  if (paid || ws !== 'NONE') {
    events.unshift({
      icon: 'lock-closed', title: t('activityTimeline.tlPaymentSecured'),
      desc: isCreator ? t('activityTimeline.tlPaymentSecuredDescCreator') : t('activityTimeline.tlPaymentSecuredDescBusiness'),
      time: fmtNPT(campaign?.paidAt ?? base),
      done: ws !== 'NONE',
      isCurrent: paid && ws === 'NONE',
    });
  }

  if (paid && ws === 'NONE') {
    events.unshift({
      icon: 'hourglass', title: t('activityTimeline.tlWaitingCreator'),
      desc: isCreator
        ? t('activityTimeline.tlWaitingCreatorDescCreator')
        : t('activityTimeline.tlWaitingCreatorDescBusiness'),
      time: '', done: false, isCurrent: true,
    });
  }

  if (ws === 'IN_PROGRESS' || ws === 'SUBMITTED' || ws === 'APPROVED') {
    events.unshift({
      icon: 'play-circle', title: t('activityTimeline.tlWorkStarted'),
      desc: isCreator ? t('activityTimeline.tlWorkStartedDescCreator') : t('activityTimeline.tlWorkStartedDescBusiness'),
      time: fmtNPT(campaign?.paidAt ?? base),
      done: ws === 'SUBMITTED' || ws === 'APPROVED',
      isCurrent: ws === 'IN_PROGRESS',
    });
  }

  if (ws === 'SUBMITTED' || ws === 'APPROVED') {
    events.unshift({
      icon: 'cloud-upload', title: t('activityTimeline.tlDeliverablesUploaded'),
      desc: isCreator ? t('activityTimeline.tlDeliverablesUploadedDescCreator') : t('activityTimeline.tlDeliverablesUploadedDescBusiness'),
      time: fmtNPT(app?.submittedAt ?? base),
      done: ws === 'APPROVED', isCurrent: ws === 'SUBMITTED',
    });
  }

  if (ws === 'APPROVED') {
    events.unshift({
      icon: 'checkmark-done-circle', title: t('activityTimeline.tlWorkApproved'),
      desc: isCreator
        ? t('activityTimeline.tlWorkApprovedDescCreator')
        : t('activityTimeline.tlWorkApprovedDescBusiness'),
      time: fmtNPT(app?.submittedAt ?? base), done: true, isCurrent: false,
    });
  }

  return events;
}

// ─── Bottom Sheet ──────────────────────────────────────────────────────────────

function Sheet({ visible, onClose, title, children }: {
  visible: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sh.overlay} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={sh.kav}>
          <Pressable style={sh.sheet} onPress={e => e.stopPropagation()}>
            <View style={sh.handle} />
            <Text style={sh.title}>{title}</Text>
            {children}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── Progress Tracker ─────────────────────────────────────────────────────────

const STEP_W = 74;

function ProgressTracker({ current, scrollRef, labels }: { current: number; scrollRef: React.RefObject<ScrollView | null>; labels: string[] }) {
  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={pt.row}
    >
      {labels.map((label, idx) => {
        const done   = idx < current;
        const active = idx === current;
        const clr    = done ? '#16A34A' : active ? '#7C3AED' : '#9CA3AF';
        const dotBg  = done ? '#16A34A' : active ? '#7C3AED' : '#fff';
        const dotBdr = done ? '#16A34A' : active ? '#7C3AED' : '#D1D5DB';
        return (
          <View key={idx} style={pt.step}>
            <View style={pt.connRow}>
              <View style={[pt.line, { backgroundColor: idx === 0 ? 'transparent' : done ? '#16A34A' : '#E5E7EB' }]} />
              <View style={[pt.dot, { backgroundColor: dotBg, borderColor: dotBdr }]}>
                {done   ? <Ionicons name="checkmark" size={11} color="#fff" /> :
                 active ? <View style={pt.activePulse} /> :
                          <View style={pt.emptyCore} />}
              </View>
              <View style={[pt.line, { backgroundColor: idx === labels.length - 1 ? 'transparent' : done ? '#16A34A' : '#E5E7EB' }]} />
            </View>
            <Text style={[pt.label, { color: clr }]} numberOfLines={1}>{label}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Action Card ──────────────────────────────────────────────────────────────

function ActionCard({ ws, paid, isCreator, isFree, submitting, onPay, onStartWork, onUpload, onReview, onApprove, onRevision }: {
  ws: WS; paid: boolean; isCreator: boolean; isFree: boolean; submitting: boolean;
  onPay: () => void; onStartWork: () => void; onUpload: () => void;
  onReview: () => void; onApprove: () => void; onRevision: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();

  // Business: payment required
  if (!paid && ws === 'NONE' && !isCreator) return (
    <View style={[ac.card, { backgroundColor: '#fff', borderLeftColor: '#EF4444' }]}>
      <View style={[ac.iconBg, { backgroundColor: '#FEF2F2' }]}><Ionicons name="card-outline" size={26} color="#EF4444" /></View>
      <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acPaymentRequiredTitle')}</Text>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acPaymentRequiredSub')}</Text>
      <Pressable style={[ac.btn, { backgroundColor: '#EF4444' }]} onPress={onPay}>
        <Ionicons name="card-outline" size={16} color="#fff" />
        <Text style={ac.btnTxt}>{t('activityTimeline.acPayNowBtn')}</Text>
      </Pressable>
    </View>
  );

  // Creator: waiting for payment
  if (!paid && ws === 'NONE' && isCreator) return (
    <View style={[ac.card, { backgroundColor: '#fff', borderLeftColor: '#D97706' }]}>
      <View style={[ac.iconBg, { backgroundColor: '#FFF7ED' }]}><Ionicons name="time-outline" size={26} color="#D97706" /></View>
      <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acWaitingPaymentTitle')}</Text>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acWaitingPaymentSub')}</Text>
    </View>
  );

  // Business: payment done, waiting on creator
  if (paid && ws === 'NONE' && !isCreator) return (
    <View style={[ac.card, { backgroundColor: '#fff', borderLeftColor: '#0EA5E9' }]}>
      <View style={[ac.iconBg, { backgroundColor: '#E0F2FE' }]}><Ionicons name="hourglass-outline" size={26} color="#0EA5E9" /></View>
      <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acWaitingCreatorTitle')}</Text>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{isFree ? t('activityTimeline.acWaitingCreatorSubFree') : t('activityTimeline.acWaitingCreatorSubPaid')}</Text>
    </View>
  );

  // Creator: ready to start
  if (paid && ws === 'NONE' && isCreator) return (
    <View style={[ac.card, { backgroundColor: '#fff', borderLeftColor: '#7C3AED' }]}>
      <View style={[ac.iconBg, { backgroundColor: '#EEF2FF' }]}><Ionicons name="rocket-outline" size={26} color="#7C3AED" /></View>
      <Text style={[ac.heading, { color: C.text }]}>{isFree ? t('activityTimeline.acReadyFreeTitle') : t('activityTimeline.acReadyPaidTitle')}</Text>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{isFree ? t('activityTimeline.acReadyFreeSub') : t('activityTimeline.acReadyPaidSub')}</Text>
      <Pressable style={[ac.btn, { backgroundColor: '#7C3AED', opacity: submitting ? 0.75 : 1 }]} onPress={onStartWork} disabled={submitting}>
        {submitting
          ? <ActivityIndicator size="small" color="#fff" />
          : <><Ionicons name="rocket-outline" size={16} color="#fff" /><Text style={ac.btnTxt}>{t('activityTimeline.acStartBtn')}</Text></>}
      </Pressable>
    </View>
  );

  // Business: creator working
  if (ws === 'IN_PROGRESS' && !isCreator) return (
    <View style={[ac.card, { backgroundColor: '#fff', borderLeftColor: '#7C3AED' }]}>
      <View style={[ac.iconBg, { backgroundColor: '#EEF2FF' }]}><Ionicons name="play-circle-outline" size={26} color="#7C3AED" /></View>
      <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acCreatorWorkingTitle')}</Text>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acCreatorWorkingSub')}</Text>
    </View>
  );

  // Creator: upload deliverables
  if (ws === 'IN_PROGRESS' && isCreator) return (
    <View style={[ac.card, { backgroundColor: '#fff', borderLeftColor: '#7C3AED' }]}>
      <View style={[ac.iconBg, { backgroundColor: '#EEF2FF' }]}><Ionicons name="cloud-upload-outline" size={26} color="#7C3AED" /></View>
      <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acUploadTitle')}</Text>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acUploadSub')}</Text>
      <Pressable style={[ac.btn, { backgroundColor: '#7C3AED' }]} onPress={onUpload}>
        <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
        <Text style={ac.btnTxt}>{t('activityTimeline.acUploadBtn')}</Text>
      </Pressable>
    </View>
  );

  // Business: review submitted work
  if (ws === 'SUBMITTED' && !isCreator) return (
    <View style={[ac.card, { backgroundColor: '#fff', borderLeftColor: '#D97706' }]}>
      <View style={[ac.iconBg, { backgroundColor: '#FFF7ED' }]}><Ionicons name="eye-outline" size={26} color="#D97706" /></View>
      <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acSubmittedTitle')}</Text>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acSubmittedSub')}</Text>
      <Pressable style={[ac.btn, { backgroundColor: '#D97706' }]} onPress={onReview}>
        <Ionicons name="eye-outline" size={16} color="#fff" />
        <Text style={ac.btnTxt}>{t('activityTimeline.acReviewBtn')}</Text>
      </Pressable>
      <View style={ac.btnRow}>
        <Pressable style={[ac.btn, { flex: 1, backgroundColor: '#EF4444' }]} onPress={onRevision}>
          <Ionicons name="create-outline" size={15} color="#fff" />
          <Text style={ac.btnTxt}>{t('activityTimeline.acRevisionBtn')}</Text>
        </Pressable>
        <Pressable style={[ac.btn, { flex: 1, backgroundColor: '#16A34A', opacity: submitting ? 0.75 : 1 }]} onPress={onApprove} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <>
            <Ionicons name="checkmark-done-outline" size={15} color="#fff" />
            <Text style={ac.btnTxt}>{t('activityTimeline.acApproveBtn')}</Text>
          </>}
        </Pressable>
      </View>
    </View>
  );

  // Creator: awaiting review
  if (ws === 'SUBMITTED' && isCreator) return (
    <View style={[ac.card, { backgroundColor: '#fff', borderLeftColor: '#0EA5E9' }]}>
      <View style={[ac.iconBg, { backgroundColor: '#E0F2FE' }]}><Ionicons name="hourglass-outline" size={26} color="#0EA5E9" /></View>
      <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acAwaitingReviewTitle')}</Text>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acAwaitingReviewSub')}</Text>
    </View>
  );

  // APPROVED — business
  if (!isCreator) return (
    <View style={[ac.card, { backgroundColor: '#fff', borderLeftColor: '#16A34A' }]}>
      <View style={[ac.iconBg, { backgroundColor: '#DCFCE7' }]}><Ionicons name="checkmark-done-circle-outline" size={26} color="#16A34A" /></View>
      <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acCompletedBizTitle')}</Text>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acCompletedBizSub')}</Text>
    </View>
  );

  // APPROVED — creator
  return (
    <View style={[ac.card, { backgroundColor: '#fff', borderLeftColor: '#16A34A' }]}>
      <View style={[ac.iconBg, { backgroundColor: '#DCFCE7' }]}><Ionicons name="trophy-outline" size={26} color="#16A34A" /></View>
      <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acCompletedCreatorTitle')}</Text>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acCompletedCreatorSub')}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CampaignWorkspaceScreen() {
  const C = useAppColors();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { campaignId, campaignTitle, role, brand, applicationId } = useLocalSearchParams<{
    campaignId: string; campaignTitle: string; role?: string; brand?: string; applicationId?: string;
  }>();

  // Role determined from auth token primarily, URL param as fallback
  const isCreator = user?.role === 'CREATOR' || role === 'CREATOR';

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [app, setApp]           = useState<AppInfo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]       = useState('');

  const [showPay, setShowPay]           = useState(false);
  const [showUpload, setShowUpload]     = useState(false);
  const [showReview, setShowReview]     = useState(false);
  const [showRevision, setShowRevision] = useState(false);
  const [showCancel, setShowCancel]     = useState(false);

  const [payMethod, setPayMethod]       = useState<'esewa' | 'khalti' | 'fonepay'>('esewa');
  const [uploadUrls, setUploadUrls]     = useState('');
  const [uploadNotes, setUploadNotes]   = useState('');
  const [urlError, setUrlError]         = useState('');
  const [revisionNote, setRevisionNote] = useState('');

  const progressScrollRef = useRef<ScrollView>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  }

  async function load() {
    setLoading(true);
    try {
      if (isCreator) {
        const [c, myApps] = await Promise.all([
          campaignService.getById(campaignId),
          campaignService.getMyApplications(),
        ]);
        setCampaign(c);
        const myApp = myApps.find(a => a.campaignId === campaignId && a.status === 'accepted');
        if (myApp) {
          setApp({
            id:               myApp.id,
            workStatus:       myApp.workStatus,
            paymentStatus:    (myApp.paymentStatus ?? 'UNPAID') as 'UNPAID' | 'PAID' | 'RELEASED',
            proposedRateRaw:  myApp.proposedRateRaw,
            submittedAt:      myApp.workSubmittedAt ?? null,
            deliverableUrls:  null,
            creatorProfileId: myApp.businessId,
            creatorUserId:    myApp.businessId,
            creatorName:      myApp.brand,
            creatorAvatar:    null,
            creatorLocation:  null,
          });
          // Sync paymentStatus from API into campaign
          setCampaign(prev => prev ? {
            ...prev,
            paymentStatus: myApp.paymentStatus,
            paidAt: myApp.paidAt,
          } : prev);
        }
      } else {
        const [c, apps] = await Promise.all([
          campaignService.getById(campaignId),
          campaignService.getApplications(campaignId),
        ]);
        setCampaign(c);
        const accepted = applicationId
          ? apps.find(a => a.id === applicationId)
          : apps.find(a => a.status === 'accepted');
        if (accepted) {
          setApp({
            id:               accepted.id,
            workStatus:       accepted.workStatus,
            paymentStatus:    (accepted.paymentStatus ?? 'UNPAID') as 'UNPAID' | 'PAID' | 'RELEASED',
            proposedRateRaw:  accepted.proposedRateRaw,
            submittedAt:      accepted.submittedAt,
            deliverableUrls:  accepted.deliverableUrls,
            creatorProfileId: accepted.creator.id,
            creatorUserId:    accepted.creator.userId,
            creatorName:      accepted.creator.fullName,
            creatorAvatar:    accepted.creator.avatarUrl,
            creatorLocation:  accepted.creator.location,
          });
        }
      }
    } catch { /* silently handled */ }
    finally { setLoading(false); }
  }

  useFocusEffect(useCallback(() => { void load(); }, [campaignId, isCreator, applicationId]));

  // Center progress tracker on current step after data loads
  useEffect(() => {
    if (!loading && progressScrollRef.current) {
      const ws   = app?.workStatus ?? 'NONE';
      const paid = campaign?.campaignType === 'OPEN_EVENT' || campaign?.paymentStatus === 'PAID' || campaign?.paymentStatus === 'RELEASED';
      const idx  = progressIdx(ws, paid);
      const x    = Math.max(0, idx * STEP_W - 120);
      setTimeout(() => progressScrollRef.current?.scrollTo({ x, animated: true }), 150);
    }
  }, [loading, app, campaign]);

  async function handlePay() {
    if (!app) return;
    setSubmitting(true);
    try {
      await campaignService.payForApplication(app.id);
      setApp(a => a ? { ...a, paymentStatus: 'PAID' } : a);
      setShowPay(false);
      showToast(t('activityTimeline.toastPaySuccess'));
    } catch (e: any) {
      showToast(e?.message ?? 'Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartWork() {
    if (!app) return;
    setSubmitting(true);
    try {
      await campaignService.startWork(app.id);
      setApp(a => a ? { ...a, workStatus: 'IN_PROGRESS' } : a);
      showToast(t('activityTimeline.acStartBtn'));
    } catch (e: any) {
      showToast(e?.message ?? 'Failed to start. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitWork() {
    if (!app) return;
    const err = validateUrls(uploadUrls, t);
    if (err) { setUrlError(err); return; }
    setUrlError('');
    setSubmitting(true);
    try {
      await campaignService.submitWork(app.id, { note: uploadNotes, urls: uploadUrls });
      setApp(a => a ? { ...a, workStatus: 'SUBMITTED', submittedAt: new Date().toISOString(), deliverableUrls: uploadUrls || a.deliverableUrls } : a);
      setUploadUrls(''); setUploadNotes('');
      setShowUpload(false);
      showToast(t('activityTimeline.toastWorkSubmitted'));
    } catch (e: any) {
      showToast(e?.message ?? 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!app) return;
    setSubmitting(true);
    try {
      await campaignService.approveWork(app.id);
      setApp(a => a ? { ...a, workStatus: 'APPROVED', paymentStatus: 'RELEASED' } : a);
      showToast(t('activityTimeline.toastWorkApproved'));
    } catch (e: any) {
      showToast(e?.message ?? 'Approval failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevision() {
    if (!app || !revisionNote.trim()) return;
    setSubmitting(true);
    try {
      await campaignService.requestRevision(app.id, revisionNote);
      setApp(a => a ? { ...a, workStatus: 'IN_PROGRESS' } : a);
      setRevisionNote(''); setShowRevision(false);
      showToast(t('activityTimeline.toastRevisionRequested'));
    } catch (e: any) {
      showToast(e?.message ?? 'Failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelEvent() {
    setSubmitting(true);
    try {
      await campaignService.cancelCampaign(campaignId);
      setShowCancel(false);
      showToast(t('activityTimeline.toastCampaignCancelled'));
      setTimeout(() => router.back(), 1500);
    } catch (e: any) {
      showToast(e?.message ?? 'Cancellation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMessage() {
    const otherProfileId = app?.creatorProfileId;
    const otherName      = isCreator ? (app?.creatorName ?? 'Brand') : (app?.creatorName ?? 'Creator');

    if (otherProfileId) {
      try {
        const conv = await chatService.checkConversation(otherProfileId);
        if (conv?.id) {
          router.push({
            pathname: isCreator ? '/(creator)/(tabs)/messages/[id]' : '/(business)/(tabs)/messages/[id]',
            params: { id: conv.id, name: otherName, status: conv.status, focusInput: 'true' },
          });
          return;
        }
      } catch { /* fall through to messages list */ }
    }

    // Fallback — open messages list so they can find the conversation
    router.push(isCreator ? '/(creator)/(tabs)/messages' : '/(business)/(tabs)/messages');
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.screen, { backgroundColor: '#F9FAFB' }]} edges={['top']}>
        <View style={[s.header, { backgroundColor: '#fff', borderBottomColor: '#E5E7EB' }]}>
          <BackButton />
          <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>{campaignTitle ?? t('activityTimeline.headerFallback')}</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={s.centered}><ActivityIndicator size="large" color="#7C3AED" /></View>
      </SafeAreaView>
    );
  }

  const ws   = app?.workStatus ?? 'NONE';
  const isFreeEvent = campaign?.campaignType === 'OPEN_EVENT';
  const paid = isFreeEvent || app?.paymentStatus === 'PAID' || app?.paymentStatus === 'RELEASED';
  const pIdx = progressIdx(ws, paid);
  const sLbl = statusLabel(ws, paid, t);
  const sClr = statusColor(ws, paid);
  const progressLabels = getProgressLabels(t);

  const crFee = app?.proposedRateRaw ?? 0;
  const pfFee = Math.round(crFee * 0.05);
  const vat   = Math.round(pfFee * 0.13);
  const total = crFee + pfFee + vat;

  const deliverables   = parseDeliverables(campaign?.deliverables);
  const submittedUrls  = parseUrls(app?.deliverableUrls);
  const tlEvents       = buildTimeline(ws, paid, campaign, app, isCreator, t);

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: '#F9FAFB' }]} edges={['top']}>

      {/* ── Header ── */}
      <View style={[s.header, { backgroundColor: '#fff', borderBottomColor: '#E5E7EB' }]}>
        <BackButton />
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>
            {campaignTitle ?? campaign?.title ?? t('activityTimeline.headerWorkspace')}
          </Text>
          <View style={[s.statusBadge, { backgroundColor: sClr + '18' }]}>
            <View style={[s.statusDot, { backgroundColor: sClr }]} />
            <Text style={[s.statusBadgeTxt, { color: sClr }]}>{sLbl}</Text>
          </View>
        </View>
        {/* Only message icon — no three dots */}
        <Pressable style={s.iconBtn} onPress={handleMessage}>
          <Ionicons name="chatbubble-outline" size={22} color="#7C3AED" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>

        {/* ── Campaign Summary Card ── */}
        <View style={[s.card, { backgroundColor: '#fff' }]}>
          <View style={s.summaryRow}>
            <View style={[s.thumb, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="megaphone-outline" size={26} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.summaryTitle, { color: C.text }]} numberOfLines={2}>
                {campaign?.title ?? campaignTitle}
              </Text>
              <Pressable
                onPress={() => {
                  if (!app) return;
                  if (isCreator) {
                    router.push({ pathname: '/(creator)/business-detail', params: { id: app.creatorProfileId } });
                  } else {
                    router.push({ pathname: '/(business)/creator-detail', params: { id: app.creatorProfileId } });
                  }
                }}
                style={{ alignSelf: 'flex-start' }}
              >
                <Text style={[s.summaryBrand, { color: '#7C3AED', textDecorationLine: 'underline' }]}>
                  {isCreator
                    ? t('activityTimeline.footerBrandLabel', { name: brand ?? campaign?.brand ?? '—' })
                    : t('activityTimeline.footerCreatorLabel', { name: app?.creatorName ?? '—' })}
                </Text>
              </Pressable>
              <View style={s.metaRow}>
                {campaign?.deadline && (
                  <View style={s.metaChip}>
                    <Ionicons name="calendar-outline" size={11} color="#6B7280" />
                    <Text style={s.metaChipTxt}>{fmtDate(campaign.deadline)}</Text>
                  </View>
                )}
                <View style={s.metaChip}>
                  <Ionicons name="wallet-outline" size={11} color="#6B7280" />
                  <Text style={s.metaChipTxt}>{campaign?.budget ?? 'Free'}</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={[s.summaryFooter, { borderTopColor: '#F3F4F6' }]}>
            {[
              { label: t('activityTimeline.footerProposalDate'), value: fmtDate(campaign?.createdAt) },
              { label: t('activityTimeline.footerPayment'),       value: paid ? t('activityTimeline.footerPaymentPaid') : t('activityTimeline.footerPaymentPending'), color: paid ? '#16A34A' : '#EF4444' },
              { label: t('activityTimeline.footerCampaignId'),   value: (campaignId ?? '').slice(0, 8) + '…' },
            ].map((item, idx) => (
              <View key={idx} style={s.footerItem}>
                <Text style={[s.footerLabel, { color: C.textSecondary }]}>{item.label}</Text>
                <Text style={[s.footerValue, { color: item.color ?? C.text }]} numberOfLines={1}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Progress Tracker (centered on current step) ── */}
        <View style={[s.card, { backgroundColor: '#fff', paddingHorizontal: 0, paddingBottom: 16 }]}>
          <Text style={[s.secTitle, { color: C.text, marginHorizontal: 16, marginBottom: 14 }]}>{t('activityTimeline.campaignProgress')}</Text>
          <ProgressTracker current={pIdx} scrollRef={progressScrollRef} labels={progressLabels} />
        </View>

        {/* ── Current Action Card ── */}
        <ActionCard
          ws={ws} paid={paid} isCreator={isCreator} isFree={isFreeEvent} submitting={submitting}
          onPay={() => setShowPay(true)}
          onStartWork={handleStartWork}
          onUpload={() => setShowUpload(true)}
          onReview={() => setShowReview(true)}
          onApprove={handleApprove}
          onRevision={() => setShowRevision(true)}
        />

        {/* ── Activity Timeline ── */}
        <View style={[s.card, { backgroundColor: '#fff' }]}>
          <View style={s.secHeader}>
            <View>
              <Text style={[s.secTitle, { color: C.text }]}>{t('activityTimeline.sectionTimeline')}</Text>
              <Text style={[s.secSub, { color: C.textSecondary }]}>{t('activityTimeline.sectionTimelineSub')}</Text>
            </View>
          </View>
          <View style={{ marginTop: 12 }}>
            {tlEvents.map((ev, idx) => (
              <View key={idx} style={tl.row}>
                <View style={tl.left}>
                  <View style={[tl.dot, {
                    backgroundColor: ev.done ? '#16A34A' : ev.isCurrent ? '#7C3AED' : '#E5E7EB',
                    borderColor:     ev.done ? '#16A34A' : ev.isCurrent ? '#7C3AED' : '#D1D5DB',
                  }]}>
                    <Ionicons name={ev.icon as any} size={14} color={ev.done || ev.isCurrent ? '#fff' : '#9CA3AF'} />
                  </View>
                  {idx < tlEvents.length - 1 && (
                    <View style={[tl.line, { backgroundColor: ev.done ? '#16A34A' : '#E5E7EB' }]} />
                  )}
                </View>
                <View style={tl.body}>
                  <View style={tl.titleRow}>
                    <Text style={[tl.title, { color: ev.done || ev.isCurrent ? C.text : '#9CA3AF', fontFamily: ev.isCurrent ? F.bold : F.semibold }]} numberOfLines={1}>
                      {ev.title}
                    </Text>
                    <View style={[tl.badge, { backgroundColor: ev.done ? '#DCFCE7' : ev.isCurrent ? '#EEF2FF' : '#F3F4F6' }]}>
                      <Text style={[tl.badgeTxt, { color: ev.done ? '#16A34A' : ev.isCurrent ? '#7C3AED' : '#9CA3AF' }]}>
                        {ev.done ? t('activityTimeline.badgeDone') : ev.isCurrent ? t('activityTimeline.badgeCurrent') : t('activityTimeline.badgePending')}
                      </Text>
                    </View>
                  </View>
                  <Text style={[tl.desc, { color: C.textSecondary }]}>{ev.desc}</Text>
                  {ev.time ? <Text style={[tl.time, { color: '#9CA3AF' }]}>{ev.time}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        </View>


        {/* ── Payment Details ── */}
        <View style={[s.card, { backgroundColor: '#fff' }]}>
          <Text style={[s.secTitle, { color: C.text }]}>{t('activityTimeline.paymentDetails')}</Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            {[
              { label: t('activityTimeline.paymentCreatorFee'),   value: `NPR ${crFee.toLocaleString()}` },
              { label: t('activityTimeline.paymentPlatformFee'),  value: `NPR ${pfFee.toLocaleString()}` },
              { label: t('activityTimeline.paymentVat'),          value: `NPR ${vat.toLocaleString()}` },
            ].map((row, idx) => (
              <View key={idx} style={py.row}>
                <Text style={[py.label, { color: C.textSecondary }]}>{row.label}</Text>
                <Text style={[py.value, { color: C.text }]}>{row.value}</Text>
              </View>
            ))}
            <View style={[py.divider, { backgroundColor: '#F3F4F6' }]} />
            <View style={py.row}>
              <Text style={[py.totalLabel, { color: C.text }]}>{t('activityTimeline.paymentTotal')}</Text>
              <Text style={[py.totalValue, { color: '#16A34A' }]}>NPR {total.toLocaleString()}</Text>
            </View>
            <View style={[py.divider, { backgroundColor: '#F3F4F6' }]} />
            <View style={py.row}>
              <Text style={[py.label, { color: C.textSecondary }]}>{t('activityTimeline.paymentStatus')}</Text>
              <View style={[py.statusChip, {
                backgroundColor: ws === 'APPROVED' ? '#DCFCE7' : paid ? '#E0F2FE' : '#FEF2F2',
              }]}>
                <Text style={[py.statusChipTxt, {
                  color: ws === 'APPROVED' ? '#16A34A' : paid ? '#0EA5E9' : '#EF4444',
                }]}>
                  {ws === 'APPROVED' ? t('activityTimeline.paymentStatusReleased') : paid ? t('activityTimeline.paymentStatusHeld') : t('activityTimeline.paymentStatusWaiting')}
                </Text>
              </View>
            </View>
          </View>
          <View style={[py.trustBox, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#16A34A" />
            <Text style={[py.trustTxt, { color: '#16A34A' }]}>{t('activityTimeline.paymentSecureNote')}</Text>
          </View>
        </View>

        {/* ── Cancel Event button (business only) ── */}
        {!isCreator && ws !== 'APPROVED' && (
          <Pressable
            style={[s.cancelBtn, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}
            onPress={() => setShowCancel(true)}
          >
            <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
            <Text style={[s.cancelBtnTxt, { color: '#EF4444' }]}>{t('activityTimeline.cancelEventBtn')}</Text>
          </Pressable>
        )}

        {/* ── Security Footer ── */}
        <View style={s.secFooter}>
          <Ionicons name="shield-checkmark-outline" size={13} color="#9CA3AF" />
          <Text style={[s.secFooterTxt, { color: '#9CA3AF' }]}>{t('activityTimeline.paymentSecurityFooter')}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Toast ── */}
      {toast ? (
        <View style={s.toast} pointerEvents="none">
          <Text style={s.toastTxt}>{toast}</Text>
        </View>
      ) : null}

      {/* ── Pay Modal ── */}
      <Sheet visible={showPay} onClose={() => setShowPay(false)} title={t('activityTimeline.modalPayTitle')}>
        <Text style={sh.sub}>{t('activityTimeline.modalPaySub')}</Text>
        <View style={{ gap: 8, marginVertical: 14 }}>
          {([['Creator Fee', crFee], ['Platform Fee (5%)', pfFee], ['VAT (13%)', vat]] as [string, number][]).map(([l, v]) => (
            <View key={l} style={sh.sumRow}><Text style={sh.sumLabel}>{l}</Text><Text style={sh.sumValue}>NPR {v.toLocaleString()}</Text></View>
          ))}
          <View style={[sh.divider, { backgroundColor: '#E5E7EB' }]} />
          <View style={sh.sumRow}><Text style={sh.totalLabel}>Total</Text><Text style={sh.totalValue}>NPR {total.toLocaleString()}</Text></View>
        </View>
        <Text style={sh.sectionLabel}>{t('activityTimeline.modalPayWith')}</Text>
        <View style={{ gap: 8, marginBottom: 16 }}>
          {([['esewa', '🟢 eSewa'], ['khalti', '🟣 Khalti'], ['fonepay', '📱 Fonepay QR']] as [typeof payMethod, string][]).map(([m, label]) => (
            <Pressable key={m}
              style={[sh.methodBtn, { borderColor: payMethod === m ? '#7C3AED' : '#E5E7EB', backgroundColor: payMethod === m ? '#EEF2FF' : '#fff' }]}
              onPress={() => setPayMethod(m)}>
              <Text style={[sh.methodTxt, { color: payMethod === m ? '#7C3AED' : '#374151' }]}>{label}</Text>
              {payMethod === m && <Ionicons name="checkmark-circle" size={18} color="#7C3AED" />}
            </Pressable>
          ))}
        </View>
        <Pressable style={[sh.primaryBtn, { backgroundColor: '#7C3AED', opacity: submitting ? 0.75 : 1 }]} onPress={handlePay} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={sh.primaryBtnTxt}>{t('activityTimeline.modalPayConfirmBtn', { amount: total.toLocaleString() })}</Text>}
        </Pressable>
      </Sheet>

      {/* ── Upload Deliverables Modal ── */}
      <Sheet visible={showUpload} onClose={() => { setShowUpload(false); setUrlError(''); }} title={t('activityTimeline.modalUploadTitle')}>
        <Text style={sh.sub}>{t('activityTimeline.modalUploadSub')}</Text>
        <View style={{ gap: 12, marginVertical: 14 }}>
          <View>
            <Text style={sh.inputLabel}>{t('activityTimeline.modalUploadLinksLabel')}</Text>
            <TextInput
              style={[sh.input, { color: '#111827', height: 100, borderColor: urlError ? '#EF4444' : '#E5E7EB' }]}
              placeholder={"https://drive.google.com/...\nhttps://youtube.com/watch?v=..."}
              placeholderTextColor="#9CA3AF"
              value={uploadUrls}
              onChangeText={(t) => { setUploadUrls(t); if (urlError) setUrlError(''); }}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {urlError ? (
              <View style={up.errorRow}>
                <Ionicons name="alert-circle" size={13} color="#EF4444" />
                <Text style={up.errorTxt}>{urlError}</Text>
              </View>
            ) : null}

            {/* Live per-link preview */}
            {uploadUrls.trim().length > 0 && (
              <View style={{ gap: 6, marginTop: 10 }}>
                {parseUrls(uploadUrls).map((url, idx) => {
                  const valid = isValidUrl(url);
                  return (
                    <View key={idx} style={[up.linkPreview, { borderColor: valid ? '#A7F3D0' : '#FECACA', backgroundColor: valid ? '#F0FDF4' : '#FEF2F2' }]}>
                      <Ionicons name={valid ? 'checkmark-circle' : 'close-circle'} size={14} color={valid ? '#16A34A' : '#EF4444'} />
                      <Text style={[up.linkPreviewTxt, { color: valid ? '#065F46' : '#991B1B' }]} numberOfLines={1}>{url}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          <View>
            <Text style={sh.inputLabel}>{t('activityTimeline.modalUploadNotesLabel')}</Text>
            <TextInput
              style={[sh.input, { color: '#111827', height: 60 }]}
              placeholder={t('activityTimeline.modalUploadNotesPlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={uploadNotes}
              onChangeText={setUploadNotes}
              multiline
            />
          </View>
        </View>
        <Pressable style={[sh.primaryBtn, { backgroundColor: '#7C3AED', opacity: submitting ? 0.75 : 1 }]} onPress={handleSubmitWork} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="cloud-upload-outline" size={17} color="#fff" /><Text style={sh.primaryBtnTxt}>{t('activityTimeline.modalUploadSubmitBtn')}</Text></>}
        </Pressable>
      </Sheet>

      {/* ── Review Deliverables Modal ── */}
      <Sheet visible={showReview} onClose={() => setShowReview(false)} title={t('activityTimeline.modalReviewTitle')}>

        {/* Submitted links — top */}
        <View style={rv.section}>
          <View style={rv.sectionHeader}>
            <View style={[rv.sectionIcon, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="link" size={14} color="#7C3AED" />
            </View>
            <Text style={rv.sectionTitle}>{t('activityTimeline.modalReviewLinksSection')}</Text>
          </View>
          {submittedUrls.length > 0 ? (
            <View style={{ gap: 8 }}>
              {submittedUrls.map((url, idx) => (
                <Pressable
                  key={idx}
                  style={rv.linkRow}
                  onPress={() => Linking.openURL(url).catch(() => {})}>
                  <Ionicons name="open-outline" size={14} color="#7C3AED" />
                  <Text style={rv.linkTxt} numberOfLines={2}>{url}</Text>
                  <Ionicons name="chevron-forward" size={13} color="#A78BFA" />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={rv.noLinks}>
              <Ionicons name="link-outline" size={20} color="#D1D5DB" />
              <Text style={rv.noLinksTxt}>{t('activityTimeline.modalReviewNoLinks')}</Text>
            </View>
          )}
        </View>

        {/* What needs to be delivered */}
        {deliverables.length > 0 && (
          <View style={[rv.section, { marginTop: 14 }]}>
            <View style={rv.sectionHeader}>
              <View style={[rv.sectionIcon, { backgroundColor: '#FFF7ED' }]}>
                <Ionicons name="list" size={14} color="#D97706" />
              </View>
              <Text style={rv.sectionTitle}>{t('activityTimeline.modalReviewDeliverablesSection')}</Text>
            </View>
            <View style={{ gap: 8 }}>
              {deliverables.map((d, idx) => (
                <View key={idx} style={rv.deliverableRow}>
                  <View style={rv.deliverableNum}>
                    <Text style={rv.deliverableNumTxt}>{idx + 1}</Text>
                  </View>
                  <Text style={rv.deliverableTxt}>{d}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <Pressable
            style={[sh.primaryBtn, { flex: 1, backgroundColor: '#D97706' }]}
            onPress={() => { setShowReview(false); setTimeout(() => setShowRevision(true), 200); }}>
            <Ionicons name="create-outline" size={15} color="#fff" />
            <Text style={sh.primaryBtnTxt}>{t('activityTimeline.acRevisionBtn')}</Text>
          </Pressable>
          <Pressable
            style={[sh.primaryBtn, { flex: 1, backgroundColor: '#16A34A', opacity: submitting ? 0.75 : 1 }]}
            disabled={submitting}
            onPress={() => { setShowReview(false); handleApprove(); }}>
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <><Ionicons name="checkmark-done-outline" size={15} color="#fff" /><Text style={sh.primaryBtnTxt}>{t('activityTimeline.acApproveBtn')}</Text></>}
          </Pressable>
        </View>
      </Sheet>

      {/* ── Request Revision Modal ── */}
      <Sheet visible={showRevision} onClose={() => setShowRevision(false)} title={t('activityTimeline.modalRevisionTitle')}>
        <Text style={sh.sub}>{t('activityTimeline.modalRevisionSub')}</Text>
        <View style={{ marginVertical: 14 }}>
          <Text style={sh.inputLabel}>{t('activityTimeline.modalRevisionNotesLabel')}</Text>
          <TextInput
            style={[sh.input, { color: '#111827', height: 100 }]}
            placeholder={t('activityTimeline.modalRevisionNotesPlaceholder')}
            placeholderTextColor="#9CA3AF"
            value={revisionNote}
            onChangeText={setRevisionNote}
            multiline
          />
        </View>
        <Pressable style={[sh.primaryBtn, { backgroundColor: '#D97706', opacity: submitting ? 0.75 : 1 }]} onPress={handleRevision} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={sh.primaryBtnTxt}>{t('activityTimeline.modalRevisionSendBtn')}</Text>}
        </Pressable>
      </Sheet>

      {/* ── Cancel Event Modal (business) — 20% deduction warning ── */}
      <Sheet visible={showCancel} onClose={() => setShowCancel(false)} title={t('activityTimeline.modalCancelTitle')}>
        <Text style={[sh.sub, { color: '#EF4444' }]}>{t('activityTimeline.modalCancelSub')}</Text>

        {paid && (
          <View style={[sh.warnBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Ionicons name="warning" size={20} color="#EF4444" />
            <View style={{ flex: 1 }}>
              <Text style={[sh.warnTitle, { color: '#EF4444' }]}>{t('activityTimeline.modalCancelFeeTitle')}</Text>
              <Text style={[sh.warnBody, { color: '#B91C1C' }]}>
                {t('activityTimeline.modalCancelFeeBody', {
                  deduction: Math.round(total * 0.2).toLocaleString(),
                  refund: Math.round(total * 0.8).toLocaleString(),
                })}
              </Text>
            </View>
          </View>
        )}

        {!paid && (
          <View style={[sh.infoBox, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', marginVertical: 12 }]}>
            <Ionicons name="information-circle-outline" size={15} color="#D97706" />
            <Text style={[sh.infoTxt, { color: '#D97706' }]}>{t('activityTimeline.modalCancelNoFee')}</Text>
          </View>
        )}

        <Text style={[sh.sub, { marginTop: 12 }]}>{t('activityTimeline.modalCancelCreatorNotified')}</Text>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Pressable
            style={[sh.primaryBtn, { flex: 1, backgroundColor: '#F3F4F6' }]}
            onPress={() => setShowCancel(false)}
          >
            <Text style={[sh.primaryBtnTxt, { color: '#374151' }]}>{t('activityTimeline.modalCancelKeepBtn')}</Text>
          </Pressable>
          <Pressable
            style={[sh.primaryBtn, { flex: 1, backgroundColor: '#EF4444', opacity: submitting ? 0.75 : 1 }]}
            onPress={handleCancelEvent}
            disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={sh.primaryBtnTxt}>{t('activityTimeline.modalCancelConfirmBtn')}</Text>}
          </Pressable>
        </View>
      </Sheet>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SHADOW = { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 };

const s = StyleSheet.create({
  screen:   { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body:     { gap: 12, paddingTop: 12, paddingHorizontal: 16 },

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, gap: 8 },
  headerCenter: { flex: 1, gap: 4 },
  headerTitle:  { fontSize: 15, fontFamily: F.bold },
  iconBtn:      { padding: 8 },

  statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  statusDot:      { width: 6, height: 6, borderRadius: 3 },
  statusBadgeTxt: { fontSize: 10, fontFamily: F.bold },

  card: { borderRadius: 16, padding: 16, ...SHADOW, overflow: 'hidden' },

  summaryRow:   { flexDirection: 'row', gap: 12, marginBottom: 12 },
  thumb:        { width: 68, height: 68, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  summaryTitle: { fontSize: 15, fontFamily: F.bold, lineHeight: 21, marginBottom: 3 },
  summaryBrand: { fontSize: 13, fontFamily: F.semibold, marginBottom: 6 },
  metaRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  metaChipTxt:  { fontSize: 11, fontFamily: F.semibold, color: '#6B7280' },

  summaryFooter: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, gap: 4 },
  footerItem:    { flex: 1, alignItems: 'center', gap: 3 },
  footerLabel:   { fontSize: 9, fontFamily: F.regular, textTransform: 'uppercase', letterSpacing: 0.4 },
  footerValue:   { fontSize: 11, fontFamily: F.bold, textAlign: 'center' },

  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  secTitle:  { fontSize: 15, fontFamily: F.bold },
  secSub:    { fontSize: 11, fontFamily: F.regular, marginTop: 2 },

  secFooter:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 8 },
  secFooterTxt: { fontSize: 11, fontFamily: F.regular, flex: 1 },

  cancelBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 14, paddingVertical: 14 },
  cancelBtnTxt: { fontSize: 15, fontFamily: F.bold },

  toast:    { position: 'absolute', bottom: 24, left: 24, right: 24, backgroundColor: '#1F2937', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  toastTxt: { fontSize: 13, fontFamily: F.semibold, color: '#fff', textAlign: 'center' },
});

const pt = StyleSheet.create({
  row:        { paddingHorizontal: 8, paddingBottom: 4 },
  step:       { width: STEP_W, alignItems: 'center' },
  connRow:    { flexDirection: 'row', alignItems: 'center', width: '100%', height: 34 },
  line:       { flex: 1, height: 2 },
  dot:        { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activePulse:{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  emptyCore:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  label:      { fontSize: 9, fontFamily: F.semibold, textAlign: 'center', marginTop: 5, lineHeight: 12 },
});

const tl = StyleSheet.create({
  row:      { flexDirection: 'row', gap: 12, marginBottom: 0 },
  left:     { alignItems: 'center', width: 32 },
  dot:      { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  line:     { width: 2, flex: 1, minHeight: 12, marginTop: 2 },
  body:     { flex: 1, paddingBottom: 18, paddingTop: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 },
  title:    { fontSize: 13 },
  badge:    { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeTxt: { fontSize: 9, fontFamily: F.bold, textTransform: 'uppercase', letterSpacing: 0.3 },
  desc:     { fontSize: 12, fontFamily: F.regular, lineHeight: 17 },
  time:     { fontSize: 10, fontFamily: F.regular, marginTop: 4, lineHeight: 15 },
});

const rv = StyleSheet.create({
  section:          { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon:      { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle:     { fontSize: 13, fontFamily: F.bold, color: '#1F2937' },
  linkRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#EDE9FE', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  linkTxt:          { flex: 1, fontSize: 13, fontFamily: F.semibold, color: '#7C3AED', textDecorationLine: 'underline' },
  noLinks:          { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  noLinksTxt:       { fontSize: 13, fontFamily: F.regular, color: '#9CA3AF' },
  deliverableRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  deliverableNum:   { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FED7AA', justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0 },
  deliverableNumTxt:{ fontSize: 11, fontFamily: F.bold, color: '#D97706' },
  deliverableTxt:   { flex: 1, fontSize: 13, fontFamily: F.regular, color: '#374151', lineHeight: 20 },
});

const py = StyleSheet.create({
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:        { fontSize: 13, fontFamily: F.regular },
  value:        { fontSize: 13, fontFamily: F.semibold },
  divider:      { height: 1 },
  totalLabel:   { fontSize: 15, fontFamily: F.bold },
  totalValue:   { fontSize: 17, fontFamily: F.bold },
  statusChip:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusChipTxt:{ fontSize: 12, fontFamily: F.bold },
  trustBox:     { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 14 },
  trustTxt:     { fontSize: 12, fontFamily: F.semibold, flex: 1 },
});

const ac = StyleSheet.create({
  card:   { borderRadius: 16, padding: 18, borderLeftWidth: 4, ...SHADOW, backgroundColor: '#fff', gap: 8 },
  iconBg: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  heading:{ fontSize: 16, fontFamily: F.bold },
  sub:    { fontSize: 13, fontFamily: F.regular, lineHeight: 19 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingVertical: 13, marginTop: 4 },
  btnTxt: { fontSize: 14, fontFamily: F.bold, color: '#fff' },
});

const up = StyleSheet.create({
  errorRow:       { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  errorTxt:       { fontSize: 12, fontFamily: F.semibold, color: '#EF4444', flex: 1 },
  linkPreview:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  linkPreviewTxt: { flex: 1, fontSize: 12, fontFamily: F.regular },
});

const sh = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  kav:          { justifyContent: 'flex-end' },
  sheet:        { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  title:        { fontSize: 18, fontFamily: F.bold, color: '#111827', marginBottom: 6 },
  sub:          { fontSize: 13, fontFamily: F.regular, color: '#6B7280', marginBottom: 4 },
  sectionLabel: { fontSize: 13, fontFamily: F.bold, color: '#374151', marginBottom: 8, marginTop: 4 },
  sumRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel:     { fontSize: 13, fontFamily: F.regular, color: '#6B7280' },
  sumValue:     { fontSize: 13, fontFamily: F.semibold, color: '#111827' },
  totalLabel:   { fontSize: 15, fontFamily: F.bold, color: '#111827' },
  totalValue:   { fontSize: 17, fontFamily: F.bold, color: '#16A34A' },
  divider:      { height: 1, marginVertical: 4 },
  methodBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  methodTxt:    { fontSize: 14, fontFamily: F.semibold },
  inputLabel:   { fontSize: 12, fontFamily: F.semibold, color: '#374151', marginBottom: 6 },
  input:        { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontFamily: F.regular, textAlignVertical: 'top' },
  primaryBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15 },
  primaryBtnTxt:{ fontSize: 15, fontFamily: F.bold, color: '#fff' },
  infoBox:      { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 10 },
  infoTxt:      { fontSize: 12, fontFamily: F.semibold, flex: 1 },
  warnBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1.5, borderRadius: 12, padding: 14, marginVertical: 12 },
  warnTitle:    { fontSize: 14, fontFamily: F.bold, marginBottom: 4 },
  warnBody:     { fontSize: 13, fontFamily: F.regular, lineHeight: 19 },
});
