import { request } from '@/lib/api';

// Competitions — the third event type (creator contests). Organizer
// (/manage) + creator/public endpoints; mirrors web/src/app/api/competitions.ts and
// backend/src/modules/competition/competition.routes.ts (/api/competitions/manage).

export type CompetitionStatus =
  | 'DRAFT' | 'PENDING_REVIEW' | 'CHANGES_REQUESTED' | 'REJECTED' | 'SCHEDULED'
  | 'ACTIVE' | 'PAUSED' | 'AWAITING_RESULTS' | 'COMPLETED' | 'CANCELLED';
export type SubmissionMethod = 'VIDEO_UPLOAD' | 'EXTERNAL_LINK';
export type SubmissionMode = 'PER_STAGE' | 'SINGLE';
export type PrizeKind = 'PLACEMENT' | 'SPECIAL';

export interface CompetitionPrize {
  id?: string;
  kind: PrizeKind;
  title: string;
  description?: string | null;
  amount?: number | null;
  currency: 'NPR';
  recipientCount: number;
  notes?: string | null;
}

export interface CompetitionCriterion { key: string; label: string; weight: number }

export interface CompetitionStageInput {
  id?: string;
  name: string;
  description?: string | null;
  brief?: string | null;
  requirements?: string | null;
  opensAt: string;
  deadline: string;
  advanceLimit?: number | null;
  allowedMethods: SubmissionMethod[];
  videoMinSec?: number | null;
  videoMaxSec?: number | null;
}

export interface CompetitionInput {
  title: string;
  description: string;
  objectives?: string | null;
  coverImageUrl?: string | null;
  rules: string;
  eligibility?: string | null;
  contentFormats: string[];
  skills: string[];
  submissionMode: SubmissionMode;
  submissionInstructions?: string | null;
  videoMinSec?: number | null;
  videoMaxSec?: number | null;
  contactInstructions?: string | null;
  resultsVisibility: 'PUBLIC' | 'PARTICIPANTS';
  registrationOpensAt: string;
  registrationDeadline: string;
  startsAt: string;
  endsAt: string;
  allowSubmissionEdits: boolean;
  onePrizePerCreator: boolean;
  scoringEnabled: boolean;
  judgingCriteria: CompetitionCriterion[];
  stages: CompetitionStageInput[];
  prizes: CompetitionPrize[];
  /** How cash prizes reach winners. Required (with accepted terms) on submit when any prize has an amount. */
  prizePaymentMethod?: PrizePaymentMethod | null;
  /** Total cash pool in NPR — must equal Σ amount × recipients on submit. */
  cashPrizePool?: number | null;
  paymentTermsAccepted?: boolean;
}

export type PrizePaymentMethod = 'KOLAB' | 'DIRECT';

/** The fields of the organizer view the mobile builder reads back. */
export interface ManagedCompetition extends Omit<CompetitionInput, 'stages'> {
  id: string;
  slug: string;
  status: CompetitionStatus;
  stages: (CompetitionStageInput & { id: string; order: number; status: string })[];
}

/**
 * The full organizer record the builder's edit mode loads (GET /manage/:id —
 * the same response web's CompetitionFormPage reads).
 */
export interface EditableCompetition extends ManagedCompetition {
  prizes: (CompetitionPrize & { id: string })[];
  payment?: { prizePaymentMethod: PrizePaymentMethod | null; paymentTermsAccepted: boolean } | null;
  review: {
    pendingChanges: { rules?: string; eligibility?: string | null; prizes?: (CompetitionPrize & { id?: string })[] } | null;
    pendingChangesSubmittedAt: string | null;
  };
  allowedActions: Partial<Record<'edit' | 'editStructure', boolean>>;
}

/** One row of the organizer's own competitions list (GET /manage). */
export interface ManagedListItem {
  id: string; slug: string; title: string; coverImageUrl: string | null; status: CompetitionStatus; suspended: boolean;
  registrationDeadline: string; publishAt: string | null; participantCount: number; stageCount: number;
  currentStage: { id: string; name: string; status: string; deadline: string } | null; createdAt: string;
}

const M = '/api/competitions/manage';

export const competitionService = {
  async listMine(): Promise<ManagedListItem[]> {
    return (await request<ManagedListItem[]>('GET', M)).data;
  },
  async create(body: CompetitionInput): Promise<ManagedCompetition> {
    return (await request<ManagedCompetition>('POST', M, body)).data;
  },
  async update(id: string, body: Partial<CompetitionInput>): Promise<EditableCompetition> {
    return (await request<EditableCompetition>('PATCH', `${M}/${id}`, body)).data;
  },
  /** Loads an existing competition into the builder (edit mode). */
  async getForEdit(id: string): Promise<EditableCompetition> {
    return (await request<EditableCompetition>('GET', `${M}/${id}`)).data;
  },
  /** Which prize payment methods this server offers (Kolab-managed is behind a flag). */
  async paymentConfig(): Promise<{ kolabPaymentsEnabled: boolean }> {
    return (await request<{ kolabPaymentsEnabled: boolean }>('GET', '/api/competitions/payment-config')).data;
  },
  async submitForReview(id: string, publishAt?: string | null): Promise<ManagedCompetition> {
    return (await request<ManagedCompetition>('POST', `${M}/${id}/submit`, { publishAt: publishAt ?? null })).data;
  },
};

// ── Creator / public ──────────────────────────────────────────────────────────

export type StageStatus = 'UPCOMING' | 'OPEN' | 'UNDER_REVIEW' | 'SELECTION_PENDING' | 'RESULTS_PUBLISHED' | 'CLOSED';
export type CreatorCompetitionStatus =
  | 'JOINED' | 'SUBMISSION_REQUIRED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NO_SUBMISSION'
  | 'ADVANCED' | 'FINALIST' | 'NOT_SELECTED' | 'COMPLETED' | 'CANCELLED' | 'WITHDRAWN';

export interface Organizer { name: string | null; slug: string | null; logoUrl: string | null; isVerified: boolean }
export interface PublicPrize extends CompetitionPrize { position?: number }

export interface PublicStage {
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
  prizeHighlights: Array<Pick<CompetitionPrize, 'kind' | 'title' | 'amount' | 'currency' | 'recipientCount'>>;
  prizePool: { amount: number; currency: string } | null;
  participantCount: number;
  joined: boolean;
}

export interface CreatorDisplay { id: string; fullName: string | null; username: string | null; avatarUrl: string | null; isVerified: boolean }

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
  submissionMode: SubmissionMode;
  submissionInstructions: string | null;
  videoMinSec: number | null;
  videoMaxSec: number | null;
  contactInstructions: string | null;
  attachments: Array<{ url: string; name?: string; type?: string; originalFileName?: string }>;
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
  stages: PublicStage[];
  currentStageId: string | null;
  prizes: PublicPrize[];
  prizePool: { amount: number; currency: string } | null;
  results: Array<{
    prize: { id: string; position: number; kind: PrizeKind; title: string; amount: number | null; currency: string };
    creator: Omit<CreatorDisplay, 'id'> & { id?: string };
  }> | null;
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

export interface MyProgressStage {
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
}

export interface MyProgress {
  participantId: string;
  joinedAt: string;
  status: CreatorCompetitionStatus;
  participantStatus: 'ACTIVE' | 'NOT_SELECTED' | 'WITHDRAWN';
  currentStageOrder: number;
  eliminatedAtOrder: number | null;
  stages: MyProgressStage[];
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

const P = '/api/competitions';

export const creatorCompetitionService = {
  async discover(params: { tab?: 'open' | 'results' | 'all'; q?: string; page?: number; limit?: number }): Promise<Paged<CompetitionCard>> {
    return (await request<Paged<CompetitionCard>>('GET', P, undefined, params)).data;
  },
  async get(idOrSlug: string): Promise<CompetitionDetail> {
    return (await request<CompetitionDetail>('GET', `${P}/${encodeURIComponent(idOrSlug)}`)).data;
  },
  async joined(): Promise<JoinedCompetition[]> {
    return (await request<JoinedCompetition[]>('GET', `${P}/me/joined`)).data;
  },
  async join(id: string): Promise<MyProgress> {
    return (await request<MyProgress>('POST', `${P}/${id}/join`)).data;
  },
  async progress(id: string): Promise<MyProgress> {
    return (await request<MyProgress>('GET', `${P}/${id}/progress`)).data;
  },
  async submitLink(id: string, stageId: string, body: { url: string; caption?: string }): Promise<MySubmission> {
    return (await request<MySubmission>('POST', `${P}/${id}/stages/${stageId}/submissions/link`, body)).data;
  },
};

// ── Organizer management (business "Manage competition" screen) ──────────────
// Mirrors web/src/app/api/competitions.ts — same /api/competitions/manage routes.

export type ReviewAction = 'SUBMITTED' | 'RESUBMITTED' | 'WITHDRAWN' | 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED' | 'EDIT_SUBMITTED' | 'EDIT_APPROVED' | 'EDIT_REJECTED';
export interface StageStats { stageId: string; eligible: number; submissions: number; advanced: number; notSelected: number; draftAdvance: number; draftNotSelected: number }
export interface DraftAward { prizeId: string; participantId: string; isPublished: boolean; prize: { id: string; position: number; kind: PrizeKind; title: string; amount: number | null; currency: string }; creator: CreatorDisplay }
export type ManageAction =
  | 'edit' | 'editStructure' | 'submitForReview' | 'withdraw' | 'discardPendingChanges' | 'deleteDraft' | 'pause' | 'resume' | 'cancel' | 'closeCompetition'
  | 'closeRegistration' | 'extendRegistration' | 'publishResults' | 'reopenResults' | 'suspended';

export interface ManageDetail {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  status: CompetitionStatus;
  submissionMode: SubmissionMode;
  registrationOpensAt: string;
  registrationDeadline: string;
  startsAt: string;
  endsAt: string;
  publishAt: string | null;
  pauseReason: string | null;
  suspended: boolean;
  suspensionReason: string | null;
  onePrizePerCreator: boolean;
  scoringEnabled: boolean;
  judgingCriteria: CompetitionCriterion[];
  review: {
    feedback: string | null;
    submittedAt: string | null;
    resubmissionAllowed: boolean;
    pendingChanges: Record<string, unknown> | null;
    pendingChangesFeedback: string | null;
  };
  reviewHistory: { id: string; action: ReviewAction; feedback: string | null; createdAt: string }[];
  stages: PublicStage[];
  prizes: (CompetitionPrize & { id: string })[];
  prizePool: { amount: number; currency: string } | null;
  stats: { participants: number; active: number; awaitingReview: number; stages: StageStats[]; upcomingDeadlines: { label: string; at: string }[] };
  awards: DraftAward[];
  recentActivity: { action: string; createdAt: string; actorType: string | null; metadata: Record<string, unknown> | null }[];
  allowedActions: Partial<Record<ManageAction, boolean>>;
}

export type ParticipantFilter = 'ALL' | 'SUBMITTED' | 'NOT_SUBMITTED' | 'UNDER_REVIEW' | 'ADVANCED' | 'NOT_SELECTED' | 'FINALISTS';
export type Decision = 'ADVANCE' | 'NOT_SELECTED' | null;

export interface ParticipantRow {
  participantId: string;
  joinedAt: string;
  status: 'ACTIVE' | 'NOT_SELECTED' | 'WITHDRAWN';
  currentStageOrder: number;
  eliminatedAtOrder: number | null;
  creator: CreatorDisplay & { location: string | null; categories: string[] };
  submission: MySubmission | null;
  decision: { decision: Decision; isPublished: boolean; notes: string | null; scores: Record<string, number> | null; totalScore: number | null; updatedAt: string } | null;
}

export interface SubmissionDetail {
  participantId: string;
  creator: CreatorDisplay & { location: string | null };
  submission: (MySubmission & { history: { version: number; videoUrl: string | null; externalUrl: string | null; submittedAt: string }[] }) | null;
  decision: ParticipantRow['decision'];
}

export interface DecisionSummary { stageId: string; inStage: number; advance: number; notSelected: number; undecided: number; advanceLimit: number | null }
export interface ActivityItem { id: string; action: string; actorType: string | null; createdAt: string; metadata: Record<string, unknown> | null }

const MG = '/api/competitions/manage';
const post = async (path: string, body?: unknown) => (await request<ManageDetail>('POST', `${MG}${path}`, body)).data;

export const competitionManageService = {
  async get(id: string): Promise<ManageDetail> {
    return (await request<ManageDetail>('GET', `${MG}/${id}`)).data;
  },
  submitForReview: (id: string) => post(`/${id}/submit`, { publishAt: null }),
  withdraw:        (id: string) => post(`/${id}/withdraw`),
  discardChanges:  (id: string) => post(`/${id}/pending-changes/discard`),
  pause:           (id: string, reason?: string) => post(`/${id}/pause`, { reason: reason || null }),
  resume:          (id: string) => post(`/${id}/resume`),
  cancel:          (id: string, reason: string) => post(`/${id}/cancel`, { reason }),
  close:           (id: string, reason?: string) => post(`/${id}/close`, { reason: reason || null }),
  closeRegistration:  (id: string) => post(`/${id}/registration/close`),
  extendRegistration: (id: string, registrationDeadline: string) => post(`/${id}/registration/extend`, { registrationDeadline }),
  openStage:   (id: string, stageId: string) => post(`/${id}/stages/${stageId}/open`),
  closeStage:  (id: string, stageId: string) => post(`/${id}/stages/${stageId}/close`),
  extendStage: (id: string, stageId: string, deadline: string) => post(`/${id}/stages/${stageId}/extend`, { deadline }),
  reopenStage: (id: string, stageId: string, deadline: string) => post(`/${id}/stages/${stageId}/reopen`, { deadline }),
  reopenResults: (id: string, reason: string) => post(`/${id}/results/reopen`, { reason }),
  async deleteDraft(id: string): Promise<void> {
    await request('DELETE', `${MG}/${id}`);
  },

  async participants(id: string, params: { stageId?: string; filter?: ParticipantFilter; q?: string; page?: number; limit?: number }): Promise<Paged<ParticipantRow>> {
    return (await request<Paged<ParticipantRow>>('GET', `${MG}/${id}/participants`, undefined, params)).data;
  },
  async submission(id: string, stageId: string, participantId: string): Promise<SubmissionDetail> {
    return (await request<SubmissionDetail>('GET', `${MG}/${id}/stages/${stageId}/submissions/${participantId}`)).data;
  },
  async decisionSummary(id: string, stageId: string): Promise<DecisionSummary> {
    return (await request<DecisionSummary>('GET', `${MG}/${id}/stages/${stageId}/decisions/summary`)).data;
  },
  async saveDecisions(id: string, stageId: string, decisions: { participantId: string; decision?: Decision; notes?: string | null; scores?: Record<string, number> | null }[]): Promise<DecisionSummary> {
    return (await request<DecisionSummary>('PUT', `${MG}/${id}/stages/${stageId}/decisions`, { decisions })).data;
  },
  publishDecisions: (id: string, stageId: string, expectedAdvanceCount: number) => post(`/${id}/stages/${stageId}/decisions/publish`, { expectedAdvanceCount }),
  async saveAwards(id: string, awards: { prizeId: string; participantId: string }[]): Promise<DraftAward[]> {
    return (await request<DraftAward[]>('PUT', `${MG}/${id}/awards`, { awards })).data;
  },
  publishResults: (id: string, expectedAwardCount: number) => post(`/${id}/results/publish`, { expectedAwardCount }),
  async activity(id: string, page = 1): Promise<Paged<ActivityItem>> {
    return (await request<Paged<ActivityItem>>('GET', `${MG}/${id}/activity`, undefined, { page })).data;
  },
};
