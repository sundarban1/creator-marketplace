import { AppError } from '../../middleware/error';
import { logger } from '../../config/logger';
import { toBusinessProfileDto, toPublicBusinessDto, toBusinessListItemDto, toPrivateBusinessDto } from './business.dto';
import { toSocialAccountDto } from '../creator/creator.dto';
import { BusinessRepository } from './business.repository';
import { CreatorService, exchangeForLongLivedFacebookToken, fetchYoutubeChannel, googleOauthConnectionType } from '../creator/creator.service';
import { PlatformRepository } from '../platform/platform.repository';
import type { UpdateBusinessProfileInput, AddSocialAccountInput, UpdateSocialAccountInput } from './business.schema';
import { translateFields, translateMany } from '../../utils/translation';
import { analyticsService } from '../analytics/analytics.service';

const BUSINESS_FIELDS = ['description', 'location', 'categories'] as const;

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
    return toBusinessProfileDto(profile);
  }

  async updateProfile(userId: string, input: UpdateBusinessProfileInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) {
      throw new AppError('Business profile not found', 404);
    }

    return toBusinessProfileDto(await this.repo.update(userId, input));
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
    const dto = toPublicBusinessDto(business);
    const translated = await translateFields(dto, [...BUSINESS_FIELDS], lang);
    const stats = await analyticsService.getBrandPublicStats(business.userId).catch(() => null);
    return { ...translated, stats };
  }

  async uploadPanDoc(userId: string, docUrl: string) {
    return toBusinessProfileDto(await this.repo.updatePanDoc(userId, docUrl));
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
  getTiktokAuthorizeUrl(userId: string): string {
    return this.creatorService.getTiktokAuthorizeUrl(userId, 'BUSINESS');
  }

  getInstagramLoginAuthorizeUrl(userId: string): string {
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
