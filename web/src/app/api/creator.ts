/**
 * Authenticated creator endpoints. Same backend contract the mobile creator
 * app uses — do not diverge.
 */

import { apiRequest, apiUpload, type ApiPagination } from '../lib/apiClient';
import type { EngagementState } from '../lib/engagement';

// ── Wallet ───────────────────────────────────────────────────────────────────

export interface WalletSummary {
  totalEarned: number;
  pendingEarnings: number;
  availableBalance: number;
  pendingWithdrawals: number;
  withdrawableBalance: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  dailyLimit: number;
  dailyWithdrawalUsed: number;
  dailyWithdrawalLeft: number;
  dailyLimitReached: boolean;
  hasPendingWithdrawal: boolean;
}

export function fetchWalletSummary(signal?: AbortSignal): Promise<WalletSummary> {
  return apiRequest<WalletSummary>('GET', '/api/creator/wallet', undefined, { signal }).then((r) => r.data);
}

/** Unified statement row — realized ledger entries + in-flight withdrawals. */
export interface WalletTransaction {
  id: string;
  kind: 'CAMPAIGN_PAYOUT' | 'REFERRAL_REWARD' | 'REFERRAL_BONUS' | 'WITHDRAWAL' | 'ADJUSTMENT';
  direction: 'CREDIT' | 'DEBIT';
  amount: number;
  status: string;
  title: string;
  campaignTitle: string | null;
  method: string | null;
  reference: string | null;
  proofUrl: string | null;
  createdAt: string;
}

export function fetchWalletTransactions(signal?: AbortSignal): Promise<WalletTransaction[]> {
  return apiRequest<WalletTransaction[]>('GET', '/api/creator/wallet/transactions', undefined, {
    signal,
  }).then((r) => r.data);
}

export interface Withdrawal {
  id: string;
  amount: number;
  method: 'BANK' | 'ESEWA' | 'KHALTI';
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED';
  referenceCode: string | null;
  payoutSnapshot: Record<string, unknown> | null;
  transactionReference: string | null;
  paymentDate: string | null;
  screenshotUrl: string | null;
  rejectionReason: string | null;
  processedAt: string | null;
  createdAt: string;
}

export function fetchWithdrawals(signal?: AbortSignal): Promise<Withdrawal[]> {
  return apiRequest<Withdrawal[]>('GET', '/api/creator/wallet/withdrawals', undefined, { signal }).then(
    (r) => r.data,
  );
}

// ── Payout methods ───────────────────────────────────────────────────────────

export interface PayoutMethod {
  id: string;
  type: 'BANK' | 'ESEWA' | 'KHALTI';
  label: string | null;
  accountName: string;
  bankName: string | null;
  branch: string | null;
  accountNumber: string | null;
  walletId: string | null;
  isDefault: boolean;
  createdAt: string;
}

export function fetchPayoutMethods(signal?: AbortSignal): Promise<PayoutMethod[]> {
  return apiRequest<PayoutMethod[]>('GET', '/api/creator/wallet/payout-methods', undefined, {
    signal,
  }).then((r) => r.data);
}

export type CreatePayoutMethodInput =
  | { type: 'BANK'; accountName: string; bankName: string; accountNumber: string; branch?: string; label?: string; isDefault?: boolean }
  | { type: 'ESEWA' | 'KHALTI'; accountName: string; walletId: string; label?: string; isDefault?: boolean };

export function createPayoutMethod(input: CreatePayoutMethodInput): Promise<PayoutMethod> {
  return apiRequest<PayoutMethod>('POST', '/api/creator/wallet/payout-methods', input).then(
    (r) => r.data,
  );
}

export function createWithdrawal(
  payoutMethodId: string,
  amount: number,
): Promise<WalletSummary> {
  return apiRequest<{ withdrawal: Withdrawal } & WalletSummary>(
    'POST',
    '/api/creator/wallet/withdrawals',
    { payoutMethodId, amount },
  ).then((r) => r.data);
}

export function cancelWithdrawal(id: string): Promise<WalletSummary> {
  return apiRequest<{ withdrawal: Withdrawal } & WalletSummary>(
    'POST',
    `/api/creator/wallet/withdrawals/${encodeURIComponent(id)}/cancel`,
  ).then((r) => r.data);
}

// ── Applications / work ──────────────────────────────────────────────────────

export interface DeliverableFile {
  id: string;
  publicId: string;
  url: string;
  fileType: 'IMAGE' | 'DOCUMENT';
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}

export interface DeliverableVideo {
  publicId: string;
  url: string;
  thumbnailUrl?: string;
  durationSec: number;
  format: string;
  sizeBytes: number;
  label: string;
  uploadedAt: string;
  status?: 'PROCESSING' | 'READY' | 'FAILED';
}

export interface CreatorApplication {
  id: string;
  campaignId: string;
  coverLetter: string;
  proposedRate: number;
  /** Derived server-side from proposedRate + the campaign's snapshotted commissionRate. */
  platformFee?: number;
  businessTotal?: number;
  timeline: string;
  socialHandles?: Record<string, string>;
  portfolioUrl?: string | null;
  status: string;
  workStatus: string;
  paymentStatus: string;
  escrowStatus: string;
  engagementState: EngagementState | string;
  workNote?: string | null;
  revisionRequestedAt?: string | null;
  revisionNotes?: { note: string; createdAt: string }[];
  submittedAt: string | null;
  submittedLate?: boolean;
  contentDeadline: string | null;
  businessReviewDueAt?: string | null;
  paymentReleaseAt: string | null;
  createdAt: string;
  paidAt: string | null;
  deliverableFiles?: DeliverableFile[];
  deliverableVideos?: DeliverableVideo[];
  dispute?: {
    status: string;
    reason: string;
    raisedByRole: string;
    resolution: string | null;
    resolutionNote: string | null;
    createdAt: string;
    resolvedAt: string | null;
  } | null;
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
    featureImageUrl?: string | null;
    business?: { businessName: string | null; logoUrl?: string | null };
  };
}

export function fetchMyApplications(
  opts: { status?: string; page?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<{ items: CreatorApplication[]; pagination?: ApiPagination }> {
  return apiRequest<CreatorApplication[]>('GET', '/api/campaigns/applications/my', undefined, {
    signal,
    params: { status: opts.status, page: opts.page ?? 1, limit: opts.limit ?? 20 },
  }).then((r) => ({ items: r.data, pagination: r.pagination }));
}

// ── Work lifecycle (there is no GET one-application route — callers find the
//    application in the `fetchMyApplications` list by id) ─────────────────────

export function startWork(appId: string): Promise<CreatorApplication> {
  return apiRequest<CreatorApplication>('PUT', `/api/campaigns/applications/${appId}/start`).then(
    (r) => r.data,
  );
}

/** Deliverables: JPG/JPEG/PNG/PDF/DOCX, ≤ 5 MB (backend-enforced). */
export function uploadDeliverableFile(appId: string, file: File): Promise<DeliverableFile> {
  const form = new FormData();
  form.append('file', file);
  return apiUpload<DeliverableFile>(`/api/campaigns/applications/${appId}/deliverables/file`, form);
}

export function removeDeliverableFile(appId: string, fileId: string): Promise<void> {
  return apiRequest(
    'DELETE',
    `/api/campaigns/applications/${appId}/deliverables/file`,
    undefined,
    { params: { fileId } },
  ).then(() => undefined);
}

export function submitWork(appId: string, note?: string): Promise<CreatorApplication> {
  return apiRequest<CreatorApplication>('PUT', `/api/campaigns/applications/${appId}/submit`, {
    note,
  }).then((r) => r.data);
}

export function reportIssue(appId: string, reason: string): Promise<void> {
  return apiRequest('PUT', `/api/campaigns/applications/${appId}/report-issue`, { reason }).then(
    () => undefined,
  );
}

// ── Reviews — shared by both roles (the endpoint takes either), so business
// pages import these from here too rather than duplicating them. ────────────

export interface ReviewRecord {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ReviewReceived extends ReviewRecord {
  from: { name: string | null; avatarUrl: string | null };
}

export function submitReview(appId: string, rating: number, comment?: string): Promise<ReviewRecord> {
  return apiRequest<ReviewRecord>('POST', `/api/campaigns/applications/${appId}/review`, { rating, comment }).then(
    (r) => r.data,
  );
}

/** null when the caller hasn't reviewed yet — not an error. */
export function getMyReview(appId: string, signal?: AbortSignal): Promise<ReviewRecord | null> {
  return apiRequest<ReviewRecord | null>('GET', `/api/campaigns/applications/${appId}/review`, undefined, { signal }).then(
    (r) => r.data,
  );
}

/** The review the OTHER party left for the caller — null when they haven't rated yet. */
export function getReviewReceived(appId: string, signal?: AbortSignal): Promise<ReviewReceived | null> {
  return apiRequest<ReviewReceived | null>('GET', `/api/campaigns/applications/${appId}/review-received`, undefined, { signal }).then(
    (r) => r.data,
  );
}

export interface ApplyInput {
  coverLetter: string;
  proposedRate: number;
  timeline: string;
  socialHandles?: Record<string, string>;
  portfolioUrl?: string;
  requirementId?: string;
}

export function applyToCampaign(campaignId: string, input: ApplyInput): Promise<CreatorApplication> {
  return apiRequest<CreatorApplication>('POST', `/api/campaigns/${campaignId}/apply`, input).then(
    (r) => r.data,
  );
}

// ── Invitations ──────────────────────────────────────────────────────────────

export interface Invitation {
  id: string;
  campaignId: string;
  status: string;
  hasApplied?: boolean;
  campaign?: {
    id: string;
    title: string;
    campaignType?: string;
    budgetMin?: number;
    budgetMax?: number;
    deadline?: string;
    featureImageUrl?: string | null;
    business?: { businessName: string | null; logoUrl?: string | null };
  };
  createdAt: string;
}

export function fetchInvitations(signal?: AbortSignal): Promise<Invitation[]> {
  return apiRequest<Invitation[]>('GET', '/api/creator/invitations', undefined, { signal }).then(
    (r) => r.data,
  );
}

export function respondToInvitation(id: string, status: 'ACCEPTED' | 'DECLINED'): Promise<Invitation> {
  return apiRequest<Invitation>('POST', `/api/creator/invitations/${id}/respond`, { status }).then(
    (r) => r.data,
  );
}

// ── Referrals ────────────────────────────────────────────────────────────────

export interface ReferralOverview {
  code: string;
  rewardAmount: number;
  referredBy: { name: string | null } | null;
  referrals: {
    id: string;
    referredName: string;
    referredAvatarUrl?: string | null;
    status: string;
    linkedAt: string;
    expiresAt: string;
    completedAt?: string | null;
  }[];
}

export function fetchReferralOverview(signal?: AbortSignal): Promise<ReferralOverview> {
  return apiRequest<ReferralOverview>('GET', '/api/creator/referral', undefined, { signal }).then(
    (r) => r.data,
  );
}

export function applyReferralCode(code: string): Promise<void> {
  return apiRequest('POST', '/api/creator/referral/apply-code', { code }).then(() => undefined);
}

// ── Notifications ────────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  refId?: string | null;
  refType?: string | null;
  createdAt: string;
}

export function fetchNotifications(limit = 10, signal?: AbortSignal): Promise<AppNotification[]> {
  return apiRequest<AppNotification[]>('GET', '/api/notifications', undefined, {
    signal,
    params: { limit },
  }).then((r) => r.data);
}

export interface NotificationsPageResult {
  items: AppNotification[];
  total: number;
}

/** Newest-first, server-paginated — backs the "View all" notifications screen. */
export function fetchNotificationsPage(
  page: number,
  limit = 20,
  signal?: AbortSignal,
): Promise<NotificationsPageResult> {
  return apiRequest<AppNotification[]>('GET', '/api/notifications', undefined, {
    signal,
    params: { page, limit },
  }).then((r) => ({ items: r.data, total: r.pagination?.total ?? r.data.length }));
}

export function markNotificationRead(id: string): Promise<void> {
  return apiRequest('PATCH', `/api/notifications/${id}/read`).then(() => undefined);
}

export interface NotificationSettings {
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
}

export function fetchNotificationSettings(signal?: AbortSignal): Promise<NotificationSettings> {
  return apiRequest<NotificationSettings>('GET', '/api/notifications/settings', undefined, { signal }).then(
    (r) => r.data,
  );
}

export function updateNotificationSettings(patch: Partial<NotificationSettings>): Promise<NotificationSettings> {
  return apiRequest<NotificationSettings>('PUT', '/api/notifications/settings', patch).then((r) => r.data);
}

// ── Profile ──────────────────────────────────────────────────────────────────

export interface CreatorSocialAccount {
  id: string;
  platform: string;
  profileUrl: string;
  followers: number;
  connectedViaOAuth: boolean;
  avatarUrl: string | null;
  followersSyncedAt: string | null;
}

export interface FacebookPageOption {
  id: string;
  name: string;
  fanCount: number;
  picture?: string;
  hasInstagram: boolean;
  instagramUsername?: string;
}

export interface CreatorFullProfile {
  id: string;
  userId: string;
  username: string | null;
  fullName: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  categories: string[];
  website: string | null;
  isVerified: boolean;
  fullyVerified: boolean;
  verificationStatus: string;
  verificationRejectReason: string | null;
  citizenshipDocUrl: string | null;
  citizenshipStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  panDocUrl: string | null;
  panDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  companyRegDocUrl: string | null;
  companyRegDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  companyRegNo: string | null;
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  hideSocialLinks: boolean;
  providerType: 'INDIVIDUAL' | 'TEAM' | 'AGENCY' | null;
  portfolioLinks: Array<{ id: string; label: string; url: string }>;
  socialLinks: Record<string, string>;
  reviewSummary?: { averageRating: number; reviewCount: number };
  savedByBusinessCount: number;
}

export function fetchCreatorFullProfile(signal?: AbortSignal): Promise<CreatorFullProfile> {
  return apiRequest<CreatorFullProfile>('GET', '/api/creator/profile', undefined, { signal }).then(
    (r) => r.data,
  );
}

export interface UpdateCreatorProfileInput {
  fullName?: string;
  bio?: string;
  location?: string | null;
  locationLat?: number;
  locationLng?: number;
  website?: string | null;
  categories?: string[];
  showPublicProfile?: boolean;
  hideSocialLinks?: boolean;
  /** Onboarding-only fields — same PUT /api/creator/profile mobile uses. */
  username?: string;
  email?: string;
  providerType?: 'INDIVIDUAL' | 'TEAM' | 'AGENCY';
  teamSize?: number;
}

export function updateCreatorProfile(patch: UpdateCreatorProfileInput): Promise<CreatorFullProfile> {
  return apiRequest<CreatorFullProfile>('PUT', '/api/creator/profile', patch).then((r) => r.data);
}

/** Onboarding's username step — live-checked the same way mobile debounces it. */
export function isUsernameAvailable(username: string, signal?: AbortSignal): Promise<boolean> {
  return apiRequest<{ available: boolean }>('GET', '/api/creator/username-available', undefined, {
    params: { username },
    signal,
  }).then((r) => r.data.available);
}

/** AI-drafts a bio from the creator's existing name/categories/location/platforms. */
export function generateBio(): Promise<string> {
  return apiRequest<{ bio: string }>('POST', '/api/creator/generate-bio').then((r) => r.data.bio);
}

/** Ids of businesses this creator has favorited — count feeds the profile's "Favorite Business" stat. */
export function fetchFavoriteBusinessIds(signal?: AbortSignal): Promise<string[]> {
  return apiRequest<{ ids: string[] }>('GET', '/api/creator/businesses/favorites', undefined, { signal }).then(
    (r) => r.data.ids,
  );
}

export function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const form = new FormData();
  form.append('avatar', file);
  return apiUpload<{ avatarUrl: string }>('/api/creator/avatar', form);
}

export function fetchSocialAccounts(signal?: AbortSignal): Promise<CreatorSocialAccount[]> {
  return apiRequest<CreatorSocialAccount[]>('GET', '/api/creator/social-accounts', undefined, {
    signal,
  }).then((r) => r.data);
}

export function addSocialAccount(input: {
  platform: string;
  profileUrl: string;
  followers: number;
}): Promise<CreatorSocialAccount> {
  return apiRequest<CreatorSocialAccount>('POST', '/api/creator/social-accounts', input).then(
    (r) => r.data,
  );
}

export function deleteSocialAccount(id: string): Promise<void> {
  return apiRequest('DELETE', `/api/creator/social-accounts/${id}`).then(() => undefined);
}

/** OAuth-connect flows — same backend contract mobile's creatorService uses. */

export function connectYoutubeAccount(accessToken: string): Promise<CreatorSocialAccount> {
  return apiRequest<CreatorSocialAccount>('POST', '/api/creator/social-accounts/youtube/connect', {
    accessToken,
    clientPlatform: 'web',
  }).then((r) => r.data);
}

/** Fetches the TikTok authorize URL to open in a popup (see lib/oauthPopup.ts). */
export function getTiktokAuthorizeUrl(): Promise<string> {
  return apiRequest<{ url: string }>('GET', '/api/creator/social-accounts/tiktok/authorize', undefined, {
    params: { platform: 'web' },
  }).then((r) => r.data.url);
}

export function getFacebookPages(accessToken: string): Promise<FacebookPageOption[]> {
  return apiRequest<FacebookPageOption[]>('POST', '/api/creator/social-accounts/facebook/pages', {
    accessToken,
  }).then((r) => r.data);
}

export function connectFacebookPage(accessToken: string, pageId: string): Promise<CreatorSocialAccount> {
  return apiRequest<CreatorSocialAccount>('POST', '/api/creator/social-accounts/facebook/connect', {
    accessToken,
    pageId,
  }).then((r) => r.data);
}

export function connectInstagramAccount(accessToken: string, pageId: string): Promise<CreatorSocialAccount> {
  return apiRequest<CreatorSocialAccount>('POST', '/api/creator/social-accounts/instagram/connect', {
    accessToken,
    pageId,
  }).then((r) => r.data);
}

export function addPortfolioLink(input: { label: string; url: string }): Promise<unknown> {
  return apiRequest('POST', '/api/creator/portfolio', input).then((r) => r.data);
}

export function deletePortfolioLink(id: string): Promise<void> {
  return apiRequest('DELETE', `/api/creator/portfolio/${id}`).then(() => undefined);
}

// ── Portfolio items (richer model: photo OR link + description) ─────────────
// Same backend contract as mobile's `portfolioService` — distinct from the
// legacy label+url `portfolioLinks` above.

export interface PortfolioItem {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  mediaUrl: string | null;
  mediaType: 'IMAGE' | 'VIDEO' | null;
  externalUrl: string | null;
  createdAt: string;
}

export interface CreatePortfolioItemInput {
  title?: string;
  description?: string;
  category?: string;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  externalUrl?: string;
}

export function fetchPortfolioItems(signal?: AbortSignal): Promise<PortfolioItem[]> {
  return apiRequest<PortfolioItem[]>('GET', '/api/creator/portfolio-items', undefined, { signal }).then(
    (r) => r.data,
  );
}

export function uploadPortfolioMedia(file: File): Promise<{ imageUrl: string }> {
  const form = new FormData();
  form.append('media', file);
  return apiUpload<{ imageUrl: string }>('/api/creator/portfolio-items/upload', form);
}

export function createPortfolioItem(input: CreatePortfolioItemInput): Promise<PortfolioItem> {
  return apiRequest<PortfolioItem>('POST', '/api/creator/portfolio-items', input).then((r) => r.data);
}

export function deletePortfolioItem(id: string): Promise<void> {
  return apiRequest('DELETE', `/api/creator/portfolio-items/${id}`).then(() => undefined);
}

// ── Verification documents ───────────────────────────────────────────────────

export interface CreatorDocUploadResult {
  docUrl: string;
  citizenshipStatus?: string;
  panDocStatus?: string;
  companyRegDocStatus?: string;
}

export function uploadCitizenshipDoc(file: File): Promise<CreatorDocUploadResult> {
  const form = new FormData();
  form.append('document', file);
  return apiUpload<CreatorDocUploadResult>('/api/creator/citizenship', form);
}

export function uploadCreatorPanDoc(file: File): Promise<CreatorDocUploadResult> {
  const form = new FormData();
  form.append('document', file);
  return apiUpload<CreatorDocUploadResult>('/api/creator/pan', form);
}
