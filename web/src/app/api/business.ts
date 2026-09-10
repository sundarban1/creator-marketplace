/**
 * Authenticated business endpoints — mirrors the mobile business app's contract.
 */

import { apiRequest, apiUpload, type ApiPagination } from '../lib/apiClient';
import type { EngagementState } from '../lib/engagement';
import type { CreatorApplication, DeliverableFile } from './creator';
import type { CreatorProfile } from './publicMarketplace';

// ── My campaigns / events ────────────────────────────────────────────────────

export interface MyCampaign {
  id: string;
  title: string;
  description: string;
  featureImageUrl?: string | null;
  category: string;
  platforms: string[];
  deliverables: string;
  deadline: string;
  location?: string | null;
  locationType?: 'ONSITE' | 'REMOTE' | null;
  budgetMin: number;
  budgetMax: number;
  budgetInputType?: 'PER_CREATOR' | 'TOTAL' | null;
  totalBudget?: number | null;
  creatorsNeeded?: number;
  campaignType?: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'CANCELLED' | 'EXPIRED';
  isFeatured: boolean;
  minFollowers: number;
  paymentStatus: string;
  createdAt: string;
  business: { businessName: string; logoUrl: string | null };
  _count: { applications: number };
  goals?: string[];
}

export function fetchMyCampaigns(
  opts: { status?: string; search?: string; page?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<{ items: MyCampaign[]; pagination?: ApiPagination }> {
  return apiRequest<MyCampaign[]>('GET', '/api/campaigns/my', undefined, {
    signal,
    params: { status: opts.status, search: opts.search, page: opts.page ?? 1, limit: opts.limit ?? 50 },
  }).then((r) => ({ items: r.data, pagination: r.pagination }));
}

export function fetchCampaign(id: string, signal?: AbortSignal): Promise<MyCampaign & Record<string, unknown>> {
  return apiRequest<MyCampaign & Record<string, unknown>>('GET', `/api/campaigns/${id}`, undefined, {
    signal,
  }).then((r) => r.data);
}

// ── Create an event ──────────────────────────────────────────────────────────

export interface CreateCampaignInput {
  title: string;
  description: string;
  category: string;
  platforms: string[];
  campaignType: 'PAID_CAMPAIGN' | 'OPEN_EVENT';
  budgetMin: number;
  budgetMax: number;
  budgetInputType: 'PER_CREATOR' | 'TOTAL';
  budgetRateType: 'FIXED' | 'RANGE';
  creatorsNeeded: number;
  deadline: string; // ISO
  deliverables: string;
  minFollowers: number;
  location?: string;
  locationType: 'ONSITE' | 'REMOTE';
  goals: string[];
  status: 'DRAFT' | 'ACTIVE';
  aiGenerated?: boolean;
  aiPrompt?: string;
}

export function createCampaign(input: CreateCampaignInput): Promise<{ id: string }> {
  return apiRequest<{ id: string }>('POST', '/api/campaigns', input).then((r) => r.data);
}

export interface AiDraft {
  title: string;
  description: string;
  category: string;
  platform: string;
  creatorsNeeded: number;
  budgetStatus: 'STATED_PER_CREATOR' | 'STATED_TOTAL' | 'AMBIGUOUS' | 'NOT_STATED';
  statedAmount: number | null;
  statedAmountMax: number | null;
  budgetRateType: 'FIXED' | 'RANGE';
  budgetMin: number;
  budgetMax: number;
  suggestedDurationDays: number;
  deliverables: Record<string, number>;
  hashtags: string[];
  location: string | null;
  needsInput: string[];
}

export function generateAiDraft(prompt: string): Promise<AiDraft> {
  return apiRequest<AiDraft>('POST', '/api/campaigns/ai/generate', { prompt, inputSource: 'text' }).then(
    (r) => r.data,
  );
}

// ── Applications the business received ────────────────────────────────────────

export interface BusinessApplication extends CreatorApplication {
  creator?: {
    id?: string;
    userId?: string;
    fullName: string | null;
    avatarUrl?: string | null;
    location?: string | null;
    categories?: string[];
  } | null;
  engagementState: EngagementState | string;
  deliverableFiles?: DeliverableFile[];
}

export function fetchBusinessApplications(
  opts: { status?: string; campaignType?: string; page?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<{ items: BusinessApplication[]; pagination?: ApiPagination }> {
  return apiRequest<BusinessApplication[]>('GET', '/api/campaigns/applications/business', undefined, {
    signal,
    params: {
      status: opts.status,
      campaignType: opts.campaignType,
      page: opts.page ?? 1,
      limit: opts.limit ?? 100,
    },
  }).then((r) => ({ items: r.data, pagination: r.pagination }));
}

export function acceptApplication(campaignId: string, appId: string): Promise<BusinessApplication> {
  return apiRequest<BusinessApplication>(
    'PUT',
    `/api/campaigns/${campaignId}/applications/${appId}/accept`,
  ).then((r) => r.data);
}

export function rejectApplication(
  campaignId: string,
  appId: string,
  reason?: string,
): Promise<BusinessApplication> {
  return apiRequest<BusinessApplication>(
    'PUT',
    `/api/campaigns/${campaignId}/applications/${appId}/reject`,
    { reason },
  ).then((r) => r.data);
}

export function payForApplication(appId: string): Promise<unknown> {
  return apiRequest('PUT', `/api/campaigns/applications/${appId}/pay`).then((r) => r.data);
}

export function approveWork(appId: string): Promise<BusinessApplication> {
  return apiRequest<BusinessApplication>('PUT', `/api/campaigns/applications/${appId}/approve`).then(
    (r) => r.data,
  );
}

export function requestRevision(appId: string, note: string): Promise<BusinessApplication> {
  return apiRequest<BusinessApplication>(
    'PUT',
    `/api/campaigns/applications/${appId}/request-revision`,
    { note },
  ).then((r) => r.data);
}

// ── Find creators ────────────────────────────────────────────────────────────

export interface BusinessCreatorCard {
  id: string;
  username?: string | null;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  categories: string[];
  isVerified: boolean;
  fullyVerified: boolean;
  socialAccounts: { platform: string; followers: number }[];
  isSaved?: boolean;
}

export function listBusinessCreators(
  q: { search?: string; categories?: string[]; platforms?: string[]; location?: string; sort?: string; page?: number },
  signal?: AbortSignal,
): Promise<{ creators: BusinessCreatorCard[]; total: number; page: number; limit: number }> {
  return apiRequest<{ creators: BusinessCreatorCard[]; total: number; page: number; limit: number }>(
    'GET',
    '/api/business/creators',
    undefined,
    {
      signal,
      params: {
        search: q.search,
        categories: q.categories?.join(','),
        platforms: q.platforms?.join(','),
        location: q.location,
        sort: q.sort,
        page: q.page ?? 1,
        limit: 12,
      },
    },
  ).then((r) => r.data);
}

/** Same controller as the public endpoint — returns the full public profile. */
export function getBusinessCreator(id: string, signal?: AbortSignal): Promise<CreatorProfile> {
  return apiRequest<CreatorProfile>('GET', `/api/business/creators/${id}`, undefined, { signal }).then(
    (r) => r.data,
  );
}

export function toggleSaveCreator(id: string): Promise<{ saved: boolean }> {
  return apiRequest<{ saved: boolean }>('POST', `/api/business/creators/${id}/save`).then((r) => r.data);
}

export function fetchSavedCreatorIds(signal?: AbortSignal): Promise<string[]> {
  return apiRequest<{ ids: string[] }>('GET', '/api/business/creators/saved-ids', undefined, {
    signal,
  }).then((r) => r.data.ids ?? []);
}

export function inviteCreators(campaignId: string, creatorIds: string[]): Promise<unknown> {
  return apiRequest('POST', `/api/business/campaigns/${campaignId}/invite`, { creatorIds }).then(
    (r) => r.data,
  );
}

// ── Payments / analytics ─────────────────────────────────────────────────────

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  status: string;
  method: string | null;
  createdAt: string;
  paidAt?: string | null;
  campaign?: { id: string; title: string } | null;
  creator?: { fullName: string | null; avatarUrl?: string | null } | null;
}

export function fetchPaymentHistory(signal?: AbortSignal): Promise<PaymentHistoryItem[]> {
  return apiRequest<PaymentHistoryItem[]>('GET', '/api/business/payment-history', undefined, {
    signal,
  }).then((r) => r.data);
}

// ── Profile ──────────────────────────────────────────────────────────────────

export interface BusinessProfile {
  id: string;
  userId: string;
  businessName: string | null;
  about: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  website: string | null;
  location: string | null;
  industry: string | null;
  hiringType?: string | null;
  isVerified: boolean;
  socialLinks?: Record<string, string>;
}

export function fetchBusinessProfile(signal?: AbortSignal): Promise<BusinessProfile> {
  return apiRequest<BusinessProfile>('GET', '/api/business/profile', undefined, { signal }).then(
    (r) => r.data,
  );
}

export function updateBusinessProfile(patch: Partial<BusinessProfile>): Promise<BusinessProfile> {
  return apiRequest<BusinessProfile>('PUT', '/api/business/profile', patch).then((r) => r.data);
}

export function uploadBusinessLogo(file: File): Promise<{ logoUrl: string }> {
  const form = new FormData();
  form.append('logo', file);
  return apiUpload<{ logoUrl: string }>('/api/business/logo', form);
}
