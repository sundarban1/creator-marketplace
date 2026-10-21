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

const M = '/api/competitions/manage';

export const competitionService = {
  async create(body: CompetitionInput): Promise<ManagedCompetition> {
    return (await request<ManagedCompetition>('POST', M, body)).data;
  },
  async update(id: string, body: Partial<CompetitionInput>): Promise<ManagedCompetition> {
    return (await request<ManagedCompetition>('PATCH', `${M}/${id}`, body)).data;
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
    creator: Omit<CreatorDisplay, 'id'>;
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
