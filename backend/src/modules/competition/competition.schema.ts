import { z } from 'zod';
import { campaignBriefSchema } from '../campaign/campaign.brief';
import { MAX_CRITERIA, MAX_PRIZES, MAX_PRIZE_RECIPIENTS, MAX_STAGES } from './competition.rules';

// Request shapes only. Cross-field rules (date ordering, weights totalling 100,
// award conflicts…) live in competition.rules.ts so they're shared by create,
// update and publish and unit-tested once.

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => text(max).nullable().optional();
const duration = z.number().int().min(1).max(3600).nullable().optional();
const method = z.enum(['VIDEO_UPLOAD', 'EXTERNAL_LINK']);

const stageSchema = z.object({
  // Present when editing an existing stage; omitted for new ones.
  id:             z.string().min(1).optional(),
  name:           text(80).min(1, 'Stage name is required'),
  description:    optionalText(2000),
  brief:          optionalText(5000),
  requirements:   optionalText(2000),
  opensAt:        z.coerce.date(),
  deadline:       z.coerce.date(),
  advanceLimit:   z.number().int().min(1).max(100000).nullable().optional(),
  allowedMethods: z.array(method).min(1, 'Allow at least one submission method').max(2),
  videoMinSec:    duration,
  videoMaxSec:    duration,
});

const prizeSchema = z.object({
  id:             z.string().min(1).optional(),
  kind:           z.enum(['PLACEMENT', 'SPECIAL']).default('PLACEMENT'),
  title:          text(80).min(1, 'Prize title is required'),
  description:    optionalText(1000),
  amount:         z.number().min(0).max(100_000_000).nullable().optional(),
  currency:       z.literal('NPR').default('NPR'),
  recipientCount: z.number().int().min(1).max(MAX_PRIZE_RECIPIENTS).default(1),
  notes:          optionalText(500),
});

const criterionSchema = z.object({
  key:    z.string().trim().min(1).max(40).regex(/^[a-z0-9_]+$/, 'Criterion key must be lowercase letters, numbers or _'),
  label:  text(80).min(1),
  weight: z.number().int().min(1).max(100),
});

const competitionFields = {
  title:                  text(150).min(3, 'Title must be at least 3 characters'),
  description:            text(5000).min(10, 'Description must be at least 10 characters'),
  objectives:             optionalText(3000),
  coverImageUrl:          z.string().url().max(1000).nullable().optional(),
  rules:                  text(10000).min(10, 'Rules must be at least 10 characters'),
  eligibility:            optionalText(3000),
  contentFormats:         z.array(text(40).min(1)).max(10).default([]),
  submissionInstructions: optionalText(5000),
  videoMinSec:            duration,
  videoMaxSec:            duration,
  contactInstructions:    optionalText(1000),
  attachments:            campaignBriefSchema.shape.attachments,
  resultsVisibility:      z.enum(['PUBLIC', 'PARTICIPANTS']).default('PUBLIC'),
  registrationOpensAt:    z.coerce.date(),
  registrationDeadline:   z.coerce.date(),
  startsAt:               z.coerce.date(),
  endsAt:                 z.coerce.date(),
  allowSubmissionEdits:   z.boolean().default(true),
  onePrizePerCreator:     z.boolean().default(true),
  scoringEnabled:         z.boolean().default(false),
  judgingCriteria:        z.array(criterionSchema).max(MAX_CRITERIA).default([]),
  stages:                 z.array(stageSchema).min(1, 'Add at least one stage').max(MAX_STAGES),
  prizes:                 z.array(prizeSchema).max(MAX_PRIZES).default([]),
};

export const createCompetitionSchema = z.object(competitionFields);

// Every field optional; which ones may change depends on the competition's
// status and is enforced in CompetitionService.update.
export const updateCompetitionSchema = z.object({
  title:                  competitionFields.title.optional(),
  description:            competitionFields.description.optional(),
  objectives:             competitionFields.objectives,
  coverImageUrl:          competitionFields.coverImageUrl,
  rules:                  competitionFields.rules.optional(),
  eligibility:            competitionFields.eligibility,
  contentFormats:         z.array(text(40).min(1)).max(10).optional(),
  submissionInstructions: competitionFields.submissionInstructions,
  videoMinSec:            duration,
  videoMaxSec:            duration,
  contactInstructions:    competitionFields.contactInstructions,
  attachments:            competitionFields.attachments,
  resultsVisibility:      z.enum(['PUBLIC', 'PARTICIPANTS']).optional(),
  registrationOpensAt:    z.coerce.date().optional(),
  registrationDeadline:   z.coerce.date().optional(),
  startsAt:               z.coerce.date().optional(),
  endsAt:                 z.coerce.date().optional(),
  allowSubmissionEdits:   z.boolean().optional(),
  onePrizePerCreator:     z.boolean().optional(),
  scoringEnabled:         z.boolean().optional(),
  judgingCriteria:        z.array(criterionSchema).max(MAX_CRITERIA).optional(),
  stages:                 z.array(stageSchema).min(1).max(MAX_STAGES).optional(),
  prizes:                 z.array(prizeSchema).max(MAX_PRIZES).optional(),
});

export const publishCompetitionSchema = z.object({
  // Future = schedule; omitted/past = publish now.
  publishAt: z.coerce.date().nullable().optional(),
});

export const reasonSchema = z.object({
  reason: text(500).min(5, 'Please give a reason (at least 5 characters)'),
});

export const optionalReasonSchema = z.object({
  reason: optionalText(500),
});

export const registrationDeadlineSchema = z.object({
  registrationDeadline: z.coerce.date(),
});

export const stageDeadlineSchema = z.object({
  deadline: z.coerce.date(),
});

export const saveDecisionsSchema = z.object({
  decisions: z.array(z.object({
    participantId: z.string().min(1),
    // null clears the draft decision (keeps notes/scores).
    decision:      z.enum(['ADVANCE', 'NOT_SELECTED']).nullable().optional(),
    notes:         optionalText(2000),
    scores:        z.record(z.string(), z.number()).nullable().optional(),
  })).min(1).max(200),
});

export const publishDecisionsSchema = z.object({
  // What the organizer saw on the confirmation screen — publishing fails if
  // the saved draft no longer matches (another tab changed it meanwhile).
  expectedAdvanceCount: z.number().int().min(0),
});

export const saveAwardsSchema = z.object({
  awards: z.array(z.object({
    prizeId:       z.string().min(1),
    participantId: z.string().min(1),
  })).max(MAX_PRIZES * MAX_PRIZE_RECIPIENTS),
});

export const publishResultsSchema = z.object({
  expectedAwardCount: z.number().int().min(0),
});

export const participantsQuerySchema = z.object({
  stageId: z.string().min(1).optional(),
  filter:  z.enum(['ALL', 'SUBMITTED', 'NOT_SUBMITTED', 'UNDER_REVIEW', 'ADVANCED', 'NOT_SELECTED', 'FINALISTS']).default('ALL'),
  q:       z.string().trim().max(100).optional(),
  page:    z.coerce.number().int().min(1).default(1),
  limit:   z.coerce.number().int().min(1).max(100).default(25),
});

export const discoverQuerySchema = z.object({
  tab:   z.enum(['open', 'results', 'all']).default('open'),
  q:     z.string().trim().max(100).optional(),
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const submitLinkSchema = z.object({
  url:     z.string().trim().min(1, 'Paste a link to your video').max(2000),
  caption: optionalText(500),
});

export const videoSignatureSchema = z.object({
  sizeBytes: z.number().min(1).max(500 * 1024 * 1024),
  mimeType:  z.enum(['video/mp4', 'video/quicktime']).default('video/mp4'),
});

export const videoCompleteSchema = z.object({
  publicId:          z.string().min(1).optional(),
  key:               z.string().min(1).optional(),
  uploadId:          z.string().min(1).optional(),
  thumbnailKey:      z.string().min(1).optional(),
  clientDurationSec: z.number().min(0).max(7200).optional(),
  caption:           optionalText(500),
}).refine((d) => !!d.publicId || !!d.key, { message: 'publicId or key is required' });

export const adminListQuerySchema = z.object({
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'CHANGES_REQUESTED', 'REJECTED', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'AWAITING_RESULTS', 'COMPLETED', 'CANCELLED']).optional(),
  flagged: z.enum(['true', 'false']).optional(),
  review:  z.enum(['pending']).optional(),
  q:     z.string().trim().max(100).optional(),
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const reviewFeedbackSchema = z.object({
  feedback: text(2000).min(10, 'Please give the organizer at least 10 characters of feedback'),
});

export const rejectSchema = reviewFeedbackSchema.extend({
  allowResubmission: z.boolean().default(true),
});

export const moderationFlagSchema = z.object({
  flag: z.enum(['NONE', 'FLAGGED', 'UNDER_INVESTIGATION', 'CLEARED']),
  note: text(1000).min(5, 'Please add a note (at least 5 characters)'),
});

export type CreateCompetitionInput = z.infer<typeof createCompetitionSchema>;
export type UpdateCompetitionInput = z.infer<typeof updateCompetitionSchema>;
export type StageInput = z.infer<typeof stageSchema>;
export type PrizeInput = z.infer<typeof prizeSchema>;
export type SaveDecisionsInput = z.infer<typeof saveDecisionsSchema>;
export type SaveAwardsInput = z.infer<typeof saveAwardsSchema>;
export type ParticipantsQuery = z.infer<typeof participantsQuerySchema>;
export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type VideoCompleteInput = z.infer<typeof videoCompleteSchema>;
