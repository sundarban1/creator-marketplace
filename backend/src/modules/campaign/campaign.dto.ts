import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { deriveEngagementState } from './application-state-machine';

// Server-verified data (built from Cloudinary's own Admin API response, never
// from client-submitted metadata — see CampaignService.completeDeliverableVideo)
// that drives an in-app video player on the business side. Parsed with
// `.catch([])` wherever read, unlike the bare `as` casts used for other Json
// columns (socialHandles, goals, ...) which are just free-text user prefs —
// a shape mismatch here would otherwise crash the player screen.
export const deliverableVideoSchema = z.object({
  // For a CLOUDINARY entry this is Cloudinary's public_id; for an R2 entry
  // it's the R2 object key — either way, the one identifier
  // remove/renameDeliverableVideo look entries up by.
  publicId:     z.string(),
  url:          z.string(),
  // Cloudinary derives this automatically (a URL transform). R2 has no
  // auto-derived poster-frame, so this comes from the client's own
  // locally-extracted thumbnail instead — absent when that upload failed or
  // was never provided (see CampaignService.completeDeliverableVideo).
  thumbnailUrl: z.string().optional(),
  durationSec:  z.number(),
  format:       z.string(),
  sizeBytes:    z.number(),
  label:        z.string(),
  uploadedAt:   z.string(),
  // Entries persisted before this field existed have no `status` at all —
  // default them to READY rather than failing the `.catch([])` parse the
  // caller wraps this schema in (see toApplicationDto).
  status:       z.enum(['PROCESSING', 'READY', 'FAILED']).default('READY'),
  // Entries persisted before this field existed were all Cloudinary —
  // default accordingly so remove/renameDeliverableVideo route old rows correctly.
  provider:     z.enum(['CLOUDINARY', 'R2']).default('CLOUDINARY'),
  // Only present for an R2 multipart entry — needed if a later cleanup pass
  // ever needs to abort/inspect the underlying multipart upload.
  uploadId:     z.string().optional(),
});
export type DeliverableVideo = z.infer<typeof deliverableVideoSchema>;

// Server-verified image/PDF/DOCX deliverables — proxied through this server
// (multer, <=5MB) rather than the direct-to-Cloudinary signed flow videos use,
// so there's no async status field here (the upload either succeeds inline or
// it doesn't).
export const deliverableFileSchema = z.object({
  id:               z.string(),
  publicId:         z.string(),
  url:              z.string(),
  fileType:         z.enum(['IMAGE', 'DOCUMENT']),
  originalFileName: z.string(),
  mimeType:         z.string(),
  sizeBytes:        z.number(),
  uploadedAt:       z.string(),
});
export type DeliverableFile = z.infer<typeof deliverableFileSchema>;

export interface CampaignDto {
  id: string;
  title: string;
  description: string;
  template: string | null;
  featureImageUrl: string | null;
  category: string;
  categoryKey: string;
  goals: string[];
  platforms: string[];
  minFollowers: number;
  contentType: string;
  deliverables: string;
  paymentType: string;
  deadline: string;
  eventDate: string | null;
  eventTime: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationType: string;
  budgetMin: number;
  budgetMax: number;
  status: string;
  isFeatured: boolean;
  creatorsNeeded: number;
  campaignType: string;
  capacity: number | null;
  venue: string | null;
  benefits: string[];
  eventStatus: string;
  paymentStatus: string;
  paidAt: string | null;
  paymentMethod: string | null;
  // Platform commission %, snapshotted at creation — added on top of what the
  // business pays; creators always receive the full proposedRate.
  commissionRate: number | null;
  targetAudience: string[];
  hashtags: string[];
  sampleCaption: string | null;
  aiGenerated: boolean;
  aiPrompt: string | null;
  aiSuggestedCategories: string[];
  completionType: string | null;
  completionReason: string | null;
  createdAt: string;
  business?: {
    businessName: string | null;
    logoUrl: string | null;
    website?: string | null;
    description?: string | null;
  };
  _count?: { applications: number };
  // How many of those applications arrived in the last TRENDING_WINDOW_HOURS —
  // the velocity signal the creator feed's Trending tab ranks on. Absent
  // (not 0) when the endpoint doesn't compute it, so a client can tell
  // "no recent interest" from "not measured".
  recentProposals?: number;
  distanceKm?: number;
  // Present only for multi-role campaigns — undefined (not []) for the
  // simple single-category case, so clients can branch on `campaign.requirements?.length`
  // rather than treating an empty array as "has zero roles."
  requirements?: CampaignRequirementDto[];
}

export interface CampaignRequirementDto {
  id: string;
  categoryId: string;
  category: { id: string; name: string; key: string; icon: string; color: string };
  quantity: number;
  budgetType: string;
  budgetFixed: number | null;
  budgetMin: number | null;
  budgetMax: number | null;
  deliverables: string | null;
  description: string | null;
  format: string[];
  deadline: string | null;
  completionType: string | null;
  completionReason: string | null;
  // Live-computed (count of ACCEPTED applications for this requirement),
  // never stored — see the schema comment on CampaignRequirement.
  acceptedCount: number;
}

export interface SubmissionVersionDto {
  version: number;
  note: string | null;
  urls: string | null;
  videos: DeliverableVideo[];
  files: DeliverableFile[];
  late: boolean;
  reviewOutcome: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface ApplicationDto {
  id: string;
  campaignId: string;
  // Null for the simple single-category case — set only when this
  // application belongs to one role of a multi-requirement campaign.
  requirementId: string | null;
  coverLetter: string;
  proposedRate: number;
  // Derived from proposedRate + the campaign's snapshotted commissionRate —
  // the amount the business actually pays, on top of the creator's full rate.
  platformFee: number;
  businessTotal: number;
  timeline: string;
  socialHandles: Record<string, string>;
  portfolioUrl: string | null;
  status: string;
  workStatus: string;
  workNote: string | null;
  revisionRequestedAt: string | null;
  revisionNotes: { note: string; createdAt: string }[];
  submittedAt: string | null;
  deliverableUrls: string | null;
  deliverableVideos: DeliverableVideo[];
  deliverableFiles: DeliverableFile[];
  // Immutable per-attempt history (escrow spec §5) — present on the single
  // application read path; each entry snapshots what was delivered for that
  // version and how the business responded to it.
  submissionVersions?: SubmissionVersionDto[];
  paymentStatus: string;
  // Authoritative escrow state (EscrowStatus). Falls back to a value derived
  // from paymentStatus on the rare read path that doesn't select the column.
  escrowStatus: string;
  // Single derived label combining the relationship / work / escrow axes —
  // what the client should switch on (see application-state-machine.ts).
  engagementState: string;
  // Present only while a dispute has been raised on this engagement.
  dispute?: {
    status: string;
    reason: string;
    raisedByRole: string;
    resolution: string | null;
    resolutionNote: string | null;
    createdAt: string;
    resolvedAt: string | null;
  } | null;
  paidAt: string | null;
  createdAt: string;
  campaign?: {
    id?: string;
    title: string;
    category?: string;
    platforms?: string[];
    budgetMin?: number;
    budgetMax?: number;
    deadline?: string;
    status?: string;
    campaignType?: string;
    paymentStatus?: string;
    paidAt?: string | null;
    featureImageUrl?: string | null;
    commissionRate?: number | null;
    business?: { id?: string; businessName: string | null; logoUrl?: string | null };
  } | null;
  creator?: {
    id?: string;
    userId?: string;
    fullName: string | null;
    avatarUrl?: string | null;
    location?: string | null;
    categories?: string[];
    socialLinks?: unknown;
  } | null;
}

type RawCampaign = {
  id: string;
  businessId: string;
  title: string;
  description: string;
  template: string | null;
  featureImageUrl: string | null;
  category: string;
  goals: Prisma.JsonValue;
  platforms: string[];
  minFollowers: number;
  contentType: string;
  deliverables: string;
  paymentType: string;
  deadline: Date;
  eventDate: Date | null;
  eventTime: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationType: string;
  budgetMin: number;
  budgetMax: number;
  status: string;
  isFeatured: boolean;
  creatorsNeeded: number;
  campaignType: string;
  capacity: number | null;
  venue: string | null;
  benefits: Prisma.JsonValue;
  eventStatus: string;
  paymentStatus: string;
  paidAt: Date | null;
  paymentMethod: string | null;
  commissionRate: number | null;
  targetAudience: string[];
  hashtags: string[];
  sampleCaption: string | null;
  aiGenerated: boolean;
  aiPrompt: string | null;
  aiSuggestedCategories: string[];
  completionType: string | null;
  completionReason: string | null;
  createdAt: Date;
  business?: { businessName: string | null; logoUrl: string | null; website?: string | null; description?: string | null } | null;
  _count?: { applications: number };
  // Applications received inside the trending window (see
  // CampaignRepository.countRecentApplications) — attached by the list
  // endpoints only, so it stays absent on single-campaign reads.
  recentApplications?: number;
  distanceKm?: number;
  requirements?: {
    id: string;
    categoryId: string;
    category: { id: string; name: string; key: string; icon: string; color: string };
    quantity: number;
    budgetType: string;
    budgetFixed: number | null;
    budgetMin: number | null;
    budgetMax: number | null;
    deliverables: string | null;
    description: string | null;
    format: string[];
    deadline: Date | null;
    completionType: string | null;
    completionReason: string | null;
    _count?: { applications: number };
  }[];
};

export function toCampaignDto(c: RawCampaign): CampaignDto {
  const dto: CampaignDto = {
    id:             c.id,
    title:          c.title,
    description:    c.description,
    template:       c.template,
    featureImageUrl: c.featureImageUrl,
    category:       c.category,
    categoryKey:    c.category,
    goals:          (c.goals ?? []) as string[],
    platforms:      c.platforms,
    minFollowers:   c.minFollowers,
    contentType:    c.contentType,
    deliverables:   c.deliverables,
    paymentType:    c.paymentType,
    deadline:       c.deadline.toISOString(),
    eventDate:      c.eventDate ? c.eventDate.toISOString() : null,
    eventTime:      c.eventTime ?? null,
    location:       c.location,
    locationLat:    c.locationLat,
    locationLng:    c.locationLng,
    locationType:   c.locationType,
    budgetMin:      c.budgetMin,
    budgetMax:      c.budgetMax,
    status:         c.status,
    isFeatured:     c.isFeatured,
    creatorsNeeded: c.creatorsNeeded,
    campaignType:   c.campaignType,
    capacity:       c.capacity,
    venue:          c.venue,
    benefits:       (c.benefits ?? []) as string[],
    eventStatus:    c.eventStatus,
    paymentStatus:  c.paymentStatus,
    paidAt:         c.paidAt ? c.paidAt.toISOString() : null,
    paymentMethod:  c.paymentMethod,
    commissionRate: c.commissionRate ?? null,
    targetAudience:       c.targetAudience ?? [],
    hashtags:             c.hashtags ?? [],
    sampleCaption:        c.sampleCaption,
    aiGenerated:           c.aiGenerated,
    aiPrompt:              c.aiPrompt,
    aiSuggestedCategories: c.aiSuggestedCategories ?? [],
    completionType:   c.completionType,
    completionReason: c.completionReason,
    createdAt:      c.createdAt.toISOString(),
  };
  if (c.business != null) dto.business = c.business;
  if (c._count  != null) dto._count   = c._count;
  if (c.recentApplications != null) dto.recentProposals = c.recentApplications;
  if (c.distanceKm != null) dto.distanceKm = Math.round(c.distanceKm * 10) / 10;
  if (c.requirements?.length) {
    dto.requirements = c.requirements.map((r) => ({
      id:            r.id,
      categoryId:    r.categoryId,
      category:      r.category,
      quantity:      r.quantity,
      budgetType:    r.budgetType,
      budgetFixed:   r.budgetFixed,
      budgetMin:     r.budgetMin,
      budgetMax:     r.budgetMax,
      deliverables:  r.deliverables,
      description:   r.description,
      format:        r.format ?? [],
      deadline:      r.deadline ? r.deadline.toISOString() : null,
      completionType:   r.completionType,
      completionReason: r.completionReason,
      acceptedCount: r._count?.applications ?? 0,
    }));
  }
  return dto;
}

type RawApplication = {
  id: string;
  campaignId: string;
  requirementId?: string | null;
  coverLetter: string;
  proposedRate: number;
  timeline: string;
  socialHandles: Prisma.JsonValue;
  portfolioUrl: string | null;
  status: string;
  workStatus: string;
  workNote: string | null;
  revisionRequestedAt: Date | null;
  // Only present on call sites that explicitly select the relation (the
  // applications-list endpoints) — other call sites (returning a plain
  // `prisma.application.update()` result) omit it, defaulted to [] below.
  revisionNotes?: { note: string; createdAt: Date }[];
  submittedAt: Date | null;
  deliverableUrls: string | null;
  deliverableVideos?: Prisma.JsonValue;
  deliverableFiles?: Prisma.JsonValue;
  submissionVersions?: {
    version: number;
    note: string | null;
    urls: string | null;
    videos: Prisma.JsonValue;
    files: Prisma.JsonValue;
    late: boolean;
    reviewOutcome: string | null;
    reviewNote: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
  }[];
  paymentStatus: string;
  escrowStatus?: string | null;
  dispute?: {
    status: string;
    reason: string;
    raisedByRole: string;
    resolution: string | null;
    resolutionNote: string | null;
    createdAt: Date;
    resolvedAt: Date | null;
  } | null;
  paidAt: Date | null;
  createdAt: Date;
  campaign?: {
    id?: string;
    title: string;
    category?: string;
    platforms?: string[];
    budgetMin?: number;
    budgetMax?: number;
    deadline?: Date;
    status?: string;
    campaignType?: string;
    paymentStatus?: string;
    paidAt?: Date | null;
    featureImageUrl?: string | null;
    commissionRate?: number | null;
    business?: { id?: string; businessName: string | null; logoUrl?: string | null };
  } | null;
  creator?: {
    id?: string;
    userId?: string;
    fullName: string | null;
    avatarUrl?: string | null;
    location?: string | null;
    categories?: string[];
    socialLinks?: Prisma.JsonValue;
  } | null;
};

// Fallback for the rare read path that returns a bare application row without
// selecting escrowStatus — mirrors the migration's backfill mapping.
function escrowStatusFromPaymentStatus(paymentStatus?: string | null, workStatus?: string | null): string {
  switch (paymentStatus) {
    case 'PAID':     return workStatus === 'DISPUTED' ? 'FROZEN' : 'HELD';
    case 'RELEASED': return 'RELEASED';
    case 'REFUNDED': return 'REFUNDED';
    default:         return 'NOT_FUNDED';
  }
}

export function toApplicationDto(a: RawApplication): ApplicationDto {
  const commissionRate = a.campaign?.commissionRate ?? 0;
  const platformFee = Math.round(a.proposedRate * (commissionRate / 100) * 100) / 100;
  const escrowStatus = a.escrowStatus ?? escrowStatusFromPaymentStatus(a.paymentStatus, a.workStatus);
  const dto: ApplicationDto = {
    id:              a.id,
    campaignId:      a.campaignId,
    requirementId:   a.requirementId ?? null,
    coverLetter:     a.coverLetter,
    proposedRate:    a.proposedRate,
    platformFee,
    businessTotal:   a.proposedRate + platformFee,
    timeline:        a.timeline,
    socialHandles:   (a.socialHandles ?? {}) as Record<string, string>,
    portfolioUrl:    a.portfolioUrl,
    status:          a.status,
    workStatus:      a.workStatus,
    workNote:        a.workNote,
    revisionRequestedAt: a.revisionRequestedAt ? a.revisionRequestedAt.toISOString() : null,
    revisionNotes:   (a.revisionNotes ?? []).map((r) => ({ note: r.note, createdAt: r.createdAt.toISOString() })),
    submittedAt:     a.submittedAt ? a.submittedAt.toISOString() : null,
    deliverableUrls: a.deliverableUrls,
    deliverableVideos: z.array(deliverableVideoSchema).catch([]).parse(a.deliverableVideos ?? []),
    deliverableFiles: z.array(deliverableFileSchema).catch([]).parse(a.deliverableFiles ?? []),
    ...(a.submissionVersions?.length
      ? {
          submissionVersions: a.submissionVersions.map((v) => ({
            version:       v.version,
            note:          v.note,
            urls:          v.urls,
            videos:        z.array(deliverableVideoSchema).catch([]).parse(v.videos ?? []),
            files:         z.array(deliverableFileSchema).catch([]).parse(v.files ?? []),
            late:          v.late,
            reviewOutcome: v.reviewOutcome,
            reviewNote:    v.reviewNote,
            reviewedAt:    v.reviewedAt ? v.reviewedAt.toISOString() : null,
            createdAt:     v.createdAt.toISOString(),
          })),
        }
      : {}),
    paymentStatus:   a.paymentStatus ?? 'UNPAID',
    escrowStatus:    escrowStatus,
    ...(a.dispute
      ? {
          dispute: {
            status:         a.dispute.status,
            reason:         a.dispute.reason,
            raisedByRole:   a.dispute.raisedByRole,
            resolution:     a.dispute.resolution,
            resolutionNote: a.dispute.resolutionNote,
            createdAt:      a.dispute.createdAt.toISOString(),
            resolvedAt:     a.dispute.resolvedAt ? a.dispute.resolvedAt.toISOString() : null,
          },
        }
      : {}),
    engagementState: deriveEngagementState({
      applicationStatus:   a.status,
      workStatus:          a.workStatus,
      escrowStatus:        escrowStatus,
      campaignType:        a.campaign?.campaignType ?? 'PAID_CAMPAIGN',
      campaignStatus:      a.campaign?.status,
      revisionRequestedAt: a.revisionRequestedAt ?? null,
    }),
    paidAt:          a.paidAt ? (a.paidAt instanceof Date ? a.paidAt.toISOString() : a.paidAt) : null,
    createdAt:       a.createdAt.toISOString(),
  };
  if (a.campaign != null) {
    dto.campaign = {
      ...a.campaign,
      deadline: a.campaign.deadline ? a.campaign.deadline.toISOString() : undefined,
      paidAt:   a.campaign.paidAt instanceof Date
        ? a.campaign.paidAt.toISOString()
        : (a.campaign.paidAt ?? null),
    };
  }
  if (a.creator != null) dto.creator = a.creator;
  return dto;
}

// Job/Application Activity tab (§ Activity Timeline) — system-generated
// events only, kept separate from chat. `action` is the dot.snake_case
// taxonomy string from ActivityAction; clients format the human-readable
// sentence from it (same approach as the admin activity feed's generic
// formatAction()) so it stays translatable rather than baking English
// sentences into the row at write time.
export interface ActivityLogDto {
  id: string;
  action: string;
  metadata: unknown;
  createdAt: string;
}

export function toActivityLogDto(a: { id: string; action: string; metadata: Prisma.JsonValue; createdAt: Date }): ActivityLogDto {
  return {
    id:        a.id,
    action:    a.action,
    metadata:  a.metadata,
    createdAt: a.createdAt.toISOString(),
  };
}

export interface EventQuestionDto {
  id: string;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
  isMine: boolean;
  // Populated only for the business viewer — the mobile client shows creators
  // an anonymized "A creator asked" label instead.
  askerName: string | null;
}

type RawEventQuestion = {
  id: string;
  creatorId: string;
  question: string;
  answer: string | null;
  answeredAt: Date | null;
  createdAt: Date;
  creator: { id: string; fullName: string | null };
};

export function toEventQuestionDto(
  q: RawEventQuestion,
  opts: { includeAsker: boolean; viewerCreatorId?: string },
): EventQuestionDto {
  return {
    id:         q.id,
    question:   q.question,
    answer:     q.answer,
    answeredAt: q.answeredAt ? q.answeredAt.toISOString() : null,
    createdAt:  q.createdAt.toISOString(),
    isMine:     !!opts.viewerCreatorId && q.creatorId === opts.viewerCreatorId,
    askerName:  opts.includeAsker ? (q.creator.fullName ?? null) : null,
  };
}
