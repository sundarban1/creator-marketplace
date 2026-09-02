import { AppError } from '../../middleware/error';
import { logger } from '../../config/logger';
import { toBusinessProfileDto, toPublicBusinessDto, toBusinessListItemDto, toPrivateBusinessDto } from './business.dto';
import { toSocialAccountDto } from '../creator/creator.dto';
import { BusinessRepository } from './business.repository';
import { CreatorService, exchangeForLongLivedFacebookToken, fetchYoutubeChannel, googleOauthConnectionType } from '../creator/creator.service';
import { PlatformRepository } from '../platform/platform.repository';
import type { UpdateBusinessProfileInput, AddSocialAccountInput, UpdateSocialAccountInput } from './business.schema';
import { translateFields, translateMany } from '../../utils/translation';
import { deriveCityFromLocation } from '../../utils/geo';
import { analyticsService } from '../analytics/analytics.service';
import { invitationService } from '../campaign/invitation/invitation.service';
import { logActivity } from '../logging/activity.service';
import { ActivityAction } from '../logging/logging.constants';
import { cached, invalidatePrefix } from '../../utils/cache';

const BUSINESS_FIELDS = ['description', 'location', 'categories'] as const;

// Same rationale as CreatorService's public-profile cache: read-heavy, and each
// build runs a live external translate call plus stats/reviews aggregation.
// Best-effort — a Redis miss/outage rebuilds it exactly as before.
const PUBLIC_PROFILE_CACHE_TTL_SEC = 60;
const publicBusinessCacheKey = (id: string, lang: string) => `business-profile:${id}:${lang}`;

/** Drop every cached language variant of one business's public profile. */
export function invalidatePublicBusinessProfile(id: string): Promise<void> {
  return invalidatePrefix(`business-profile:${id}:`);
}

export class BusinessService {
  private repo: BusinessRepository;
  private platformRepo: PlatformRepository;
  // Reused (not duplicated) for its owner-agnostic OAuth helpers — see the "Social
  // Accounts" section below for exactly which of its methods this calls into.
  private creatorService: CreatorService;

  constructor() {
    this.repo = new BusinessRepository();
    this.platformRepo = new PlatformRepository();
    this.creatorService = new CreatorService();
  }

  async getProfile(userId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) {
      throw new AppError('Business profile not found', 404);
    }
    // Every review this business has received (latest first, no cap) — shown as
    // the last section on their own profile screen, mirroring the creator side.
    const reviews = await analyticsService.getReviewsReceived(profile.userId, null).catch(() => []);
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;
    return { ...toBusinessProfileDto(profile), reviews, reviewSummary: { averageRating, reviewCount } };
  }

  async updateProfile(userId: string, input: UpdateBusinessProfileInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) {
      throw new AppError('Business profile not found', 404);
    }

    const { email, ...rest } = input;
    if (email) {
      const account = await this.repo.getUserEmailStatus(userId);
      if (account?.isEmailVerified) throw new AppError('Your account already has a verified email', 409);
      const existing = await this.repo.findUserByEmail(email);
      if (existing && existing.id !== userId) throw new AppError('This email is already in use by another account', 409);
      await this.repo.setAccountEmail(userId, email);
    }

    // The location picker only hands back a formatted string (no structured
    // city/district) — derive `city` from it here so businesses are
    // searchable/browsable by location without a separate settings step,
    // unless the caller already sent an explicit city (e.g. the
    // location-privacy settings screen).
    if (rest.location && rest.city === undefined) {
      const derivedCity = deriveCityFromLocation(rest.location);
      if (derivedCity) rest.city = derivedCity;
    }

    // Organization-only fields must not survive on an INDIVIDUAL profile — the
    // hiring type is the source of truth, so switching to INDIVIDUAL clears
    // them rather than leaving stale organization data hanging off a personal
    // account. Likewise, the free-text "other" label only means anything while
    // organizationType is OTHER.
    if (rest.representingType === 'INDIVIDUAL') {
      rest.organizationType      = null;
      rest.organizationTypeOther = null;
      rest.contactPersonName     = null;
    } else if (rest.organizationType && rest.organizationType !== 'OTHER') {
      rest.organizationTypeOther = null;
    }

    const updated = await this.repo.update(userId, rest);

    // Logo/cover uploads and every other profile edit route through here.
    void invalidatePublicBusinessProfile(profile.id);

    logActivity({ userId, action: ActivityAction.BUSINESS_PROFILE_UPDATED, metadata: { changedFields: Object.keys(rest) } });

    // The organizer name/logo is baked into every confirmed creator's
    // open-event invitation PNG — refresh them when either actually changed.
    // Fire-and-forget (see invitationService.regenerateForBusiness).
    const nameChanged = rest.businessName !== undefined && rest.businessName !== profile.businessName;
    const logoChanged = rest.logoUrl !== undefined && rest.logoUrl !== profile.logoUrl;
    if (nameChanged || logoChanged) {
      invitationService.regenerateForBusiness(profile.id).catch((err) =>
        logger.warn({ err: err instanceof Error ? err.message : err, businessId: profile.id }, 'invitation: regenerate-on-business-edit failed'),
      );
    }

    return toBusinessProfileDto(updated);
  }

  async listBusinesses(params: {
    search?:    string;
    category?:  string;
    platform?:  string;
    locations?: string[];
    page:       number;
    limit:      number;
    lang?:      string;
  }) {
    const { lang = 'en', ...rest } = params;
    const { businesses, total } = await this.repo.findMany(rest);
    const dtos = businesses.map(toBusinessListItemDto);
    const translated = await translateMany(dtos, [...BUSINESS_FIELDS], lang);
    return { businesses: translated, total };
  }

  async getBusinessPublic(id: string, lang = 'en') {
    const business = await this.repo.findPublicById(id);
    if (!business) throw new AppError('Business not found', 404);
    if (!business.showPublicProfile) return toPrivateBusinessDto(business);

    return cached(publicBusinessCacheKey(id, lang), PUBLIC_PROFILE_CACHE_TTL_SEC, async () => {
      const dto = toPublicBusinessDto(business);
      const translated = await translateFields(dto, [...BUSINESS_FIELDS], lang);
      const [stats, reviews] = await Promise.all([
        analyticsService.getBrandPublicStats(business.userId).catch(() => null),
        analyticsService.getReviewsReceived(business.userId).catch(() => []),
      ]);
      return { ...translated, stats, reviews };
    });
  }

  async uploadPanDoc(userId: string, docUrl: string) {
    return toBusinessProfileDto(await this.repo.updatePanDoc(userId, docUrl));
  }

  // INDIVIDUAL service takers only — citizenship / national ID / personal PAN.
  // Rejected for ORGANIZATION profiles so the two verification paths can't be
  // mixed into a half-and-half state the status rules don't describe. Checked
  // by the controller *before* it uploads, so a rejected request doesn't leave
  // an orphaned file in Cloudinary.
  async assertCanUploadIdentityDoc(userId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Business profile not found', 404);
    if (profile.representingType !== 'INDIVIDUAL') {
      throw new AppError('Identity documents apply to individual accounts. Upload your PAN and company registration instead.', 400);
    }
  }

  async uploadIdentityDoc(userId: string, docUrl: string) {
    return toBusinessProfileDto(await this.repo.updateIdentityDoc(userId, docUrl));
  }

  async uploadCompanyRegDoc(userId: string, docUrl: string) {
    return toBusinessProfileDto(await this.repo.updateCompanyRegDoc(userId, docUrl));
  }

  async getPaymentHistory(userId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Business profile not found', 404);

    const { applications, referrals } = await this.repo.getPaymentHistoryData(profile.id);

    const debitRows = applications.map((a) => ({
      id:          a.id,
      date:        (a.paidAt ?? new Date()).toISOString(),
      description: `Payment for "${a.campaign.title}" - ${a.creator.fullName ?? 'Creator'}`,
      amount:      a.proposedRate,
      type:        'debit' as const,
    }));

    const creditRows = referrals.map((r) => ({
      id:          r.id,
      date:        (r.completedAt ?? new Date()).toISOString(),
      description: `Referral bonus - ${r.referred.businessName ?? 'Business'}`,
      amount:      Number(r.rewardAmount),
      type:        'credit' as const,
    }));

    return [...debitRows, ...creditRows].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  // ── Social Accounts — mirrors creator.service.ts's section of the same name.
  // Manual CRUD is duplicated (it's a handful of lines); the actual OAuth API calls
  // are reused via this.creatorService since they carry no creator-specific data. ──

  async getSocialAccounts(userId: string) {
    const accounts = await this.repo.findSocialAccountsByUserId(userId);

    const profile = accounts[0] ? { id: accounts[0].businessProfileId! } : await this.repo.findByUserId(userId);
    if (profile) {
      this.refreshStaleSocialAccounts(profile.id).catch((err) =>
        logger.error({ err, userId }, 'Background social account refresh failed to start'));
    }

    return accounts.map(toSocialAccountDto);
  }

  private async refreshStaleSocialAccounts(businessProfileId: string): Promise<void> {
    const staleBefore = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const stale = await this.repo.findStaleSocialAccounts(businessProfileId, staleBefore);
    await this.creatorService.refreshStaleAccountsBatch(stale);
  }

  async addSocialAccount(userId: string, input: AddSocialAccountInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Business profile not found', 404);

    const platforms = await this.platformRepo.findManyPublic();
    if (!platforms.some((p) => p.key === input.platform)) throw new AppError('Invalid platform', 400);

    const existing = await this.repo.findSocialAccountByPlatform(profile.id, input.platform);
    if (existing) throw new AppError(`${input.platform} account is already added`, 409);

    return toSocialAccountDto(await this.repo.addSocialAccount(profile.id, input));
  }

  async updateSocialAccount(userId: string, accountId: string, input: UpdateSocialAccountInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Business profile not found', 404);

    const account = await this.repo.findSocialAccountById(accountId);
    if (!account || account.businessProfileId !== profile.id) throw new AppError('Social account not found', 404);

    return toSocialAccountDto(await this.repo.updateSocialAccount(accountId, input));
  }

  async deleteSocialAccount(userId: string, accountId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Business profile not found', 404);

    const account = await this.repo.findSocialAccountById(accountId);
    if (!account || account.businessProfileId !== profile.id) throw new AppError('Social account not found', 404);

    await this.repo.deleteSocialAccount(accountId);
  }

  async connectYoutubeAccount(
    userId: string, accessToken: string, refreshToken?: string, expiresIn?: number,
    clientPlatform?: 'ios' | 'android' | 'web',
  ) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Business profile not found', 404);

    const channel = await fetchYoutubeChannel(accessToken);

    const account = await this.repo.upsertOAuthSocialAccount(profile.id, 'youtube', {
      profileUrl: channel.profileUrl,
      followers: channel.followers,
      platformUserId: channel.channelId,
      avatarUrl: channel.avatarUrl,
      accessToken,
      refreshToken,
      tokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
      oauthConnectionType: googleOauthConnectionType(clientPlatform),
    });
    return toSocialAccountDto(account);
  }

  // TikTok/Instagram-direct-login both need a server-side redirect callback, and
  // each provider only has ONE registered redirect URI (shared with the creator
  // flow) — so the authorize URL just tags this as a BUSINESS connect via signed
  // state, and the existing creator.service.ts callback handlers (already
  // role-aware) resolve it back to this business profile when it lands. There is
  // no separate business-side callback route.
  getTiktokAuthorizeUrl(userId: string): Promise<string> {
    return this.creatorService.getTiktokAuthorizeUrl(userId, 'BUSINESS');
  }

  getInstagramLoginAuthorizeUrl(userId: string): Promise<string> {
    return this.creatorService.getInstagramLoginAuthorizeUrl(userId, 'BUSINESS');
  }

  async listFacebookPages(accessToken: string) {
    return this.creatorService.listFacebookPages(accessToken);
  }

  async connectFacebookPage(userId: string, accessToken: string, pageId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Business profile not found', 404);

    const longLivedToken = await exchangeForLongLivedFacebookToken(accessToken);
    const pages = await this.creatorService.fetchFacebookPages(longLivedToken);
    const page = pages.find((p) => p.id === pageId);
    if (!page) throw new AppError('Facebook Page not found — please reconnect and try again', 404);

    const account = await this.repo.upsertOAuthSocialAccount(profile.id, 'facebook', {
      profileUrl: page.link ?? `https://www.facebook.com/${page.id}`,
      followers: page.fan_count ?? 0,
      platformUserId: page.id,
      avatarUrl: page.picture?.data?.url,
      accessToken: page.access_token,
      oauthConnectionType: 'facebook_page',
    });
    return toSocialAccountDto(account);
  }

  async connectInstagramAccount(userId: string, accessToken: string, pageId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Business profile not found', 404);

    const longLivedToken = await exchangeForLongLivedFacebookToken(accessToken);
    const pages = await this.creatorService.fetchFacebookPages(longLivedToken);
    const page = pages.find((p) => p.id === pageId);
    if (!page) throw new AppError('Facebook Page not found — please reconnect and try again', 404);

    const ig = page.instagram_business_account;
    if (!ig) throw new AppError('This Facebook Page has no linked Instagram Business account', 404);

    const account = await this.repo.upsertOAuthSocialAccount(profile.id, 'instagram', {
      profileUrl: ig.username ? `https://www.instagram.com/${ig.username}` : 'https://www.instagram.com/',
      followers: ig.followers_count ?? 0,
      platformUserId: ig.id,
      avatarUrl: ig.profile_picture_url,
      accessToken: page.access_token,
      oauthConnectionType: 'facebook_page',
    });
    return toSocialAccountDto(account);
  }
}
