/**
 * Competitions — third event type (creator contests). Mirrors
 * backend/src/modules/competition/competition.routes.ts.
 *   /api/competitions/*         creator + public
 *   /api/competitions/manage/*  organizer (BUSINESS, own competitions only)
 * Admin endpoints live in src/lib/api.ts (admin client).
 */
import { api, apiRequest } from '../lib/apiClient';
import type { CampaignAttachment } from './business';

export type CompetitionStatus = 'DRAFT' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'REJECTED' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'AWAITING_RESULTS' | 'COMPLETED' | 'CANCELLED';
export type StageStatus = 'UPCOMING' | 'OPEN' | 'UNDER_REVIEW' | 'SELECTION_PENDING' | 'RESULTS_PUBLISHED' | 'CLOSED';
export type SubmissionMethod = 'VIDEO_UPLOAD' | 'EXTERNAL_LINK';
export type PrizeKind = 'PLACEMENT' | 'SPECIAL';
export type CreatorCompetitionStatus =
  | 'JOINED' | 'SUBMISSION_REQUIRED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NO_SUBMISSION'
  | 'ADVANCED' | 'FINALIST' | 'NOT_SELECTED' | 'COMPLETED' | 'CANCELLED' | 'WITHDRAWN';

export interface Organizer { name: string | null; slug: string | null; logoUrl: string | null; isVerified: boolean }
export interface Prize {
  id?: string;
  kind: PrizeKind;
  title: string;
  description?: string | null;
  amount?: number | null;
  currency: string;
  recipientCount: number;
  notes?: string | null;
  position?: number;
}
export interface Criterion { key: string; label: string; weight: number }

export interface Stage {
  id: string;
  order: number;
  name: string;
  description: string | null;
  brief: string | null;
  requirements: string | null;
  opensAt: string;
  deadline: string;
  status: StageStatus;
  advanceLimit: number | null;
  allowedMethods: SubmissionMethod[];
  videoMinSec: number | null;
  videoMaxSec: number | null;
}

export interface CompetitionCard {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  status: CompetitionStatus;
  organizer: Organizer;
  registrationOpen: boolean;
  registrationOpensAt: string;
  registrationDeadline: string;
  currentStage: { name: string; status: StageStatus; deadline: string } | null;
  stageCount: number;
  prizeHighlights: Array<Pick<Prize, 'kind' | 'title' | 'amount' | 'currency' | 'recipientCount'>>;
  prizePool: { amount: number; currency: string } | null;
  participantCount: number;
  joined: boolean;
}

export interface CreatorDisplay { id: string; fullName: string | null; username: string | null; avatarUrl: string | null; isVerified: boolean }

export interface PublicResult {
  prize: { id: string; position: number; kind: PrizeKind; title: string; amount: number | null; currency: string };
  creator: Omit<CreatorDisplay, 'id'>;
}

export interface CompetitionDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  objectives: string | null;
  coverImageUrl: string | null;
  rules: string;
  eligibility: string | null;
  contentFormats: string[];
  skills: string[];
  /** SINGLE = one entry deadline, later stages shortlist the same entries. */
  submissionMode: SubmissionMode;
  submissionInstructions: string | null;
  videoMinSec: number | null;
  videoMaxSec: number | null;
  contactInstructions: string | null;
  attachments: CampaignAttachment[];
  status: CompetitionStatus;
  pauseReason: string | null;
  cancelReason: string | null;
  registrationOpensAt: string;
  registrationDeadline: string;
  startsAt: string;
  endsAt: string;
  registrationOpen: boolean;
  registrationClosedReason: string | null;
  allowSubmissionEdits: boolean;
  onePrizePerCreator: boolean;
  judgingCriteria: Array<{ label: string; weight: number }>;
  organizer: Organizer;
  participantCount: number;
  stages: Stage[];
  currentStageId: string | null;
  prizes: Prize[];
  prizePool: { amount: number; currency: string } | null;
  results: PublicResult[] | null;
  viewer: { role: 'OWNER' | 'PARTICIPANT' | 'VISITOR'; joined: boolean; canJoin: boolean };
}

export interface MySubmission {
  id: string;
  method: SubmissionMethod;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  externalUrl: string | null;
  durationSec: number | null;
  sizeBytes: number | null;
  caption: string | null;
  version: number;
  submittedAt: string;
  updatedAt: string;
}

export type SubmissionMode = 'PER_STAGE' | 'SINGLE';

export interface MyProgress {
  participantId: string;
  joinedAt: string;
  status: CreatorCompetitionStatus;
  participantStatus: 'ACTIVE' | 'NOT_SELECTED' | 'WITHDRAWN';
  currentStageOrder: number;
  eliminatedAtOrder: number | null;
  stages: Array<{
    stageId: string;
    order: number;
    name: string;
    status: StageStatus;
    opensAt: string;
    deadline: string;
    allowedMethods: SubmissionMethod[];
    videoMinSec: number | null;
    videoMaxSec: number | null;
    submission: (MySubmission & { previousVersions: number }) | null;
    outcome: 'ADVANCE' | 'NOT_SELECTED' | null;
    canSubmit: boolean;
    /** SINGLE mode, stage 2+: no submissions — the creator's entry was carried over. */
    reviewRound?: boolean;
    blockedReason: string | null;
  }>;
  awards: Array<{ id: string; title: string; kind: PrizeKind; amount: number | null; currency: string }>;
}

export interface JoinedCompetition {
  competition: { id: string; slug: string; title: string; coverImageUrl: string | null; status: CompetitionStatus; organizer: { name: string | null; logoUrl: string | null }; registrationDeadline: string; stageCount: number };
  participantId: string;
  joinedAt: string;
  status: CreatorCompetitionStatus;
  currentStage: { id: string; name: string; order: number; status: StageStatus; opensAt: string; deadline: string } | null;
  submittedToCurrentStage: boolean;
  latestResult: { stageName: string; decision: 'ADVANCE' | 'NOT_SELECTED' | null; publishedAt: string | null } | null;
  awards: Array<{ title: string; kind: PrizeKind; amount: number | null; currency: string }>;
}

export interface Paged<T> {
  items: T[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

// ── Creator / public ──────────────────────────────────────────────────────────

export function fetchCompetitions(params: { tab?: 'open' | 'results' | 'all'; q?: string; page?: number; limit?: number }, signal?: AbortSignal) {
  return api<Paged<CompetitionCard>>('GET', '/api/competitions', undefined, { signal, params });
}
/** Which prize payment methods this server offers (Kolab-managed is behind a flag). */
export function fetchCompetitionPaymentConfig(signal?: AbortSignal) {
  return api<{ kolabPaymentsEnabled: boolean }>('GET', '/api/competitions/payment-config', undefined, { signal });
}
export function fetchCompetition(idOrSlug: string, signal?: AbortSignal) {
  return api<CompetitionDetail>('GET', `/api/competitions/${encodeURIComponent(idOrSlug)}`, undefined, { signal });
}
export function fetchJoinedCompetitions(signal?: AbortSignal) {
  return api<JoinedCompetition[]>('GET', '/api/competitions/me/joined', undefined, { signal });
}
export function joinCompetition(id: string) {
  return api<MyProgress>('POST', `/api/competitions/${id}/join`);
}
export function fetchMyProgress(id: string, signal?: AbortSignal) {
  return api<MyProgress>('GET', `/api/competitions/${id}/progress`, undefined, { signal });
}
export function submitCompetitionLink(id: string, stageId: string, body: { url: string; caption?: string }) {
  return api<MySubmission>('POST', `/api/competitions/${id}/stages/${stageId}/submissions/link`, body);
}
export type VideoUploadPlan =
  | { provider: 'cloudinary'; cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string; publicId: string; uploadUrl: string }
  | { provider: 'r2'; mode: 'single'; key: string; uploadUrl: string; expiresIn: number; thumbnailKey?: string; thumbnailUploadUrl?: string }
  | { provider: 'r2'; mode: 'multipart'; key: string; uploadId: string; partSize: number; parts: { partNumber: number; url: string }[]; expiresIn: number; thumbnailKey?: string; thumbnailUploadUrl?: string };
export function requestVideoUpload(id: string, stageId: string, body: { sizeBytes: number; mimeType: 'video/mp4' | 'video/quicktime' }) {
  return api<{ plan: VideoUploadPlan; constraints: { maxBytes: number; minSec: number | null; maxSec: number | null } }>(
    'POST', `/api/competitions/${id}/stages/${stageId}/submissions/video/signature`, body,
  );
}
export function completeVideoUpload(id: string, stageId: string, body: { publicId?: string; key?: string; uploadId?: string; thumbnailKey?: string; clientDurationSec?: number; caption?: string }) {
  return api<MySubmission>('POST', `/api/competitions/${id}/stages/${stageId}/submissions/video/complete`, body);
}

// ── Organizer ─────────────────────────────────────────────────────────────────

export interface CompetitionInput {
  title: string;
  description: string;
  objectives?: string | null;
  coverImageUrl?: string | null;
  rules: string;
  eligibility?: string | null;
  contentFormats: string[];
  skills: string[];
  /** SINGLE = one entry deadline, later stages shortlist the same entries. */
  submissionMode: SubmissionMode;
  submissionInstructions?: string | null;
  videoMinSec?: number | null;
  videoMaxSec?: number | null;
  contactInstructions?: string | null;
  attachments?: CampaignAttachment[];
  resultsVisibility: 'PUBLIC' | 'PARTICIPANTS';
  registrationOpensAt: string;
  registrationDeadline: string;
  startsAt: string;
  endsAt: string;
  allowSubmissionEdits: boolean;
  onePrizePerCreator: boolean;
  scoringEnabled: boolean;
  judgingCriteria: Criterion[];
  stages: Array<Omit<Stage, 'id' | 'order' | 'status'> & { id?: string }>;
  prizes: Prize[];
  /** How cash prizes reach winners. Required (with accepted terms) on submit when any prize has an amount. */
  prizePaymentMethod?: PrizePaymentMethod | null;
  /** Total cash pool in NPR — must equal Σ amount × recipients on submit. */
  cashPrizePool?: number | null;
  paymentTermsAccepted?: boolean;
}

/** DIRECT = the business pays each winner itself (needs a verified business); KOLAB = funded through Kolab. */
export type PrizePaymentMethod = 'KOLAB' | 'DIRECT';

export interface ManagedListItem {
  id: string; slug: string; title: string; coverImageUrl: string | null; status: CompetitionStatus; suspended: boolean;
  registrationDeadline: string; publishAt: string | null; participantCount: number; stageCount: number;
  currentStage: { id: string; name: string; status: StageStatus; deadline: string } | null; createdAt: string;
}

export interface StageStats { stageId: string; eligible: number; submissions: number; advanced: number; notSelected: number; draftAdvance: number; draftNotSelected: number }
export interface DraftAward { prizeId: string; participantId: string; isPublished: boolean; prize: { id: string; position: number; kind: PrizeKind; title: string; amount: number | null; currency: string }; creator: CreatorDisplay }

export interface ManagedCompetition extends Omit<CompetitionInput, 'stages' | 'prizes' | 'attachments'> {
  id: string;
  slug: string;
  status: CompetitionStatus;
  /** Prize payment setup (only the fields web reads). DIRECT = the business pays winners itself. */
  payment?: { prizePaymentMethod: PrizePaymentMethod | null; paymentTermsAccepted: boolean; fundingStatus?: string; kolabPaymentsEnabled?: boolean };
  attachments: CampaignAttachment[];
  publishAt: string | null;
  publishedAt: string | null;
  pausedAt: string | null;
  pauseReason: string | null;
  completedAt: string | null;
  resultsPublishedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  suspended: boolean;
  suspensionReason: string | null;
  review: {
    feedback: string | null;
    reviewedAt: string | null;
    submittedAt: string | null;
    resubmissionAllowed: boolean;
    /** Times it has been sent to Kolab review (0 = never submitted). */
    revision?: number;
    /** Proposed rules / eligibility / prizes awaiting admin approval. */
    pendingChanges: { rules?: string; eligibility?: string | null; prizes?: Prize[] } | null;
    pendingChangesSubmittedAt: string | null;
    pendingChangesFeedback: string | null;
  };
  reviewHistory: ReviewHistoryItem[];
  stages: Stage[];
  prizes: Prize[];
  prizePool: { amount: number; currency: string } | null;
  stats: { participants: number; active: number; awaitingReview: number; stages: StageStats[]; upcomingDeadlines: Array<{ label: string; at: string }> };
  awards: DraftAward[];
  recentActivity: Array<{ action: string; createdAt: string; actorType: string | null; metadata: Record<string, unknown> | null }>;
  allowedActions: Partial<Record<
    'edit' | 'editStructure' | 'submitForReview' | 'withdraw' | 'discardPendingChanges' | 'deleteDraft' | 'pause' | 'resume' | 'cancel' | 'closeCompetition'
    | 'closeRegistration' | 'extendRegistration' | 'publishResults' | 'reopenResults' | 'suspended', boolean>>;
}

export type ReviewAction = 'SUBMITTED' | 'RESUBMITTED' | 'WITHDRAWN' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED' | 'EDIT_SUBMITTED' | 'EDIT_APPROVED' | 'EDIT_REJECTED';
export interface ReviewHistoryItem { id: string; action: ReviewAction; feedback: string | null; revision: number; changedFields: string[]; createdAt: string }

export type ParticipantFilter = 'ALL' | 'SUBMITTED' | 'NOT_SUBMITTED' | 'UNDER_REVIEW' | 'ADVANCED' | 'NOT_SELECTED' | 'FINALISTS';

export interface ParticipantRow {
  participantId: string;
  joinedAt: string;
  status: 'ACTIVE' | 'NOT_SELECTED' | 'WITHDRAWN';
  currentStageOrder: number;
  eliminatedAtOrder: number | null;
  creator: CreatorDisplay & { location: string | null; categories: string[] };
  submission: MySubmission | null;
  decision: { decision: 'ADVANCE' | 'NOT_SELECTED' | null; isPublished: boolean; notes: string | null; scores: Record<string, number> | null; totalScore: number | null; updatedAt: string } | null;
  awards: Array<{ prizeId: string; isPublished: boolean }>;
}

export interface ParticipantsPage extends Paged<ParticipantRow> {
  stage: { id: string; name: string; order: number; status: StageStatus; advanceLimit: number | null; isFinal: boolean };
}

export interface SubmissionDetail {
  participantId: string;
  status: string;
  currentStageOrder: number;
  joinedAt: string;
  creator: CreatorDisplay & { location: string | null; bio: string | null; categories: string[] };
  submission: (MySubmission & { history: Array<{ version: number; method: SubmissionMethod; videoUrl: string | null; thumbnailUrl: string | null; externalUrl: string | null; durationSec: number | null; caption: string | null; submittedAt: string; replacedAt: string }> }) | null;
  decision: ParticipantRow['decision'];
}

const M = '/api/competitions/manage';

export const fetchManagedCompetitions = (signal?: AbortSignal) => api<ManagedListItem[]>('GET', M, undefined, { signal });
export const fetchManagedCompetition = (id: string, signal?: AbortSignal) => api<ManagedCompetition>('GET', `${M}/${id}`, undefined, { signal });
export const createCompetition = (body: CompetitionInput) => api<ManagedCompetition>('POST', M, body);
export const updateCompetition = (id: string, body: Partial<CompetitionInput>) => api<ManagedCompetition>('PATCH', `${M}/${id}`, body);
export const deleteCompetitionDraft = (id: string) => api<{ id: string }>('DELETE', `${M}/${id}`);
/** Every competition is reviewed by Kolab before going live; `publishAt` is the requested go-live time. */
export const submitCompetitionForReview = (id: string, publishAt?: string | null) => api<ManagedCompetition>('POST', `${M}/${id}/submit`, { publishAt: publishAt ?? null });
export const withdrawCompetition = (id: string) => api<ManagedCompetition>('POST', `${M}/${id}/withdraw`);
export const discardPendingChanges = (id: string) => api<ManagedCompetition>('POST', `${M}/${id}/pending-changes/discard`);
export const pauseCompetition = (id: string, reason?: string) => api<ManagedCompetition>('POST', `${M}/${id}/pause`, { reason: reason || null });
export const resumeCompetition = (id: string) => api<ManagedCompetition>('POST', `${M}/${id}/resume`);
export const cancelCompetition = (id: string, reason: string) => api<ManagedCompetition>('POST', `${M}/${id}/cancel`, { reason });
export const closeCompetition = (id: string, reason?: string) => api<ManagedCompetition>('POST', `${M}/${id}/close`, { reason: reason || null });
export const closeRegistration = (id: string) => api<ManagedCompetition>('POST', `${M}/${id}/registration/close`);
export const extendRegistration = (id: string, registrationDeadline: string) => api<ManagedCompetition>('POST', `${M}/${id}/registration/extend`, { registrationDeadline });
export const openStageNow = (id: string, stageId: string) => api<ManagedCompetition>('POST', `${M}/${id}/stages/${stageId}/open`);
export const closeStageNow = (id: string, stageId: string) => api<ManagedCompetition>('POST', `${M}/${id}/stages/${stageId}/close`);
export const extendStage = (id: string, stageId: string, deadline: string) => api<ManagedCompetition>('POST', `${M}/${id}/stages/${stageId}/extend`, { deadline });
export const reopenStage = (id: string, stageId: string, deadline: string) => api<ManagedCompetition>('POST', `${M}/${id}/stages/${stageId}/reopen`, { deadline });

export function fetchParticipants(id: string, params: { stageId?: string; filter?: ParticipantFilter; q?: string; page?: number; limit?: number }, signal?: AbortSignal) {
  return api<ParticipantsPage>('GET', `${M}/${id}/participants`, undefined, { signal, params });
}
export const fetchSubmissionDetail = (id: string, stageId: string, participantId: string, signal?: AbortSignal) =>
  api<SubmissionDetail>('GET', `${M}/${id}/stages/${stageId}/submissions/${participantId}`, undefined, { signal });
export interface DecisionSummary { stageId: string; inStage: number; advance: number; notSelected: number; undecided: number; advanceLimit: number | null }
export const fetchDecisionSummary = (id: string, stageId: string, signal?: AbortSignal) =>
  api<DecisionSummary>('GET', `${M}/${id}/stages/${stageId}/decisions/summary`, undefined, { signal });
export const saveDecisions = (id: string, stageId: string, decisions: Array<{ participantId: string; decision?: 'ADVANCE' | 'NOT_SELECTED' | null; notes?: string | null; scores?: Record<string, number> | null }>) =>
  api<DecisionSummary>('PUT', `${M}/${id}/stages/${stageId}/decisions`, { decisions });
export const publishDecisions = (id: string, stageId: string, expectedAdvanceCount: number) =>
  api<ManagedCompetition>('POST', `${M}/${id}/stages/${stageId}/decisions/publish`, { expectedAdvanceCount });
export const saveAwards = (id: string, awards: Array<{ prizeId: string; participantId: string }>) =>
  api<DraftAward[]>('PUT', `${M}/${id}/awards`, { awards });
export const publishResults = (id: string, expectedAwardCount: number) => api<ManagedCompetition>('POST', `${M}/${id}/results/publish`, { expectedAwardCount });
export const reopenResults = (id: string, reason: string) => api<ManagedCompetition>('POST', `${M}/${id}/results/reopen`, { reason });
export function fetchCompetitionActivity(id: string, page = 1, signal?: AbortSignal) {
  return apiRequest<{ items: Array<{ id: string; action: string; actorType: string | null; createdAt: string; oldValue: unknown; newValue: unknown; metadata: Record<string, unknown> | null }>; pagination: Paged<unknown>['pagination'] }>(
    'GET', `${M}/${id}/activity`, undefined, { signal, params: { page } },
  ).then((r) => r.data);
}
