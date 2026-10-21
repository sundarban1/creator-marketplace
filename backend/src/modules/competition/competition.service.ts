import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { Prisma, type CompetitionStage } from '@prisma/client';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { HttpStatus } from '../../constants/httpStatus';
import { getDict } from '../../i18n';
import { getRequestContext } from '../../middleware/requestContext';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { generateUniqueSlug } from '../../utils/slug';
import { createVideoUploadPlan, finalizeR2Object, completeR2Multipart, abortR2Multipart, deleteR2Object } from '../../utils/r2Media';
import { videoPlaybackUrl, videoThumbnailUrl, deleteVideo, MAX_VIDEO_SIZE_BYTES } from '../../utils/cloudinary';
import { AuditAction, EntityType, type AuditActionValue } from '../logging/logging.constants';
import * as rules from './competition.rules';
import { competitionNotifications as N } from './competition.notifications';
import { validateSubmissionLink, checkLinkAccessibility } from './competition.links';
import * as PR from './competition.payments.rules';
import { competitionPaymentService as Pay, paymentConfigView, kolabPaymentsEnabled } from './competition.payments.service';
import type {
  CreateCompetitionInput, UpdateCompetitionInput, StageInput, PrizeInput, SaveDecisionsInput,
  SaveAwardsInput, ParticipantsQuery, DiscoverQuery, AdminListQuery, VideoCompleteInput,
} from './competition.schema';

// ─────────────────────────────────────────────────────────────────────────────
// Competitions — organizer, creator, admin and sweep logic in one place, so
// every state transition and access rule is enforced here (never only in the
// UI). Conventions:
//  * An organizer only ever sees their own competitions — anything else is a
//    404, so ids can't be probed.
//  * Draft decisions, notes and scores never leave the organizer endpoints;
//    creators only see what the participant row / published rows say.
//  * Multi-row state changes run in one transaction with the affected row
//    locked (SELECT … FOR UPDATE) and an AuditLog row written inside it.
//  * Notifications go out only AFTER the transaction commits.
//  * Prize money lives in competition.payments.service.ts; this file only
//    calls its hooks (funding gate, payouts on results, refunds on cancel).
// ─────────────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;
const M = () => getDict().competition;
const fail = (message: string, status: number, code?: string) => new AppError(message, status, true, code ? { code } : undefined);

const STAGE_ORDER = { orderBy: { order: 'asc' as const } };
const PRIZE_ORDER = { orderBy: { position: 'asc' as const } };
const CREATOR_DISPLAY = { id: true, fullName: true, username: true, avatarUrl: true, isVerified: true } as const;
const ORGANIZER_DISPLAY = { id: true, userId: true, businessName: true, slug: true, logoUrl: true, isVerified: true, isActive: true } as const;

const LIVE = ['ACTIVE', 'PAUSED', 'AWAITING_RESULTS'] as const;
const VIDEO_FORMATS = new Set(['mp4', 'mov', 'qt']);
const DURATION_TOLERANCE_SEC = 1;

function moderatorEmails(): Set<string> {
  return new Set((env.COMPETITION_MODERATOR_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean));
}

export function isCompetitionModerator(email: string | undefined | null): boolean {
  return !!email && moderatorEmails().has(email.toLowerCase());
}

interface AuditInput {
  actorId?: string | null;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM';
  action: AuditActionValue;
  competitionId: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Same columns as logging/audit.service.ts's logAudit(), but written on the
// caller's transaction so the trail can't diverge from the change it records.
function audit(tx: Tx, a: AuditInput) {
  const ctx = getRequestContext();
  return tx.auditLog.create({
    data: {
      userId: a.actorId ?? undefined,
      actorType: a.actorType,
      action: a.action,
      entityType: EntityType.COMPETITION,
      entityId: a.competitionId,
      oldValue: a.oldValue as Prisma.InputJsonValue | undefined,
      newValue: a.newValue as Prisma.InputJsonValue | undefined,
      metadata: a.metadata as Prisma.InputJsonValue | undefined,
      ipAddress: ctx?.ip,
      userAgent: ctx?.userAgent,
      requestId: ctx?.requestId,
    },
  });
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

function throwProblems(problems: rules.Problem[] | string[]) {
  if (!problems.length) return;
  const messages = problems.map((p) => (typeof p === 'string' ? p : p.message));
  throw new AppError(Array.from(new Set(messages)).slice(0, 4).join(' '), HttpStatus.BAD_REQUEST, true, {
    code: 'COMPETITION_VALIDATION',
    problems,
  });
}

function criteriaOf(json: Prisma.JsonValue): rules.Criterion[] {
  return Array.isArray(json) ? (json as unknown as rules.Criterion[]) : [];
}

function stageData(s: StageInput, index: number, isFinal: boolean) {
  return {
    order: index + 1,
    name: s.name,
    description: s.description ?? null,
    brief: s.brief ?? null,
    requirements: s.requirements ?? null,
    opensAt: s.opensAt,
    deadline: s.deadline,
    advanceLimit: isFinal ? null : s.advanceLimit ?? null,
    allowedMethods: Array.from(new Set(s.allowedMethods)),
    videoMinSec: s.videoMinSec ?? null,
    videoMaxSec: s.videoMaxSec ?? null,
  };
}

function prizeData(p: PrizeInput, index: number) {
  return {
    position: index + 1,
    kind: p.kind,
    title: p.title,
    description: p.description ?? null,
    amount: p.amount ?? null,
    currency: p.currency ?? 'NPR',
    recipientCount: p.recipientCount,
    notes: p.notes ?? null,
  };
}

/** Full-config validation used by create, draft update and publish. */
function validateConfig(c: {
  publishAt?: Date | null; registrationOpensAt: Date; registrationDeadline: Date; startsAt: Date; endsAt: Date;
  videoMinSec?: number | null; videoMaxSec?: number | null; scoringEnabled: boolean; judgingCriteria: rules.Criterion[];
  stages: Array<rules.StageScheduleInput>; prizes: rules.PrizeInput[]; submissionMode?: rules.SubmissionMode;
}) {
  const problems = [
    ...rules.validateSchedule(c, c.stages, c.submissionMode ?? 'PER_STAGE'),
    ...rules.validatePrizes(c.prizes),
    ...rules.validateCriteria(c.scoringEnabled, c.judgingCriteria),
  ];
  if (c.videoMinSec != null && c.videoMaxSec != null && c.videoMinSec > c.videoMaxSec) {
    problems.push({ field: 'videoMaxSec', message: 'Maximum video duration must be at least the minimum' });
  }
  throwProblems(problems);
}

type StageLite = Pick<CompetitionStage, 'id' | 'order' | 'name' | 'status' | 'opensAt' | 'deadline'>;

/** The stage creators should be looking at: the first not yet finished, else the last. */
function currentStage<T extends StageLite>(stages: T[]): T | undefined {
  return stages.find((s) => s.status !== 'RESULTS_PUBLISHED' && s.status !== 'CLOSED') ?? stages[stages.length - 1];
}

function prizePool(prizes: Array<{ amount: number | null; currency: string; recipientCount: number }>) {
  const priced = prizes.filter((p) => p.amount != null);
  if (!priced.length || priced.some((p) => p.currency !== 'NPR')) return null;
  return { amount: priced.reduce((s, p) => s + (p.amount ?? 0) * p.recipientCount, 0), currency: 'NPR' };
}

// ── Prize payment configuration ─────────────────────────────────────────────

type PaymentInput = Pick<UpdateCompetitionInput, 'prizePaymentMethod' | 'cashPrizePool' | 'prizeTieRule' | 'paymentTermsAccepted'>;

interface CurrentPayment {
  prizePaymentMethod: PR.PrizePaymentMethod | null;
  cashPrizePoolPaisa: number | null;
  prizeTieRule: string | null;
  fundingStatus: PR.FundingStatus;
  paymentTermsMethod: PR.PrizePaymentMethod | null;
  paymentTermsAcceptedAt: Date | null;
  paymentTermsAcceptedById: string | null;
}

function splitPayment<T extends PaymentInput>(input: T) {
  const { prizePaymentMethod, cashPrizePool, prizeTieRule, paymentTermsAccepted, ...rest } = input;
  return { pay: { prizePaymentMethod, cashPrizePool, prizeTieRule, paymentTermsAccepted } as PaymentInput, rest };
}

const paymentTouched = (pay: PaymentInput) => Object.values(pay).some((v) => v !== undefined);

/**
 * The payment columns for a pre-launch save. Changing the method clears the
 * terms acceptance; once money has moved (funding pending / funded) the
 * method and pool are locked.
 */
function resolvePayment(pay: PaymentInput, cur: CurrentPayment | null, prizes: PR.PrizeLike[], userId: string, strict = false) {
  const method = pay.prizePaymentMethod !== undefined ? pay.prizePaymentMethod ?? null : cur?.prizePaymentMethod ?? null;
  const pool = pay.cashPrizePool !== undefined ? (pay.cashPrizePool == null ? null : PR.toPaisa(pay.cashPrizePool)) : cur?.cashPrizePoolPaisa ?? null;
  if (pay.cashPrizePool != null && pool == null) throwProblems([{ field: 'cashPrizePool', message: 'Prize pool can have at most 2 decimal places' }]);
  const methodChanged = method !== (cur?.prizePaymentMethod ?? null);
  const locked = !!cur && PR.FUNDING_LOCKED.includes(cur.fundingStatus);
  if (locked && (methodChanged || pool !== cur!.cashPrizePoolPaisa)) {
    throw fail('Money has already been paid towards this prize pool, so the payment method and pool can’t change. Contact Kolab support.', HttpStatus.CONFLICT, 'PAYMENT_LOCKED');
  }

  let termsMethod = methodChanged ? null : cur?.paymentTermsMethod ?? null;
  let termsAt = methodChanged ? null : cur?.paymentTermsAcceptedAt ?? null;
  let termsBy = methodChanged ? null : cur?.paymentTermsAcceptedById ?? null;
  if (pay.paymentTermsAccepted === true && method && (termsMethod !== method || !termsAt)) {
    termsMethod = method; termsAt = new Date(); termsBy = userId;
  } else if (pay.paymentTermsAccepted === false) {
    termsMethod = null; termsAt = null; termsBy = null;
  }

  // A competition already funded through Kolab stays valid if the flag is later switched off.
  const kolabEnabled = kolabPaymentsEnabled() || (locked && method === 'KOLAB');
  throwProblems(PR.validatePaymentConfig(prizes, { prizePaymentMethod: method, cashPrizePoolPaisa: pool, paymentTermsMethod: termsMethod, paymentTermsAcceptedAt: termsAt }, { strict, kolabEnabled }));

  return {
    prizePaymentMethod: method,
    cashPrizePoolPaisa: pool,
    prizeTieRule: pay.prizeTieRule !== undefined ? pay.prizeTieRule ?? null : cur?.prizeTieRule ?? null,
    paymentTermsMethod: termsMethod,
    paymentTermsAcceptedAt: termsAt,
    paymentTermsAcceptedById: termsBy,
    fundingStatus: locked ? cur!.fundingStatus : PR.baselineFundingStatus(method, pool),
  };
}

function effectiveDuration(c: { videoMinSec: number | null; videoMaxSec: number | null }, s: { videoMinSec: number | null; videoMaxSec: number | null }) {
  return { min: s.videoMinSec ?? c.videoMinSec, max: s.videoMaxSec ?? c.videoMaxSec };
}

// ── Creator-side submission eligibility ─────────────────────────────────────

type SubmitBlock =
  | 'suspended' | 'paused' | 'notActive' | 'notEligible' | 'notYet' | 'stageNotOpen' | 'stageClosed'
  | 'deadlinePassed' | 'editsDisabled';

function submitBlock(
  c: { status: string; suspendedAt: Date | null; allowSubmissionEdits: boolean },
  stage: { order: number; status: string; deadline: Date },
  p: { status: string; currentStageOrder: number } | null,
  hasExisting: boolean,
  now: Date,
): SubmitBlock | null {
  if (c.suspendedAt) return 'suspended';
  if (c.status === 'PAUSED') return 'paused';
  if (c.status !== 'ACTIVE') return 'notActive';
  if (!p || p.status !== 'ACTIVE') return 'notEligible';
  if (p.currentStageOrder < stage.order) return 'notYet';
  if (p.currentStageOrder > stage.order) return 'stageClosed';
  if (stage.status === 'UPCOMING') return 'stageNotOpen';
  if (stage.status !== 'OPEN') return 'stageClosed';
  if (now >= stage.deadline) return 'deadlinePassed';
  if (hasExisting && !c.allowSubmissionEdits) return 'editsDisabled';
  return null;
}

function submitBlockMessage(b: SubmitBlock): string {
  const m = M();
  return {
    suspended: m.competitionSuspended,
    paused: m.competitionPaused,
    notActive: m.competitionNotActive,
    notEligible: m.notEligibleForStage,
    notYet: m.notEligibleForStage,
    stageNotOpen: m.stageNotOpen,
    stageClosed: m.stageClosed,
    deadlinePassed: m.deadlinePassed,
    editsDisabled: m.editsDisabled,
  }[b];
}

export class CompetitionService {
  // ── Lookups / access ──────────────────────────────────────────────────────

  private async organizerProfile(userId: string) {
    const b = await prisma.businessProfile.findUnique({ where: { userId }, select: { id: true, isActive: true } });
    if (!b) throw fail(M().businessProfileRequired, HttpStatus.FORBIDDEN);
    return b;
  }

  private async creatorProfile(userId: string) {
    const c = await prisma.creatorProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!c) throw fail(M().creatorProfileRequired, HttpStatus.FORBIDDEN);
    return c;
  }

  /** The organizer's own competition, else 404 (never 403 — ids aren't probeable). */
  private async owned(userId: string, id: string) {
    const b = await this.organizerProfile(userId);
    const c = await prisma.competition.findFirst({
      where: { id, businessId: b.id },
      include: { stages: STAGE_ORDER, prizes: PRIZE_ORDER, business: { select: ORGANIZER_DISPLAY } },
    });
    if (!c) throw fail(M().notFound, HttpStatus.NOT_FOUND);
    return c;
  }

  private assertNotSuspended(c: { suspendedAt: Date | null }) {
    if (c.suspendedAt) throw fail(M().competitionSuspended, HttpStatus.FORBIDDEN, 'COMPETITION_SUSPENDED');
  }

  private assertEditable(c: { status: string }) {
    if (c.status === 'COMPLETED' || c.status === 'CANCELLED') throw fail(M().competitionFinished, HttpStatus.CONFLICT);
  }

  private async lockCompetition(tx: Tx, id: string) {
    await tx.$queryRaw`SELECT id FROM "competitions" WHERE id = ${id} FOR UPDATE`;
    const c = await tx.competition.findUnique({ where: { id }, include: { stages: STAGE_ORDER, prizes: PRIZE_ORDER } });
    if (!c) throw fail(M().notFound, HttpStatus.NOT_FOUND);
    return c;
  }

  private async participantUserIds(competitionId: string, where: Prisma.CompetitionParticipantWhereInput = {}) {
    const rows = await prisma.competitionParticipant.findMany({
      where: { competitionId, status: { not: 'WITHDRAWN' }, ...where },
      select: { creator: { select: { userId: true } } },
    });
    return rows.map((r) => r.creator.userId);
  }

  /** Participants who can submit to `order` right now. */
  private eligibleAt(competitionId: string, order: number) {
    return this.participantUserIds(competitionId, { status: 'ACTIVE', currentStageOrder: order });
  }

  // ── Organizer: create / edit / publish ────────────────────────────────────

  async create(userId: string, input: CreateCompetitionInput) {
    const b = await this.organizerProfile(userId);
    input = { ...input, stages: rules.normalizeStageDates(input.submissionMode, input.stages, input.endsAt) };
    validateConfig({ ...input, publishAt: null });
    const { pay, rest } = splitPayment(input);
    const payment = resolvePayment(pay, null, input.prizes, userId);

    const slug = await generateUniqueSlug(input.title, async (s) => !!(await prisma.competition.findUnique({ where: { slug: s }, select: { id: true } })));
    const { stages, prizes, judgingCriteria, attachments, ...scalars } = rest;

    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.competition.create({
        data: {
          ...scalars,
          ...payment,
          businessId: b.id,
          slug,
          judgingCriteria: judgingCriteria as unknown as Prisma.InputJsonValue,
          attachments: (attachments ?? []) as unknown as Prisma.InputJsonValue,
          stages: { create: stages.map((s, i) => stageData(s, i, i === stages.length - 1)) },
          prizes: { create: prizes.map(prizeData) },
        },
      });
      await audit(tx, { actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_CREATED, competitionId: c.id, newValue: { title: c.title, prizePaymentMethod: payment.prizePaymentMethod, cashPrizePoolPaisa: payment.cashPrizePoolPaisa } });
      return c;
    });
    return this.getForOrganizer(userId, created.id);
  }

  async update(userId: string, id: string, input: UpdateCompetitionInput) {
    const c = await this.owned(userId, id);
    this.assertEditable(c);
    this.assertNotSuspended(c);

    if (rules.PRE_LAUNCH_EDITABLE.includes(c.status)) return this.updateDraft(userId, c, input);
    // Approved but not public yet: nobody has joined, so a change to the
    // reviewed fields, dates or stage plan simply sends it back to review.
    if (c.status === 'SCHEDULED') return this.updateDraft(userId, c, input, { backToReview: this.scheduledNeedsReview(c, input) });
    return this.updateLive(userId, c, input);
  }

  /** Which admin-reviewed fields (rules / eligibility / prizes) this input actually changes. */
  private reviewedChanges(c: { rules: string; eligibility: string | null; prizes: Array<Parameters<typeof rules.prizeSignature>[0][number]> }, input: UpdateCompetitionInput): rules.ReviewedField[] {
    const out: rules.ReviewedField[] = [];
    if (input.rules !== undefined && input.rules.trim() !== c.rules.trim()) out.push('rules');
    if (input.eligibility !== undefined && (input.eligibility ?? '').trim() !== (c.eligibility ?? '').trim()) out.push('eligibility');
    if (input.prizes && rules.prizeSignature(input.prizes) !== rules.prizeSignature(c.prizes)) out.push('prizes');
    return out;
  }

  private scheduledNeedsReview(c: Awaited<ReturnType<CompetitionService['owned']>>, input: UpdateCompetitionInput): boolean {
    if (this.reviewedChanges(c, input).length) return true;
    if (input.prizePaymentMethod !== undefined && (input.prizePaymentMethod ?? null) !== c.prizePaymentMethod) return true;
    if (input.cashPrizePool !== undefined && (input.cashPrizePool == null ? null : PR.toPaisa(input.cashPrizePool)) !== c.cashPrizePoolPaisa) return true;
    if (input.prizeTieRule !== undefined && (input.prizeTieRule ?? '').trim() !== (c.prizeTieRule ?? '').trim()) return true;
    const t = (d?: Date) => d?.getTime();
    if ((['registrationOpensAt', 'registrationDeadline', 'startsAt', 'endsAt'] as const).some((k) => input[k] !== undefined && t(input[k]) !== t(c[k]))) return true;
    if (input.submissionMode !== undefined && input.submissionMode !== c.submissionMode) return true;
    if (input.stages) {
      const sig = (xs: Array<{ name: string; opensAt: Date; deadline: Date; advanceLimit?: number | null; allowedMethods: string[] }>) =>
        JSON.stringify(xs.map((x) => [x.name, x.opensAt.getTime(), x.deadline.getTime(), x.advanceLimit ?? null, [...x.allowedMethods].sort()]));
      if (sig(input.stages) !== sig(c.stages)) return true;
    }
    return false;
  }

  // Before anyone can join: everything is editable; stages/prizes are replaced wholesale.
  private async updateDraft(userId: string, c: Awaited<ReturnType<CompetitionService['owned']>>, fullInput: UpdateCompetitionInput, opts: { backToReview?: boolean } = {}) {
    const { pay, rest: input } = splitPayment(fullInput);
    const { stages: rawStages, prizes, judgingCriteria, attachments, ...scalars } = input;
    const mode = scalars.submissionMode ?? c.submissionMode;
    const endsAt = scalars.endsAt ?? c.endsAt;
    // Review-round dates are derived; rewrite them whenever the inputs they depend on change.
    const derivedChanged = mode === 'SINGLE' && (!!rawStages || scalars.submissionMode !== undefined || scalars.endsAt !== undefined);
    const stages = rawStages
      ? rules.normalizeStageDates(mode, rawStages, endsAt)
      : derivedChanged ? rules.normalizeStageDates(mode, c.stages.map((s) => ({ ...s, allowedMethods: s.allowedMethods as rules.SubmissionMethod[] })), endsAt) : undefined;
    const nextStages = stages ?? c.stages.map((s) => ({ ...s, allowedMethods: s.allowedMethods as rules.SubmissionMethod[] }));
    const nextPrizes = prizes ?? c.prizes.map((p) => ({ ...p, kind: p.kind as rules.PrizeKind }));
    const merged = {
      publishAt: c.status === 'SCHEDULED' ? c.publishAt : null,
      registrationOpensAt: scalars.registrationOpensAt ?? c.registrationOpensAt,
      registrationDeadline: scalars.registrationDeadline ?? c.registrationDeadline,
      startsAt: scalars.startsAt ?? c.startsAt,
      endsAt: scalars.endsAt ?? c.endsAt,
      videoMinSec: scalars.videoMinSec !== undefined ? scalars.videoMinSec : c.videoMinSec,
      videoMaxSec: scalars.videoMaxSec !== undefined ? scalars.videoMaxSec : c.videoMaxSec,
      scoringEnabled: scalars.scoringEnabled ?? c.scoringEnabled,
      judgingCriteria: judgingCriteria ?? criteriaOf(c.judgingCriteria),
      stages: nextStages,
      prizes: nextPrizes,
      submissionMode: mode,
    };
    validateConfig(merged);
    const payment = paymentTouched(pay) || prizes ? resolvePayment(pay, c, nextPrizes, userId) : null;

    await prisma.$transaction(async (tx) => {
      // Funding may have moved since we read the row — re-check under the lock.
      if (payment) {
        await this.lockCompetition(tx, c.id);
        const fresh = await tx.competition.findUniqueOrThrow({ where: { id: c.id } });
        if (fresh.fundingStatus !== c.fundingStatus) resolvePayment(pay, fresh, nextPrizes, userId);
      }
      await tx.competition.update({
        where: { id: c.id },
        data: {
          ...scalars,
          ...(payment ?? {}),
          ...(judgingCriteria ? { judgingCriteria: judgingCriteria as unknown as Prisma.InputJsonValue } : {}),
          ...(attachments ? { attachments: attachments as unknown as Prisma.InputJsonValue } : {}),
        },
      });
      if (stages) {
        await tx.competitionStage.deleteMany({ where: { competitionId: c.id } });
        await tx.competitionStage.createMany({ data: stages.map((s, i) => ({ ...stageData(s, i, i === stages.length - 1), competitionId: c.id })) });
      }
      if (prizes) {
        await tx.competitionPrize.deleteMany({ where: { competitionId: c.id } });
        await tx.competitionPrize.createMany({ data: prizes.map((p, i) => ({ ...prizeData(p, i), competitionId: c.id })) });
      }
      await audit(tx, { actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_UPDATED, competitionId: c.id, metadata: { fields: Object.keys(fullInput), backToReview: !!opts.backToReview } });
      if (payment && (payment.prizePaymentMethod !== c.prizePaymentMethod || payment.cashPrizePoolPaisa !== c.cashPrizePoolPaisa || payment.paymentTermsAcceptedAt !== c.paymentTermsAcceptedAt)) {
        await audit(tx, {
          actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_PAYMENT_CONFIGURED, competitionId: c.id,
          oldValue: { prizePaymentMethod: c.prizePaymentMethod, cashPrizePoolPaisa: c.cashPrizePoolPaisa, termsAcceptedAt: c.paymentTermsAcceptedAt },
          newValue: { prizePaymentMethod: payment.prizePaymentMethod, cashPrizePoolPaisa: payment.cashPrizePoolPaisa, termsAcceptedAt: payment.paymentTermsAcceptedAt },
        });
      }
      if (opts.backToReview) {
        const res = await tx.competition.updateMany({
          where: { id: c.id, status: 'SCHEDULED' },
          data: { status: 'PENDING_REVIEW', submittedForReviewAt: new Date(), reviewRevision: { increment: 1 }, reviewFeedback: null },
        });
        if (res.count !== 1) throw fail(M().changedMeanwhile, HttpStatus.CONFLICT);
        await tx.competitionReview.create({
          data: { competitionId: c.id, actorId: userId, action: 'RESUBMITTED', revision: c.reviewRevision + 1, changedFields: Object.keys(fullInput) },
        });
      }
    });
    if (opts.backToReview) void N.adminReviewRequested(c, 'launch').catch((err) => logger.warn({ err }, 'competition: admin review notify failed'));
    return this.getForOrganizer(userId, c.id);
  }

  // After publication: content can change (participants are told); dates go
  // through the dedicated deadline actions; the stage structure is fixed.
  private async updateLive(userId: string, c: Awaited<ReturnType<CompetitionService['owned']>>, fullInput: UpdateCompetitionInput) {
    const m = M();
    // The payment method and pool are fixed once the competition has started.
    const { pay, rest: input } = splitPayment(fullInput);
    if ((pay.prizePaymentMethod !== undefined && (pay.prizePaymentMethod ?? null) !== c.prizePaymentMethod)
      || (pay.cashPrizePool !== undefined && (pay.cashPrizePool == null ? null : PR.toPaisa(pay.cashPrizePool)) !== c.cashPrizePoolPaisa)
      || (pay.prizeTieRule !== undefined && (pay.prizeTieRule ?? '').trim() !== (c.prizeTieRule ?? '').trim())) {
      throw fail('Prize payment settings can’t change after the competition has gone live.', HttpStatus.CONFLICT, 'PAYMENT_LOCKED');
    }
    const sameDate = (a: Date | undefined, b: Date) => a === undefined || a.getTime() === b.getTime();
    if (!sameDate(input.registrationOpensAt, c.registrationOpensAt) || !sameDate(input.registrationDeadline, c.registrationDeadline)
      || !sameDate(input.startsAt, c.startsAt) || !sameDate(input.endsAt, c.endsAt)) {
      throw fail(m.useDeadlineActions, HttpStatus.CONFLICT);
    }
    if (input.submissionMode !== undefined && input.submissionMode !== c.submissionMode) throw fail(m.submissionModeLocked, HttpStatus.CONFLICT);

    const scoredDecisions = input.judgingCriteria || input.scoringEnabled !== undefined
      ? await prisma.competitionStageDecision.count({ where: { stage: { competitionId: c.id }, scores: { not: Prisma.AnyNull } } })
      : 0;
    if (scoredDecisions > 0 && (input.judgingCriteria || (input.scoringEnabled !== undefined && input.scoringEnabled !== c.scoringEnabled))) {
      throw fail(m.scoringLocked, HttpStatus.CONFLICT);
    }
    if (input.judgingCriteria || input.scoringEnabled !== undefined) {
      throwProblems(rules.validateCriteria(input.scoringEnabled ?? c.scoringEnabled, input.judgingCriteria ?? criteriaOf(c.judgingCriteria)));
    }
    const minSec = input.videoMinSec !== undefined ? input.videoMinSec : c.videoMinSec;
    const maxSec = input.videoMaxSec !== undefined ? input.videoMaxSec : c.videoMaxSec;
    if (minSec != null && maxSec != null && minSec > maxSec) throwProblems([{ field: 'videoMaxSec', message: 'Maximum video duration must be at least the minimum' }]);

    // Stage edits: same set of stages, same dates; content always, rules only while UPCOMING.
    const stageUpdates: Array<{ id: string; data: Prisma.CompetitionStageUpdateInput; materially: boolean }> = [];
    if (input.stages) {
      if (input.stages.length !== c.stages.length || input.stages.some((s) => !s.id || !c.stages.find((x) => x.id === s.id))) {
        throw fail(m.stageStructureLocked, HttpStatus.CONFLICT);
      }
      for (const s of input.stages) {
        const cur = c.stages.find((x) => x.id === s.id)!;
        if (s.opensAt.getTime() !== cur.opensAt.getTime() || s.deadline.getTime() !== cur.deadline.getTime()) throw fail(m.useDeadlineActions, HttpStatus.CONFLICT);
        const isFinal = cur.order === c.stages.length;
        const data: Prisma.CompetitionStageUpdateInput = {
          name: s.name, description: s.description ?? null, brief: s.brief ?? null, requirements: s.requirements ?? null,
        };
        let materially = (s.brief ?? null) !== cur.brief || (s.requirements ?? null) !== cur.requirements;
        const rulesChanged = (s.advanceLimit ?? null) !== (isFinal ? null : cur.advanceLimit)
          || [...s.allowedMethods].sort().join() !== [...cur.allowedMethods].sort().join()
          || (s.videoMinSec ?? null) !== cur.videoMinSec || (s.videoMaxSec ?? null) !== cur.videoMaxSec;
        if (rulesChanged) {
          if (cur.status !== 'UPCOMING') throw fail(m.stageRulesLocked, HttpStatus.CONFLICT);
          if (s.videoMinSec != null && s.videoMaxSec != null && s.videoMinSec > s.videoMaxSec) throwProblems([{ field: 'stages', message: `${s.name}: maximum duration must be at least the minimum` }]);
          Object.assign(data, {
            advanceLimit: isFinal ? null : s.advanceLimit ?? null,
            allowedMethods: Array.from(new Set(s.allowedMethods)),
            videoMinSec: s.videoMinSec ?? null,
            videoMaxSec: s.videoMaxSec ?? null,
          });
          materially = true;
        }
        stageUpdates.push({ id: cur.id, data, materially });
      }
    }

    // Rules / eligibility / prizes need admin re-approval: they're stored as
    // pending changes and the approved version stays live until then.
    const reviewed = this.reviewedChanges(c, input);
    if (input.prizes && reviewed.includes('prizes')) {
      throwProblems(rules.validatePrizes(input.prizes));
      throwProblems(this.livePrizeProblems(c, input.prizes));
      const keptIds = new Set(input.prizes.map((p) => p.id).filter(Boolean) as string[]);
      if ([...keptIds].some((pid) => !c.prizes.find((p) => p.id === pid))) throw fail(m.prizeNotFound, HttpStatus.BAD_REQUEST);
      const removed = c.prizes.filter((p) => !keptIds.has(p.id)).map((p) => p.id);
      if (removed.length && await prisma.competitionAward.count({ where: { prizeId: { in: removed } } })) {
        throw fail(m.prizeHasAwards, HttpStatus.CONFLICT);
      }
    }

    const {
      stages: _s, prizes: _p, rules: _r, eligibility: _e, judgingCriteria, attachments,
      registrationOpensAt: _a, registrationDeadline: _b, startsAt: _c, endsAt: _d, ...scalars
    } = input;
    void [_s, _p, _r, _e, _a, _b, _c, _d];
    const proposed: Record<string, unknown> = {};
    if (reviewed.includes('rules')) proposed.rules = input.rules;
    if (reviewed.includes('eligibility')) proposed.eligibility = input.eligibility ?? null;
    if (reviewed.includes('prizes')) proposed.prizes = input.prizes!.map((p, i) => ({ ...p, position: i + 1 }));
    const changed: string[] = [];
    if (scalars.submissionInstructions !== undefined && (scalars.submissionInstructions ?? null) !== c.submissionInstructions) changed.push('submission instructions');
    if (minSec !== c.videoMinSec || maxSec !== c.videoMaxSec) changed.push('video requirements');
    if (stageUpdates.some((s) => s.materially)) changed.push('stage requirements');

    await prisma.$transaction(async (tx) => {
      await tx.competition.update({
        where: { id: c.id },
        data: {
          ...scalars,
          ...(judgingCriteria ? { judgingCriteria: judgingCriteria as unknown as Prisma.InputJsonValue } : {}),
          ...(attachments ? { attachments: attachments as unknown as Prisma.InputJsonValue } : {}),
        },
      });
      for (const s of stageUpdates) await tx.competitionStage.update({ where: { id: s.id }, data: s.data });
      if (reviewed.length) {
        // Merge with any proposal already waiting, so two quick saves don't drop the first.
        const fresh = await tx.competition.findUnique({ where: { id: c.id }, select: { pendingChanges: true, reviewRevision: true } });
        const merged = { ...((fresh?.pendingChanges as Record<string, unknown> | null) ?? {}), ...proposed };
        await tx.competition.update({
          where: { id: c.id },
          data: {
            pendingChanges: merged as Prisma.InputJsonValue, pendingChangesSubmittedAt: new Date(), pendingChangesFeedback: null,
            reviewRevision: { increment: 1 },
          },
        });
        await tx.competitionReview.create({
          data: { competitionId: c.id, actorId: userId, action: 'EDIT_SUBMITTED', revision: (fresh?.reviewRevision ?? 0) + 1, changedFields: Object.keys(merged) },
        });
      }
      await audit(tx, { actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_UPDATED, competitionId: c.id, metadata: { fields: Object.keys(input), material: changed, sentForReview: reviewed } });
    });
    if (reviewed.length) void N.adminReviewRequested(c, 'edit').catch((err) => logger.warn({ err }, 'competition: admin review notify failed'));

    if (changed.length) {
      const users = await this.participantUserIds(c.id, { status: 'ACTIVE' });
      void N.updated(users, c, changed.join(', '), new Date()).catch((err) => logger.warn({ err }, 'competition: update notify failed'));
    }
    return this.getForOrganizer(userId, c.id);
  }

  /** A proposed prize edit on a live competition must keep a Kolab-funded pool fully allocated. */
  private livePrizeProblems(c: { prizePaymentMethod: string | null; cashPrizePoolPaisa: number | null }, prizes: PR.PrizeLike[]): rules.Problem[] {
    const out: rules.Problem[] = PR.validatePaymentConfig(prizes, { prizePaymentMethod: null, cashPrizePoolPaisa: null, paymentTermsMethod: null, paymentTermsAcceptedAt: null }, { strict: false, kolabEnabled: true });
    if (c.prizePaymentMethod === 'KOLAB' && PR.cashAllocationPaisa(prizes) !== (c.cashPrizePoolPaisa ?? 0)) {
      out.push({ field: 'prizes', message: 'Cash prizes must still add up to the funded prize pool' });
    }
    return out;
  }

  /**
   * Organizer submits (or resubmits) for admin review. `publishAt` is the
   * requested go-live time — null/past means "as soon as it's approved".
   * Every competition is reviewed; verified businesses don't skip it.
   */
  async submitForReview(userId: string, id: string, publishAt?: Date | null) {
    const m = M();
    const c = await this.owned(userId, id);
    this.assertNotSuspended(c);
    const from = c.status;
    if (!['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(from)) throw fail(m.onlyDraftsPublish, HttpStatus.CONFLICT);
    if (from === 'REJECTED' && !c.resubmissionAllowed) throw fail(m.resubmissionBlocked, HttpStatus.FORBIDDEN);
    if (!c.business.isActive) throw fail(m.businessInactive, HttpStatus.FORBIDDEN);

    const now = new Date();
    const requestedAt = publishAt && publishAt.getTime() > now.getTime() ? publishAt : null;
    validateConfig({
      ...c,
      publishAt: requestedAt,
      judgingCriteria: criteriaOf(c.judgingCriteria),
      stages: c.stages.map((s) => ({ ...s, allowedMethods: s.allowedMethods as rules.SubmissionMethod[] })),
      prizes: c.prizes.map((p) => ({ ...p, kind: p.kind as rules.PrizeKind })),
    });
    if (c.registrationDeadline <= now) throw fail(m.registrationDeadlinePast, HttpStatus.BAD_REQUEST);
    if (c.stages[0].deadline <= now) throw fail(m.firstStageDeadlinePast, HttpStatus.BAD_REQUEST);
    // Prize & payment must be complete: method chosen, pool fully allocated, terms accepted.
    resolvePayment({}, c, c.prizes, userId, true);
    // Paying winners yourself (DIRECT) needs a verified business — Kolab can't
    // vouch for prizes an unverified organizer promises to pay. Kolab-managed
    // payments are funded upfront, so they don't need this. Only first-time
    // submissions are gated: competitions already sent to review before this
    // rule existed (reviewRevision > 0) keep resubmitting as before.
    if (c.prizePaymentMethod === 'DIRECT' && !c.business.isVerified && c.reviewRevision === 0) {
      throw fail(m.verificationRequiredDirect, HttpStatus.FORBIDDEN, 'BUSINESS_VERIFICATION_REQUIRED');
    }

    await prisma.$transaction(async (tx) => {
      const res = await tx.competition.updateMany({
        where: { id, status: from },
        data: { status: 'PENDING_REVIEW', publishAt: requestedAt, submittedForReviewAt: now, reviewRevision: { increment: 1 } },
      });
      if (res.count !== 1) throw fail(m.changedMeanwhile, HttpStatus.CONFLICT);
      await tx.competitionReview.create({
        data: { competitionId: id, actorId: userId, action: from === 'DRAFT' && c.reviewRevision === 0 ? 'SUBMITTED' : 'RESUBMITTED', revision: c.reviewRevision + 1 },
      });
      await audit(tx, { actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_SUBMITTED, competitionId: id, oldValue: { status: from }, newValue: { status: 'PENDING_REVIEW', publishAt: requestedAt } });
    });
    void N.adminReviewRequested(c, 'launch').catch((err) => logger.warn({ err }, 'competition: admin review notify failed'));
    return this.getForOrganizer(userId, id);
  }

  /** PENDING_REVIEW or SCHEDULED → DRAFT. Going live again needs a fresh review. */
  async withdraw(userId: string, id: string) {
    const c = await this.owned(userId, id);
    if (!['PENDING_REVIEW', 'SCHEDULED'].includes(c.status)) throw fail(M().invalidTransition, HttpStatus.CONFLICT);
    await prisma.$transaction(async (tx) => {
      const res = await tx.competition.updateMany({ where: { id, status: c.status }, data: { status: 'DRAFT', publishAt: null } });
      if (res.count !== 1) throw fail(M().changedMeanwhile, HttpStatus.CONFLICT);
      await tx.competitionReview.create({ data: { competitionId: id, actorId: userId, action: 'WITHDRAWN', revision: c.reviewRevision } });
      await audit(tx, { actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_UPDATED, competitionId: id, oldValue: { status: c.status }, newValue: { status: 'DRAFT' }, metadata: { withdrawn: true } });
    });
    return this.getForOrganizer(userId, id);
  }

  /** Drop a proposed rules/eligibility/prize edit that's still awaiting review. */
  async discardPendingChanges(userId: string, id: string) {
    const c = await this.owned(userId, id);
    if (!c.pendingChanges) throw fail(M().noPendingChanges, HttpStatus.CONFLICT);
    await prisma.competition.update({ where: { id }, data: { pendingChanges: Prisma.DbNull, pendingChangesSubmittedAt: null } });
    return this.getForOrganizer(userId, id);
  }

  async deleteDraft(userId: string, id: string) {
    const c = await this.owned(userId, id);
    const deletable = ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'];
    if (!deletable.includes(c.status)) throw fail(M().onlyDraftsDelete, HttpStatus.CONFLICT);
    if (await prisma.competitionFunding.count({ where: { competitionId: id } })) {
      throw fail('This competition has prize payment records, so it can’t be deleted. Contact Kolab support.', HttpStatus.CONFLICT, 'HAS_PAYMENT_RECORDS');
    }
    await prisma.competition.deleteMany({ where: { id, status: { in: deletable as never } } });
    return { id };
  }

  // ── Organizer: lifecycle controls ─────────────────────────────────────────

  private async transition(userId: string, id: string, to: string, opts: {
    action: AuditActionValue; data?: Prisma.CompetitionUncheckedUpdateInput; reason?: string | null; from?: string[];
    inTx?: (tx: Tx) => Promise<unknown>;
  }) {
    const c = await this.owned(userId, id);
    this.assertNotSuspended(c);
    const allowedFrom = opts.from ?? Object.keys(rules.COMPETITION_TRANSITIONS).filter((f) => rules.canTransition(f, to));
    if (!allowedFrom.includes(c.status) || !rules.canTransition(c.status, to)) throw fail(M().invalidTransition, HttpStatus.CONFLICT);

    await prisma.$transaction(async (tx) => {
      const res = await tx.competition.updateMany({ where: { id, status: c.status }, data: { status: to as never, ...(opts.data ?? {}) } });
      if (res.count !== 1) throw fail(M().changedMeanwhile, HttpStatus.CONFLICT);
      await audit(tx, { actorId: userId, actorType: 'USER', action: opts.action, competitionId: id, oldValue: { status: c.status }, newValue: { status: to }, metadata: opts.reason ? { reason: opts.reason } : undefined });
      if (opts.inTx) await opts.inTx(tx);
    });
    return c;
  }

  async pause(userId: string, id: string, reason?: string | null) {
    const now = new Date();
    const c = await this.transition(userId, id, 'PAUSED', { action: AuditAction.COMPETITION_PAUSED, from: ['ACTIVE', 'SCHEDULED'], reason, data: { pausedAt: now, pauseReason: reason ?? null } });
    if (c.status === 'ACTIVE') {
      const users = await this.participantUserIds(id, { status: 'ACTIVE' });
      void N.statusChanged(users, c, 'PAUSED', now).catch((err) => logger.warn({ err }, 'competition: pause notify failed'));
    }
    return this.getForOrganizer(userId, id);
  }

  async resume(userId: string, id: string) {
    const c = await this.owned(userId, id);
    const now = new Date();
    // A competition paused before its scheduled publication goes back to waiting.
    const to = c.publishedAt ? 'ACTIVE' : 'SCHEDULED';
    await this.transition(userId, id, to, { action: AuditAction.COMPETITION_RESUMED, from: ['PAUSED'], data: { pausedAt: null, pauseReason: null } });
    if (to === 'ACTIVE') {
      const users = await this.participantUserIds(id, { status: 'ACTIVE' });
      void N.statusChanged(users, c, 'RESUMED', now).catch((err) => logger.warn({ err }, 'competition: resume notify failed'));
      await this.runLifecycleSweep(new Date(), id);
    }
    return this.getForOrganizer(userId, id);
  }

  async cancel(userId: string, id: string, reason: string) {
    const now = new Date();
    let refund: Awaited<ReturnType<typeof Pay.onCancelled>> = null;
    const c = await this.transition(userId, id, 'CANCELLED', {
      action: AuditAction.COMPETITION_CANCELLED, reason, data: { cancelledAt: now, cancelReason: reason },
      inTx: async (tx) => { refund = await Pay.onCancelled(tx, id, userId); },
    });
    const due = refund as Awaited<ReturnType<typeof Pay.onCancelled>>;
    if (due) void N.adminPaymentAttention({ id, title: due.title }, `“${due.title}” was cancelled with NPR ${due.refundDue.toLocaleString('en-IN')} of prize money held by Kolab. Refund it to the business.`).catch(() => {});
    await prisma.competitionStage.updateMany({ where: { competitionId: id, status: { in: ['UPCOMING', 'OPEN'] } }, data: { status: 'CLOSED', submissionsClosedAt: now } });
    const users = await this.participantUserIds(id);
    void N.statusChanged(users, c, 'CANCELLED', now, reason).catch((err) => logger.warn({ err }, 'competition: cancel notify failed'));
    return this.getForOrganizer(userId, id);
  }

  /** Ends the competition early: closes registration and any open stage, skips remaining stages. */
  async closeCompetition(userId: string, id: string, reason?: string | null) {
    const c = await this.owned(userId, id);
    this.assertNotSuspended(c);
    if (!['ACTIVE', 'PAUSED'].includes(c.status)) throw fail(M().invalidTransition, HttpStatus.CONFLICT);
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const locked = await this.lockCompetition(tx, id);
      if (!['ACTIVE', 'PAUSED'].includes(locked.status)) throw fail(M().changedMeanwhile, HttpStatus.CONFLICT);
      await tx.competitionStage.updateMany({ where: { competitionId: id, status: 'OPEN' }, data: { status: 'UNDER_REVIEW', submissionsClosedAt: now } });
      await tx.competitionStage.updateMany({ where: { competitionId: id, status: 'UPCOMING' }, data: { status: 'CLOSED' } });
      await tx.competition.update({
        where: { id },
        data: {
          status: 'AWAITING_RESULTS', pausedAt: null, pauseReason: null,
          registrationDeadline: locked.registrationDeadline > now ? now : locked.registrationDeadline,
        },
      });
      await audit(tx, { actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_CLOSED, competitionId: id, oldValue: { status: locked.status }, newValue: { status: 'AWAITING_RESULTS' }, metadata: reason ? { reason } : undefined });
    });
    const users = await this.participantUserIds(id, { status: 'ACTIVE' });
    void N.updated(users, c, 'the schedule — submissions are now closed and final results are next', now).catch(() => {});
    return this.getForOrganizer(userId, id);
  }

  async closeRegistration(userId: string, id: string) {
    const c = await this.owned(userId, id);
    this.assertNotSuspended(c);
    this.assertEditable(c);
    const now = new Date();
    if (c.registrationDeadline <= now) throw fail(M().registrationAlreadyClosed, HttpStatus.CONFLICT);
    await prisma.$transaction(async (tx) => {
      await tx.competition.update({ where: { id }, data: { registrationDeadline: now } });
      await audit(tx, { actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_REGISTRATION_CHANGED, competitionId: id, oldValue: { registrationDeadline: c.registrationDeadline }, newValue: { registrationDeadline: now } });
    });
    return this.getForOrganizer(userId, id);
  }

  async extendRegistration(userId: string, id: string, registrationDeadline: Date) {
    const c = await this.owned(userId, id);
    this.assertNotSuspended(c);
    if (!['SCHEDULED', 'ACTIVE', 'PAUSED'].includes(c.status)) throw fail(M().invalidTransition, HttpStatus.CONFLICT);
    const now = new Date();
    if (registrationDeadline <= now || registrationDeadline <= c.registrationOpensAt) throw fail(M().deadlineMustBeFuture, HttpStatus.BAD_REQUEST);
    if (registrationDeadline > c.endsAt) throw fail(M().deadlineAfterEnd, HttpStatus.BAD_REQUEST);
    await prisma.$transaction(async (tx) => {
      await tx.competition.update({ where: { id }, data: { registrationDeadline } });
      await audit(tx, { actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_REGISTRATION_CHANGED, competitionId: id, oldValue: { registrationDeadline: c.registrationDeadline }, newValue: { registrationDeadline } });
    });
    return this.getForOrganizer(userId, id);
  }

  // ── Organizer: stage controls ─────────────────────────────────────────────

  private stageOf<T extends { id: string }>(c: { stages: T[] }, stageId: string): T {
    const s = c.stages.find((x) => x.id === stageId);
    if (!s) throw fail(M().stageNotFound, HttpStatus.NOT_FOUND);
    return s;
  }

  /** Open an UPCOMING stage now, ahead of its scheduled time. */
  async openStage(userId: string, id: string, stageId: string) {
    const c = await this.owned(userId, id);
    this.assertNotSuspended(c);
    if (c.status !== 'ACTIVE') throw fail(M().competitionNotActive, HttpStatus.CONFLICT);
    const stage = this.stageOf(c, stageId);
    if (rules.isReviewRound(c.submissionMode, stage.order)) throw fail(M().reviewRoundNoDeadline, HttpStatus.CONFLICT);
    if (stage.status !== 'UPCOMING') throw fail(M().stageNotUpcoming, HttpStatus.CONFLICT);
    const prev = c.stages.find((s) => s.order === stage.order - 1);
    if (prev && prev.status !== 'RESULTS_PUBLISHED') throw fail(M().previousStageUnpublished, HttpStatus.CONFLICT);
    const now = new Date();
    if (stage.deadline <= now) throw fail(M().stageDeadlinePassedExtend, HttpStatus.CONFLICT);

    await prisma.$transaction(async (tx) => {
      const res = await tx.competitionStage.updateMany({ where: { id: stageId, status: 'UPCOMING' }, data: { status: 'OPEN', openedAt: now, opensAt: stage.opensAt < now ? stage.opensAt : now } });
      if (res.count !== 1) throw fail(M().changedMeanwhile, HttpStatus.CONFLICT);
      await audit(tx, { actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_STAGE_OPENED, competitionId: id, metadata: { stageId, stage: stage.name } });
    });
    const users = await this.eligibleAt(id, stage.order);
    void N.stageOpened(users, c, stage).catch((err) => logger.warn({ err }, 'competition: stage open notify failed'));
    return this.getForOrganizer(userId, id);
  }

  /** Close an OPEN stage's submissions now (separate from closing the competition). */
  async closeStage(userId: string, id: string, stageId: string) {
    const c = await this.owned(userId, id);
    this.assertNotSuspended(c);
    const stage = this.stageOf(c, stageId);
    if (rules.isReviewRound(c.submissionMode, stage.order)) throw fail(M().reviewRoundNoDeadline, HttpStatus.CONFLICT);
    if (stage.status !== 'OPEN') throw fail(M().stageNotOpen, HttpStatus.CONFLICT);
    const now = new Date();
    const isFinal = stage.order === c.stages.length;
    await prisma.$transaction(async (tx) => {
      const res = await tx.competitionStage.updateMany({ where: { id: stageId, status: 'OPEN' }, data: { status: 'UNDER_REVIEW', submissionsClosedAt: now } });
      if (res.count !== 1) throw fail(M().changedMeanwhile, HttpStatus.CONFLICT);
      if (isFinal) await tx.competition.updateMany({ where: { id, status: 'ACTIVE' }, data: { status: 'AWAITING_RESULTS' } });
      await audit(tx, { actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_STAGE_CLOSED, competitionId: id, metadata: { stageId, stage: stage.name, early: stage.deadline > now } });
    });
    if (stage.deadline > now) {
      const users = await this.eligibleAt(id, stage.order);
      void N.deadlineChanged(users, c, `${stage.name} submissions closed early — the deadline`, now, `stage:${stageId}:closed`).catch(() => {});
    }
    return this.getForOrganizer(userId, id);
  }

  /**
   * Move an UPCOMING/OPEN stage's deadline. If it lands past the competition
   * end, the end date moves with it (recorded in the audit row) rather than
   * rejecting an otherwise valid extension.
   */
  async extendStageDeadline(userId: string, id: string, stageId: string, deadline: Date) {
    const c = await this.owned(userId, id);
    this.assertNotSuspended(c);
    this.assertEditable(c);
    const stage = this.stageOf(c, stageId);
    if (rules.isReviewRound(c.submissionMode, stage.order)) throw fail(M().reviewRoundNoDeadline, HttpStatus.CONFLICT);
    if (!['UPCOMING', 'OPEN'].includes(stage.status)) throw fail(M().stageNotExtendable, HttpStatus.CONFLICT);
    const now = new Date();
    if (deadline <= now || deadline <= stage.opensAt) throw fail(M().deadlineMustBeFuture, HttpStatus.BAD_REQUEST);
    if (deadline <= stage.deadline) throw fail(M().deadlineMustBeLater, HttpStatus.BAD_REQUEST);
    return this.moveStageDeadline(userId, c, stage, deadline, ['UPCOMING', 'OPEN'], AuditAction.COMPETITION_DEADLINE_EXTENDED, null);
  }

  /** Reopen a closed (not yet published) stage for submissions with a new deadline. */
  async reopenStage(userId: string, id: string, stageId: string, deadline: Date) {
    const c = await this.owned(userId, id);
    this.assertNotSuspended(c);
    if (!['ACTIVE', 'AWAITING_RESULTS'].includes(c.status)) throw fail(M().competitionNotActive, HttpStatus.CONFLICT);
    const stage = this.stageOf(c, stageId);
    if (rules.isReviewRound(c.submissionMode, stage.order)) throw fail(M().reviewRoundNoDeadline, HttpStatus.CONFLICT);
    if (!['UNDER_REVIEW', 'SELECTION_PENDING'].includes(stage.status)) throw fail(M().stageNotReopenable, HttpStatus.CONFLICT);
    if (deadline <= new Date()) throw fail(M().deadlineMustBeFuture, HttpStatus.BAD_REQUEST);
    return this.moveStageDeadline(userId, c, stage, deadline, ['UNDER_REVIEW', 'SELECTION_PENDING'], AuditAction.COMPETITION_STAGE_REOPENED, 'OPEN');
  }

  private async moveStageDeadline(
    userId: string,
    c: Awaited<ReturnType<CompetitionService['owned']>>,
    stage: CompetitionStage,
    deadline: Date,
    fromStatuses: Array<CompetitionStage['status']>,
    action: AuditActionValue,
    toStatus: 'OPEN' | null,
  ) {
    const isFinal = stage.order === c.stages.length;
    const newEnd = deadline > c.endsAt ? deadline : null;
    await prisma.$transaction(async (tx) => {
      // Conditional on the status we validated — a concurrent sweep that just
      // closed the stage makes this a clean conflict instead of a lost update.
      const res = await tx.competitionStage.updateMany({
        where: { id: stage.id, status: { in: fromStatuses } },
        data: { deadline, ...(toStatus ? { status: toStatus, submissionsClosedAt: null, openedAt: stage.openedAt ?? new Date() } : {}) },
      });
      if (res.count !== 1) throw fail(M().changedMeanwhile, HttpStatus.CONFLICT);
      if (newEnd) await tx.competition.update({ where: { id: c.id }, data: { endsAt: newEnd } });
      if (c.submissionMode === 'SINGLE' && stage.order === 1) {
        // Review rounds' derived dates follow the entry deadline (see rules.normalizeStageDates).
        await tx.competitionStage.updateMany({ where: { competitionId: c.id, order: { gt: 1 } }, data: { opensAt: deadline, ...(newEnd ? { deadline: newEnd } : {}) } });
      }
      if (toStatus && isFinal) await tx.competition.updateMany({ where: { id: c.id, status: 'AWAITING_RESULTS' }, data: { status: 'ACTIVE' } });
      await audit(tx, {
        actorId: userId, actorType: 'USER', action, competitionId: c.id,
        oldValue: { deadline: stage.deadline, status: stage.status, ...(newEnd ? { endsAt: c.endsAt } : {}) },
        newValue: { deadline, status: toStatus ?? stage.status, ...(newEnd ? { endsAt: newEnd } : {}) },
        metadata: { stageId: stage.id, stage: stage.name },
      });
    });

    const users = await this.eligibleAt(c.id, stage.order);
    void N.deadlineChanged(users, c, toStatus ? `${stage.name} is open again — the new deadline` : `the ${stage.name} deadline`, deadline, `stage:${stage.id}`)
      .catch((err) => logger.warn({ err }, 'competition: deadline notify failed'));
    return this.getForOrganizer(userId, c.id);
  }

  // ── Organizer: review + decisions ─────────────────────────────────────────

  async saveDecisions(userId: string, id: string, stageId: string, input: SaveDecisionsInput) {
    const m = M();
    const c = await this.owned(userId, id);
    this.assertNotSuspended(c);
    this.assertEditable(c);
    const stage = this.stageOf(c, stageId);
    if (!['OPEN', 'UNDER_REVIEW', 'SELECTION_PENDING'].includes(stage.status)) throw fail(m.stageAlreadyPublished, HttpStatus.CONFLICT);
    const isFinal = stage.order === c.stages.length;
    const criteria = criteriaOf(c.judgingCriteria);

    const ids = Array.from(new Set(input.decisions.map((d) => d.participantId)));
    const participants = await prisma.competitionParticipant.findMany({
      where: { id: { in: ids }, competitionId: id, status: 'ACTIVE', currentStageOrder: stage.order },
      select: { id: true },
    });
    if (participants.length !== ids.length) throw fail(m.participantNotInStage, HttpStatus.BAD_REQUEST);

    for (const d of input.decisions) {
      if (isFinal && d.decision) throw fail(m.finalStageUsesAwards, HttpStatus.BAD_REQUEST);
      if (d.scores) {
        if (!c.scoringEnabled) throw fail(m.scoringDisabled, HttpStatus.BAD_REQUEST);
        const err = rules.validateScores(criteria, d.scores);
        if (err) throw fail(err, HttpStatus.BAD_REQUEST);
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "competition_stages" WHERE id = ${stageId} FOR UPDATE`;
      const fresh = await tx.competitionStage.findUnique({ where: { id: stageId }, select: { status: true } });
      if (!fresh || !['OPEN', 'UNDER_REVIEW', 'SELECTION_PENDING'].includes(fresh.status)) throw fail(m.stageAlreadyPublished, HttpStatus.CONFLICT);

      for (const d of input.decisions) {
        const patch: Prisma.CompetitionStageDecisionUncheckedUpdateInput = { decidedById: userId };
        if (d.decision !== undefined) patch.decision = d.decision;
        if (d.notes !== undefined) patch.notes = d.notes;
        if (d.scores !== undefined) {
          patch.scores = d.scores === null ? Prisma.DbNull : (d.scores as Prisma.InputJsonValue);
          patch.totalScore = d.scores === null ? null : rules.computeTotalScore(criteria, d.scores);
        }
        await tx.competitionStageDecision.upsert({
          where: { stageId_participantId: { stageId, participantId: d.participantId } },
          create: {
            stageId, participantId: d.participantId, decidedById: userId,
            decision: d.decision ?? null, notes: d.notes ?? null,
            scores: d.scores ? (d.scores as Prisma.InputJsonValue) : undefined,
            totalScore: d.scores ? rules.computeTotalScore(criteria, d.scores) : null,
          },
          update: patch,
        });
      }
      if (fresh.status === 'UNDER_REVIEW' && !isFinal) {
        const drafted = await tx.competitionStageDecision.count({ where: { stageId, decision: { not: null }, isPublished: false } });
        if (drafted > 0) await tx.competitionStage.update({ where: { id: stageId }, data: { status: 'SELECTION_PENDING' } });
      }
    });
    return this.decisionSummary(c, stage);
  }

  private async decisionSummary(c: { id: string; stages: CompetitionStage[] }, stage: CompetitionStage) {
    const [inStage, advance, notSelected] = await Promise.all([
      prisma.competitionParticipant.count({ where: { competitionId: c.id, status: 'ACTIVE', currentStageOrder: stage.order } }),
      prisma.competitionStageDecision.count({ where: { stageId: stage.id, decision: 'ADVANCE', participant: { status: 'ACTIVE', currentStageOrder: stage.order } } }),
      prisma.competitionStageDecision.count({ where: { stageId: stage.id, decision: 'NOT_SELECTED', participant: { status: 'ACTIVE', currentStageOrder: stage.order } } }),
    ]);
    return { stageId: stage.id, inStage, advance, notSelected, undecided: inStage - advance - notSelected, advanceLimit: stage.advanceLimit };
  }

  async getDecisionSummary(userId: string, id: string, stageId: string) {
    const c = await this.owned(userId, id);
    return this.decisionSummary(c, this.stageOf(c, stageId));
  }

  async publishDecisions(userId: string, id: string, stageId: string, expectedAdvanceCount: number) {
    const m = M();
    const c = await this.owned(userId, id);
    this.assertNotSuspended(c);
    const stage = this.stageOf(c, stageId);
    const isFinal = stage.order === c.stages.length;
    if (isFinal) throw fail(m.finalStageUsesAwards, HttpStatus.BAD_REQUEST);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const comp = await this.lockCompetition(tx, id);
      if (comp.status !== 'ACTIVE') throw fail(m.competitionNotActive, HttpStatus.CONFLICT);
      await tx.$queryRaw`SELECT id FROM "competition_stages" WHERE id = ${stageId} FOR UPDATE`;
      const fresh = await tx.competitionStage.findUnique({ where: { id: stageId } });
      if (!fresh) throw fail(m.stageNotFound, HttpStatus.NOT_FOUND);
      if (fresh.status === 'RESULTS_PUBLISHED') throw fail(m.stageAlreadyPublished, HttpStatus.CONFLICT);
      if (!['UNDER_REVIEW', 'SELECTION_PENDING'].includes(fresh.status)) throw fail(m.closeSubmissionsFirst, HttpStatus.CONFLICT);

      const inStage = await tx.competitionParticipant.findMany({
        where: { competitionId: id, status: 'ACTIVE', currentStageOrder: stage.order },
        select: { id: true, creator: { select: { userId: true } }, decisions: { where: { stageId }, select: { decision: true } } },
      });
      const advance = inStage.filter((p) => p.decisions[0]?.decision === 'ADVANCE');
      const rest = inStage.filter((p) => p.decisions[0]?.decision !== 'ADVANCE');
      if (advance.length !== expectedAdvanceCount) throw fail(m.selectionChanged, HttpStatus.CONFLICT, 'SELECTION_CHANGED');
      const problem = rules.validateAdvanceSelection(advance.length, fresh.advanceLimit);
      if (problem) throw fail(problem, HttpStatus.BAD_REQUEST);

      const advanceIds = advance.map((p) => p.id);
      const restIds = rest.map((p) => p.id);
      await tx.competitionStageDecision.updateMany({ where: { stageId, participantId: { in: advanceIds } }, data: { isPublished: true, publishedAt: now, decidedById: userId } });
      // Everyone not advanced gets an explicit published NOT_SELECTED row.
      await tx.competitionStageDecision.updateMany({ where: { stageId, participantId: { in: restIds } }, data: { decision: 'NOT_SELECTED', isPublished: true, publishedAt: now, decidedById: userId } });
      await tx.competitionStageDecision.createMany({
        data: restIds.map((participantId) => ({ stageId, participantId, decision: 'NOT_SELECTED' as const, isPublished: true, publishedAt: now, decidedById: userId })),
        skipDuplicates: true,
      });
      await tx.competitionParticipant.updateMany({ where: { id: { in: advanceIds } }, data: { currentStageOrder: stage.order + 1 } });
      await tx.competitionParticipant.updateMany({ where: { id: { in: restIds } }, data: { status: 'NOT_SELECTED', eliminatedAtOrder: stage.order } });
      await tx.competitionStage.update({ where: { id: stageId }, data: { status: 'RESULTS_PUBLISHED', resultsPublishedAt: now } });
      if (comp.submissionMode === 'SINGLE') await this.startReviewRound(tx, id, stage.order + 1, stageId, advanceIds, now);
      await audit(tx, {
        actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_DECISIONS_PUBLISHED, competitionId: id,
        metadata: { stageId, stage: stage.name, advanced: advanceIds.length, notSelected: restIds.length, advancedParticipantIds: advanceIds },
      });
      return { advancedUsers: advance.map((p) => p.creator.userId), restUsers: rest.map((p) => p.creator.userId) };
    });

    const nextIsFinal = stage.order + 1 === c.stages.length;
    void N.stageResults(result.advancedUsers, result.restUsers, c, stage, nextIsFinal, c.submissionMode === 'SINGLE').catch((err) => logger.warn({ err }, 'competition: stage results notify failed'));
    await this.runLifecycleSweep(new Date(), id);
    return this.getForOrganizer(userId, id);
  }

  /**
   * SINGLE mode: the next round has no submission window. It goes straight to
   * review, and each advancing creator's entry is carried into it so the
   * review / scoring / awards flow works exactly as for a per-stage round.
   * Copies never take the storage reference — only the original row owns the file.
   */
  private async startReviewRound(tx: Tx, competitionId: string, order: number, fromStageId: string, participantIds: string[], now: Date) {
    const next = await tx.competitionStage.findUnique({ where: { competitionId_order: { competitionId, order } } });
    if (!next || next.status !== 'UPCOMING') return;
    const entries = await tx.competitionSubmission.findMany({ where: { stageId: fromStageId, participantId: { in: participantIds } } });
    if (entries.length) {
      await tx.competitionSubmission.createMany({
        data: entries.map((e) => ({
          stageId: next.id, participantId: e.participantId, method: e.method, videoUrl: e.videoUrl, thumbnailUrl: e.thumbnailUrl,
          storageRef: null, storageProvider: null, durationSec: e.durationSec, sizeBytes: e.sizeBytes, externalUrl: e.externalUrl,
          caption: e.caption, version: e.version, submittedAt: e.submittedAt,
        })),
        skipDuplicates: true,
      });
    }
    await tx.competitionStage.update({ where: { id: next.id }, data: { status: 'UNDER_REVIEW', openedAt: now, submissionsClosedAt: now } });
    const isFinal = !(await tx.competitionStage.count({ where: { competitionId, order: { gt: order } } }));
    if (isFinal) await tx.competition.updateMany({ where: { id: competitionId, status: 'ACTIVE' }, data: { status: 'AWAITING_RESULTS' } });
  }

  // ── Organizer: final awards ───────────────────────────────────────────────

  private async finalists(competitionId: string, tx: Tx | typeof prisma = prisma) {
    const rows = await tx.competitionParticipant.findMany({ where: { competitionId, status: 'ACTIVE' }, select: { id: true } });
    return new Set(rows.map((r) => r.id));
  }

  async saveAwards(userId: string, id: string, input: SaveAwardsInput) {
    const c = await this.owned(userId, id);
    this.assertNotSuspended(c);
    if (!['ACTIVE', 'AWAITING_RESULTS'].includes(c.status)) throw fail(M().resultsNotEditable, HttpStatus.CONFLICT);
    const errors = rules.validateAwards(
      c.prizes.map((p) => ({ ...p, kind: p.kind as rules.PrizeKind })),
      input.awards, await this.finalists(id), c.onePrizePerCreator,
    );
    throwProblems(errors);
    await prisma.$transaction(async (tx) => {
      await this.lockCompetition(tx, id);
      await tx.competitionAward.deleteMany({ where: { competitionId: id, isPublished: false } });
      await tx.competitionAward.createMany({ data: input.awards.map((a) => ({ competitionId: id, prizeId: a.prizeId, participantId: a.participantId })) });
    });
    return this.listAwards(id, true);
  }

  async publishResults(userId: string, id: string, expectedAwardCount: number) {
    const m = M();
    const c = await this.owned(userId, id);
    this.assertNotSuspended(c);
    const now = new Date();

    const recipients = await prisma.$transaction(async (tx) => {
      const comp = await this.lockCompetition(tx, id);
      if (comp.status !== 'AWAITING_RESULTS') throw fail(m.notAwaitingResults, HttpStatus.CONFLICT);
      const drafts = await tx.competitionAward.findMany({ where: { competitionId: id, isPublished: false } });
      if (drafts.length !== expectedAwardCount) throw fail(m.selectionChanged, HttpStatus.CONFLICT, 'SELECTION_CHANGED');
      if (comp.prizes.length > 0 && drafts.length === 0) throw fail(m.assignAtLeastOnePrize, HttpStatus.BAD_REQUEST);
      throwProblems(rules.validateAwards(comp.prizes.map((p) => ({ ...p, kind: p.kind as rules.PrizeKind })), drafts, await this.finalists(id, tx), comp.onePrizePerCreator));

      await tx.competitionAward.updateMany({ where: { competitionId: id, isPublished: false }, data: { isPublished: true, publishedAt: now } });
      await tx.competitionStage.updateMany({ where: { competitionId: id, status: { in: ['UNDER_REVIEW', 'SELECTION_PENDING'] } }, data: { status: 'RESULTS_PUBLISHED', resultsPublishedAt: now } });
      await tx.competition.update({ where: { id }, data: { status: 'COMPLETED', completedAt: now, resultsPublishedAt: now } });
      await audit(tx, {
        actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_RESULTS_PUBLISHED, competitionId: id,
        newValue: { awards: drafts.map((d) => ({ prizeId: d.prizeId, participantId: d.participantId })) },
      });
      // Final results → one tracked payout per cash award (KOLAB or DIRECT).
      const payouts = await Pay.createPayoutsForResults(tx, id, userId);
      return { users: await this.participantUserIds(id), payouts };
    });

    void N.resultsPublished(recipients.users, c, now).catch((err) => logger.warn({ err }, 'competition: results notify failed'));
    const { method, created } = recipients.payouts;
    if (method && created.length) {
      void Promise.all(created.map((x) => N.prizeWon(x.userId, c, x.payoutId, x.prizeTitle, x.amountNpr, method))).catch(() => {});
      if (method === 'DIRECT') {
        void N.prizesOutstanding(c.business.userId, c, created.length, created.reduce((sum, x) => sum + x.amountNpr, 0)).catch(() => {});
      }
    }
    return this.getForOrganizer(userId, id);
  }

  /** COMPLETED → AWAITING_RESULTS. Explicit, reasoned, audited, and participants are told. */
  async reopenResults(userId: string, id: string, reason: string) {
    const c = await this.owned(userId, id);
    this.assertNotSuspended(c);
    if (c.status !== 'COMPLETED') throw fail(M().invalidTransition, HttpStatus.CONFLICT);
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      const comp = await this.lockCompetition(tx, id);
      if (comp.status !== 'COMPLETED') throw fail(M().changedMeanwhile, HttpStatus.CONFLICT);
      await Pay.cancelPayoutsForReopen(tx, id, userId, reason);
      const published = await tx.competitionAward.findMany({ where: { competitionId: id, isPublished: true }, select: { prizeId: true, participantId: true } });
      await tx.competitionAward.updateMany({ where: { competitionId: id }, data: { isPublished: false, publishedAt: null } });
      await tx.competition.update({ where: { id }, data: { status: 'AWAITING_RESULTS', completedAt: null, resultsPublishedAt: null } });
      await audit(tx, { actorId: userId, actorType: 'USER', action: AuditAction.COMPETITION_RESULTS_REOPENED, competitionId: id, oldValue: { status: 'COMPLETED', awards: published }, newValue: { status: 'AWAITING_RESULTS' }, metadata: { reason } });
    });
    const users = await this.participantUserIds(id);
    void N.resultsReopened(users, c, now).catch(() => {});
    return this.getForOrganizer(userId, id);
  }

  private async listAwards(competitionId: string, includeDrafts: boolean) {
    const awards = await prisma.competitionAward.findMany({
      where: { competitionId, ...(includeDrafts ? {} : { isPublished: true }) },
      include: {
        prize: { select: { id: true, position: true, kind: true, title: true, amount: true, currency: true } },
        participant: { select: { id: true, creator: { select: CREATOR_DISPLAY } } },
      },
    });
    return awards
      .sort((a, b) => a.prize.position - b.prize.position)
      .map((a) => ({
        prizeId: a.prizeId,
        participantId: a.participantId,
        isPublished: a.isPublished,
        publishedAt: a.publishedAt,
        prize: a.prize,
        creator: a.participant.creator,
      }));
  }

  // ── Organizer: reads ──────────────────────────────────────────────────────

  async listForOrganizer(userId: string) {
    const b = await this.organizerProfile(userId);
    const rows = await prisma.competition.findMany({
      where: { businessId: b.id },
      orderBy: { createdAt: 'desc' },
      include: { stages: { ...STAGE_ORDER, select: { id: true, order: true, name: true, status: true, opensAt: true, deadline: true } }, _count: { select: { participants: true } } },
    });
    return rows.map((c) => {
      const cur = currentStage(c.stages);
      return {
        id: c.id, slug: c.slug, title: c.title, coverImageUrl: c.coverImageUrl, status: c.status,
        suspended: !!c.suspendedAt, registrationDeadline: c.registrationDeadline, publishAt: c.publishAt,
        participantCount: c._count.participants, stageCount: c.stages.length,
        currentStage: cur ? { id: cur.id, name: cur.name, status: cur.status, deadline: cur.deadline } : null,
        createdAt: c.createdAt,
      };
    });
  }

  async getForOrganizer(userId: string, id: string) {
    const c = await this.owned(userId, id);
    const [byOrder, subsByStage, decisionsByStage, awaiting, recent, awards] = await Promise.all([
      prisma.competitionParticipant.groupBy({ by: ['currentStageOrder', 'status'], where: { competitionId: id }, _count: { _all: true } }),
      prisma.competitionSubmission.groupBy({ by: ['stageId'], where: { stage: { competitionId: id } }, _count: { _all: true } }),
      prisma.competitionStageDecision.groupBy({ by: ['stageId', 'decision', 'isPublished'], where: { stage: { competitionId: id } }, _count: { _all: true } }),
      this.awaitingReviewCount(c),
      prisma.auditLog.findMany({ where: { entityType: EntityType.COMPETITION, entityId: id }, orderBy: { createdAt: 'desc' }, take: 8, select: { action: true, createdAt: true, actorType: true, metadata: true } }),
      this.listAwards(id, true),
    ]);
    const reviewHistory = await this.reviewHistory(id);

    const total = byOrder.reduce((s, r) => s + r._count._all, 0);
    const reached = (order: number) => byOrder.filter((r) => r.currentStageOrder >= order && r.status !== 'WITHDRAWN').reduce((s, r) => s + r._count._all, 0);
    const dec = (stageId: string, decision: string, published: boolean) =>
      decisionsByStage.filter((d) => d.stageId === stageId && d.decision === decision && d.isPublished === published).reduce((s, d) => s + d._count._all, 0);

    const now = new Date();
    return {
      ...this.organizerDto(c),
      stats: {
        participants: total,
        active: byOrder.filter((r) => r.status === 'ACTIVE').reduce((s, r) => s + r._count._all, 0),
        awaitingReview: awaiting,
        stages: c.stages.map((s) => ({
          stageId: s.id,
          eligible: reached(s.order),
          submissions: subsByStage.find((x) => x.stageId === s.id)?._count._all ?? 0,
          advanced: dec(s.id, 'ADVANCE', true),
          notSelected: dec(s.id, 'NOT_SELECTED', true),
          draftAdvance: dec(s.id, 'ADVANCE', false),
          draftNotSelected: dec(s.id, 'NOT_SELECTED', false),
        })),
        upcomingDeadlines: [
          ...(c.registrationDeadline > now ? [{ label: 'Registration closes', at: c.registrationDeadline }] : []),
          ...c.stages.filter((s) => ['UPCOMING', 'OPEN'].includes(s.status) && s.deadline > now).map((s) => ({ label: `${s.name} deadline`, at: s.deadline })),
        ].sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, 4),
      },
      awards,
      reviewHistory,
      recentActivity: recent,
      allowedActions: this.allowedActions(c, now),
    };
  }

  private async awaitingReviewCount(c: { id: string; stages: CompetitionStage[] }) {
    const stage = currentStage(c.stages);
    if (!stage) return 0;
    // Submitted to the current stage, still in, and no decision drafted yet.
    return prisma.competitionParticipant.count({
      where: {
        competitionId: c.id, status: 'ACTIVE', currentStageOrder: stage.order,
        submissions: { some: { stageId: stage.id } },
        decisions: { none: { stageId: stage.id, decision: { not: null } } },
      },
    });
  }

  private allowedActions(c: { status: string; suspendedAt: Date | null; publishedAt: Date | null; registrationDeadline: Date; resubmissionAllowed: boolean; pendingChanges: Prisma.JsonValue; prizePaymentMethod: string | null; fundingStatus: string }, now: Date) {
    if (c.suspendedAt) return { suspended: true } as Record<string, boolean>;
    const s = c.status;
    const live = ['SCHEDULED', 'ACTIVE', 'PAUSED', 'AWAITING_RESULTS'].includes(s);
    return {
      edit: !['COMPLETED', 'CANCELLED'].includes(s),
      editStructure: rules.PRE_LAUNCH_EDITABLE.includes(s) || s === 'SCHEDULED',
      submitForReview: s === 'DRAFT' || s === 'CHANGES_REQUESTED' || (s === 'REJECTED' && c.resubmissionAllowed),
      withdraw: s === 'PENDING_REVIEW' || s === 'SCHEDULED',
      discardPendingChanges: !!c.pendingChanges,
      deleteDraft: ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED'].includes(s),
      pause: s === 'ACTIVE' || s === 'SCHEDULED',
      resume: s === 'PAUSED',
      cancel: live,
      closeCompetition: s === 'ACTIVE' || s === 'PAUSED',
      closeRegistration: ['SCHEDULED', 'ACTIVE', 'PAUSED'].includes(s) && c.registrationDeadline > now,
      extendRegistration: ['SCHEDULED', 'ACTIVE', 'PAUSED'].includes(s),
      publishResults: s === 'AWAITING_RESULTS',
      reopenResults: s === 'COMPLETED',
      fundPrizePool: c.prizePaymentMethod === 'KOLAB' && (s === 'SCHEDULED' || (s === 'PAUSED' && !c.publishedAt)) && ['UNFUNDED', 'FAILED', 'PENDING', 'PARTIALLY_FUNDED'].includes(c.fundingStatus),
      // Payment method / pool can only change before launch and before money moves.
      editPayment: (rules.PRE_LAUNCH_EDITABLE.includes(s) || s === 'SCHEDULED') && !PR.FUNDING_LOCKED.includes(c.fundingStatus as PR.FundingStatus),
    };
  }

  private organizerDto(c: Awaited<ReturnType<CompetitionService['owned']>>) {
    return {
      id: c.id, slug: c.slug, title: c.title, description: c.description, objectives: c.objectives,
      coverImageUrl: c.coverImageUrl, rules: c.rules, eligibility: c.eligibility, contentFormats: c.contentFormats, skills: c.skills, submissionMode: c.submissionMode,
      submissionInstructions: c.submissionInstructions, videoMinSec: c.videoMinSec, videoMaxSec: c.videoMaxSec,
      contactInstructions: c.contactInstructions, attachments: c.attachments, status: c.status, resultsVisibility: c.resultsVisibility,
      publishAt: c.publishAt, registrationOpensAt: c.registrationOpensAt, registrationDeadline: c.registrationDeadline,
      startsAt: c.startsAt, endsAt: c.endsAt, allowSubmissionEdits: c.allowSubmissionEdits, onePrizePerCreator: c.onePrizePerCreator,
      scoringEnabled: c.scoringEnabled, judgingCriteria: criteriaOf(c.judgingCriteria),
      publishedAt: c.publishedAt, pausedAt: c.pausedAt, pauseReason: c.pauseReason, completedAt: c.completedAt,
      resultsPublishedAt: c.resultsPublishedAt, cancelledAt: c.cancelledAt, cancelReason: c.cancelReason,
      suspended: !!c.suspendedAt, suspensionReason: c.suspendedAt ? c.suspensionReason : null,
      review: {
        feedback: c.reviewFeedback, reviewedAt: c.reviewedAt, submittedAt: c.submittedForReviewAt,
        resubmissionAllowed: c.resubmissionAllowed, revision: c.reviewRevision,
        pendingChanges: c.pendingChanges as Record<string, unknown> | null,
        pendingChangesSubmittedAt: c.pendingChangesSubmittedAt,
        pendingChangesFeedback: c.pendingChangesFeedback,
      },
      createdAt: c.createdAt, updatedAt: c.updatedAt,
      stages: c.stages.map((s) => ({
        id: s.id, order: s.order, name: s.name, description: s.description, brief: s.brief, requirements: s.requirements,
        opensAt: s.opensAt, deadline: s.deadline, status: s.status, advanceLimit: s.advanceLimit, allowedMethods: s.allowedMethods,
        videoMinSec: s.videoMinSec, videoMaxSec: s.videoMaxSec, openedAt: s.openedAt, submissionsClosedAt: s.submissionsClosedAt,
        resultsPublishedAt: s.resultsPublishedAt,
      })),
      prizes: c.prizes.map((p) => ({ id: p.id, position: p.position, kind: p.kind, title: p.title, description: p.description, amount: p.amount, currency: p.currency, recipientCount: p.recipientCount, notes: p.notes })),
      prizePool: prizePool(c.prizes),
      payment: { ...paymentConfigView(c), kolabPaymentsEnabled: kolabPaymentsEnabled() },
    };
  }

  async listParticipants(userId: string, id: string, q: ParticipantsQuery) {
    const c = await this.owned(userId, id);
    const stage = q.stageId ? this.stageOf(c, q.stageId) : currentStage(c.stages)!;
    const lastOrder = c.stages.length;

    const where: Prisma.CompetitionParticipantWhereInput = {
      competitionId: id,
      status: { not: 'WITHDRAWN' },
      currentStageOrder: { gte: stage.order },
    };
    const and: Prisma.CompetitionParticipantWhereInput[] = [];
    switch (q.filter) {
      case 'SUBMITTED': and.push({ submissions: { some: { stageId: stage.id } } }); break;
      case 'NOT_SUBMITTED': and.push({ submissions: { none: { stageId: stage.id } } }); break;
      case 'UNDER_REVIEW':
        and.push({ status: 'ACTIVE', currentStageOrder: stage.order, submissions: { some: { stageId: stage.id } }, decisions: { none: { stageId: stage.id, isPublished: true } } });
        break;
      case 'ADVANCED': and.push({ currentStageOrder: { gt: stage.order } }); break;
      case 'NOT_SELECTED': and.push({ status: 'NOT_SELECTED', eliminatedAtOrder: stage.order }); break;
      case 'FINALISTS': and.push({ status: 'ACTIVE', currentStageOrder: lastOrder }); break;
    }
    if (q.q) {
      and.push({ creator: { OR: [{ fullName: { contains: q.q, mode: 'insensitive' } }, { username: { contains: q.q, mode: 'insensitive' } }] } });
    }
    if (and.length) where.AND = and;

    const [total, rows] = await Promise.all([
      prisma.competitionParticipant.count({ where }),
      prisma.competitionParticipant.findMany({
        where,
        orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: {
          creator: { select: { ...CREATOR_DISPLAY, location: true, categories: true } },
          submissions: { where: { stageId: stage.id }, take: 1 },
          decisions: { where: { stageId: stage.id }, take: 1 },
          awards: { select: { prizeId: true, isPublished: true } },
        },
      }),
    ]);

    return {
      stage: { id: stage.id, name: stage.name, order: stage.order, status: stage.status, advanceLimit: stage.advanceLimit, isFinal: stage.order === lastOrder },
      items: rows.map((p) => {
        const sub = p.submissions[0];
        const d = p.decisions[0];
        return {
          participantId: p.id,
          joinedAt: p.joinedAt,
          status: p.status,
          currentStageOrder: p.currentStageOrder,
          eliminatedAtOrder: p.eliminatedAtOrder,
          creator: p.creator,
          submission: sub ? this.submissionDto(sub) : null,
          decision: d ? { decision: d.decision, isPublished: d.isPublished, notes: d.notes, scores: d.scores, totalScore: d.totalScore, updatedAt: d.updatedAt } : null,
          awards: p.awards,
        };
      }),
      pagination: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) },
    };
  }

  private submissionDto(s: { id: string; method: string; videoUrl: string | null; thumbnailUrl: string | null; externalUrl: string | null; durationSec: number | null; sizeBytes: number | null; caption: string | null; version: number; submittedAt: Date; updatedAt: Date }) {
    return {
      id: s.id, method: s.method, videoUrl: s.videoUrl, thumbnailUrl: s.thumbnailUrl, externalUrl: s.externalUrl,
      durationSec: s.durationSec, sizeBytes: s.sizeBytes, caption: s.caption, version: s.version, submittedAt: s.submittedAt, updatedAt: s.updatedAt,
    };
  }

  async getSubmission(userId: string, id: string, stageId: string, participantId: string) {
    const c = await this.owned(userId, id);
    this.stageOf(c, stageId);
    const p = await prisma.competitionParticipant.findFirst({
      where: { id: participantId, competitionId: id },
      include: {
        creator: { select: { ...CREATOR_DISPLAY, location: true, bio: true, categories: true } },
        submissions: { where: { stageId }, include: { versions: { orderBy: { version: 'desc' } } } },
        decisions: { where: { stageId } },
      },
    });
    if (!p) throw fail(M().participantNotFound, HttpStatus.NOT_FOUND);
    const s = p.submissions[0];
    const d = p.decisions[0];
    return {
      participantId: p.id, status: p.status, currentStageOrder: p.currentStageOrder, joinedAt: p.joinedAt, creator: p.creator,
      submission: s ? { ...this.submissionDto(s), history: s.versions.map((v) => ({ version: v.version, method: v.method, videoUrl: v.videoUrl, thumbnailUrl: v.thumbnailUrl, externalUrl: v.externalUrl, durationSec: v.durationSec, caption: v.caption, submittedAt: v.submittedAt, replacedAt: v.replacedAt })) } : null,
      decision: d ? { decision: d.decision, isPublished: d.isPublished, notes: d.notes, scores: d.scores, totalScore: d.totalScore } : null,
    };
  }

  async activity(userId: string, id: string, page = 1) {
    await this.owned(userId, id);
    const take = 50;
    const [total, rows] = await Promise.all([
      prisma.auditLog.count({ where: { entityType: EntityType.COMPETITION, entityId: id } }),
      prisma.auditLog.findMany({
        where: { entityType: EntityType.COMPETITION, entityId: id, NOT: { action: AuditAction.COMPETITION_SENSITIVE_ACCESS } },
        orderBy: { createdAt: 'desc' }, skip: (page - 1) * take, take,
        select: { id: true, action: true, actorType: true, createdAt: true, oldValue: true, newValue: true, metadata: true },
      }),
    ]);
    return { items: rows, pagination: { total, page, limit: take, totalPages: Math.ceil(total / take) } };
  }

  // ── Creator / public ──────────────────────────────────────────────────────

  async discover(q: DiscoverQuery, viewer?: { id: string; role: string }) {
    const statuses = q.tab === 'open' ? [...LIVE] : q.tab === 'results' ? ['COMPLETED'] : [...LIVE, 'COMPLETED'];
    const where: Prisma.CompetitionWhereInput = {
      status: { in: statuses as never },
      suspendedAt: null,
      business: { isActive: true },
      ...(q.q ? { title: { contains: q.q, mode: 'insensitive' } } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.competition.count({ where }),
      prisma.competition.findMany({
        where,
        orderBy: q.tab === 'results' ? [{ completedAt: 'desc' }] : [{ registrationDeadline: 'asc' }, { id: 'asc' }],
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: {
          business: { select: ORGANIZER_DISPLAY },
          stages: { ...STAGE_ORDER, select: { id: true, order: true, name: true, status: true, opensAt: true, deadline: true } },
          prizes: { ...PRIZE_ORDER, select: { kind: true, title: true, amount: true, currency: true, recipientCount: true } },
          _count: { select: { participants: true } },
        },
      }),
    ]);

    const mine = new Map<string, { status: string; currentStageOrder: number }>();
    if (viewer?.role === 'CREATOR' && rows.length) {
      const creator = await prisma.creatorProfile.findUnique({ where: { userId: viewer.id }, select: { id: true } });
      if (creator) {
        const ps = await prisma.competitionParticipant.findMany({ where: { creatorId: creator.id, competitionId: { in: rows.map((r) => r.id) } }, select: { competitionId: true, status: true, currentStageOrder: true } });
        ps.forEach((p) => mine.set(p.competitionId, p));
      }
    }

    const now = new Date();
    return {
      items: rows.map((c) => {
        const cur = currentStage(c.stages);
        return {
          id: c.id, slug: c.slug, title: c.title, coverImageUrl: c.coverImageUrl, status: c.status,
          organizer: { name: c.business.businessName, slug: c.business.slug, logoUrl: c.business.logoUrl, isVerified: c.business.isVerified },
          registrationOpen: rules.registrationOpen(c, now),
          registrationOpensAt: c.registrationOpensAt,
          registrationDeadline: c.registrationDeadline,
          currentStage: cur ? { name: cur.name, status: cur.status, deadline: cur.deadline } : null,
          stageCount: c.stages.length,
          prizeHighlights: c.prizes.slice(0, 3),
          prizePool: prizePool(c.prizes),
          prizePaymentMethod: c.prizePaymentMethod,
          prizePoolFunded: c.prizePaymentMethod === 'KOLAB' && c.fundingStatus === 'FUNDED',
          participantCount: c._count.participants,
          joined: mine.has(c.id),
        };
      }),
      pagination: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) },
    };
  }

  private async findByIdOrSlug(idOrSlug: string) {
    return prisma.competition.findFirst({
      where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: { stages: STAGE_ORDER, prizes: PRIZE_ORDER, business: { select: ORGANIZER_DISPLAY }, _count: { select: { participants: true } } },
    });
  }

  async getPublic(idOrSlug: string, viewer?: { id: string; role: string }) {
    const c = await this.findByIdOrSlug(idOrSlug);
    const isOwner = !!viewer && c?.business.userId === viewer.id;
    if (!c || (!isOwner && (rules.UNPUBLISHED_STATUSES.includes(c.status) || c.suspendedAt || !c.business.isActive))) {
      throw fail(M().notFound, HttpStatus.NOT_FOUND);
    }

    let participant: Awaited<ReturnType<typeof prisma.competitionParticipant.findFirst>> = null;
    if (viewer?.role === 'CREATOR') {
      const creator = await prisma.creatorProfile.findUnique({ where: { userId: viewer.id }, select: { id: true } });
      if (creator) participant = await prisma.competitionParticipant.findUnique({ where: { competitionId_creatorId: { competitionId: c.id, creatorId: creator.id } } });
    }

    const now = new Date();
    const regOpen = rules.registrationOpen(c, now);
    const showResults = c.status === 'COMPLETED' && (c.resultsVisibility === 'PUBLIC' || isOwner || !!participant);

    return {
      id: c.id, slug: c.slug, title: c.title, description: c.description, objectives: c.objectives, coverImageUrl: c.coverImageUrl,
      rules: c.rules, eligibility: c.eligibility, contentFormats: c.contentFormats, skills: c.skills, submissionMode: c.submissionMode, submissionInstructions: c.submissionInstructions,
      videoMinSec: c.videoMinSec, videoMaxSec: c.videoMaxSec, contactInstructions: c.contactInstructions, attachments: c.attachments,
      status: c.status, pauseReason: c.status === 'PAUSED' ? c.pauseReason : null, cancelReason: c.status === 'CANCELLED' ? c.cancelReason : null,
      registrationOpensAt: c.registrationOpensAt, registrationDeadline: c.registrationDeadline, startsAt: c.startsAt, endsAt: c.endsAt,
      registrationOpen: regOpen,
      registrationClosedReason: regOpen ? null : this.registrationClosedReason(c, now),
      allowSubmissionEdits: c.allowSubmissionEdits, onePrizePerCreator: c.onePrizePerCreator,
      // The rubric is part of the published rules creators are judged by; scores themselves are never public.
      judgingCriteria: c.scoringEnabled ? criteriaOf(c.judgingCriteria).map((x) => ({ label: x.label, weight: x.weight })) : [],
      organizer: { name: c.business.businessName, slug: c.business.slug, logoUrl: c.business.logoUrl, isVerified: c.business.isVerified },
      participantCount: c._count.participants,
      stages: c.stages.map((s) => ({
        id: s.id, order: s.order, name: s.name, description: s.description, brief: s.brief, requirements: s.requirements,
        opensAt: s.opensAt, deadline: s.deadline, status: s.status, advanceLimit: s.advanceLimit, allowedMethods: s.allowedMethods,
        videoMinSec: s.videoMinSec, videoMaxSec: s.videoMaxSec,
      })),
      currentStageId: currentStage(c.stages)?.id ?? null,
      prizes: c.prizes.map((p) => ({ id: p.id, kind: p.kind, title: p.title, description: p.description, amount: p.amount, currency: p.currency, recipientCount: p.recipientCount, notes: p.notes })),
      prizePool: prizePool(c.prizes),
      // Who pays the prizes. DIRECT = the organizer, not funded or guaranteed by Kolab.
      prizePayment: {
        method: c.prizePaymentMethod,
        funded: c.prizePaymentMethod === 'KOLAB' && c.fundingStatus === 'FUNDED',
        tieRule: c.prizeTieRule,
      },
      results: showResults ? await this.publicResults(c.id) : null,
      viewer: {
        role: isOwner ? 'OWNER' : participant ? 'PARTICIPANT' : 'VISITOR',
        joined: !!participant,
        canJoin: viewer?.role === 'CREATOR' && !participant && regOpen,
      },
    };
  }

  private registrationClosedReason(c: { status: string; suspendedAt: Date | null; registrationOpensAt: Date; registrationDeadline: Date }, now: Date): string {
    const m = M();
    if (c.status === 'PAUSED') return m.competitionPaused;
    if (c.status === 'CANCELLED') return m.competitionCancelledReason;
    if (['AWAITING_RESULTS', 'COMPLETED'].includes(c.status)) return m.competitionEnded;
    if (now < c.registrationOpensAt) return m.registrationNotYetOpen;
    return m.registrationClosed;
  }

  private async publicResults(competitionId: string) {
    const awards = await this.listAwards(competitionId, false);
    return awards.map((a) => ({ prize: a.prize, creator: { fullName: a.creator.fullName, username: a.creator.username, avatarUrl: a.creator.avatarUrl, isVerified: a.creator.isVerified } }));
  }

  async join(userId: string, id: string) {
    const m = M();
    const creator = await this.creatorProfile(userId);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true, suspendedAt: true } });
    if (!user?.isActive || user.suspendedAt) throw fail(m.accountInactive, HttpStatus.FORBIDDEN);

    const c = await prisma.competition.findUnique({ where: { id }, include: { business: { select: ORGANIZER_DISPLAY } } });
    if (!c || rules.UNPUBLISHED_STATUSES.includes(c.status) || !c.business.isActive) throw fail(m.notFound, HttpStatus.NOT_FOUND);
    const now = new Date();
    if (!rules.registrationOpen(c, now)) {
      throw fail(c.suspendedAt ? m.competitionSuspended : this.registrationClosedReason(c, now), HttpStatus.CONFLICT, 'REGISTRATION_CLOSED');
    }

    try {
      await prisma.competitionParticipant.create({ data: { competitionId: id, creatorId: creator.id } });
    } catch (err) {
      if (isUniqueViolation(err)) throw fail(m.alreadyJoined, HttpStatus.CONFLICT, 'ALREADY_JOINED');
      throw err;
    }

    void N.joined(userId, c).catch(() => {});
    void N.newParticipant(c.business.userId, c, now).catch(() => {});
    return this.myProgress(userId, id);
  }

  async listJoined(userId: string) {
    const creator = await this.creatorProfile(userId);
    const rows = await prisma.competitionParticipant.findMany({
      where: { creatorId: creator.id, competition: { status: { notIn: rules.UNPUBLISHED_STATUSES as never } } },
      orderBy: { joinedAt: 'desc' },
      include: {
        competition: { include: { stages: STAGE_ORDER, business: { select: ORGANIZER_DISPLAY } } },
        submissions: { select: { stageId: true, submittedAt: true, version: true } },
        decisions: { where: { isPublished: true }, select: { stageId: true, decision: true, publishedAt: true } },
        awards: { where: { isPublished: true }, include: { prize: { select: { title: true, kind: true, amount: true, currency: true } } } },
      },
    });

    return rows.map((p) => {
      const c = p.competition;
      const stage = c.stages.find((s) => s.order === p.currentStageOrder) ?? c.stages[c.stages.length - 1];
      const submitted = !!stage && p.submissions.some((s) => s.stageId === stage.id);
      const status = rules.creatorStatus({
        competitionStatus: c.status, participantStatus: p.status, currentStageOrder: p.currentStageOrder,
        stageCount: c.stages.length, currentStageStatus: stage?.status, submittedToCurrentStage: submitted,
      });
      const latest = [...p.decisions].sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))[0];
      return {
        competition: {
          id: c.id, slug: c.slug, title: c.title, coverImageUrl: c.coverImageUrl, status: c.status,
          organizer: { name: c.business.businessName, logoUrl: c.business.logoUrl },
          registrationDeadline: c.registrationDeadline, stageCount: c.stages.length,
        },
        participantId: p.id, joinedAt: p.joinedAt, status,
        currentStage: stage ? { id: stage.id, name: stage.name, order: stage.order, status: stage.status, opensAt: stage.opensAt, deadline: stage.deadline } : null,
        submittedToCurrentStage: submitted,
        latestResult: latest ? { stageName: c.stages.find((s) => s.id === latest.stageId)?.name ?? '', decision: latest.decision, publishedAt: latest.publishedAt } : null,
        awards: p.awards.map((a) => a.prize),
      };
    });
  }

  /** Everything a participant may see about their own run — never drafts, notes or scores. */
  async myProgress(userId: string, id: string) {
    const creator = await this.creatorProfile(userId);
    const p = await prisma.competitionParticipant.findUnique({
      where: { competitionId_creatorId: { competitionId: id, creatorId: creator.id } },
      include: {
        competition: { include: { stages: STAGE_ORDER } },
        submissions: { include: { _count: { select: { versions: true } } } },
        decisions: { where: { isPublished: true }, select: { stageId: true, decision: true, publishedAt: true } },
        awards: { where: { isPublished: true }, include: { prize: { select: { id: true, title: true, kind: true, amount: true, currency: true } } } },
      },
    });
    if (!p) throw fail(M().notJoined, HttpStatus.NOT_FOUND, 'NOT_JOINED');
    const c = p.competition;
    const now = new Date();
    const cur = c.stages.find((s) => s.order === p.currentStageOrder) ?? c.stages[c.stages.length - 1];
    const status = rules.creatorStatus({
      competitionStatus: c.status, participantStatus: p.status, currentStageOrder: p.currentStageOrder,
      stageCount: c.stages.length, currentStageStatus: cur?.status, submittedToCurrentStage: !!cur && p.submissions.some((s) => s.stageId === cur.id),
    });

    return {
      participantId: p.id, joinedAt: p.joinedAt, status, participantStatus: p.status,
      currentStageOrder: p.currentStageOrder, eliminatedAtOrder: p.eliminatedAtOrder,
      stages: c.stages.map((s) => {
        const sub = p.submissions.find((x) => x.stageId === s.id);
        const block = submitBlock(c, s, p, !!sub, now);
        const dur = effectiveDuration(c, s);
        return {
          stageId: s.id, order: s.order, name: s.name, status: s.status, opensAt: s.opensAt, deadline: s.deadline,
          allowedMethods: s.allowedMethods, videoMinSec: dur.min, videoMaxSec: dur.max,
          submission: sub ? { ...this.submissionDto(sub), previousVersions: sub._count.versions } : null,
          outcome: p.decisions.find((d) => d.stageId === s.id)?.decision ?? null,
          canSubmit: block === null,
          reviewRound: rules.isReviewRound(c.submissionMode, s.order),
          blockedReason: block && !['notYet'].includes(block) && !rules.isReviewRound(c.submissionMode, s.order) ? submitBlockMessage(block) : null,
        };
      }),
      awards: p.awards.map((a) => a.prize),
      prizePaymentMethod: c.prizePaymentMethod,
      prizePayments: await Pay.creatorPayouts(creator.id, c.id),
    };
  }

  private async submissionContext(userId: string, id: string, stageId: string) {
    const creator = await this.creatorProfile(userId);
    const c = await prisma.competition.findUnique({ where: { id }, include: { stages: STAGE_ORDER, business: { select: { userId: true } } } });
    if (!c || rules.UNPUBLISHED_STATUSES.includes(c.status)) throw fail(M().notFound, HttpStatus.NOT_FOUND);
    const stage = this.stageOf(c, stageId);
    const participant = await prisma.competitionParticipant.findUnique({ where: { competitionId_creatorId: { competitionId: id, creatorId: creator.id } } });
    if (!participant) throw fail(M().notJoined, HttpStatus.FORBIDDEN, 'NOT_JOINED');
    const existing = await prisma.competitionSubmission.findUnique({ where: { stageId_participantId: { stageId, participantId: participant.id } }, select: { id: true } });
    const block = submitBlock(c, stage, participant, !!existing, new Date());
    if (block) throw fail(submitBlockMessage(block), block === 'notEligible' || block === 'notYet' ? HttpStatus.FORBIDDEN : HttpStatus.CONFLICT, 'SUBMISSION_BLOCKED');
    return { c, stage, participant };
  }

  /**
   * Writes the participant's active entry for a stage. Re-validates stage
   * state and deadline inside the transaction (with the participant row
   * locked) so a request racing the deadline sweep or a second tab can't
   * slip in a late or duplicate entry. The old entry is archived first.
   */
  private async writeSubmission(
    ctx: Awaited<ReturnType<CompetitionService['submissionContext']>>,
    data: Omit<Prisma.CompetitionSubmissionUncheckedCreateInput, 'stageId' | 'participantId' | 'version'>,
    userId: string,
  ) {
    const { c, stage, participant } = ctx;
    const out = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "competition_participants" WHERE id = ${participant.id} FOR UPDATE`;
      const [freshStage, freshComp, freshP] = await Promise.all([
        tx.competitionStage.findUnique({ where: { id: stage.id } }),
        tx.competition.findUnique({ where: { id: c.id } }),
        tx.competitionParticipant.findUnique({ where: { id: participant.id } }),
      ]);
      const existing = await tx.competitionSubmission.findUnique({ where: { stageId_participantId: { stageId: stage.id, participantId: participant.id } } });
      const block = submitBlock(freshComp!, freshStage!, freshP, !!existing, new Date());
      if (block) throw fail(submitBlockMessage(block), HttpStatus.CONFLICT, 'SUBMISSION_BLOCKED');

      const cleared = { videoUrl: null, thumbnailUrl: null, storageRef: null, storageProvider: null, durationSec: null, sizeBytes: null, externalUrl: null };
      if (existing) {
        await tx.competitionSubmissionVersion.create({
          data: {
            submissionId: existing.id, version: existing.version, method: existing.method, videoUrl: existing.videoUrl,
            thumbnailUrl: existing.thumbnailUrl, externalUrl: existing.externalUrl, durationSec: existing.durationSec,
            caption: existing.caption, submittedAt: existing.submittedAt,
          },
        });
        return tx.competitionSubmission.update({ where: { id: existing.id }, data: { ...cleared, ...data, version: existing.version + 1, submittedAt: new Date() } });
      }
      return tx.competitionSubmission.create({ data: { ...cleared, ...data, stageId: stage.id, participantId: participant.id } });
    });

    void N.submissionReceived(userId, c, stage, out.version).catch(() => {});
    void N.newSubmission(c.business.userId, c, stage).catch(() => {});
    return this.submissionDto(out);
  }

  async submitLink(userId: string, id: string, stageId: string, input: { url: string; caption?: string | null }) {
    const m = M();
    const ctx = await this.submissionContext(userId, id, stageId);
    if (!ctx.stage.allowedMethods.includes('EXTERNAL_LINK')) throw fail(m.methodNotAllowed, HttpStatus.BAD_REQUEST);
    const link = validateSubmissionLink(input.url);
    if (!link.ok) throw fail(link.message, HttpStatus.BAD_REQUEST, 'INVALID_LINK');
    const access = await checkLinkAccessibility(link.url, link.provider);
    if (access === 'RESTRICTED') throw fail(m.linkNotShared, HttpStatus.BAD_REQUEST, 'LINK_NOT_SHARED');
    return this.writeSubmission(ctx, { method: 'EXTERNAL_LINK', externalUrl: link.url, caption: input.caption ?? null }, userId);
  }

  async requestVideoUpload(userId: string, id: string, stageId: string, sizeBytes: number, mimeType: 'video/mp4' | 'video/quicktime') {
    const m = M();
    const ctx = await this.submissionContext(userId, id, stageId);
    if (!ctx.stage.allowedMethods.includes('VIDEO_UPLOAD')) throw fail(m.methodNotAllowed, HttpStatus.BAD_REQUEST);
    if (sizeBytes > MAX_VIDEO_SIZE_BYTES) throw fail(m.videoTooLarge, HttpStatus.BAD_REQUEST);
    const ext = mimeType === 'video/quicktime' ? 'mov' : 'mp4';
    const publicId = `comp_${stageId}_${ctx.participant.id}_${Date.now()}_${randomUUID()}`;
    const plan = await createVideoUploadPlan(userId, ext, mimeType, sizeBytes, { folder: 'competitions/submissions', publicId });
    const dur = effectiveDuration(ctx.c, ctx.stage);
    return { plan, constraints: { maxBytes: MAX_VIDEO_SIZE_BYTES, minSec: dur.min, maxSec: dur.max } };
  }

  /**
   * Verifies the uploaded object with the storage provider (never trusting the
   * client's word for size/format), enforces duration limits where the
   * duration is known, then records it as the stage entry. Mirrors
   * CampaignService.completeDeliverableVideo.
   */
  async completeVideoUpload(userId: string, id: string, stageId: string, ref: VideoCompleteInput) {
    const m = M();
    const ctx = await this.submissionContext(userId, id, stageId);
    if (!ctx.stage.allowedMethods.includes('VIDEO_UPLOAD')) throw fail(m.methodNotAllowed, HttpStatus.BAD_REQUEST);

    let url: string, thumbnailUrl: string | null = null, durationSec: number, sizeBytes: number, provider: 'R2' | 'CLOUDINARY', storedId: string;
    const discard = async () => { if (provider === 'R2') await deleteR2Object(storedId).catch(() => {}); else await deleteVideo(storedId).catch(() => {}); };

    if (ref.key) {
      if (!ref.key.startsWith(`users/${userId}/videos/`)) throw fail(m.invalidUploadReference, HttpStatus.BAD_REQUEST);
      let result;
      try {
        result = ref.uploadId ? await completeR2Multipart(ref.key, ref.uploadId) : await finalizeR2Object(ref.key);
      } catch (err) {
        logger.error({ err, competitionId: id, stageId }, 'competition video: R2 verification failed');
        if (ref.uploadId) await abortR2Multipart(ref.key, ref.uploadId).catch(() => {});
        throw fail(m.couldNotVerifyVideo, HttpStatus.BAD_REQUEST);
      }
      provider = 'R2';
      storedId = ref.key;
      if (!result.url) { await discard(); throw fail(m.videoStorageNotConfigured, HttpStatus.INTERNAL_SERVER_ERROR); }
      if (result.sizeBytes > MAX_VIDEO_SIZE_BYTES) { await discard(); throw fail(m.videoTooLarge, HttpStatus.BAD_REQUEST); }
      url = result.url;
      sizeBytes = result.sizeBytes;
      durationSec = Math.round(ref.clientDurationSec || 0);
      if (ref.thumbnailKey?.startsWith(`users/${userId}/thumbnails/`)) {
        thumbnailUrl = await finalizeR2Object(ref.thumbnailKey).then((t) => t.url).catch(() => null);
      }
    } else {
      const publicId = ref.publicId!;
      if (!publicId.startsWith('competitions/submissions/comp_') || !publicId.includes(`_${stageId}_${ctx.participant.id}_`)) {
        throw fail(m.invalidUploadReference, HttpStatus.BAD_REQUEST);
      }
      let resource;
      try {
        resource = await cloudinary.api.resource(publicId, { resource_type: 'video' });
      } catch (err) {
        logger.error({ err, competitionId: id, stageId }, 'competition video: Cloudinary verification failed');
        throw fail(m.couldNotVerifyVideo, HttpStatus.BAD_REQUEST);
      }
      provider = 'CLOUDINARY';
      storedId = publicId;
      if (!VIDEO_FORMATS.has(String(resource.format ?? '').toLowerCase())) { await discard(); throw fail(m.unsupportedVideoFormat, HttpStatus.BAD_REQUEST); }
      if ((resource.bytes ?? 0) > MAX_VIDEO_SIZE_BYTES) { await discard(); throw fail(m.videoTooLarge, HttpStatus.BAD_REQUEST); }
      url = videoPlaybackUrl(resource.secure_url);
      thumbnailUrl = videoThumbnailUrl(resource.secure_url) ?? null;
      durationSec = Math.round(resource.duration || ref.clientDurationSec || 0);
      sizeBytes = resource.bytes ?? 0;
    }

    const dur = effectiveDuration(ctx.c, ctx.stage);
    if (durationSec > 0) {
      if (dur.min != null && durationSec + DURATION_TOLERANCE_SEC < dur.min) { await discard(); throw fail(m.videoTooShort.replace('{{sec}}', String(dur.min)), HttpStatus.BAD_REQUEST, 'VIDEO_DURATION'); }
      if (dur.max != null && durationSec - DURATION_TOLERANCE_SEC > dur.max) { await discard(); throw fail(m.videoTooLong.replace('{{sec}}', String(dur.max)), HttpStatus.BAD_REQUEST, 'VIDEO_DURATION'); }
    }

    try {
      return await this.writeSubmission(ctx, {
        method: 'VIDEO_UPLOAD', videoUrl: url, thumbnailUrl, storageRef: storedId, storageProvider: provider,
        durationSec: durationSec || null, sizeBytes, caption: ref.caption ?? null,
      }, userId);
    } catch (err) {
      // Deadline passed (or similar) while the upload was in flight — don't orphan the object.
      await discard();
      throw err;
    }
  }

  // ── Kolab admin: oversight (restricted by default) ────────────────────────

  async adminList(q: AdminListQuery) {
    const where: Prisma.CompetitionWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.flagged === 'true' ? { OR: [{ moderationFlag: { in: ['FLAGGED', 'UNDER_INVESTIGATION'] } }, { suspendedAt: { not: null } }] } : {}),
      ...(q.q ? { AND: [{ OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { business: { businessName: { contains: q.q, mode: 'insensitive' } } }] }] } : {}),
      // Review queue: new submissions + proposed edits to live competitions.
      ...(q.review === 'pending' ? { AND: [{ OR: [{ status: 'PENDING_REVIEW' }, { pendingChanges: { not: Prisma.AnyNull } }] }] } : {}),
    };
    const [total, rows] = await Promise.all([
      prisma.competition.count({ where }),
      prisma.competition.findMany({
        where,
        // The review queue is oldest-first (fair turn order); everything else newest-first.
        orderBy: q.review === 'pending' ? [{ submittedForReviewAt: 'asc' }, { pendingChangesSubmittedAt: 'asc' }] : { createdAt: 'desc' },
        skip: (q.page - 1) * q.limit, take: q.limit,
        include: { business: { select: { id: true, businessName: true, isVerified: true } }, _count: { select: { participants: true, stages: true } } },
      }),
    ]);
    const reportCounts = rows.length
      ? await prisma.report.groupBy({ by: ['targetId'], where: { targetType: 'COMPETITION', targetId: { in: rows.map((r) => r.id) }, status: { in: ['NEW', 'UNDER_REVIEW'] } }, _count: { _all: true } })
      : [];
    return {
      items: rows.map((c) => ({
        id: c.id, title: c.title, status: c.status, organizer: c.business,
        registrationDeadline: c.registrationDeadline, startsAt: c.startsAt, endsAt: c.endsAt, createdAt: c.createdAt,
        participantCount: c._count.participants, stageCount: c._count.stages,
        moderationFlag: c.moderationFlag, suspended: !!c.suspendedAt,
        submittedForReviewAt: c.submittedForReviewAt, hasPendingChanges: !!c.pendingChanges,
        prizePaymentMethod: c.prizePaymentMethod, fundingStatus: c.fundingStatus,
        openReports: reportCounts.find((r) => r.targetId === c.id)?._count._all ?? 0,
      })),
      pagination: { total, page: q.page, limit: q.limit, totalPages: Math.ceil(total / q.limit) },
    };
  }

  /** Aggregate-only view: counts, never identities of non-winners, submissions, drafts or notes. */
  async adminGet(id: string, adminEmail?: string) {
    const c = await prisma.competition.findUnique({
      where: { id },
      include: { stages: STAGE_ORDER, prizes: PRIZE_ORDER, business: { select: { id: true, businessName: true, isVerified: true, slug: true } }, _count: { select: { participants: true } } },
    });
    if (!c) throw fail(M().notFound, HttpStatus.NOT_FOUND);
    const [subs, published, reports] = await Promise.all([
      prisma.competitionSubmission.groupBy({ by: ['stageId'], where: { stage: { competitionId: id } }, _count: { _all: true } }),
      prisma.competitionStageDecision.groupBy({ by: ['stageId', 'decision'], where: { stage: { competitionId: id }, isPublished: true }, _count: { _all: true } }),
      prisma.report.findMany({ where: { targetType: 'COMPETITION', targetId: id }, orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, reason: true, description: true, status: true, createdAt: true } }),
    ]);
    const count = (stageId: string, decision: string) => published.find((p) => p.stageId === stageId && p.decision === decision)?._count._all ?? 0;
    return {
      id: c.id, title: c.title, description: c.description, status: c.status, organizer: c.business,
      // Organizer-authored content the admin reviews before it goes live —
      // public once published; never participant data.
      content: {
        objectives: c.objectives, coverImageUrl: c.coverImageUrl, rules: c.rules, eligibility: c.eligibility,
        contentFormats: c.contentFormats, skills: c.skills, submissionMode: c.submissionMode, submissionInstructions: c.submissionInstructions, contactInstructions: c.contactInstructions,
        videoMinSec: c.videoMinSec, videoMaxSec: c.videoMaxSec, attachments: c.attachments, resultsVisibility: c.resultsVisibility,
        allowSubmissionEdits: c.allowSubmissionEdits, onePrizePerCreator: c.onePrizePerCreator,
        judgingCriteria: c.scoringEnabled ? criteriaOf(c.judgingCriteria) : [],
        stageBriefs: c.stages.map((s) => ({ id: s.id, name: s.name, brief: s.brief, requirements: s.requirements, allowedMethods: s.allowedMethods, videoMinSec: s.videoMinSec, videoMaxSec: s.videoMaxSec })),
        prizes: c.prizes.map((p) => ({ title: p.title, kind: p.kind, description: p.description, amount: p.amount, currency: p.currency, recipientCount: p.recipientCount, notes: p.notes })),
      },
      review: {
        publishAt: c.publishAt, submittedAt: c.submittedForReviewAt, reviewedAt: c.reviewedAt, feedback: c.reviewFeedback,
        resubmissionAllowed: c.resubmissionAllowed, revision: c.reviewRevision,
        pendingChanges: c.pendingChanges as Record<string, unknown> | null, pendingChangesSubmittedAt: c.pendingChangesSubmittedAt,
        history: await this.reviewHistory(id),
      },
      publishedAt: c.publishedAt, registrationOpensAt: c.registrationOpensAt, registrationDeadline: c.registrationDeadline,
      startsAt: c.startsAt, endsAt: c.endsAt, completedAt: c.completedAt, cancelledAt: c.cancelledAt, cancelReason: c.cancelReason,
      participantCount: c._count.participants,
      stages: c.stages.map((s) => ({
        id: s.id, order: s.order, name: s.name, status: s.status, opensAt: s.opensAt, deadline: s.deadline, advanceLimit: s.advanceLimit,
        submissions: subs.find((x) => x.stageId === s.id)?._count._all ?? 0,
        advanced: count(s.id, 'ADVANCE'),
        notSelected: count(s.id, 'NOT_SELECTED'),
      })),
      prizes: c.prizes.map((p) => ({ title: p.title, kind: p.kind, amount: p.amount, currency: p.currency, recipientCount: p.recipientCount })),
      prizePool: prizePool(c.prizes),
      payment: paymentConfigView(c),
      results: c.status === 'COMPLETED' ? await this.publicResults(id) : null,
      moderation: { flag: c.moderationFlag, note: c.moderationNote, suspended: !!c.suspendedAt, suspendedAt: c.suspendedAt, suspensionReason: c.suspensionReason },
      reports,
      viewerIsModerator: isCompetitionModerator(adminEmail),
    };
  }

  private async reviewHistory(competitionId: string) {
    return prisma.competitionReview.findMany({
      where: { competitionId }, orderBy: { createdAt: 'desc' }, take: 30,
      select: { id: true, action: true, feedback: true, revision: true, changedFields: true, createdAt: true },
    });
  }

  // ── Kolab admin: review (any admin — content only, no participant data) ───
  // Same pattern as event review: one conditional UPDATE + a history row in a
  // transaction, so two admins deciding at once produce exactly one decision.

  async approve(adminId: string, id: string) {
    const m = M();
    const now = new Date();
    const out = await prisma.$transaction(async (tx) => {
      const c = await this.lockCompetition(tx, id);
      if (c.status !== 'PENDING_REVIEW') throw fail(m.notPendingReview, HttpStatus.CONFLICT);
      // Dates can lapse while it waits in the queue — don't approve something that can't run.
      if (c.registrationDeadline <= now || c.stages[0].deadline <= now) throw fail(m.datesLapsed, HttpStatus.CONFLICT);
      // Approval never makes a Kolab-funded competition live on its own: until
      // the full prize pool is confirmed it waits as SCHEDULED (publishAt =
      // the requested time, or now = "as soon as it's funded").
      const awaitingFunding = !PR.fundingAllowsLaunch(c.fundingStatus);
      const scheduled = (!!c.publishAt && c.publishAt > now) || awaitingFunding;
      await tx.competition.update({
        where: { id },
        data: {
          status: scheduled ? 'SCHEDULED' : 'ACTIVE', reviewedAt: now, reviewFeedback: null,
          ...(scheduled ? (awaitingFunding && !(c.publishAt && c.publishAt > now) ? { publishAt: now } : {}) : { publishedAt: now, publishAt: null }),
        },
      });
      await tx.competitionReview.create({ data: { competitionId: id, actorId: adminId, action: 'APPROVED', revision: c.reviewRevision } });
      await audit(tx, { actorId: adminId, actorType: 'ADMIN', action: AuditAction.COMPETITION_APPROVED, competitionId: id, newValue: { status: scheduled ? 'SCHEDULED' : 'ACTIVE', publishAt: c.publishAt, awaitingFunding } });
      return { c, scheduled, awaitingFunding };
    });
    const organizer = await this.organizerUserId(id);
    if (out.awaitingFunding) {
      void N.fundingRequired(organizer, out.c, PR.fromPaisa((out.c.cashPrizePoolPaisa ?? 0) - out.c.fundedAmountPaisa)).catch(() => {});
    } else {
      void N.reviewDecision(organizer, out.c, out.scheduled ? 'APPROVED_SCHEDULED' : 'APPROVED', null, out.c.publishAt).catch(() => {});
    }
    if (!out.scheduled) await this.runLifecycleSweep(new Date(), id);
    return this.adminGet(id);
  }

  async requestChanges(adminId: string, id: string, feedback: string) {
    return this.decide(adminId, id, 'CHANGES_REQUESTED', feedback, true);
  }

  async reject(adminId: string, id: string, feedback: string, allowResubmission: boolean) {
    return this.decide(adminId, id, 'REJECTED', feedback, allowResubmission);
  }

  private async decide(adminId: string, id: string, to: 'CHANGES_REQUESTED' | 'REJECTED', feedback: string, allowResubmission: boolean) {
    const m = M();
    const text = feedback.trim();
    if (text.length < rules.MIN_REVIEW_FEEDBACK) throw fail(m.feedbackTooShort, HttpStatus.BAD_REQUEST);
    const now = new Date();
    const c = await prisma.$transaction(async (tx) => {
      const c = await this.lockCompetition(tx, id);
      if (c.status !== 'PENDING_REVIEW') throw fail(m.notPendingReview, HttpStatus.CONFLICT);
      await tx.competition.update({ where: { id }, data: { status: to, reviewedAt: now, reviewFeedback: text, resubmissionAllowed: allowResubmission } });
      await tx.competitionReview.create({ data: { competitionId: id, actorId: adminId, action: to, feedback: text, revision: c.reviewRevision } });
      await audit(tx, { actorId: adminId, actorType: 'ADMIN', action: to === 'REJECTED' ? AuditAction.COMPETITION_REJECTED : AuditAction.COMPETITION_CHANGES_REQUESTED, competitionId: id, metadata: { feedback: text, allowResubmission } });
      return c;
    });
    void N.reviewDecision(await this.organizerUserId(id), c, to, text, null, allowResubmission).catch(() => {});
    return this.adminGet(id);
  }

  /** Apply a proposed rules/eligibility/prize edit to a live competition. */
  async approveChanges(adminId: string, id: string) {
    const m = M();
    const { c, fields } = await prisma.$transaction(async (tx) => {
      const c = await this.lockCompetition(tx, id);
      const pending = c.pendingChanges as { rules?: string; eligibility?: string | null; prizes?: PrizeInput[] } | null;
      if (!pending) throw fail(m.noPendingChanges, HttpStatus.CONFLICT);
      if (['COMPLETED', 'CANCELLED'].includes(c.status)) throw fail(m.competitionFinished, HttpStatus.CONFLICT);
      if (pending.prizes) {
        throwProblems(rules.validatePrizes(pending.prizes));
        throwProblems(this.livePrizeProblems(c, pending.prizes));
        if (c.prizePaymentMethod === 'DIRECT') {
          // The organizer's direct commitment follows the approved prize list.
          await tx.competition.update({ where: { id }, data: { cashPrizePoolPaisa: PR.cashAllocationPaisa(pending.prizes) || null } });
        }
        const keep = pending.prizes.map((p) => p.id).filter(Boolean) as string[];
        const removed = c.prizes.filter((p) => !keep.includes(p.id)).map((p) => p.id);
        // Awards may have been drafted since the proposal was made.
        if (removed.length && await tx.competitionAward.count({ where: { prizeId: { in: removed } } })) throw fail(m.prizeHasAwards, HttpStatus.CONFLICT);
        await tx.competitionPrize.deleteMany({ where: { competitionId: id, id: { notIn: keep } } });
        for (const [i, p] of pending.prizes.entries()) {
          if (p.id && c.prizes.some((x) => x.id === p.id)) await tx.competitionPrize.update({ where: { id: p.id }, data: prizeData(p, i) });
          else await tx.competitionPrize.create({ data: { ...prizeData(p, i), competitionId: id } });
        }
      }
      await tx.competition.update({
        where: { id },
        data: {
          ...(pending.rules !== undefined ? { rules: pending.rules } : {}),
          ...(pending.eligibility !== undefined ? { eligibility: pending.eligibility } : {}),
          pendingChanges: Prisma.DbNull, pendingChangesSubmittedAt: null, pendingChangesFeedback: null, reviewedAt: new Date(),
        },
      });
      const fields = Object.keys(pending);
      await tx.competitionReview.create({ data: { competitionId: id, actorId: adminId, action: 'EDIT_APPROVED', revision: c.reviewRevision, changedFields: fields } });
      await audit(tx, { actorId: adminId, actorType: 'ADMIN', action: AuditAction.COMPETITION_CHANGES_APPROVED, competitionId: id, oldValue: { rules: c.rules, eligibility: c.eligibility }, newValue: pending as Record<string, unknown> });
      return { c, fields };
    });
    void N.reviewDecision(await this.organizerUserId(id), c, 'EDIT_APPROVED', null).catch(() => {});
    if (!rules.UNPUBLISHED_STATUSES.includes(c.status)) {
      const label = fields.map((f) => (f === 'rules' ? 'the rules' : f === 'prizes' ? 'the prizes' : 'eligibility')).join(', ');
      const users = await this.participantUserIds(id, { status: 'ACTIVE' });
      void N.updated(users, c, label, new Date()).catch(() => {});
    }
    return this.adminGet(id);
  }

  async rejectChanges(adminId: string, id: string, feedback: string) {
    const m = M();
    const text = feedback.trim();
    if (text.length < rules.MIN_REVIEW_FEEDBACK) throw fail(m.feedbackTooShort, HttpStatus.BAD_REQUEST);
    const c = await prisma.$transaction(async (tx) => {
      const c = await this.lockCompetition(tx, id);
      if (!c.pendingChanges) throw fail(m.noPendingChanges, HttpStatus.CONFLICT);
      await tx.competition.update({ where: { id }, data: { pendingChanges: Prisma.DbNull, pendingChangesSubmittedAt: null, pendingChangesFeedback: text } });
      await tx.competitionReview.create({ data: { competitionId: id, actorId: adminId, action: 'EDIT_REJECTED', feedback: text, revision: c.reviewRevision, changedFields: Object.keys(c.pendingChanges as object) } });
      await audit(tx, { actorId: adminId, actorType: 'ADMIN', action: AuditAction.COMPETITION_CHANGES_REJECTED, competitionId: id, metadata: { feedback: text } });
      return c;
    });
    void N.reviewDecision(await this.organizerUserId(id), c, 'EDIT_REJECTED', text).catch(() => {});
    return this.adminGet(id);
  }

  private async organizerUserId(competitionId: string): Promise<string> {
    const c = await prisma.competition.findUniqueOrThrow({ where: { id: competitionId }, select: { business: { select: { userId: true } } } });
    return c.business.userId;
  }

  // ── Kolab admin: moderation (permission-gated + audited) ──────────────────

  private assertModerator(email?: string) {
    if (!isCompetitionModerator(email)) throw fail(M().moderatorOnly, HttpStatus.FORBIDDEN, 'COMPETITION_MODERATOR_REQUIRED');
  }

  async setModerationFlag(adminId: string, adminEmail: string, id: string, flag: 'NONE' | 'FLAGGED' | 'UNDER_INVESTIGATION' | 'CLEARED', note: string) {
    this.assertModerator(adminEmail);
    const c = await prisma.competition.findUnique({ where: { id }, select: { id: true, moderationFlag: true } });
    if (!c) throw fail(M().notFound, HttpStatus.NOT_FOUND);
    await prisma.$transaction(async (tx) => {
      await tx.competition.update({ where: { id }, data: { moderationFlag: flag, moderationNote: note } });
      await audit(tx, { actorId: adminId, actorType: 'ADMIN', action: AuditAction.COMPETITION_MODERATION_FLAGGED, competitionId: id, oldValue: { flag: c.moderationFlag }, newValue: { flag }, metadata: { note } });
    });
    return this.adminGet(id, adminEmail);
  }

  async suspend(adminId: string, adminEmail: string, id: string, reason: string) {
    this.assertModerator(adminEmail);
    const c = await prisma.competition.findUnique({ where: { id }, include: { business: { select: { userId: true } } } });
    if (!c) throw fail(M().notFound, HttpStatus.NOT_FOUND);
    if (c.suspendedAt) throw fail(M().alreadySuspended, HttpStatus.CONFLICT);
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.competition.update({ where: { id }, data: { suspendedAt: now, suspensionReason: reason, moderationFlag: c.moderationFlag === 'NONE' ? 'UNDER_INVESTIGATION' : c.moderationFlag } });
      await audit(tx, { actorId: adminId, actorType: 'ADMIN', action: AuditAction.COMPETITION_SUSPENDED, competitionId: id, metadata: { reason } });
    });
    void N.suspended(c.business.userId, c, now).catch(() => {});
    return this.adminGet(id, adminEmail);
  }

  async unsuspend(adminId: string, adminEmail: string, id: string, reason: string) {
    this.assertModerator(adminEmail);
    const c = await prisma.competition.findUnique({ where: { id }, select: { id: true, suspendedAt: true } });
    if (!c) throw fail(M().notFound, HttpStatus.NOT_FOUND);
    if (!c.suspendedAt) throw fail(M().notSuspended, HttpStatus.CONFLICT);
    await prisma.$transaction(async (tx) => {
      await tx.competition.update({ where: { id }, data: { suspendedAt: null, suspensionReason: null } });
      await audit(tx, { actorId: adminId, actorType: 'ADMIN', action: AuditAction.COMPETITION_UNSUSPENDED, competitionId: id, metadata: { reason } });
    });
    return this.adminGet(id, adminEmail);
  }

  /** Evidence access for an investigation — moderator-only, reason required, every access audited. */
  async moderationSubmissions(adminId: string, adminEmail: string, id: string, stageId: string, reason: string) {
    this.assertModerator(adminEmail);
    const stage = await prisma.competitionStage.findFirst({ where: { id: stageId, competitionId: id }, select: { id: true, name: true } });
    if (!stage) throw fail(M().stageNotFound, HttpStatus.NOT_FOUND);
    const rows = await prisma.competitionSubmission.findMany({
      where: { stageId },
      orderBy: { submittedAt: 'asc' },
      take: 200,
      include: { participant: { select: { id: true, creator: { select: { fullName: true, username: true } } } } },
    });
    await prisma.auditLog.create({
      data: {
        userId: adminId, actorType: 'ADMIN', action: AuditAction.COMPETITION_SENSITIVE_ACCESS,
        entityType: EntityType.COMPETITION, entityId: id,
        metadata: { stageId, stage: stage.name, reason, records: rows.length } as Prisma.InputJsonValue,
        ipAddress: getRequestContext()?.ip, userAgent: getRequestContext()?.userAgent, requestId: getRequestContext()?.requestId,
      },
    });
    return {
      stage,
      items: rows.map((s) => ({
        participantId: s.participantId, creator: s.participant.creator,
        method: s.method, videoUrl: s.videoUrl, externalUrl: s.externalUrl, caption: s.caption, version: s.version, submittedAt: s.submittedAt,
      })),
    };
  }

  // ── Lifecycle sweep (jobs/competitionLifecycle.ts) ────────────────────────
  //
  // Every transition is a conditional updateMany whose WHERE re-checks the
  // CURRENT status and date at write time. An organizer extending a deadline
  // between our read and our write makes the update match 0 rows — so a stale
  // sweep can never close a stage (or competition) that was just extended or
  // reopened. Notifications carry dedupe keys that include the deadline, so a
  // repeated sweep is silent and an extension legitimately re-arms reminders.

  async runLifecycleSweep(now = new Date(), competitionId?: string) {
    const scope = competitionId ? { id: competitionId } : {};
    const stats = { published: 0, opened: 0, closed: 0, reminded: 0 };

    // 1. Scheduled publication.
    // Kolab-funded prize pools must be fully confirmed before going live.
    const launchable = { fundingStatus: { in: ['NOT_REQUIRED', 'FUNDED'] as Array<'NOT_REQUIRED' | 'FUNDED'> } };
    const due = await prisma.competition.findMany({ where: { ...scope, status: 'SCHEDULED', publishAt: { lte: now }, suspendedAt: null, ...launchable }, select: { id: true } });
    for (const c of due) {
      const ok = await prisma.$transaction(async (tx) => {
        const res = await tx.competition.updateMany({ where: { id: c.id, status: 'SCHEDULED', publishAt: { lte: now }, suspendedAt: null, ...launchable }, data: { status: 'ACTIVE', publishedAt: now } });
        if (res.count === 1) await audit(tx, { actorType: 'SYSTEM', action: AuditAction.COMPETITION_PUBLISHED, competitionId: c.id, newValue: { status: 'ACTIVE' }, metadata: { scheduled: true } });
        return res.count === 1;
      });
      if (ok) stats.published++;
    }

    const liveWhere = { ...scope, status: 'ACTIVE' as const, suspendedAt: null };

    // 2. Stages due to open (previous stage's results must be published first).
    const toOpen = await prisma.competitionStage.findMany({
      // SINGLE-mode review rounds start from publishDecisions, never by date.
      where: { status: 'UPCOMING', opensAt: { lte: now }, competition: liveWhere, OR: [{ order: 1 }, { competition: { submissionMode: 'PER_STAGE' } }] },
      include: { competition: { include: { stages: { select: { order: true, status: true } }, business: { select: { userId: true } } } } },
    });
    for (const s of toOpen) {
      const prev = s.competition.stages.find((x) => x.order === s.order - 1);
      if (prev && prev.status !== 'RESULTS_PUBLISHED') continue;
      if (s.deadline <= now) {
        void N.needsAttention(s.competition.business.userId, s.competition, s).catch(() => {});
        continue;
      }
      const res = await prisma.competitionStage.updateMany({ where: { id: s.id, status: 'UPCOMING', opensAt: { lte: now }, deadline: { gt: now } }, data: { status: 'OPEN', openedAt: now } });
      if (res.count !== 1) continue;
      stats.opened++;
      const users = await this.eligibleAt(s.competitionId, s.order);
      await N.stageOpened(users, s.competition, s).catch((err) => logger.warn({ err }, 'competition sweep: open notify failed'));
    }

    // 3. Stages past their (current) deadline → submissions closed, review begins.
    const toClose = await prisma.competitionStage.findMany({
      where: { status: 'OPEN', deadline: { lte: now }, competition: liveWhere },
      include: { competition: { include: { _count: { select: { stages: true } }, business: { select: { userId: true } } } } },
    });
    for (const s of toClose) {
      const isFinal = s.order === s.competition._count.stages;
      const closed = await prisma.$transaction(async (tx) => {
        const res = await tx.competitionStage.updateMany({ where: { id: s.id, status: 'OPEN', deadline: { lte: now } }, data: { status: 'UNDER_REVIEW', submissionsClosedAt: now } });
        if (res.count !== 1) return false;
        if (isFinal) await tx.competition.updateMany({ where: { id: s.competitionId, status: 'ACTIVE' }, data: { status: 'AWAITING_RESULTS' } });
        await audit(tx, { actorType: 'SYSTEM', action: AuditAction.COMPETITION_STAGE_CLOSED, competitionId: s.competitionId, metadata: { stageId: s.id, stage: s.name, deadline: s.deadline } });
        return true;
      });
      if (!closed) continue;
      stats.closed++;
      await N.readyForReview(s.competition.business.userId, s.competition, s).catch(() => {});
    }

    // 4. 24h reminders — creators who haven't submitted, plus one organizer heads-up.
    const soon = await prisma.competitionStage.findMany({
      where: { status: 'OPEN', deadline: { gt: now, lte: new Date(now.getTime() + 24 * 3_600_000) }, competition: liveWhere },
      include: { competition: { select: { id: true, title: true, business: { select: { userId: true } } } } },
    });
    for (const s of soon) {
      const pending = await prisma.competitionParticipant.findMany({
        where: { competitionId: s.competitionId, status: 'ACTIVE', currentStageOrder: s.order, submissions: { none: { stageId: s.id } } },
        select: { creator: { select: { userId: true } } },
      });
      await N.deadlineReminder(pending.map((p) => p.creator.userId), s.competition, s).catch(() => {});
      const submitted = await prisma.competitionSubmission.count({ where: { stageId: s.id } });
      await N.organizerDeadline(s.competition.business.userId, s.competition, s, submitted).catch(() => {});
      stats.reminded += pending.length;
    }

    return stats;
  }
}

export const competitionService = new CompetitionService();
