import { Prisma } from '@prisma/client';

export interface CampaignDto {
  id: string;
  title: string;
  description: string;
  template: string | null;
  category: string;
  goals: string[];
  platform: string;
  minFollowers: number;
  contentType: string;
  deliverables: string;
  paymentType: string;
  deadline: string;
  eventDate: string | null;
  location: string | null;
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
  objective: string | null;
  contentGuidelines: string[];
  targetAudience: string[];
  hashtags: string[];
  sampleCaption: string | null;
  callToAction: string | null;
  approvalRequirements: string | null;
  aiGenerated: boolean;
  aiPrompt: string | null;
  aiSuggestedCategories: string[];
  aiSuggestedPlatforms: string[];
  createdAt: string;
  business?: {
    businessName: string | null;
    logoUrl: string | null;
    website?: string | null;
    description?: string | null;
  };
  _count?: { applications: number };
  distanceKm?: number;
}

export interface ApplicationDto {
  id: string;
  campaignId: string;
  coverLetter: string;
  proposedRate: number;
  timeline: string;
  socialHandles: Record<string, string>;
  portfolioUrl: string | null;
  status: string;
  workStatus: string;
  workNote: string | null;
  submittedAt: string | null;
  deliverableUrls: string | null;
  paymentStatus: string;
  paidAt: string | null;
  createdAt: string;
  campaign?: {
    id?: string;
    title: string;
    category?: string;
    platform?: string;
    budgetMin?: number;
    budgetMax?: number;
    deadline?: string;
    status?: string;
    campaignType?: string;
    paymentStatus?: string;
    paidAt?: string | null;
    business?: { id?: string; businessName: string | null; logoUrl: string | null };
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
  category: string;
  goals: Prisma.JsonValue;
  platform: string;
  minFollowers: number;
  contentType: string;
  deliverables: string;
  paymentType: string;
  deadline: Date;
  eventDate: Date | null;
  location: string | null;
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
  objective: string | null;
  contentGuidelines: string[];
  targetAudience: string[];
  hashtags: string[];
  sampleCaption: string | null;
  callToAction: string | null;
  approvalRequirements: string | null;
  aiGenerated: boolean;
  aiPrompt: string | null;
  aiSuggestedCategories: string[];
  aiSuggestedPlatforms: string[];
  createdAt: Date;
  business?: { businessName: string | null; logoUrl: string | null; website?: string | null; description?: string | null } | null;
  _count?: { applications: number };
  distanceKm?: number;
};

export function toCampaignDto(c: RawCampaign): CampaignDto {
  const dto: CampaignDto = {
    id:             c.id,
    title:          c.title,
    description:    c.description,
    template:       c.template,
    category:       c.category,
    goals:          (c.goals ?? []) as string[],
    platform:       c.platform,
    minFollowers:   c.minFollowers,
    contentType:    c.contentType,
    deliverables:   c.deliverables,
    paymentType:    c.paymentType,
    deadline:       c.deadline.toISOString(),
    eventDate:      c.eventDate ? c.eventDate.toISOString() : null,
    location:       c.location,
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
    objective:            c.objective,
    contentGuidelines:    c.contentGuidelines ?? [],
    targetAudience:       c.targetAudience ?? [],
    hashtags:             c.hashtags ?? [],
    sampleCaption:        c.sampleCaption,
    callToAction:         c.callToAction,
    approvalRequirements: c.approvalRequirements,
    aiGenerated:           c.aiGenerated,
    aiPrompt:              c.aiPrompt,
    aiSuggestedCategories: c.aiSuggestedCategories ?? [],
    aiSuggestedPlatforms:  c.aiSuggestedPlatforms ?? [],
    createdAt:      c.createdAt.toISOString(),
  };
  if (c.business != null) dto.business = c.business;
  if (c._count  != null) dto._count   = c._count;
  if (c.distanceKm != null) dto.distanceKm = Math.round(c.distanceKm * 10) / 10;
  return dto;
}

type RawApplication = {
  id: string;
  campaignId: string;
  coverLetter: string;
  proposedRate: number;
  timeline: string;
  socialHandles: Prisma.JsonValue;
  portfolioUrl: string | null;
  status: string;
  workStatus: string;
  workNote: string | null;
  submittedAt: Date | null;
  deliverableUrls: string | null;
  paymentStatus: string;
  paidAt: Date | null;
  createdAt: Date;
  campaign?: {
    id?: string;
    title: string;
    category?: string;
    platform?: string;
    budgetMin?: number;
    budgetMax?: number;
    deadline?: Date;
    status?: string;
    campaignType?: string;
    paymentStatus?: string;
    paidAt?: Date | null;
    business?: { id?: string; businessName: string | null; logoUrl: string | null };
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

export function toApplicationDto(a: RawApplication): ApplicationDto {
  const dto: ApplicationDto = {
    id:              a.id,
    campaignId:      a.campaignId,
    coverLetter:     a.coverLetter,
    proposedRate:    a.proposedRate,
    timeline:        a.timeline,
    socialHandles:   (a.socialHandles ?? {}) as Record<string, string>,
    portfolioUrl:    a.portfolioUrl,
    status:          a.status,
    workStatus:      a.workStatus,
    workNote:        a.workNote,
    submittedAt:     a.submittedAt ? a.submittedAt.toISOString() : null,
    deliverableUrls: a.deliverableUrls,
    paymentStatus:   a.paymentStatus ?? 'UNPAID',
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
