import { request } from '@/lib/api';

// Competitions — the third event type (creator contests). Organizer endpoints
// only for now; mirrors web/src/app/api/competitions.ts and
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
