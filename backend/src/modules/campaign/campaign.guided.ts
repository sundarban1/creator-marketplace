import { Prisma } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { HttpStatus } from '../../constants/httpStatus';
import {
  countFilledBriefSections, summarizeDeliverables,
  type CampaignBrief, type CampaignLocation, type DeliverableItem,
} from './campaign.brief';
import {
  blockingIssues, computeComplexity, getCampaignIssues,
  type CampaignComplexityLevel, type CampaignRuleIssue, type CampaignRulesInput,
} from './campaign.rules';

// Glue between the guided creator's structured fields and the Campaign row:
// what to persist (plus the legacy columns kept in sync for older readers),
// and how to run the shared publish rules against a campaign.

type GuidedInput = {
  locations?: CampaignLocation[];
  locationScope?: 'SPECIFIC' | 'NATIONWIDE' | 'ANYWHERE';
  deliverableItems?: DeliverableItem[];
  brief?: CampaignBrief;
  startDate?: string | null;
  applicationDeadline?: string | null;
  aiProvenance?: Record<string, 'USER' | 'AI_EXTRACTED' | 'AI_SUGGESTED'>;
  draftStep?: string | null;
  deliverables?: string;
  locationType?: 'ONSITE' | 'REMOTE';
};

// Only fields the client actually sent are returned, so a partial update or
// autosave never wipes what it didn't touch.
export function guidedPersistFields(input: GuidedInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.locations !== undefined) {
    out.locations = input.locations as unknown as Prisma.InputJsonValue;
    // Legacy columns mirror the first location (search, distance, cards).
    const first = input.locations[0];
    if (input.locationType !== 'REMOTE') {
      out.location    = first?.name ?? null;
      out.locationLat = first?.lat ?? null;
      out.locationLng = first?.lng ?? null;
    }
  }
  if (input.locationScope !== undefined) out.locationScope = input.locationScope;
  if (input.deliverableItems !== undefined) {
    out.deliverableItems = input.deliverableItems as unknown as Prisma.InputJsonValue;
    if (!input.deliverables?.trim() && input.deliverableItems.length) {
      out.deliverables = summarizeDeliverables(input.deliverableItems);
    }
  }
  if (input.brief !== undefined) out.brief = input.brief as unknown as Prisma.InputJsonValue;
  if (input.startDate !== undefined) out.startDate = input.startDate ? new Date(input.startDate) : null;
  if (input.applicationDeadline !== undefined) {
    out.applicationDeadline = input.applicationDeadline ? new Date(input.applicationDeadline) : null;
  }
  if (input.aiProvenance !== undefined) out.aiProvenance = input.aiProvenance as unknown as Prisma.InputJsonValue;
  if (input.draftStep !== undefined) out.draftStep = input.draftStep;
  return out;
}

// Anything campaign-shaped: a stored row, a create body, or a row merged with
// an update body.
type CampaignLike = {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  platforms?: string[] | null;
  creatorsNeeded?: number | null;
  deliverables?: string | null;
  deliverableItems?: unknown;
  paymentType?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  deadline?: string | Date | null;
  startDate?: string | Date | null;
  applicationDeadline?: string | Date | null;
  locationType?: string | null;
  locationScope?: string | null;
  locations?: unknown;
  location?: string | null;
  minFollowers?: number | null;
  brief?: unknown;
  requirements?: unknown[] | null;
};

export function toRulesInput(c: CampaignLike): CampaignRulesInput {
  const items = Array.isArray(c.deliverableItems) ? (c.deliverableItems as DeliverableItem[]) : [];
  const locations = Array.isArray(c.locations) ? (c.locations as CampaignLocation[]) : [];
  const brief = c.brief && typeof c.brief === 'object' ? (c.brief as CampaignBrief) : undefined;
  return {
    title: c.title,
    description: c.description,
    category: c.category,
    platforms: c.platforms ?? [],
    creatorsNeeded: c.creatorsNeeded,
    deliverables: c.deliverables,
    deliverableItems: items,
    paymentType: c.paymentType,
    budgetMin: c.budgetMin,
    budgetMax: c.budgetMax,
    hasRequirements: (c.requirements?.length ?? 0) > 0,
    deadline: c.deadline,
    startDate: c.startDate,
    applicationDeadline: c.applicationDeadline,
    locationType: c.locationType === 'REMOTE' ? 'REMOTE' : c.locationType === 'ONSITE' ? 'ONSITE' : null,
    locationScope: (c.locationScope as CampaignRulesInput['locationScope']) ?? null,
    locations,
    location: c.location,
    minFollowers: c.minFollowers,
    briefSectionsFilled: countFilledBriefSections(brief),
  };
}

export function assessCampaign(c: CampaignLike): {
  ready: boolean;
  issues: CampaignRuleIssue[];
  complexity: CampaignComplexityLevel;
} {
  const input = toRulesInput(c);
  const issues = getCampaignIssues(input);
  return { ready: blockingIssues(issues).length === 0, issues, complexity: computeComplexity(input) };
}

// Publish gate: 422 in the same { field, message } shape Zod errors use, plus
// code/step so the apps can jump straight to the step that needs attention.
// `onlyFields` limits the check to issues on those fields — used when editing
// an already-live campaign, so an edit is only blocked by what it changes
// (e.g. pausing an older campaign whose deadline has passed still works).
export function assertPublishable(c: CampaignLike, onlyFields?: Set<string>): void {
  const blocking = blockingIssues(getCampaignIssues(toRulesInput(c)))
    .filter((i) => !onlyFields || onlyFields.has(i.field));
  if (blocking.length === 0) return;
  throw new AppError(blocking[0].message, HttpStatus.UNPROCESSABLE_ENTITY, true, {
    errors: blocking.map(({ field, message, code, step }) => ({ field, message, code, step })),
  });
}
