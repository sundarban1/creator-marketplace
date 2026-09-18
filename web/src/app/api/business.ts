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
  hashtags?: string[];
  budgetRateType?: 'FIXED' | 'RANGE' | null;
  // Open-event-only fields.
  capacity?: number | null;
  eventDate?: string | null;
  eventTime?: string | null;
  venue?: string | null;
  benefits?: string[];
  targetAudience?: string[];
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
  featureImageUrl?: string;
  hashtags?: string[];
  isFeatured?: boolean;
  // Open-event-only fields — ignored server-side for PAID_CAMPAIGN.
  capacity?: number;
  eventDate?: string; // ISO
  eventTime?: string; // "HH:mm"
  venue?: string;
  benefits?: string[];
  targetAudience?: string[];
}

export function createCampaign(input: CreateCampaignInput): Promise<{ id: string }> {
  return apiRequest<{ id: string }>('POST', '/api/campaigns', input).then((r) => r.data);
}

/** Matches backend's updateCampaignSchema — a narrower field set than create (no aiGenerated/aiPrompt/goals). */
export interface UpdateCampaignInput {
  title?: string;
  description?: string;
  featureImageUrl?: string | null;
  category?: string;
  platforms?: string[];
  minFollowers?: number;
  deliverables?: string;
  targetAudience?: string[];
  hashtags?: string[];
  deadline?: string; // ISO
  location?: string | null;
  locationType?: 'ONSITE' | 'REMOTE';
  budgetMin?: number;
  budgetMax?: number;
  budgetRateType?: 'FIXED' | 'RANGE';
  budgetInputType?: 'PER_CREATOR' | 'TOTAL';
  creatorsNeeded?: number;
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'CANCELLED';
  isFeatured?: boolean;
  capacity?: number;
  eventDate?: string; // ISO
  eventTime?: string | null;
  venue?: string;
  benefits?: string[];
}

export function updateCampaign(id: string, input: UpdateCampaignInput): Promise<MyCampaign> {
  return apiRequest<MyCampaign>('PUT', `/api/campaigns/${id}`, input).then((r) => r.data);
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
  featureImageUrl?: string | null;
  featureImageCredit?: { name: string; profileUrl: string } | null;
}

export function generateAiDraft(prompt: string): Promise<AiDraft> {
  return apiRequest<AiDraft>('POST', '/api/campaigns/ai/generate', { prompt, inputSource: 'text' }).then(
    (r) => r.data,
  );
}

/** Free/open-event counterpart of {@link AiDraft} — mirrors the mobile app's "Create Invitation" AI draft. */
export interface AiEventDraft {
  title: string;
  description: string;
  category: string;
  platform: string;
  benefits: string[];
  exchangeType: string[];
  expectedContent: string;
  capacity: number;
  location: string | null;
  eventDate: string | null; // YYYY-MM-DD
  eventTime: string | null; // HH:mm
  venue: string | null;
  needsInput: string[];
  featureImageUrl?: string | null;
  featureImageCredit?: { name: string; profileUrl: string } | null;
}

export function generateEventAiDraft(prompt: string): Promise<AiEventDraft> {
  return apiRequest<AiEventDraft>('POST', '/api/campaigns/ai/generate-event', { prompt, inputSource: 'text' }).then(
    (r) => r.data,
  );
}

export function uploadCampaignFeatureImage(file: File): Promise<{ imageUrl: string }> {
  const form = new FormData();
  form.append('image', file);
  return apiUpload<{ imageUrl: string }>('/api/campaigns/feature-image', form);
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
    followers?: number;
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

/** Pays with any non-eSewa method (Kolab Credits, or another admin-enabled method with no dedicated gateway flow) — mirrors mobile's campaignService.payForApplication. */
export function payForApplication(appId: string, method: string): Promise<unknown> {
  return apiRequest('PUT', `/api/campaigns/applications/${appId}/pay`, { method }).then((r) => r.data);
}

/** Kolab Rewards business credits balance — same endpoint mobile's creditsService.getBalance hits. */
export function getBusinessCredits(): Promise<{ balance: number }> {
  return apiRequest<{ balance: number }>('GET', '/api/business/credits').then((r) => r.data);
}

/** Starts an eSewa escrow-funding payment; returns a checkout-page URL to redirect the browser to. */
export function initiateEsewaPayment(appId: string): Promise<{ paymentUrl: string }> {
  return apiRequest<{ paymentUrl: string }>(
    'POST',
    `/api/campaigns/applications/${appId}/pay/esewa/initiate`,
    undefined,
    { params: { platform: 'web' } },
  ).then((r) => r.data);
}

export function approveWork(appId: string): Promise<BusinessApplication> {
  return apiRequest<BusinessApplication>('PUT', `/api/campaigns/applications/${appId}/approve`).then(
    (r) => r.data,
  );
}

export function reportIssue(appId: string, reason: string): Promise<void> {
  return apiRequest('PUT', `/api/campaigns/applications/${appId}/report-issue`, { reason }).then(() => undefined);
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

// Admin-configurable "feature this event" paywall (see backend
// CampaignService.getFeaturedQuota) — `unlimited` is true whenever the admin
// hasn't turned the paywall on at all, or this business is on the
// email allowlist, in which case `remaining` is a large sentinel, not a real count.
export interface FeaturedQuota {
  paywallEnabled: boolean;
  freeQuota: number;
  used: number;
  remaining: number;
  price: number;
  unlimited: boolean;
}

export function fetchFeaturedQuota(signal?: AbortSignal): Promise<FeaturedQuota> {
  return apiRequest<FeaturedQuota>('GET', '/api/campaigns/featured-quota', undefined, { signal }).then(
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
  /** Backend field is `description`, not `about` — matches `BusinessProfileDto`. */
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  website: string | null;
  location: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  province?: string | null;
  district?: string | null;
  city?: string | null;
  /** The business's own industry/industries — an array, not a single string. */
  categories: string[];
  /** What kind of creators an INDIVIDUAL is looking for (organizations leave this empty). */
  defaultCreatorCategories?: string[];
  representingType?: 'ORGANIZATION' | 'INDIVIDUAL' | null;
  contactPersonName?: string | null;
  phone: string | null;
  isVerified: boolean;
  /** Server-computed — every doc approved, not just `isVerified`. */
  fullyVerified: boolean;
  favoritedByCount: number;
  socialLinks?: Record<string, string>;
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  hideSocialLinks: boolean;
  paymentMethods: string[];
  verificationStatus: 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED';
  verificationRejectReason: string | null;
  panDocUrl: string | null;
  panDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  identityDocUrl: string | null;
  identityDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  companyRegDocUrl: string | null;
  companyRegDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

export function fetchBusinessProfile(signal?: AbortSignal): Promise<BusinessProfile> {
  return apiRequest<BusinessProfile>('GET', '/api/business/profile', undefined, { signal }).then(
    (r) => r.data,
  );
}

export interface UpdateBusinessProfileInput extends Partial<BusinessProfile> {
  /** Write-only — not part of the profile DTO, only accepted on a phone-signup account. */
  email?: string;
}

export function updateBusinessProfile(patch: UpdateBusinessProfileInput): Promise<BusinessProfile> {
  return apiRequest<BusinessProfile>('PUT', '/api/business/profile', patch).then((r) => r.data);
}

export function uploadBusinessLogo(file: File): Promise<{ logoUrl: string }> {
  const form = new FormData();
  form.append('logo', file);
  return apiUpload<{ logoUrl: string }>('/api/business/logo', form);
}

export function uploadBusinessCover(file: File): Promise<{ coverImageUrl: string }> {
  const form = new FormData();
  form.append('cover', file);
  return apiUpload<{ coverImageUrl: string }>('/api/business/cover', form);
}

// ── Referrals ────────────────────────────────────────────────────────────────

export interface BusinessReferralOverview {
  code: string;
  rewardAmount: number;
  referredBy: { name: string | null } | null;
  referrals: {
    id: string;
    referredName: string;
    referredLogoUrl?: string | null;
    status: string;
    linkedAt: string;
    expiresAt: string;
    completedAt?: string | null;
  }[];
}

export function fetchBusinessReferralOverview(signal?: AbortSignal): Promise<BusinessReferralOverview> {
  return apiRequest<BusinessReferralOverview>('GET', '/api/business/referral', undefined, { signal }).then(
    (r) => r.data,
  );
}

export function applyBusinessReferralCode(code: string): Promise<void> {
  return apiRequest('POST', '/api/business/referral/apply-code', { code }).then(() => undefined);
}

export function resendBusinessReferral(id: string): Promise<void> {
  return apiRequest('POST', `/api/business/referral/${id}/resend`).then(() => undefined);
}

// ── Verification documents ───────────────────────────────────────────────────

export interface DocUploadResult {
  docUrl: string;
  panDocStatus?: string;
  identityDocStatus?: string;
  companyRegDocStatus?: string;
}

export function uploadPanDoc(file: File): Promise<DocUploadResult> {
  const form = new FormData();
  form.append('document', file);
  return apiUpload<DocUploadResult>('/api/business/documents/pan', form);
}

export function uploadCompanyRegDoc(file: File): Promise<DocUploadResult> {
  const form = new FormData();
  form.append('document', file);
  return apiUpload<DocUploadResult>('/api/business/documents/company-reg', form);
}

export function uploadIdentityDoc(file: File): Promise<DocUploadResult> {
  const form = new FormData();
  form.append('document', file);
  return apiUpload<DocUploadResult>('/api/business/documents/identity', form);
}
