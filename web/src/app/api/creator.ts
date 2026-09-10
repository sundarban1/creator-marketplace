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

export interface CreatorApplication {
  id: string;
  campaignId: string;
  coverLetter: string;
  proposedRate: number;
  timeline: string;
  socialHandles?: Record<string, string>;
  portfolioUrl?: string | null;
  status: string;
  workStatus: string;
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
  dispute?: { status: string; reason: string; raisedByRole: string; createdAt: string } | null;
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

export function markNotificationRead(id: string): Promise<void> {
  return apiRequest('PATCH', `/api/notifications/${id}/read`).then(() => undefined);
}

// ── Profile ──────────────────────────────────────────────────────────────────

export interface CreatorSocialAccount {
  id: string;
  platform: string;
  profileUrl: string;
  followers: number;
  connectedViaOAuth: boolean;
  avatarUrl: string | null;
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
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  hideSocialLinks: boolean;
  providerType: 'INDIVIDUAL' | 'TEAM' | 'AGENCY' | null;
  portfolioLinks: Array<{ id: string; label: string; url: string }>;
  socialLinks: Record<string, string>;
  reviewSummary?: { averageRating: number; reviewCount: number };
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
  website?: string | null;
  categories?: string[];
  showPublicProfile?: boolean;
  hideSocialLinks?: boolean;
}

export function updateCreatorProfile(patch: UpdateCreatorProfileInput): Promise<CreatorFullProfile> {
  return apiRequest<CreatorFullProfile>('PUT', '/api/creator/profile', patch).then((r) => r.data);
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

export function addPortfolioLink(input: { label: string; url: string }): Promise<unknown> {
  return apiRequest('POST', '/api/creator/portfolio', input).then((r) => r.data);
}

export function deletePortfolioLink(id: string): Promise<void> {
  return apiRequest('DELETE', `/api/creator/portfolio/${id}`).then(() => undefined);
}
