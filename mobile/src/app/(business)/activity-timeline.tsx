import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BackButton } from '@/components/BackButton';
import { getTemplateImage, DEFAULT_TEMPLATE_IMAGE } from '@/features/creator/data/templateImages';
import { PaymentMethodIcon } from '@/components/PaymentMethodIcon';
import { isPaymentMethodId } from '@/utilities/paymentMethods';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { campaignService, type DeliverableVideo, type DeliverableFile } from '@/services/campaign';
import { chatService } from '@/services/chat';
import { useDeliverableVideoUploads, type DeliverableUploadItem } from '@/hooks/useDeliverableVideoUploads';
import { useDeliverableFileUploads, type DeliverableFileUploadItem } from '@/hooks/useDeliverableFileUploads';
import {
  pickDeliverableVideosFromLibrary, pickDeliverableVideoFromCamera,
  pickDeliverableImagesFromLibrary, pickDeliverableImageFromCamera, pickDeliverableDocument,
  promptDeliverableUploadChoice,
} from '@/utilities/chatAttachments';
import { VideoPlayerModal } from '@/components/VideoPlayerModal';
import { BottomSheet } from '@/components/BottomSheet';
import { TabSlider } from '@/components/TabSlider';
import { ContractBody } from '@/components/ContractModal';
import { contractService, type Contract } from '@/services/contract';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
import { DocumentPreviewModal } from '@/components/DocumentPreviewModal';
import { NameVideoModal } from '@/components/NameVideoModal';
import type { Campaign } from '@/types';
import { F, RADIUS, SCREEN_GUTTER, SHADOW as TOKEN_SHADOW, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';

// ─── Types ─────────────────────────────────────────────────────────────────────

type WS = 'NONE' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'COMPLETED' | 'DISPUTED';
type PS = 'UNPAID' | 'PAID' | 'RELEASED';

type AppInfo = {
  id: string;
  // Which role of a multi-role campaign this application is for — null for
  // the simple single-category campaigns every existing campaign uses. Used
  // to look up this job's own completionType from campaign.requirements
  // rather than the campaign-level one.
  requirementId: string | null;
  workStatus: WS;
  paymentStatus: 'UNPAID' | 'PAID' | 'RELEASED';
  proposedRateRaw: number;
  submittedAt: string | null;
  deliverableUrls: string | null;
  deliverableVideos: DeliverableVideo[];
  deliverableFiles: DeliverableFile[];
  creatorProfileId: string;
  creatorUserId: string;
  creatorName: string;
  creatorAvatar: string | null;
  creatorLocation: string | null;
  workNote: string | null;
  revisionRequestedAt: string | null;
  revisionNotes: { note: string; createdAt: string }[];
};

// ─── Progress steps ────────────────────────────────────────────────────────────
// idx: 0=Accepted 1=Payment 2=Secured 3=Waiting 4=Started 5=Submitted 6=Review 7=Approved 8=Released (terminal)
// Payment release is the final stage — there is no separate "Completed"
// confirmation step. As soon as paymentStatus is RELEASED, every step
// (including "Released") shows done.

type TFn = (key: string, params?: Record<string, string | number>) => string;

function getProgressLabels(t: TFn, isService: boolean, isFree: boolean): string[] {
  // A free event has no money in the flow at all — the Payment/Secured/
  // Released steps would sit permanently greyed out, so they're dropped
  // rather than shown as steps that can never complete. Confirmation by the
  // business is the terminal step instead of payment release.
  if (isFree) {
    return [
      t('activityTimeline.progressAccepted'),
      t('activityTimeline.progressWaiting'),
      isService ? t('activityTimeline.progressServiceStarted') : t('activityTimeline.progressStarted'),
      isService ? t('activityTimeline.progressServiceCompleted') : t('activityTimeline.progressSubmitted'),
      isService ? t('activityTimeline.progressConfirming') : t('activityTimeline.progressReview'),
      isService ? t('activityTimeline.progressConfirmed') : t('activityTimeline.progressApproved'),
    ];
  }
  return [
    t('activityTimeline.progressAccepted'),
    t('activityTimeline.progressPayment'),
    t('activityTimeline.progressSecured'),
    t('activityTimeline.progressWaiting'),
    isService ? t('activityTimeline.progressServiceStarted') : t('activityTimeline.progressStarted'),
    isService ? t('activityTimeline.progressServiceCompleted') : t('activityTimeline.progressSubmitted'),
    isService ? t('activityTimeline.progressConfirming') : t('activityTimeline.progressReview'),
    isService ? t('activityTimeline.progressConfirmed') : t('activityTimeline.progressApproved'),
    t('activityTimeline.progressReleased'),
  ];
}

function progressIdx(ws: WS, paid: boolean, paymentStatus?: PS, isFree?: boolean): number {
  // Indices into the 6-label free-event set above — approval is terminal
  // there (nothing to release), so it returns one past the last step to
  // render every step as done.
  if (isFree) {
    if (ws === 'APPROVED' || ws === 'COMPLETED') return 6;
    if (ws === 'DISPUTED')    return 4;
    if (ws === 'SUBMITTED')   return 3;
    if (ws === 'IN_PROGRESS') return 2;
    return 1;
  }
  if (paymentStatus === 'RELEASED') return 9; // final stage — every step shows done
  if (ws === 'DISPUTED')   return 6; // stuck at the review/confirmation step, unresolved
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
  return `${time} · ${date}`;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseDeliverables(raw?: string): string[] {
  if (!raw) return [];
  return raw.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
}

function parseUrls(raw?: string | null): string[] {
  if (!raw) return [];
  return raw.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
}

// Creators often paste a bare domain (e.g. "drive.google.com/...") without a
// scheme — treat that as shorthand for https:// rather than rejecting it, both
// here and wherever the link is actually opened/played below.
function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(normalizeUrl(url));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

const DIRECT_VIDEO_EXTENSIONS = /\.(mp4|mov|m4v|webm|m3u8)(\?.*)?$/i;

// "Deliverable Links" are the intended path for videos too large for native
// upload (>500MB) — a raw video file URL (Cloudinary, S3, etc.) can open
// directly in the in-app player, but a YouTube/Google Drive share link is a
// *page*, not a video file, and genuinely needs an external app/browser.
function isDirectVideoUrl(url: string): boolean {
  if (DIRECT_VIDEO_EXTENSIONS.test(url)) return true;
  try {
    const { hostname, pathname } = new URL(url);
    return hostname.endsWith('res.cloudinary.com') && pathname.includes('/video/');
  } catch {
    return false;
  }
}

// Creator can submit a video, deliverable links, or both — only the combination
// of "no video AND no link" is rejected. Links, if present, must all be valid URLs.
function validateSubmission(hasDeliverable: boolean, raw: string, t: TFn): string {
  const lines = parseUrls(raw);
  if (!hasDeliverable && lines.length === 0) return t('activityTimeline.urlValidationAtLeastOne');
  const invalid = lines.filter(u => !isValidUrl(u));
  if (invalid.length === 1) return t('activityTimeline.urlValidationInvalidOne', { url: invalid[0] });
  if (invalid.length > 1)  return t('activityTimeline.urlValidationInvalidMany', { count: invalid.length });
  return '';
}

function statusLabel(ws: WS, paid: boolean, t: TFn, paymentStatus?: PS, isService?: boolean) {
  if (ws === 'COMPLETED')   return t('activityTimeline.statusReleased');
  if (ws === 'APPROVED' && paymentStatus === 'RELEASED') return t('activityTimeline.statusReleased');
  if (ws === 'APPROVED')    return isService ? t('activityTimeline.statusConfirmed') : t('activityTimeline.statusApproved');
  if (ws === 'SUBMITTED')   return isService ? t('activityTimeline.statusAwaitingConfirmation') : t('activityTimeline.statusUnderReview');
  if (ws === 'IN_PROGRESS') return t('activityTimeline.statusInProgress');
  if (paid)                 return t('activityTimeline.statusWaitingOnCreator');
  return t('activityTimeline.statusWaitingPayment');
}
function statusColor(ws: WS, paid: boolean, paymentStatus?: PS) {
  if (ws === 'COMPLETED')   return '#0EA5E9';
  if (ws === 'APPROVED' && paymentStatus === 'RELEASED') return '#0EA5E9';
  if (ws === 'APPROVED')    return '#65A30D';
  if (ws === 'SUBMITTED')   return '#D97706';
  if (ws === 'IN_PROGRESS') return '#7C3AED';
  if (paid)                 return '#0EA5E9';
  return '#EF4444';
}

type TLEvent = { icon: string; title: string; desc: string; time: string; done: boolean; isCurrent: boolean };

function buildTimeline(ws: WS, paid: boolean, campaign: Campaign | null, app: AppInfo | null, isCreator: boolean, t: TFn, isService: boolean, isFree: boolean): TLEvent[] {
  const base = campaign?.createdAt ?? new Date().toISOString();
  const events: TLEvent[] = [];
  // COMPLETED is the same "work is done" point as APPROVED for timeline
  // purposes — a paid campaign gets there via the admin's payment release, a
  // free event lands on it the moment the business confirms. Without this,
  // every work-stage row below (started/submitted/approved) would disappear
  // from a completed job's timeline.
  const workDone = ws === 'APPROVED' || ws === 'COMPLETED';

  events.push({
    icon: 'check-circle', title: t('activityTimeline.tlProposalAccepted'),
    desc: isCreator ? t('activityTimeline.tlProposalAcceptedDescCreator') : t('activityTimeline.tlProposalAcceptedDescBusiness'),
    time: fmtNPT(base), done: true, isCurrent: false,
  });

  if (!paid && ws === 'NONE') {
    events.unshift({
      icon: 'credit-card', title: t('activityTimeline.tlWaitingPayment'),
      desc: isCreator
        ? t('activityTimeline.tlWaitingPaymentDescCreator')
        : t('activityTimeline.tlWaitingPaymentDescBusiness'),
      time: '', done: false, isCurrent: true,
    });
  }

  // No escrow on a free event — nothing was ever secured, so this step is
  // dropped instead of claiming a payment that doesn't exist.
  if (!isFree && (paid || ws !== 'NONE')) {
    events.unshift({
      icon: 'lock', title: t('activityTimeline.tlPaymentSecured'),
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

  if (ws === 'IN_PROGRESS' || ws === 'SUBMITTED' || workDone) {
    events.unshift({
      icon: 'play-circle', title: isService ? t('activityTimeline.tlServiceStarted') : t('activityTimeline.tlWorkStarted'),
      desc: isCreator ? t('activityTimeline.tlWorkStartedDescCreator') : t('activityTimeline.tlWorkStartedDescBusiness'),
      time: fmtNPT(campaign?.paidAt ?? base),
      done: ws === 'SUBMITTED' || workDone,
      isCurrent: ws === 'IN_PROGRESS',
    });
  }

  if (ws === 'SUBMITTED' || workDone) {
    events.unshift(isService ? {
      icon: 'check-circle', title: t('activityTimeline.tlServiceCompleted'),
      desc: isCreator ? t('activityTimeline.tlServiceCompletedDescCreator') : t('activityTimeline.tlServiceCompletedDescBusiness'),
      time: fmtNPT(app?.submittedAt ?? base),
      done: workDone, isCurrent: ws === 'SUBMITTED',
    } : {
      icon: 'cloud-upload-alt', title: t('activityTimeline.tlDeliverablesUploaded'),
      desc: isCreator ? t('activityTimeline.tlDeliverablesUploadedDescCreator') : t('activityTimeline.tlDeliverablesUploadedDescBusiness'),
      time: fmtNPT(app?.submittedAt ?? base),
      done: workDone, isCurrent: ws === 'SUBMITTED',
    });
  }

  if (ws === 'DISPUTED') {
    events.unshift({
      icon: 'exclamation-triangle', title: t('activityTimeline.tlIssueReported'),
      desc: isCreator ? t('activityTimeline.tlIssueReportedDescCreator') : t('activityTimeline.tlIssueReportedDescBusiness'),
      time: fmtNPT(app?.revisionRequestedAt ?? base), done: true, isCurrent: true,
    });
  }

  if (workDone) {
    // The paid variants of these descriptions all talk about the admin
    // releasing payment — on a free event approval is simply the end of the
    // collaboration, so both roles get their own copy.
    events.unshift(isService ? {
      icon: 'check-double', title: t('activityTimeline.tlCompletionConfirmed'),
      desc: isFree
        ? (isCreator ? t('activityTimeline.tlFreeCompletedDescCreator') : t('activityTimeline.tlFreeCompletedDescBusiness'))
        : isCreator
        ? t('activityTimeline.tlCompletionConfirmedDescCreator')
        : t('activityTimeline.tlCompletionConfirmedDescBusiness'),
      time: fmtNPT(app?.submittedAt ?? base), done: true, isCurrent: false,
    } : {
      icon: 'check-double', title: t('activityTimeline.tlWorkApproved'),
      desc: isFree
        ? (isCreator ? t('activityTimeline.tlFreeCompletedDescCreator') : t('activityTimeline.tlFreeCompletedDescBusiness'))
        : isCreator
        ? t('activityTimeline.tlWorkApprovedDescCreator')
        : t('activityTimeline.tlWorkApprovedDescBusiness'),
      time: fmtNPT(app?.submittedAt ?? base), done: true, isCurrent: false,
    });
  }

  return events;
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
                {done   ? <FontAwesome5 name="check" solid size={11} color="#fff" /> :
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

function ActionCard({ ws, paid, paymentStatus, isCreator, isFree, isService, submitting, onPay, onStartWork, onUpload, onMarkComplete, onReview, onApprove, onRevision, onViewSubmission }: {
  ws: WS; paid: boolean; paymentStatus: PS; isCreator: boolean; isFree: boolean; isService: boolean; submitting: boolean;
  onPay: () => void; onStartWork: () => void; onUpload: () => void; onMarkComplete: () => void;
  onReview: () => void; onApprove: () => void; onRevision: () => void; onViewSubmission: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();

  // Business: payment required
  if (!paid && ws === 'NONE' && !isCreator) return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#EF4444' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#FEF2F2', shadowColor: '#EF4444', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="credit-card" size={16} color="#EF4444" solid /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acPaymentRequiredTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acPaymentRequiredSub')}</Text>
      <Pressable style={[ac.btn, { backgroundColor: '#EF4444', shadowColor: '#EF4444', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]} onPress={onPay}>
        <FontAwesome5 name="credit-card" size={14} color="#fff" solid />
        <Text style={ac.btnTxt}>{t('activityTimeline.acPayNowBtn')}</Text>
      </Pressable>
    </View>
  );

  // Creator: waiting for payment
  if (!paid && ws === 'NONE' && isCreator) return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#D97706' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#FFF7ED', shadowColor: '#D97706', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="clock" solid size={20} color="#D97706" /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acWaitingPaymentTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acWaitingPaymentSub')}</Text>
    </View>
  );

  // Business: payment done, waiting on creator
  if (paid && ws === 'NONE' && !isCreator) return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#0EA5E9' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#E0F2FE', shadowColor: '#0EA5E9', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="hourglass" solid size={20} color="#0EA5E9" /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acWaitingCreatorTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{isFree ? t('activityTimeline.acWaitingCreatorSubFree') : t('activityTimeline.acWaitingCreatorSubPaid')}</Text>
    </View>
  );

  // Creator: ready to start
  if (paid && ws === 'NONE' && isCreator) return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#7C3AED' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#EEF2FF', shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="rocket" size={16} color="#7C3AED" solid /></View>
        <Text style={[ac.heading, { color: C.text }]}>{isFree ? t('activityTimeline.acReadyFreeTitle') : t('activityTimeline.acReadyPaidTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{isFree ? t('activityTimeline.acReadyFreeSub') : t('activityTimeline.acReadyPaidSub')}</Text>
      <Pressable style={[ac.btn, { backgroundColor: '#7C3AED', opacity: submitting ? 0.75 : 1, shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]} onPress={onStartWork} disabled={submitting}>
        {submitting
          ? <ActivityIndicator size="small" color="#fff" />
          : <><FontAwesome5 name="rocket" size={14} color="#fff" solid /><Text style={ac.btnTxt}>{t('activityTimeline.acStartBtn')}</Text></>}
      </Pressable>
    </View>
  );

  // Business: creator working
  if (ws === 'IN_PROGRESS' && !isCreator) return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#7C3AED' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#EEF2FF', shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="play-circle" solid size={20} color="#7C3AED" /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acCreatorWorkingTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acCreatorWorkingSub')}</Text>
    </View>
  );

  // Creator: SERVICE jobs skip the upload step entirely — no file/link UI,
  // just a direct "mark as completed" action (§24 — no upload screen).
  if (ws === 'IN_PROGRESS' && isCreator && isService) return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#7C3AED' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#EEF2FF', shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="check-circle" solid size={20} color="#7C3AED" /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acServiceInProgressTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acServiceInProgressSub')}</Text>
      <Pressable style={[ac.btn, { backgroundColor: '#7C3AED', opacity: submitting ? 0.75 : 1, shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]} onPress={onMarkComplete} disabled={submitting}>
        {submitting
          ? <ActivityIndicator size="small" color="#fff" />
          : <><FontAwesome5 name="check-circle" solid size={16} color="#fff" /><Text style={ac.btnTxt}>{t('activityTimeline.acMarkCompletedBtn')}</Text></>}
      </Pressable>
    </View>
  );

  // Creator: upload deliverables (DELIVERABLE jobs only)
  if (ws === 'IN_PROGRESS' && isCreator) return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#7C3AED' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#EEF2FF', shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="cloud-upload-alt" solid size={20} color="#7C3AED" /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acUploadTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acUploadSub')}</Text>
      <Pressable style={[ac.btn, { backgroundColor: '#7C3AED', shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]} onPress={onUpload}>
        <FontAwesome5 name="cloud-upload-alt" solid size={16} color="#fff" />
        <Text style={ac.btnTxt}>{t('activityTimeline.acUploadBtn')}</Text>
      </Pressable>
    </View>
  );

  // Business: SERVICE job marked complete by the provider — confirm or
  // report an issue, no file review section (§27 — nothing was submitted).
  if (ws === 'SUBMITTED' && !isCreator && isService) return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#D97706' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#FFF7ED', shadowColor: '#D97706', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="check-circle" solid size={20} color="#D97706" /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acServiceCompletedTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acServiceCompletedSub')}</Text>
      <View style={ac.btnRow}>
        <Pressable style={[ac.btn, { flex: 1, backgroundColor: '#EF4444', shadowColor: '#EF4444', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]} onPress={onRevision}>
          <FontAwesome5 name="exclamation-triangle" solid size={15} color="#fff" />
          <Text style={ac.btnTxt}>{t('activityTimeline.acReportIssueBtn')}</Text>
        </Pressable>
        <Pressable style={[ac.btn, { flex: 1, backgroundColor: '#16A34A', opacity: submitting ? 0.75 : 1, shadowColor: '#16A34A', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]} onPress={onApprove} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <>
            <FontAwesome5 name="check-double" solid size={15} color="#fff" />
            <Text style={ac.btnTxt}>{t('activityTimeline.acConfirmCompletionBtn')}</Text>
          </>}
        </Pressable>
      </View>
    </View>
  );

  // Business: review submitted work (DELIVERABLE jobs only)
  if (ws === 'SUBMITTED' && !isCreator) return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#D97706' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#FFF7ED', shadowColor: '#D97706', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="eye" solid size={20} color="#D97706" /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acSubmittedTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acSubmittedSub')}</Text>
      <Pressable style={[ac.btn, { backgroundColor: '#D97706', shadowColor: '#D97706', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]} onPress={onReview}>
        <FontAwesome5 name="eye" solid size={16} color="#fff" />
        <Text style={ac.btnTxt}>{t('activityTimeline.acReviewBtn')}</Text>
      </Pressable>
      <View style={ac.btnRow}>
        <Pressable style={[ac.btn, { flex: 1, backgroundColor: '#EF4444', shadowColor: '#EF4444', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]} onPress={onRevision}>
          <FontAwesome5 name="edit" solid size={15} color="#fff" />
          <Text style={ac.btnTxt}>{t('activityTimeline.acRevisionBtn')}</Text>
        </Pressable>
        <Pressable style={[ac.btn, { flex: 1, backgroundColor: '#16A34A', opacity: submitting ? 0.75 : 1, shadowColor: '#16A34A', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]} onPress={onApprove} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <>
            <FontAwesome5 name="check-double" solid size={15} color="#fff" />
            <Text style={ac.btnTxt}>{t('activityTimeline.acApproveBtn')}</Text>
          </>}
        </Pressable>
      </View>
    </View>
  );

  // Creator: SERVICE job awaiting the client's confirmation — nothing to view.
  if (ws === 'SUBMITTED' && isCreator && isService) return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#0EA5E9' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#E0F2FE', shadowColor: '#0EA5E9', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="hourglass" solid size={20} color="#0EA5E9" /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acAwaitingConfirmationTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acAwaitingConfirmationSub')}</Text>
    </View>
  );

  // Creator: awaiting review (DELIVERABLE jobs only)
  if (ws === 'SUBMITTED' && isCreator) return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#0EA5E9' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#E0F2FE', shadowColor: '#0EA5E9', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="hourglass" solid size={20} color="#0EA5E9" /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acAwaitingReviewTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acAwaitingReviewSub')}</Text>
      <Pressable style={[ac.btn, { backgroundColor: '#0EA5E9', shadowColor: '#0EA5E9', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]} onPress={onViewSubmission}>
        <FontAwesome5 name="eye" solid size={16} color="#fff" />
        <Text style={ac.btnTxt}>{t('activityTimeline.acViewSubmissionBtn')}</Text>
      </Pressable>
    </View>
  );

  // Disputed (§40) — no further self-service action for either side; Kolab
  // support reviews it. Shown before the payment-released check since a
  // disputed job never reaches that state on its own.
  if (ws === 'DISPUTED') return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#EF4444' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#FEF2F2', shadowColor: '#EF4444', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="exclamation-triangle" solid size={18} color="#EF4444" /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acIssueReportedTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{isCreator ? t('activityTimeline.acIssueReportedSubCreator') : t('activityTimeline.acIssueReportedSubBusiness')}</Text>
    </View>
  );

  // Free event, approved/completed — terminal. Checked before the two
  // APPROVED cards below, which both promise an admin payment release that
  // will never come for a free event (paymentStatus stays UNPAID forever;
  // approving one flips it straight to COMPLETED server-side).
  if (isFree && (ws === 'APPROVED' || ws === 'COMPLETED')) return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#16A34A' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#DCFCE7', shadowColor: '#16A34A', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="check-double" solid size={20} color="#16A34A" /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acFreeCompleteTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{isCreator ? t('activityTimeline.acFreeCompleteCreatorSub') : t('activityTimeline.acFreeCompleteBizSub')}</Text>
    </View>
  );

  // Payment released — the final stage, both roles see the same completion
  // card immediately (no separate "confirm receipt" step required).
  if (paymentStatus === 'RELEASED') return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#16A34A' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#DCFCE7', shadowColor: '#16A34A', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="check-double" solid size={20} color="#16A34A" /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acProjectCompleteTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{isCreator ? t('activityTimeline.acProjectCompleteCreatorSub') : t('activityTimeline.acProjectCompleteBizSub')}</Text>
    </View>
  );

  // APPROVED, payment still held — business: admin will release it
  if (!isCreator) return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#16A34A' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#DCFCE7', shadowColor: '#16A34A', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="check-double" solid size={20} color="#16A34A" /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acApprovedBizTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acApprovedBizSub')}</Text>
    </View>
  );

  // APPROVED, payment still held — creator: admin will release it
  return (
    <View style={[ac.card, { backgroundColor: C.surface, borderLeftColor: '#16A34A' }]}>
      <View style={ac.headerRow}>
        <View style={[ac.iconBg, { backgroundColor: '#DCFCE7', shadowColor: '#16A34A', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}><FontAwesome5 name="trophy" size={16} color="#16A34A" solid /></View>
        <Text style={[ac.heading, { color: C.text }]}>{t('activityTimeline.acApprovedCreatorTitle')}</Text>
      </View>
      <Text style={[ac.sub, { color: C.textSecondary }]}>{t('activityTimeline.acApprovedCreatorSub')}</Text>
    </View>
  );
}

// Distinguishes PDF vs Word docs in the deliverables grid (both otherwise
// render as the same generic file icon) — anything else falls back to a
// plain "FILE" badge rather than guessing.
function docThumb(mimeType: string): { label: string; color: string } {
  if (mimeType === 'application/pdf') return { label: 'PDF', color: '#DC2626' };
  if (mimeType === 'application/msword' || mimeType.includes('wordprocessingml')) return { label: 'DOC', color: '#2563EB' };
  return { label: 'FILE', color: '#7C3AED' };
}

// A paused, muted first-frame preview of an on-device video file — same
// primitive as the chat screens' LocalVideoPreview, used here so an in-flight
// deliverable video shows its real thumbnail instantly instead of a generic
// spinner, without implying it's playable while still uploading (see the
// in-flight video card below, which never overlays a play button on this).
function LocalVideoPreview({ uri, style }: { uri: string; style: object }) {
  const player = useVideoPlayer(uri, (p) => {
    p.muted = true;
    p.pause();
  });
  return <VideoView player={player} style={style as never} nativeControls={false} contentFit="cover" />;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CampaignWorkspaceScreen() {
  const C = useAppColors();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { campaignId, campaignTitle, role, brand, applicationId, openFeedback } = useLocalSearchParams<{
    campaignId: string; campaignTitle: string; role?: string; brand?: string; applicationId?: string; openFeedback?: string;
  }>();

  // Role determined from auth token primarily, URL param as fallback
  const isCreator = user?.role === 'CREATOR' || role === 'CREATOR';

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [app, setApp]           = useState<AppInfo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]       = useState('');

  // §52 — Overview/Chat/Deliverables/Payment/Agreement/Activity tabs. Purely
  // a render-layer split: every state/handler above and below is shared
  // across tabs unchanged, only which section is visible changes.
  const [activeTab, setActiveTab] = useState<'overview' | 'deliverables' | 'payment' | 'agreement' | 'activity'>('overview');
  // undefined = not fetched yet (== loading, once the Agreement tab is open
  // and it's not a free event), null = fetched-and-none.
  const [contract, setContract] = useState<Contract | null | undefined>(undefined);
  const contractFetchStarted = useRef(false);

  const [showPay, setShowPay]           = useState(false);
  const [showUpload, setShowUpload]     = useState(false);
  const [showReview, setShowReview]     = useState(false);
  const [showRevision, setShowRevision] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const autoOpenedFeedback = useRef(false);

  // Post-completion rating (§58) — distinct from showFeedback/showReview
  // above, which are about the submitted deliverables, not rating the other
  // party. undefined = not fetched yet, null = fetched, none exists.
  const [myReview, setMyReview] = useState<{ id: string; rating: number; comment: string | null; createdAt: string } | null | undefined>(undefined);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue]     = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const [payMethod, setPayMethod]       = useState<'esewa' | 'khalti' | 'fonepay'>('esewa');
  const [uploadUrls, setUploadUrls]     = useState('');
  const [uploadNotes, setUploadNotes]   = useState('');
  const [urlError, setUrlError]         = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  // Widened beyond DeliverableVideo (only .url/.label are ever read below) so
  // a plain "Deliverable Link" that turns out to be a direct video URL can
  // open in the same player without needing a full fake DeliverableVideo.
  const [playingVideo, setPlayingVideo] = useState<{ url: string; label: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; label: string } | null>(null);
  const [previewDoc, setPreviewDoc]     = useState<{ url: string; label: string } | null>(null);
  // Which BottomSheet (if any) was closed to make way for the video/image/doc
  // preview below — RN presents each <Modal> as its own native window, and
  // having two visible at once (the sheet + the preview) hangs the UI on iOS
  // with no error, so the sheet must fully close first and reopen after.
  const [previewReturnTo, setPreviewReturnTo] = useState<'upload' | 'review' | null>(null);
  function openPreviewFrom(sheet: 'upload' | 'review', open: () => void) {
    setPreviewReturnTo(sheet);
    if (sheet === 'upload') setShowUpload(false); else setShowReview(false);
    setTimeout(open, 200);
  }
  function closePreviewAndReturn(close: () => void) {
    close();
    if (previewReturnTo) {
      const sheet = previewReturnTo;
      setPreviewReturnTo(null);
      setTimeout(() => (sheet === 'upload' ? setShowUpload(true) : setShowReview(true)), 200);
    }
  }

  const videoUploads = useDeliverableVideoUploads(app?.id ?? '', app?.deliverableVideos.length ?? 0);
  // Once a session upload finishes it's already persisted server-side (see
  // completeDeliverableVideo) — filtered out of `app.deliverableVideos` here so
  // it isn't shown twice if `load()` re-fetches (e.g. on refocus) while the
  // hook's own "done" card for it is still on screen.
  const persistedVideos = (app?.deliverableVideos ?? []).filter(v => !videoUploads.items.some(i => i.result?.publicId === v.publicId));

  const fileUploads = useDeliverableFileUploads(app?.id ?? '', app?.deliverableFiles.length ?? 0);
  // Same de-dup reasoning as persistedVideos above.
  const persistedFiles = (app?.deliverableFiles ?? []).filter(f => !fileUploads.items.some(i => i.result?.id === f.id));

  // Naming prompt — shown once per finished upload (already saved
  // server-side with an auto-generated "Video N" label by this point; Save
  // just relabels it, it's never blocked on this input). promptedRef tracks
  // which localIds have already been offered the prompt so it doesn't
  // reappear every re-render while the finished card is still on screen.
  const [namingItem, setNamingItem] = useState<DeliverableUploadItem | null>(null);
  const promptedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const next = videoUploads.items.find((i) => i.status === 'done' && i.result && !promptedRef.current.has(i.localId));
    if (next) {
      promptedRef.current.add(next.localId);
      showToast(t('activityTimeline.videoUploaded'));
      setNamingItem(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUploads.items]);

  // Toast-only equivalent of the naming prompt above — images/docs don't get
  // a rename step, just a confirmation that the upload landed.
  const promptedFileRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const next = fileUploads.items.find((i) => i.status === 'done' && i.result && !promptedFileRef.current.has(i.localId));
    if (next) {
      promptedFileRef.current.add(next.localId);
      showToast(t(next.file.fileType === 'image' ? 'activityTimeline.imageUploaded' : 'activityTimeline.fileUploaded'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUploads.items]);

  // Warm the deliverables as soon as the brand lands on a SUBMITTED
  // application, instead of waiting for them to tap "Review" — the slow part
  // isn't the download itself, it's Cloudinary generating/caching the
  // delivery transformation on its *first* request for that asset. Firing
  // that request here means it's already cached by the time the review sheet
  // opens. Guarded by application id so it only fires once per submission,
  // not on every re-focus poll.
  const prefetchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (isCreator || !app || app.workStatus !== 'SUBMITTED' || prefetchedRef.current === app.id) return;
    prefetchedRef.current = app.id;

    app.deliverableFiles.forEach((f) => {
      if (f.fileType === 'IMAGE') void Image.prefetch(f.url);
      else void fetch(f.url, { headers: { Range: 'bytes=0-1048575' } }).catch(() => {});
    });
    app.deliverableVideos.forEach((v) => {
      void Image.prefetch(v.thumbnailUrl);
      void fetch(v.url, { headers: { Range: 'bytes=0-1048575' } }).catch(() => {});
    });
  }, [isCreator, app]);

  function handleSaveVideoName(label: string) {
    if (namingItem?.result && app?.id) {
      campaignService.renameDeliverableVideo(app.id, namingItem.result.publicId, label).catch(() => {});
      videoUploads.relabel(namingItem.localId, label);
    }
    setNamingItem(null);
  }

  const progressScrollRef = useRef<ScrollView>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  }

  // Single entry point behind the one "+" tile in the combined deliverables
  // grid — the chooser covers video/photo/document, and each branch checks
  // its own type's slot limit only once the creator has picked a type (the
  // add tile itself is already hidden once *both* limits are hit — see the
  // sheet's `remainingSlots > 0` check below).
  async function handleAddDeliverable() {
    const choice = await promptDeliverableUploadChoice();
    if (!choice) return;
    if (choice === 'video-camera' || choice === 'video-library') {
      if (videoUploads.remainingSlots <= 0) {
        showToast(t('activityTimeline.videoLimitReached'));
        return;
      }
      if (choice === 'video-camera') {
        const video = await pickDeliverableVideoFromCamera();
        if (video) videoUploads.addVideos([video]);
      } else {
        const videos = await pickDeliverableVideosFromLibrary(videoUploads.remainingSlots);
        if (videos.length > 0) videoUploads.addVideos(videos);
      }
      return;
    }

    if (fileUploads.remainingSlots <= 0) {
      showToast(t('activityTimeline.fileLimitReached'));
      return;
    }
    if (choice === 'photo-camera') {
      const image = await pickDeliverableImageFromCamera();
      if (image) fileUploads.addFiles([image]);
    } else if (choice === 'photo-library') {
      const images = await pickDeliverableImagesFromLibrary(fileUploads.remainingSlots);
      if (images.length > 0) fileUploads.addFiles(images);
    } else {
      const doc = await pickDeliverableDocument();
      if (doc) fileUploads.addFiles([doc]);
    }
  }

  async function handleRemoveDeliverableVideo(publicId: string) {
    if (!app) return;
    try {
      await campaignService.removeDeliverableVideo(app.id, publicId);
      setApp(a => a ? { ...a, deliverableVideos: a.deliverableVideos.filter(v => v.publicId !== publicId) } : a);
    } catch (e: any) {
      showToast(e?.message ?? 'Could not remove video');
    }
  }

  async function handleRemoveDeliverableFile(fileId: string) {
    if (!app) return;
    try {
      await campaignService.removeDeliverableFile(app.id, fileId);
      setApp(a => a ? { ...a, deliverableFiles: a.deliverableFiles.filter(f => f.id !== fileId) } : a);
    } catch (e: any) {
      showToast(e?.message ?? 'Could not remove file');
    }
  }

  // A finished upload item is already persisted server-side (see
  // persistedVideos/persistedFiles' de-dup filter above) but hasn't shown up
  // in `app.deliverableVideos/Files` yet — a plain dismiss() would just hide
  // it locally without deleting it from the backend, orphaning it until the
  // next refetch. So closing a "done" card actually deletes the deliverable,
  // then drops the local card once that succeeds.
  async function handleRemoveVideoUploadItem(item: DeliverableUploadItem) {
    if (item.result) await handleRemoveDeliverableVideo(item.result.publicId);
    videoUploads.dismiss(item.localId);
  }

  async function handleRemoveFileUploadItem(item: DeliverableFileUploadItem) {
    if (item.result) await handleRemoveDeliverableFile(item.result.id);
    fileUploads.dismiss(item.localId);
  }

  async function load() {
    setLoading(true);
    try {
      if (isCreator) {
        const [c, { proposals: myApps }] = await Promise.all([
          campaignService.getById(campaignId),
          campaignService.getMyApplications(),
        ]);
        setCampaign(c);
        const myApp = myApps.find(a => a.campaignId === campaignId && a.status === 'accepted');
        if (myApp) {
          setApp({
            id:               myApp.id,
            requirementId:    myApp.requirementId,
            workStatus:       myApp.workStatus,
            paymentStatus:    (myApp.paymentStatus ?? 'UNPAID') as 'UNPAID' | 'PAID' | 'RELEASED',
            proposedRateRaw:  myApp.proposedRateRaw,
            submittedAt:      myApp.workSubmittedAt ?? null,
            deliverableUrls:  null,
            deliverableVideos: myApp.deliverableVideos ?? [],
            deliverableFiles: myApp.deliverableFiles ?? [],
            creatorProfileId: myApp.businessId,
            creatorUserId:    myApp.businessId,
            creatorName:      myApp.brand,
            creatorAvatar:    null,
            creatorLocation:  null,
            workNote:         myApp.workNote ?? null,
            revisionRequestedAt: myApp.revisionRequestedAt ?? null,
            revisionNotes:    myApp.revisionNotes ?? [],
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
            requirementId:    accepted.requirementId,
            workStatus:       accepted.workStatus,
            paymentStatus:    (accepted.paymentStatus ?? 'UNPAID') as 'UNPAID' | 'PAID' | 'RELEASED',
            proposedRateRaw:  accepted.proposedRateRaw,
            submittedAt:      accepted.submittedAt,
            deliverableUrls:  accepted.deliverableUrls,
            deliverableVideos: accepted.deliverableVideos ?? [],
            deliverableFiles: accepted.deliverableFiles ?? [],
            creatorProfileId: accepted.creator.id,
            creatorUserId:    accepted.creator.userId,
            creatorName:      accepted.creator.fullName,
            creatorAvatar:    accepted.creator.avatarUrl,
            creatorLocation:  accepted.creator.location,
            workNote:         accepted.workNote ?? null,
            revisionRequestedAt: accepted.revisionRequestedAt ?? null,
            revisionNotes:    accepted.revisionNotes ?? [],
          });
        }
      }
    } catch { /* silently handled */ }
    finally { setLoading(false); }
  }

  useFocusEffect(useCallback(() => { void load(); }, [campaignId, isCreator, applicationId]));

  useEffect(() => {
    if (app?.workStatus !== 'COMPLETED' || !app.id) return;
    campaignService.getMyReview(app.id).then(setMyReview).catch(() => setMyReview(null));
  }, [app?.workStatus, app?.id]);

  // Agreement tab (§52) — lazy, fetched only once the tab is actually opened
  // (not on initial screen load) since most opens never look at it. Contracts
  // only exist for paid campaigns — free events have nothing to fetch.
  useEffect(() => {
    // Free events never have a contract (render checks isFreeEvent directly,
    // ahead of `contract`'s undefined/null states) — nothing to fetch, so we
    // just skip rather than needing to record that in `contract` itself.
    // contractFetchStarted is a ref (not state) so this guard doesn't itself
    // trigger the "setState synchronously in an effect" pattern.
    if (activeTab !== 'agreement' || contractFetchStarted.current) return;
    if (!app?.id || campaign?.campaignType === 'OPEN_EVENT') return;
    contractFetchStarted.current = true;
    contractService.getContractForApplication(app.id)
      .then(setContract)
      .catch(() => setContract(null));
  }, [activeTab, app?.id, campaign?.campaignType]);

  async function handleSubmitRating() {
    if (!app?.id || ratingValue < 1 || submittingRating) return;
    setSubmittingRating(true);
    try {
      await campaignService.submitReview(app.id, ratingValue, ratingComment.trim());
      setMyReview({ id: app.id, rating: ratingValue, comment: ratingComment.trim() || null, createdAt: new Date().toISOString() });
      setShowRatingModal(false);
      showToast(t('activityTimeline.ratingSubmitted'));
    } catch (e) {
      showToast(e instanceof Error ? e.message : t('activityTimeline.ratingFailed'));
    } finally {
      setSubmittingRating(false);
    }
  }

  // Deep-linked from the "Revision Requested" notification — open the
  // feedback modal once the note has loaded. Guarded to fire only once per
  // mount so it doesn't reopen on every useFocusEffect refetch.
  useEffect(() => {
    if (!autoOpenedFeedback.current && openFeedback === 'true' && app?.revisionNotes && app.revisionNotes.length > 0) {
      autoOpenedFeedback.current = true;
      setShowFeedback(true);
    }
  }, [openFeedback, app]);

  // Center progress tracker on current step after data loads
  useEffect(() => {
    if (!loading && progressScrollRef.current) {
      const ws   = app?.workStatus ?? 'NONE';
      const paid = campaign?.campaignType === 'OPEN_EVENT' || campaign?.paymentStatus === 'PAID' || campaign?.paymentStatus === 'RELEASED';
      const idx  = progressIdx(ws, paid, app?.paymentStatus);
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
      showToast(e?.message ?? t('activityTimeline.toastPayFailed'));
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
      showToast(e?.message ?? t('activityTimeline.toastStartFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitWork() {
    if (!app) return;
    const hasDeliverable = persistedVideos.length > 0 || videoUploads.items.some(i => i.status === 'done')
      || persistedFiles.length > 0 || fileUploads.items.some(i => i.status === 'done');
    const err = validateSubmission(hasDeliverable, uploadUrls, t);
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
      showToast(e?.message ?? t('activityTimeline.toastSubmitFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  // SERVICE jobs skip the upload modal entirely — reuses the same submitWork
  // endpoint as the DELIVERABLE flow (it already accepts an empty body), just
  // with no file/link payload and its own toast copy.
  async function handleMarkComplete() {
    if (!app) return;
    setSubmitting(true);
    try {
      await campaignService.submitWork(app.id, {});
      setApp(a => a ? { ...a, workStatus: 'SUBMITTED', submittedAt: new Date().toISOString() } : a);
      showToast(t('activityTimeline.toastServiceCompleted'));
    } catch (e: any) {
      showToast(e?.message ?? t('activityTimeline.toastSubmitFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!app) return;
    setSubmitting(true);
    try {
      await campaignService.approveWork(app.id);
      // Approving a free event completes it outright server-side (there's no
      // payment release left to wait on) — mirror that locally so a refetch
      // doesn't change what this screen shows.
      setApp(a => a ? { ...a, workStatus: campaign?.campaignType === 'OPEN_EVENT' ? 'COMPLETED' : 'APPROVED' } : a);
      showToast(t('activityTimeline.toastWorkApproved'));
    } catch (e: any) {
      showToast(e?.message ?? t('activityTimeline.toastApproveFailed'));
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
      showToast(e?.message ?? t('activityTimeline.toastRevisionFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  // §40 dispute flow — reuses the same "revision" BottomSheet UI (title/copy
  // already branch on isService), but calls the dedicated report-issue
  // endpoint so the job flags DISPUTED instead of silently reopening.
  async function handleReportIssue() {
    if (!app || !revisionNote.trim()) return;
    setSubmitting(true);
    try {
      await campaignService.reportIssue(app.id, revisionNote);
      setApp(a => a ? { ...a, workStatus: 'DISPUTED' } : a);
      setRevisionNote(''); setShowRevision(false);
      showToast(t('activityTimeline.toastIssueReported'));
    } catch (e: any) {
      showToast(e?.message ?? t('activityTimeline.toastRevisionFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMessage() {
    const otherProfileId = app?.creatorProfileId;
    const otherName      = isCreator ? (app?.creatorName ?? t('activityTimeline.fallbackBrand')) : (app?.creatorName ?? t('activityTimeline.fallbackCreator'));

    if (otherProfileId) {
      try {
        const conv = await chatService.checkConversation(otherProfileId);
        if (conv?.id) {
          router.push({
            // Outer-stack chat route (sibling of this screen), not the
            // Messages tab's nested one — keeps chat directly on top of
            // activity-timeline in the same stack so plain back() correctly
            // pops here, then further back() calls pop to whatever opened
            // this screen, with no cross-navigator history juggling needed.
            pathname: (isCreator ? '/(creator)/chat/[id]' : '/(business)/chat/[id]') as never,
            params: {
              id: conv.id, name: otherName, status: conv.status, focusInput: 'true', participantId: otherProfileId, participantRole: isCreator ? 'BUSINESS' : 'CREATOR',
              // Only the creator's avatar is fetched onto this screen's AppInfo
              // today — when isCreator is true (viewing the business side) there's
              // no business logo available here to pass, so this falls back to
              // initials same as before for that direction.
              avatar: isCreator ? '' : (app?.creatorAvatar ?? ''),
              campaignTitle,
            },
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
      <SafeAreaView style={[s.screen, { backgroundColor: C.background }]} edges={['top']}>
        <View style={{ backgroundColor: C.surface }}>
          <View style={s.header}>
            <BackButton />
            <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>{campaignTitle ?? t('activityTimeline.headerFallback')}</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={[s.headerSeparator, { backgroundColor: C.border }]} />
        </View>
        <View style={s.centered}><ActivityIndicator size="large" color="#7C3AED" /></View>
      </SafeAreaView>
    );
  }

  const ws   = app?.workStatus ?? 'NONE';
  const isFreeEvent = campaign?.campaignType === 'OPEN_EVENT';
  const paid = isFreeEvent || app?.paymentStatus === 'PAID' || app?.paymentStatus === 'RELEASED';
  const pIdx = progressIdx(ws, paid, app?.paymentStatus, isFreeEvent);
  // A multi-role campaign's own requirement carries its own completionType
  // (a photographer role can be DELIVERABLE while a DJ role on the same
  // campaign is SERVICE); the simple single-category case falls back to the
  // campaign-level field. Null (not yet classified) behaves exactly like the
  // existing DELIVERABLE flow — no behavior change for campaigns predating
  // completionType.
  const jobCompletionType = app?.requirementId
    ? (campaign?.requirements?.find(r => r.id === app.requirementId)?.completionType ?? null)
    : (campaign?.completionType ?? null);
  const isService = jobCompletionType === 'SERVICE';
  const progressLabels = getProgressLabels(t, isService, isFreeEvent);

  const crFee = app?.proposedRateRaw ?? 0;
  const pfFee = Math.round(crFee * 0.05);
  const vat   = Math.round(pfFee * 0.13);
  const total = crFee + pfFee + vat;

  const deliverables   = parseDeliverables(campaign?.deliverables);
  const submittedUrls  = parseUrls(app?.deliverableUrls);
  const tlEvents       = buildTimeline(ws, paid, campaign, app, isCreator, t, isService, isFreeEvent);

  const summaryImage = campaign?.featureImageUrl
    || getTemplateImage(campaign?.template, campaign?.categoryKey ?? campaign?.category)
    || DEFAULT_TEMPLATE_IMAGE;

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>

      {/* ── Header ── */}
      <View style={{ backgroundColor: C.surface }}>
        <View style={s.header}>
          <BackButton />
          <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>
            {campaign?.title || campaignTitle || t('activityTimeline.headerWorkspace')}
          </Text>
          {/* Only message icon — no overflow menu. Payment release is the final
              stage, so chat closes here rather than staying open indefinitely. */}
          {app?.paymentStatus === 'RELEASED' ? (
            <View style={s.iconBtn}>
              <FontAwesome5 name="comment-alt" solid size={22} color="#D1D5DB" />
            </View>
          ) : (
            <Pressable style={s.iconBtn} onPress={handleMessage} hitSlop={6}>
              <FontAwesome5 name="comment-alt" solid size={22} color="#7C3AED" />
            </Pressable>
          )}
        </View>
        <View style={[s.headerSeparator, { backgroundColor: C.border }]} />
      </View>

      <View style={[s.tabBarWrap, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <TabSlider
          justify
          active={activeTab}
          onChange={(k) => setActiveTab(k as typeof activeTab)}
          tabs={[
            { key: 'overview',     label: t('activityTimeline.tabOverview') },
            // SERVICE jobs have no files/links to review — the tab has
            // nothing to show (§24 — no upload screen for these roles).
            ...(isService ? [] : [{ key: 'deliverables', label: t('activityTimeline.tabDeliverables') }]),
            // Free events have no payment at all — the tab would only ever
            // show a Rs. 0 breakdown (same reason Agreement shows a
            // not-applicable note instead of a contract).
            ...(isFreeEvent ? [] : [{ key: 'payment', label: t('activityTimeline.tabPayment') }]),
            { key: 'agreement',    label: t('activityTimeline.tabAgreement') },
            { key: 'activity',     label: t('activityTimeline.tabActivity') },
          ]}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>

        {activeTab === 'overview' && (<>
        {/* ── Campaign Summary Card ── */}
        <View style={[s.card, { backgroundColor: C.surface }]}>
          <View style={s.summaryRow}>
            {/* Shadow lives on the outer view — Android's elevation shadow doesn't
                composite correctly with overflow:hidden + an image on the same view. */}
            <View style={[s.thumb, { shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 }]}>
              <View style={s.thumbClip}>
                <Image source={{ uri: summaryImage }} style={s.thumbImage} contentFit="cover" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.summaryTitle, { color: C.text }]} numberOfLines={2}>
                {campaign?.title || campaignTitle}
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
                    <FontAwesome5 name="calendar-alt" solid size={11} color="#6B7280" />
                    <Text style={s.metaChipTxt}>{fmtDate(campaign.deadline)}</Text>
                  </View>
                )}
                <View style={s.metaChip}>
                  <FontAwesome5 name="wallet" solid size={11} color="#6B7280" />
                  <Text style={s.metaChipTxt}>{campaign?.budget ?? 'Free'}</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={[s.summaryFooter, { borderTopColor: '#F3F4F6' }]}>
            {[
              { label: t('activityTimeline.footerProposalDate'), value: fmtDate(campaign?.createdAt) },
              // `paid` is forced true for a free event (nothing to pay), so
              // it would otherwise read "Paid" — say what it actually is.
              { label: t('activityTimeline.footerPayment'),       value: isFreeEvent ? t('activityTimeline.footerPaymentFree') : paid ? t('activityTimeline.footerPaymentPaid') : t('activityTimeline.footerPaymentPending'), color: isFreeEvent ? '#059669' : paid ? '#16A34A' : '#EF4444' },
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
        <View style={[s.card, { backgroundColor: C.surface, paddingHorizontal: 0, paddingBottom: 16 }]}>
          <View style={[s.secHeader, { marginHorizontal: 16, marginBottom: 14 }]}>
            <Text style={[s.secTitle, { color: C.text }]}>{t('activityTimeline.campaignProgress')}</Text>
            {!!app?.revisionNotes && app.revisionNotes.length > 0 && (
              <Pressable onPress={() => setShowFeedback(true)} hitSlop={6}>
                <Text style={[s.feedbackLink, { color: '#D97706' }]} numberOfLines={1}>
                  {t('activityTimeline.viewRevisionFeedback')}
                </Text>
              </Pressable>
            )}
          </View>
          <ProgressTracker current={pIdx} scrollRef={progressScrollRef} labels={progressLabels} />
        </View>

        {/* ── Current Action Card ── */}
        <ActionCard
          ws={ws} paid={paid} paymentStatus={app?.paymentStatus ?? 'UNPAID'} isCreator={isCreator} isFree={isFreeEvent} isService={isService} submitting={submitting}
          onPay={() => setShowPay(true)}
          onStartWork={handleStartWork}
          onUpload={() => setShowUpload(true)}
          onMarkComplete={handleMarkComplete}
          onReview={() => setShowReview(true)}
          onApprove={handleApprove}
          onRevision={() => setShowRevision(true)}
          onViewSubmission={() => setShowReview(true)}
        />

        {/* ── Security Footer ── */}
        <View style={s.secFooter}>
          <FontAwesome5 name="shield-alt" solid size={13} color="#9CA3AF" />
          <Text style={[s.secFooterTxt, { color: '#9CA3AF' }]}>{t('activityTimeline.paymentSecurityFooter')}</Text>
        </View>
        </>)}

        {activeTab === 'deliverables' && (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.secTitle, { color: C.text }]}>{t('activityTimeline.deliverablesSection')}</Text>
            {(ws === 'SUBMITTED' || ws === 'APPROVED' || ws === 'COMPLETED') ? (
              <View style={{ marginTop: 12, gap: 10 }}>
                <View style={py.row}>
                  <Text style={[py.label, { color: C.textSecondary }]}>{t('activityTimeline.deliverablesVideos')}</Text>
                  <Text style={[py.value, { color: C.text }]}>{app?.deliverableVideos.length ?? 0}</Text>
                </View>
                <View style={py.row}>
                  <Text style={[py.label, { color: C.textSecondary }]}>{t('activityTimeline.deliverablesFiles')}</Text>
                  <Text style={[py.value, { color: C.text }]}>{app?.deliverableFiles.length ?? 0}</Text>
                </View>
                <View style={py.row}>
                  <Text style={[py.label, { color: C.textSecondary }]}>{t('activityTimeline.deliverablesLinks')}</Text>
                  <Text style={[py.value, { color: C.text }]}>{submittedUrls.length}</Text>
                </View>
                {app?.submittedAt && (
                  <View style={py.row}>
                    <Text style={[py.label, { color: C.textSecondary }]}>{t('activityTimeline.deliverablesSubmittedAt')}</Text>
                    <Text style={[py.value, { color: C.text }]}>{fmtDate(app.submittedAt)}</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={{ color: C.textSecondary, fontSize: 13, marginTop: 8 }}>
                {isCreator ? t('activityTimeline.deliverablesEmptyCreator') : t('activityTimeline.deliverablesEmptyBusiness')}
              </Text>
            )}
            {ws === 'IN_PROGRESS' && isCreator && (
              <Pressable
                style={[ac.btn, { backgroundColor: '#7C3AED', marginTop: 14, shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]}
                onPress={() => setShowUpload(true)}>
                <FontAwesome5 name="cloud-upload-alt" solid size={16} color="#fff" />
                <Text style={ac.btnTxt}>{t('activityTimeline.acUploadBtn')}</Text>
              </Pressable>
            )}
            {(ws === 'SUBMITTED' || ws === 'APPROVED' || ws === 'COMPLETED') && (
              <Pressable
                style={[ac.btn, { backgroundColor: '#0EA5E9', marginTop: 14, shadowColor: '#0EA5E9', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]}
                onPress={() => setShowReview(true)}>
                <FontAwesome5 name="eye" solid size={16} color="#fff" />
                <Text style={ac.btnTxt}>{isCreator ? t('activityTimeline.acViewSubmissionBtn') : t('activityTimeline.acReviewBtn')}</Text>
              </Pressable>
            )}
          </View>
        )}

        {activeTab === 'payment' && (
        <View style={[s.card, { backgroundColor: C.surface }]}>
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
                backgroundColor: app?.paymentStatus === 'RELEASED' ? '#DCFCE7' : paid ? '#E0F2FE' : '#FEF2F2',
              }]}>
                <Text style={[py.statusChipTxt, {
                  color: app?.paymentStatus === 'RELEASED' ? '#16A34A' : paid ? '#0EA5E9' : '#EF4444',
                }]}>
                  {app?.paymentStatus === 'RELEASED' ? t('activityTimeline.paymentStatusReleased') : paid ? t('activityTimeline.paymentStatusHeld') : t('activityTimeline.paymentStatusWaiting')}
                </Text>
              </View>
            </View>
          </View>
          <View style={[py.trustBox, { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' }]}>
            <FontAwesome5 name="shield-alt" solid size={13} color="#16A34A" />
            <Text style={[py.trustTxt, { color: '#16A34A' }]}>{t('activityTimeline.paymentSecureNote')}</Text>
          </View>
        </View>
        )}

        {activeTab === 'agreement' && (
          <View style={[s.card, { backgroundColor: C.surface }]}>
            <Text style={[s.secTitle, { color: C.text }]}>{t('activityTimeline.agreementSection')}</Text>
            {isFreeEvent ? (
              <Text style={{ color: C.textSecondary, fontSize: 13, marginTop: 8 }}>{t('activityTimeline.agreementNotApplicable')}</Text>
            ) : contract === undefined ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}><ActivityIndicator size="small" color="#7C3AED" /></View>
            ) : contract === null ? (
              <Text style={{ color: C.textSecondary, fontSize: 13, marginTop: 8 }}>{t('activityTimeline.agreementUnavailable')}</Text>
            ) : (
              <View style={{ marginTop: 12 }}>
                <ContractBody filledBody={contract.filledBody} terms={contract.terms} contractId={contract.id} downloadTitle={contract.title} />
              </View>
            )}
          </View>
        )}

        {activeTab === 'activity' && (<>
        {/* ── Activity Timeline ── */}
        <View style={[s.card, { backgroundColor: C.surface }]}>
          <View style={s.secHeader}>
            <View>
              <Text style={[s.secTitle, { color: C.text }]}>{t('activityTimeline.sectionTimeline')}</Text>
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
                    <FontAwesome5 name={ev.icon as any} solid size={14} color={ev.done || ev.isCurrent ? '#fff' : '#9CA3AF'} />
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

        {/* ── Rate your experience (§58) — shown once the project is fully
              complete, for both sides. ── */}
        {ws === 'COMPLETED' && myReview !== undefined && (
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            {myReview ? (
              <View style={{ gap: 6 }}>
                <Text style={[s.cardTitle, { color: C.text }]}>{t('activityTimeline.yourRatingTitle')}</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <FontAwesome5 key={n} name="star" solid size={16} color={n <= myReview.rating ? '#F59E0B' : '#E5E7EB'} />
                  ))}
                </View>
                {myReview.comment && <Text style={{ color: C.textSecondary, fontSize: 13 }}>{myReview.comment}</Text>}
              </View>
            ) : (
              <Pressable
                style={[s.ratingCta, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}
                onPress={() => { setRatingValue(0); setRatingComment(''); setShowRatingModal(true); }}>
                <FontAwesome5 name="star" solid size={18} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardTitle, { color: C.text }]}>
                    {isCreator ? t('activityTimeline.rateBusinessTitle') : t('activityTimeline.rateCreatorTitle')}
                  </Text>
                  <Text style={{ color: C.textSecondary, fontSize: 12 }}>{t('activityTimeline.rateSub')}</Text>
                </View>
                <FontAwesome5 name="chevron-right" size={14} color="#F59E0B" />
              </Pressable>
            )}
          </View>
        )}
        </>)}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Toast ── */}
      {toast ? (
        <View style={s.toast} pointerEvents="none">
          <Text style={s.toastTxt}>{toast}</Text>
        </View>
      ) : null}

      {/* ── Pay Modal ── */}
      <BottomSheet visible={showPay} onClose={() => setShowPay(false)} title={t('activityTimeline.modalPayTitle')}>
        <Text style={sh.sub}>{t('activityTimeline.modalPaySub')}</Text>
        <View style={{ gap: 8, marginVertical: 14 }}>
          {([[t('activityTimeline.feeCreator'), crFee], [t('activityTimeline.feePlatform'), pfFee], [t('activityTimeline.feeVat'), vat]] as [string, number][]).map(([l, v]) => (
            <View key={l} style={sh.sumRow}><Text style={sh.sumLabel}>{l}</Text><Text style={sh.sumValue}>NPR {v.toLocaleString()}</Text></View>
          ))}
          <View style={[sh.divider, { backgroundColor: '#E5E7EB' }]} />
          <View style={sh.sumRow}><Text style={sh.totalLabel}>{t('activityTimeline.feeTotal')}</Text><Text style={sh.totalValue}>NPR {total.toLocaleString()}</Text></View>
        </View>
        <Text style={sh.sectionLabel}>{t('activityTimeline.modalPayWith')}</Text>
        <View style={{ gap: 8, marginBottom: 16 }}>
          {([['esewa', 'eSewa'], ['khalti', 'Khalti'], ['fonepay', 'Fonepay QR']] as [typeof payMethod, string][]).map(([m, label]) => (
            <Pressable key={m}
              style={[sh.methodBtn, { borderColor: payMethod === m ? '#7C3AED' : '#E5E7EB', backgroundColor: payMethod === m ? '#EEF2FF' : '#fff' }]}
              onPress={() => setPayMethod(m)}>
              <View style={sh.methodLeft}>
                <PaymentMethodIcon method={m} size={22} />
                <Text style={[sh.methodTxt, { color: payMethod === m ? '#7C3AED' : '#374151' }]}>{label}</Text>
              </View>
              {payMethod === m && <FontAwesome5 name="check-circle" solid size={18} color="#7C3AED" />}
            </Pressable>
          ))}
        </View>
        <Pressable style={[sh.primaryBtn, { backgroundColor: '#7C3AED', opacity: submitting ? 0.75 : 1, shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]} onPress={handlePay} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={sh.primaryBtnTxt}>{t('activityTimeline.modalPayConfirmBtn', { amount: total.toLocaleString() })}</Text>}
        </Pressable>
      </BottomSheet>

      {/* ── Upload Deliverables Modal ── */}
      <BottomSheet
        visible={showUpload}
        onClose={() => { setShowUpload(false); setUrlError(''); }}
        title={t('activityTimeline.modalUploadTitle')}
        subtitle={t('activityTimeline.modalUploadSub')}
      >
        {urlError ? (
          <View style={[up.errorRowCenter, { marginBottom: 14 }]}>
            <FontAwesome5 name="exclamation-circle" solid size={13} color="#EF4444" />
            <Text style={up.errorTxtCenter}>{urlError}</Text>
          </View>
        ) : null}

        {/* ── Upload Deliverables — one combined grid, one add tile ── */}
        <View style={{ marginTop: 4 }}>
          <Text style={sh.inputLabel}>{t('activityTimeline.modalUploadDeliverablesLabel')}</Text>
          <Text style={up.videosSub}>{t('activityTimeline.modalUploadDeliverablesSub')}</Text>
          <View style={up.videoGrid}>
            {persistedVideos.map((v) => (
              <View key={v.publicId} style={up.videoCard}>
                <View style={up.thumbWrap}>
                  <Pressable style={up.videoThumb} onPress={() => openPreviewFrom('upload', () => setPlayingVideo(v))}>
                    <FontAwesome5 name="play-circle" solid size={28} color="#7C3AED" />
                  </Pressable>
                  <Pressable style={up.removeBadge} onPress={() => handleRemoveDeliverableVideo(v.publicId)} hitSlop={6}>
                    <FontAwesome5 name="times-circle" solid size={18} color="#EF4444" />
                  </Pressable>
                </View>
                <Text style={up.videoLabel} numberOfLines={1}>{v.label}</Text>
              </View>
            ))}

            {videoUploads.items.filter(i => i.status !== 'cancelled').map((item) => (
              <View key={item.localId} style={up.videoCard}>
                <View style={up.thumbWrap}>
                  <Pressable
                    style={up.videoThumb}
                    disabled={item.status !== 'done'}
                    onPress={() => item.result && openPreviewFrom('upload', () => setPlayingVideo({ url: item.result!.url, label: item.result!.label }))}
                  >
                    {/* Real first-frame preview shown instantly, not a
                        generic icon — see LocalVideoPreview above. A play
                        button is only overlaid once status is 'done': while
                        queued/compressing/uploading/finalizing, the progress
                        bar (or the failed alert icon) is the only overlay, so
                        nothing implies the video is playable before it is. */}
                    <LocalVideoPreview uri={item.compressedUri ?? item.video.uri} style={{ width: '100%', height: '100%' }} />
                    {item.status === 'done' && (
                      <View style={up.playOverlay}>
                        <FontAwesome5 name="play-circle" solid size={28} color="#fff" />
                      </View>
                    )}
                    {item.status !== 'done' && item.status !== 'failed' && (
                      <View style={up.thumbOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    )}
                    {item.status === 'failed' && (
                      <View style={up.thumbOverlay}>
                        <FontAwesome5 name="exclamation-circle" solid size={26} color="#fff" />
                      </View>
                    )}
                    {(item.status === 'compressing' || item.status === 'uploading') && (
                      <View style={up.progressTrack}>
                        <View style={[up.progressFill, { width: `${Math.round(item.progress * 100)}%` }]} />
                      </View>
                    )}
                  </Pressable>
                  <Pressable
                    style={up.removeBadge}
                    onPress={() => (item.status === 'done' ? handleRemoveVideoUploadItem(item) : videoUploads.cancel(item.localId))}
                    hitSlop={6}
                  >
                    <FontAwesome5 name="times-circle" solid size={18} color={item.status === 'done' ? '#EF4444' : '#9CA3AF'} />
                  </Pressable>
                </View>
                <Text style={up.videoLabel} numberOfLines={1}>
                  {item.status === 'compressing' ? `Preparing… ${Math.round(item.progress * 100)}%`
                    : item.status === 'uploading' ? `Uploading… ${Math.round(item.progress * 100)}%`
                    : item.status === 'finalizing' ? 'Processing…'
                    : item.status === 'failed' ? (item.error ?? 'Failed')
                    : item.status === 'done' ? (item.result?.label ?? 'Video')
                    : 'Waiting…'}
                </Text>
                {item.status === 'failed' && (
                  <Pressable onPress={() => videoUploads.retry(item.localId)} hitSlop={6}>
                    <Text style={up.retryTxt}>{t('activityTimeline.videoRetryBtn')}</Text>
                  </Pressable>
                )}
              </View>
            ))}

            {persistedFiles.map((f) => (
              <View key={f.id} style={up.videoCard}>
                <View style={up.thumbWrap}>
                  <Pressable
                    style={up.videoThumb}
                    onPress={() => openPreviewFrom('upload', () => (f.fileType === 'IMAGE'
                      ? setPreviewImage({ url: f.url, label: f.originalFileName })
                      : setPreviewDoc({ url: f.url, label: f.originalFileName })))}
                  >
                    {f.fileType === 'IMAGE' ? (
                      <Image source={{ uri: f.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <>
                        <FontAwesome5 name="file-alt" solid size={26} color={docThumb(f.mimeType).color} />
                        <Text style={[up.docBadgeTxt, { color: docThumb(f.mimeType).color }]}>{docThumb(f.mimeType).label}</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable style={up.removeBadge} onPress={() => handleRemoveDeliverableFile(f.id)} hitSlop={6}>
                    <FontAwesome5 name="times-circle" solid size={18} color="#EF4444" />
                  </Pressable>
                </View>
                <Text style={up.videoLabel} numberOfLines={1}>{f.originalFileName}</Text>
              </View>
            ))}

            {fileUploads.items.filter(i => i.status !== 'cancelled').map((item) => (
              <View key={item.localId} style={up.videoCard}>
                <View style={up.thumbWrap}>
                  <View style={up.videoThumb}>
                    {item.file.fileType === 'image' ? (
                      // Local picked-file URI, not the (not-yet-known) remote
                      // URL — renders the real thumbnail the instant it's
                      // added, before the upload even starts.
                      <Image source={{ uri: item.file.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                    ) : (
                      <>
                        <FontAwesome5 name="file-alt" solid size={26} color={docThumb(item.file.mimeType).color} />
                        <Text style={[up.docBadgeTxt, { color: docThumb(item.file.mimeType).color }]}>{docThumb(item.file.mimeType).label}</Text>
                      </>
                    )}
                    {item.status === 'uploading' && (
                      <View style={up.thumbOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    )}
                    {item.status === 'failed' && (
                      <View style={up.thumbOverlay}>
                        <FontAwesome5 name="exclamation-circle" solid size={26} color="#fff" />
                      </View>
                    )}
                    {item.status === 'uploading' && (
                      <View style={up.progressTrack}>
                        <View style={[up.progressFill, { width: `${Math.round(item.progress * 100)}%` }]} />
                      </View>
                    )}
                  </View>
                  <Pressable
                    style={up.removeBadge}
                    onPress={() => (item.status === 'done' ? handleRemoveFileUploadItem(item) : fileUploads.cancel(item.localId))}
                    hitSlop={6}
                  >
                    <FontAwesome5 name="times-circle" solid size={18} color={item.status === 'done' ? '#EF4444' : '#9CA3AF'} />
                  </Pressable>
                </View>
                <Text style={up.videoLabel} numberOfLines={1}>
                  {item.status === 'uploading' ? `Uploading… ${Math.round(item.progress * 100)}%`
                    : item.status === 'failed' ? (item.error ?? 'Failed')
                    : item.file.name}
                </Text>
                {item.status === 'failed' && (
                  <Pressable onPress={() => fileUploads.retry(item.localId)} hitSlop={6}>
                    <Text style={up.retryTxt}>{t('activityTimeline.videoRetryBtn')}</Text>
                  </Pressable>
                )}
              </View>
            ))}

            {(videoUploads.remainingSlots > 0 || fileUploads.remainingSlots > 0) && (
              <Pressable style={up.addDeliverableTile} onPress={handleAddDeliverable} hitSlop={6}>
                <FontAwesome5 name="plus" solid size={28} color="#7C3AED" />
              </Pressable>
            )}
          </View>
        </View>

        <View style={{ gap: 12, marginVertical: 14 }}>
          <View>
            <TextInputWithLabel
              label={t('activityTimeline.modalUploadLinksLabel')}
              hint={t('activityTimeline.modalUploadLinksSub')}
              leftIcon="link"
              placeholder="https://drive.google.com/..."
              value={uploadUrls}
              onChangeText={(t) => { setUploadUrls(t); if (urlError) setUrlError(''); }}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            {/* C.brinjal1/C.primaryLight, not hardcoded indigo — this screen
                is shared by both roles, and a fixed purple would look wrong
                against a business viewer's green theme. */}
            <View style={[sh.infoBox, { backgroundColor: C.primaryLight, borderColor: C.border, marginTop: 8 }]}>
              <FontAwesome5 name="info-circle" solid size={15} color={C.brinjal1} />
              <Text style={[sh.infoTxt, { color: C.brinjal1 }]}>{t('activityTimeline.modalUploadLinksPublicHint')}</Text>
            </View>

            {/* Live per-link preview */}
            {uploadUrls.trim().length > 0 && (
              <View style={{ gap: 6, marginTop: 10 }}>
                {parseUrls(uploadUrls).map((url, idx) => {
                  const valid = isValidUrl(url);
                  return (
                    <View key={idx} style={[up.linkPreview, { borderColor: valid ? '#A7F3D0' : '#FECACA', backgroundColor: valid ? '#F0FDF4' : '#FEF2F2' }]}>
                      <FontAwesome5 name={valid ? 'check-circle' : 'times-circle'} solid size={14} color={valid ? '#16A34A' : '#EF4444'} />
                      <Text style={[up.linkPreviewTxt, { color: valid ? '#065F46' : '#991B1B' }]} numberOfLines={1}>{url}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          <View>
            <TextInputWithLabel
              label={t('activityTimeline.modalUploadNotesLabel')}
              placeholder={t('activityTimeline.modalUploadNotesPlaceholder')}
              value={uploadNotes}
              onChangeText={setUploadNotes}
              multiline
            />
          </View>
        </View>
        <View style={[sh.divider, { backgroundColor: '#E5E7EB', marginVertical: 12 }]} />
        <Pressable style={[sh.primaryBtn, { backgroundColor: '#7C3AED', opacity: submitting ? 0.75 : 1, shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]} onPress={handleSubmitWork} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <><FontAwesome5 name="cloud-upload-alt" solid size={17} color="#fff" /><Text style={sh.primaryBtnTxt}>{t('activityTimeline.modalUploadSubmitBtn')}</Text></>}
        </Pressable>
      </BottomSheet>

      {/* ── Review Deliverables Modal ── */}
      <BottomSheet visible={showReview} onClose={() => setShowReview(false)} title={t('activityTimeline.modalReviewTitle')}>

        {/* Submitted videos — above links, per design */}
        {(app?.deliverableVideos ?? []).length > 0 && (
          <View style={rv.section}>
            <View style={rv.sectionHeader}>
              <View
                style={[
                  rv.sectionIcon,
                  { backgroundColor: '#F0FDF4', shadowColor: '#16A34A', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
                ]}
              >
                <FontAwesome5 name="video" solid size={14} color="#16A34A" />
              </View>
              <Text style={rv.sectionTitle}>{t('activityTimeline.modalReviewVideosSection', { name: app?.creatorName ?? '—' })}</Text>
            </View>
            <View style={{ gap: 8 }}>
              {(app?.deliverableVideos ?? []).map((v) => (
                <Pressable
                  key={v.publicId}
                  style={rv.linkRow}
                  onPress={() => openPreviewFrom('review', () => setPlayingVideo(v))}>
                  <FontAwesome5 name="play-circle" solid size={16} color="#16A34A" />
                  <Text style={rv.linkTxt} numberOfLines={1}>{v.label} · {formatDuration(v.durationSec)}</Text>
                  <FontAwesome5 name="chevron-right" solid size={13} color="#A78BFA" />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Submitted images/files */}
        {(app?.deliverableFiles ?? []).length > 0 && (
          <View style={[rv.section, (app?.deliverableVideos ?? []).length > 0 && { marginTop: 14 }]}>
            <View style={rv.sectionHeader}>
              <View
                style={[
                  rv.sectionIcon,
                  { backgroundColor: '#EFF6FF', shadowColor: '#2563EB', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
                ]}
              >
                <FontAwesome5 name="images" solid size={14} color="#2563EB" />
              </View>
              <Text style={rv.sectionTitle}>{t('activityTimeline.modalReviewFilesSection', { name: app?.creatorName ?? '—' })}</Text>
            </View>
            <View style={{ gap: 8 }}>
              {(app?.deliverableFiles ?? []).map((f) => (
                <Pressable
                  key={f.id}
                  style={rv.linkRow}
                  onPress={() => openPreviewFrom('review', () => (f.fileType === 'IMAGE'
                    ? setPreviewImage({ url: f.url, label: f.originalFileName })
                    : setPreviewDoc({ url: f.url, label: f.originalFileName })))}>
                  <FontAwesome5 name={f.fileType === 'IMAGE' ? 'image' : 'file-alt'} solid size={16} color="#2563EB" />
                  <Text style={rv.linkTxt} numberOfLines={1}>{f.originalFileName}</Text>
                  <FontAwesome5 name="chevron-right" solid size={13} color="#A78BFA" />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Submitted links — only rendered when the creator actually submitted a link;
            a video-only submission should show just the video section, and vice versa. */}
        {submittedUrls.length > 0 && (
          <View style={[rv.section, ((app?.deliverableVideos ?? []).length > 0 || (app?.deliverableFiles ?? []).length > 0) && { marginTop: 14 }]}>
            <View style={rv.sectionHeader}>
              <View
                style={[
                  rv.sectionIcon,
                  { backgroundColor: '#F5F3FF', shadowColor: '#7C3AED', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
                ]}
              >
                <FontAwesome5 name="link" solid size={14} color="#7C3AED" />
              </View>
              <Text style={rv.sectionTitle}>{t('activityTimeline.modalReviewLinksSection', { name: app?.creatorName ?? '—' })}</Text>
            </View>
            <View style={{ gap: 8 }}>
              {submittedUrls.map((url, idx) => (
                <Pressable
                  key={idx}
                  style={rv.linkRow}
                  onPress={() => {
                    if (isDirectVideoUrl(url)) {
                      openPreviewFrom('review', () => setPlayingVideo({ url: normalizeUrl(url), label: t('activityTimeline.modalReviewLinksSection', { name: app?.creatorName ?? '—' }) }));
                    } else {
                      Linking.openURL(normalizeUrl(url)).catch(() => showToast(t('activityTimeline.linkOpenFailed')));
                    }
                  }}>
                  <FontAwesome5 name={isDirectVideoUrl(url) ? 'play-circle' : 'external-link-alt'} solid size={14} color="#7C3AED" />
                  <Text style={rv.linkTxt} numberOfLines={2}>{url}</Text>
                  <FontAwesome5 name="chevron-right" solid size={13} color="#A78BFA" />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* True empty state — neither a video nor a link was submitted */}
        {submittedUrls.length === 0 && (app?.deliverableVideos ?? []).length === 0 && (
          <View style={rv.section}>
            <View style={rv.noLinks}>
              <FontAwesome5 name="link" solid size={20} color="#D1D5DB" />
              <Text style={rv.noLinksTxt}>{t('activityTimeline.modalReviewNoLinks')}</Text>
            </View>
          </View>
        )}

        {/* What needs to be delivered */}
        {deliverables.length > 0 && (
          <View style={[rv.section, { marginTop: 14 }]}>
            <View style={rv.sectionHeader}>
              <View
                style={[
                  rv.sectionIcon,
                  { backgroundColor: '#FFF7ED', shadowColor: '#D97706', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
                ]}
              >
                <FontAwesome5 name="list" solid size={14} color="#D97706" />
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

        {/* Action buttons — business only; the creator opens this same sheet
            read-only via "View My Submission" and shouldn't see review actions
            on their own work. */}
        {!isCreator && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
            <Pressable
              style={[sh.primaryBtn, { flex: 1, backgroundColor: '#D97706', shadowColor: '#D97706', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]}
              onPress={() => { setShowReview(false); setTimeout(() => setShowRevision(true), 200); }}>
              <FontAwesome5 name="edit" solid size={15} color="#fff" />
              <Text style={sh.primaryBtnTxt}>{t('activityTimeline.acRevisionBtn')}</Text>
            </Pressable>
            <Pressable
              style={[sh.primaryBtn, { flex: 1, backgroundColor: '#16A34A', opacity: submitting ? 0.75 : 1, shadowColor: '#16A34A', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]}
              disabled={submitting}
              onPress={() => { setShowReview(false); handleApprove(); }}>
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <><FontAwesome5 name="check-double" solid size={15} color="#fff" /><Text style={sh.primaryBtnTxt}>{t('activityTimeline.acApproveBtn')}</Text></>}
            </Pressable>
          </View>
        )}
      </BottomSheet>

      {/* ── Request Revision Modal ── */}
      <BottomSheet visible={showRevision} onClose={() => setShowRevision(false)} title={isService ? t('activityTimeline.modalIssueTitle') : t('activityTimeline.modalRevisionTitle')}>
        <Text style={sh.sub}>{isService ? t('activityTimeline.modalIssueSub') : t('activityTimeline.modalRevisionSub')}</Text>
        {!isService && (app?.deliverableVideos ?? []).length > 0 && (
          <View style={[sh.infoBox, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', marginTop: 12 }]}>
            <FontAwesome5 name="info-circle" solid size={15} color="#D97706" />
            <Text style={[sh.infoTxt, { color: '#D97706' }]}>{t('activityTimeline.modalRevisionVideoNotice')}</Text>
          </View>
        )}
        <View style={{ marginVertical: 14 }}>
          <TextInputWithLabel
            label={isService ? t('activityTimeline.modalIssueNotesLabel') : t('activityTimeline.modalRevisionNotesLabel')}
            placeholder={isService ? t('activityTimeline.modalIssueNotesPlaceholder') : t('activityTimeline.modalRevisionNotesPlaceholder')}
            value={revisionNote}
            onChangeText={setRevisionNote}
            multiline
          />
        </View>
        <Pressable style={[sh.primaryBtn, { backgroundColor: '#D97706', opacity: submitting ? 0.75 : 1, shadowColor: '#D97706', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]} onPress={isService ? handleReportIssue : handleRevision} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={sh.primaryBtnTxt}>{isService ? t('activityTimeline.modalIssueSendBtn') : t('activityTimeline.modalRevisionSendBtn')}</Text>}
        </Pressable>
      </BottomSheet>

      {/* ── Feedback Modal — full revision-request history, newest first, either side ── */}
      <BottomSheet
        visible={showFeedback}
        onClose={() => setShowFeedback(false)}
        title={t('activityTimeline.revisionFeedback')}
      >
        <View style={fb.list}>
          {(app?.revisionNotes ?? []).map((r, i) => (
            <View key={i} style={[fb.card, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
              <Text style={[fb.note, { color: '#78350F' }]}>{r.note}</Text>
              <Text style={[fb.time, { color: '#B45309' }]}>{fmtNPT(r.createdAt)}</Text>
            </View>
          ))}
        </View>
      </BottomSheet>

      <BottomSheet visible={showRatingModal} onClose={() => setShowRatingModal(false)} title={isCreator ? t('activityTimeline.rateBusinessTitle') : t('activityTimeline.rateCreatorTitle')}>
        <Text style={sh.sub}>{t('activityTimeline.rateSub')}</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginVertical: 18 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable key={n} hitSlop={8} onPress={() => setRatingValue(n)}>
              <FontAwesome5 name="star" solid size={32} color={n <= ratingValue ? '#F59E0B' : '#E5E7EB'} />
            </Pressable>
          ))}
        </View>
        <TextInputWithLabel
          label={t('activityTimeline.ratingCommentLabel')}
          value={ratingComment}
          onChangeText={(v) => setRatingComment(v.slice(0, 1000))}
          placeholder={t('activityTimeline.ratingCommentPlaceholder')}
          multiline
          numberOfLines={4}
        />
        <Pressable
          style={[sh.primaryBtn, { marginTop: 16, backgroundColor: '#7C3AED', shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6, opacity: (ratingValue < 1 || submittingRating) ? 0.6 : 1 }]}
          onPress={handleSubmitRating}
          disabled={ratingValue < 1 || submittingRating}
        >
          {submittingRating
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={sh.primaryBtnTxt}>{t('activityTimeline.ratingSubmitBtn')}</Text>}
        </Pressable>
      </BottomSheet>

      <VideoPlayerModal
        visible={!!playingVideo}
        url={playingVideo?.url ?? null}
        title={playingVideo?.label ?? ''}
        onClose={() => closePreviewAndReturn(() => setPlayingVideo(null))}
      />

      <ImagePreviewModal
        visible={!!previewImage}
        url={previewImage?.url ?? null}
        title={previewImage?.label ?? ''}
        onClose={() => closePreviewAndReturn(() => setPreviewImage(null))}
      />

      <DocumentPreviewModal
        visible={!!previewDoc}
        url={previewDoc?.url ?? null}
        title={previewDoc?.label ?? ''}
        onClose={() => closePreviewAndReturn(() => setPreviewDoc(null))}
      />

      <NameVideoModal
        key={namingItem?.localId ?? 'none'}
        visible={!!namingItem}
        initialLabel={namingItem?.result?.label ?? ''}
        onSave={handleSaveVideoName}
        onSkip={() => setNamingItem(null)}
      />

      </MaxWidthContainer>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:   { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body:     { gap: 12, paddingTop: 12, paddingHorizontal: SCREEN_GUTTER },

  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md, gap: 8 },
  headerSeparator: { height: StyleSheet.hairlineWidth, marginHorizontal: SCREEN_GUTTER },
  tabBarWrap: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:  { flex: 1, fontSize: 18, fontFamily: F.bold, textAlign: 'center' },
  iconBtn:      { padding: 8, minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' },

  card: { borderRadius: RADIUS.lg, padding: SPACING.lg, ...TOKEN_SHADOW.card, overflow: 'hidden' },
  cardTitle: { fontSize: 14, fontFamily: F.bold },
  ratingCta: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.md, borderWidth: 1.5, padding: 12 },

  summaryRow:   { flexDirection: 'row', gap: 12, marginBottom: 12 },
  thumb:        { width: 68, height: 68, borderRadius: RADIUS.md, flexShrink: 0 },
  thumbClip:    { width: '100%', height: '100%', borderRadius: RADIUS.md, overflow: 'hidden' },
  thumbImage:   { width: '100%', height: '100%' },
  summaryTitle: { fontSize: 15, fontFamily: F.bold, lineHeight: 23, marginBottom: 3 },
  summaryBrand: { fontSize: 13, fontFamily: F.semibold, marginBottom: 6 },
  metaRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  metaChipTxt:  { fontSize: 11, fontFamily: F.semibold, color: '#6B7280' },

  summaryFooter: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, gap: 4 },
  footerItem:    { flex: 1, alignItems: 'center', gap: 3 },
  footerLabel:   { fontSize: 9, fontFamily: F.regular, textTransform: 'uppercase', letterSpacing: 0.4 },
  footerValue:   { fontSize: 11, fontFamily: F.bold, textAlign: 'center' },

  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  secTitle:  { fontSize: 15, fontFamily: F.bold },
  secSub:    { fontSize: 11, fontFamily: F.regular, marginTop: 2 },
  feedbackLink: { fontSize: 12, fontFamily: F.bold, maxWidth: 150, textDecorationLine: 'underline' },

  secFooter:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 8 },
  secFooterTxt: { fontSize: 11, fontFamily: F.regular, flex: 1 },


  toast:    { position: 'absolute', bottom: 24, left: 24, right: 24, backgroundColor: '#1F2937', borderRadius: RADIUS.md, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  toastTxt: { fontSize: 13, fontFamily: F.semibold, color: '#fff', textAlign: 'center' },
});

const pt = StyleSheet.create({
  row:        { paddingHorizontal: 8, paddingBottom: 4 },
  step:       { width: STEP_W, alignItems: 'center' },
  connRow:    { flexDirection: 'row', alignItems: 'center', width: '100%', height: 34 },
  line:       { flex: 1, height: 2 },
  dot:        { width: 28, height: 28, borderRadius: RADIUS.full, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  activePulse:{ width: 10, height: 10, borderRadius: RADIUS.full, backgroundColor: '#fff' },
  emptyCore:  { width: 8, height: 8, borderRadius: RADIUS.full, backgroundColor: '#E5E7EB' },
  label:      { fontSize: 9, fontFamily: F.semibold, textAlign: 'center', marginTop: 5, lineHeight: 14 },
});

const tl = StyleSheet.create({
  row:      { flexDirection: 'row', gap: 12, marginBottom: 0 },
  left:     { alignItems: 'center', width: 32 },
  dot:      { width: 32, height: 32, borderRadius: RADIUS.full, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  line:     { width: 2, flex: 1, minHeight: 12, marginTop: 2 },
  body:     { flex: 1, paddingBottom: 18, paddingTop: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 },
  title:    { fontSize: 13 },
  badge:    { borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 2 },
  badgeTxt: { fontSize: 9, fontFamily: F.bold, textTransform: 'uppercase', letterSpacing: 0.3 },
  desc:     { fontSize: 12, fontFamily: F.regular, lineHeight: 18 },
  time:     { fontSize: 10, fontFamily: F.regular, marginTop: 4, lineHeight: 15 },
});

const rv = StyleSheet.create({
  section:          { backgroundColor: '#FAFAFA', borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: '#F3F4F6' },
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionIcon:      { width: 26, height: 26, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  sectionTitle:     { fontSize: 13, fontFamily: F.bold, color: '#1F2937' },
  linkRow:          { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#EDE9FE', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 11 },
  linkTxt:          { flex: 1, fontSize: 13, fontFamily: F.semibold, color: '#7C3AED', textDecorationLine: 'underline' },
  noLinks:          { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  noLinksTxt:       { fontSize: 13, fontFamily: F.regular, color: '#9CA3AF' },
  deliverableRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  deliverableNum:   { width: 22, height: 22, borderRadius: RADIUS.full, backgroundColor: '#FED7AA', justifyContent: 'center', alignItems: 'center', marginTop: 1, flexShrink: 0 },
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
  statusChip:   { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  statusChipTxt:{ fontSize: 12, fontFamily: F.bold },
  trustBox:     { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: RADIUS.sm, padding: 10, marginTop: 14 },
  trustTxt:     { fontSize: 12, fontFamily: F.semibold, flex: 1 },
});

const ac = StyleSheet.create({
  card:   { borderRadius: RADIUS.lg, padding: SPACING.lg, borderLeftWidth: 4, ...TOKEN_SHADOW.raised, backgroundColor: '#fff', gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBg: { width: 36, height: 36, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  heading:{ fontSize: 16, fontFamily: F.bold, flexShrink: 1 },
  sub:    { fontSize: 13, fontFamily: F.regular, lineHeight: 20 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: RADIUS.full, paddingVertical: 13, marginTop: 4 },
  btnTxt: { fontSize: 14, fontFamily: F.bold, color: '#fff' },
});

const fb = StyleSheet.create({
  list: { gap: SPACING.md },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: 8 },
  note: { fontSize: 14, fontFamily: F.regular, lineHeight: 21 },
  time: { fontSize: 11, fontFamily: F.medium },
});

const up = StyleSheet.create({
  errorRowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  errorTxtCenter: { fontSize: 12, fontFamily: F.semibold, color: '#EF4444', textAlign: 'center' },
  linkPreview:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 7 },
  linkPreviewTxt: { flex: 1, fontSize: 12, fontFamily: F.regular },

  videosSub:      { fontSize: 11, fontFamily: F.regular, color: '#9CA3AF', marginBottom: 10 },
  videoGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  videoCard:      { width: 90, alignItems: 'center', gap: 4 },
  // Wraps videoThumb (which clips its own content via overflow:hidden) so the
  // removeBadge can sit half outside the thumbnail's top-right corner without
  // being clipped itself.
  thumbWrap:      { width: 90, height: 70 },
  videoThumb:     { width: 90, height: 70, borderRadius: RADIUS.sm, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  removeBadge:    { position: 'absolute', top: -7, right: -7, backgroundColor: '#fff', borderRadius: RADIUS.full, ...TOKEN_SHADOW.card },
  // Dims an image thumbnail that's already rendering (from the local picked
  // URI) while its upload is still in flight or has failed.
  thumbOverlay:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  // Lighter scrim than thumbOverlay — just enough to keep the white play
  // icon legible over a finished video's own frame, not to dim it like an
  // in-progress upload.
  playOverlay:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.15)', justifyContent: 'center', alignItems: 'center' },
  docBadgeTxt:    { fontSize: 9, fontFamily: F.bold, marginTop: 3, letterSpacing: 0.3 },
  videoLabel:     { fontSize: 10.5, fontFamily: F.medium, color: '#374151', maxWidth: 90, textAlign: 'center' },
  retryTxt:       { fontSize: 11, fontFamily: F.bold, color: '#7C3AED' },
  progressTrack:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(124,58,237,0.15)' },
  progressFill:   { height: 4, backgroundColor: '#7C3AED' },
  // Single icon-only add tile shared by both videos and images/files — sits
  // among the uploaded items in the combined grid rather than each type
  // getting its own labeled tile.
  addDeliverableTile: { width: 90, height: 70, borderRadius: RADIUS.sm, borderWidth: 1.5, borderColor: '#DDD6FE', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
});

const sh = StyleSheet.create({
  sub:          { fontSize: 13, fontFamily: F.regular, color: '#6B7280', marginBottom: 4 },
  sectionLabel: { fontSize: 13, fontFamily: F.bold, color: '#374151', marginBottom: 8, marginTop: 4 },
  sumRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel:     { fontSize: 13, fontFamily: F.regular, color: '#6B7280' },
  sumValue:     { fontSize: 13, fontFamily: F.semibold, color: '#111827' },
  totalLabel:   { fontSize: 15, fontFamily: F.bold, color: '#111827' },
  totalValue:   { fontSize: 17, fontFamily: F.bold, color: '#16A34A' },
  divider:      { height: 1, marginVertical: 4 },
  methodBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12 },
  methodLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  methodTxt:    { fontSize: 14, fontFamily: F.semibold },
  inputLabel:   { fontSize: 12, fontFamily: F.semibold, color: '#374151', marginBottom: 6 },
  primaryBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.full, paddingVertical: 15 },
  primaryBtnTxt:{ fontSize: 15, fontFamily: F.bold, color: '#fff' },
  infoBox:      { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: RADIUS.sm, padding: 10 },
  infoTxt:      { fontSize: 12, fontFamily: F.semibold, flex: 1 },
  warnBox:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1.5, borderRadius: RADIUS.md, padding: 14, marginVertical: 12 },
  warnTitle:    { fontSize: 14, fontFamily: F.bold, marginBottom: 4 },
  warnBody:     { fontSize: 13, fontFamily: F.regular, lineHeight: 20 },
});
