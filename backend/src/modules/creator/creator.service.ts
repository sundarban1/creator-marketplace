import { randomUUID } from 'crypto';
import { AppError } from '../../middleware/error';
import { logger } from '../../config/logger';
import { toCreatorProfileDto, toPublicCreatorDto, toCreatorListItemDto, toSocialAccountDto } from './creator.dto';
import { translateFields, translateMany } from '../../utils/translation';
import { haversineKm } from '../../utils/geo';

const CREATOR_FIELDS = ['bio', 'location', 'categories'] as const;
import { CreatorRepository } from './creator.repository';
import { BusinessRepository } from '../business/business.repository';
import { analyticsService } from '../analytics/analytics.service';
import type {
  UpdateCreatorProfileInput,
  AddPortfolioLinkInput,
  UpdateSocialLinksInput,
  AddSocialAccountInput,
  UpdateSocialAccountInput,
  UpdatePaymentMethodsInput,
  UpdateCampaignPrefsInput,
} from './creator.schema';

interface YoutubeChannelResponse {
  items?: Array<{
    id: string;
    snippet?: { title?: string; customUrl?: string; thumbnails?: { default?: { url?: string } } };
    statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
  }>;
}

export class CreatorService {
  private repo: CreatorRepository;
  private businessRepo: BusinessRepository;

  constructor() {
    this.repo = new CreatorRepository();
    this.businessRepo = new BusinessRepository();
  }

  async listCreators(params: {
    page: number;
    limit: number;
    search?: string;
    categories?: string[];
    location?: string;
    platforms?: string[];
    priceMin?: number;
    priceMax?: number;
    lang?: string;
  }) {
    const { page, limit, search, categories, location, platforms, priceMin, priceMax, lang = 'en' } = params;
    const { creators: raw, total } = await this.repo.findMany({
      page, limit: Math.min(limit, 20),
      search, categories, location, platforms, priceMin, priceMax,
    });
    const dtos = raw.map(toCreatorListItemDto);
    const creators = await translateMany(dtos, [...CREATOR_FIELDS], lang);
    return { creators, total, page, limit };
  }

  /**
   * Up to `limit` creators matching the campaign's category, for the "recommend
   * creators to invite" prompt shown right after publishing. When the campaign
   * has coordinates, nearby matches are ranked first (distance computed in JS —
   * the ~50-row category-matched candidate pool is small enough that this is
   * simpler than a DB-side Haversine query, unlike the campaign nearby-search
   * which has to scale to much larger result sets).
   */
  async getRecommendedForCampaign(params: {
    category: string;
    lat?: number;
    lng?: number;
    limit?: number;
    lang?: string;
  }) {
    const limit = Math.min(params.limit ?? 10, 20);
    const candidates = await this.repo.findRecommended(params.category);

    const ranked = candidates
      .map((c) => ({
        ...c,
        distanceKm:
          params.lat != null && params.lng != null && c.locationLat != null && c.locationLng != null
            ? haversineKm(params.lat, params.lng, c.locationLat, c.locationLng)
            : undefined,
      }))
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      })
      .slice(0, limit);

    const dtos = ranked.map(toCreatorListItemDto);
    return translateMany(dtos, [...CREATOR_FIELDS], params.lang ?? 'en');
  }

  async getCreatorPublicProfile(creatorId: string, lang = 'en', viewerUserId?: string) {
    const profile = await this.repo.findByIdPublic(creatorId);
    if (!profile) throw new AppError('Creator not found', 404);

    // Fire-and-forget — only authenticated brands reach this route at all
    // (business.routes.ts gates the whole file on authorize('BUSINESS')), so
    // the "ignore own profile"/"authenticated brands only" PRD rules are
    // already satisfied by the route itself.
    if (viewerUserId) {
      this.businessRepo.findByUserId(viewerUserId).then((business) => {
        if (business) analyticsService.recordProfileView(profile.id, business.id, profile.userId);
      }).catch(() => {});
    }

    const dto = toPublicCreatorDto(profile);
    const translated = await translateFields(dto, [...CREATOR_FIELDS], lang);
    const stats = await analyticsService.getCreatorPublicStats(profile.userId).catch(() => null);
    return { ...translated, stats };
  }

  async getFilterOptions() {
    return this.repo.getFilterOptions();
  }

  async isUsernameAvailable(username: string) {
    const taken = await this.repo.findByUsername(username);
    return { available: !taken };
  }

  async getProfile(userId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    return toCreatorProfileDto(profile);
  }

  async updateProfile(userId: string, input: UpdateCreatorProfileInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    // Enforce username uniqueness (only if changing)
    if (input.username && input.username !== profile.username) {
      const taken = await this.repo.findByUsername(input.username);
      if (taken) throw new AppError('This username is already taken', 409);
    }

    return toCreatorProfileDto(await this.repo.update(userId, input));
  }

  async uploadCitizenship(userId: string, docUrl: string) {
    return toCreatorProfileDto(await this.repo.updateCitizenship(userId, docUrl));
  }

  async addPortfolioLink(userId: string, input: AddPortfolioLinkInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const currentLinks = (profile.portfolioLinks as { id: string; label: string; url: string }[]) || [];
    const newLink = { id: randomUUID(), label: input.label, url: input.url };
    return toCreatorProfileDto(await this.repo.addPortfolioLink(userId, newLink, currentLinks));
  }

  async removePortfolioLink(userId: string, linkId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const currentLinks = (profile.portfolioLinks as { id: string; label: string; url: string }[]) || [];
    if (!currentLinks.some((l) => l.id === linkId)) throw new AppError('Portfolio link not found', 404);
    return toCreatorProfileDto(await this.repo.removePortfolioLink(userId, linkId, currentLinks));
  }

  async updateSocialLinks(userId: string, input: UpdateSocialLinksInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const currentLinks = (profile.socialLinks as Record<string, string>) || {};
    return toCreatorProfileDto(await this.repo.updateSocialLinks(userId, { ...currentLinks, ...input }));
  }

  // ── Social Accounts ────────────────────────────────────────────────────────

  async getSocialAccounts(userId: string) {
    const accounts = await this.repo.findSocialAccountsByUserId(userId);
    return accounts.map(toSocialAccountDto);
  }

  async addSocialAccount(userId: string, input: AddSocialAccountInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const existing = await this.repo.findSocialAccountByPlatform(profile.id, input.platform);
    if (existing) throw new AppError(`${input.platform} account is already added`, 409);

    return toSocialAccountDto(await this.repo.addSocialAccount(profile.id, input));
  }

  async updateSocialAccount(userId: string, accountId: string, input: UpdateSocialAccountInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const account = await this.repo.findSocialAccountById(accountId);
    if (!account || account.creatorProfileId !== profile.id) throw new AppError('Social account not found', 404);

    return toSocialAccountDto(await this.repo.updateSocialAccount(accountId, input));
  }

  async deleteSocialAccount(userId: string, accountId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const account = await this.repo.findSocialAccountById(accountId);
    if (!account || account.creatorProfileId !== profile.id) throw new AppError('Social account not found', 404);

    await this.repo.deleteSocialAccount(accountId);
  }

  // Exchanges a Google access token (obtained client-side with the youtube.readonly
  // scope) for the creator's own channel data, and saves it — no manual URL/follower
  // entry needed. Safe to call again later to refresh the subscriber count.
  async connectYoutubeAccount(userId: string, accessToken: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error({ status: res.status, body }, 'YouTube Data API request failed');
      const reason = (() => { try { return JSON.parse(body)?.error?.errors?.[0]?.reason; } catch { return undefined; } })();

      if (res.status === 401) throw new AppError('Google session expired — please reconnect', 401);
      if (reason === 'accessNotConfigured') {
        throw new AppError('YouTube Data API v3 is not enabled for this app yet — enable it in Google Cloud Console and try again', 502);
      }
      if (res.status === 403) {
        throw new AppError('Google denied access to YouTube data — check the youtube.readonly scope is added to the OAuth consent screen', 403);
      }
      throw new AppError(`Could not reach YouTube (${res.status})`, 502);
    }
    const data = (await res.json()) as YoutubeChannelResponse;
    const channel = data.items?.[0];
    if (!channel) throw new AppError('No YouTube channel found for this Google account', 404);

    const profileUrl = channel.snippet?.customUrl
      ? `https://www.youtube.com/${channel.snippet.customUrl}`
      : `https://www.youtube.com/channel/${channel.id}`;
    const followers = channel.statistics?.hiddenSubscriberCount
      ? 0
      : parseInt(channel.statistics?.subscriberCount ?? '0', 10);

    const account = await this.repo.upsertOAuthSocialAccount(profile.id, 'youtube', {
      profileUrl,
      followers,
      platformUserId: channel.id,
      avatarUrl: channel.snippet?.thumbnails?.default?.url,
    });
    return toSocialAccountDto(account);
  }

  // ── Payment Methods ────────────────────────────────────────────────────────

  async updatePaymentMethods(userId: string, input: UpdatePaymentMethodsInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    return toCreatorProfileDto(await this.repo.updatePaymentMethods(userId, input.methods));
  }

  // ── Campaign Preferences ────────────────────────────────────────────────────

  async updateCampaignPrefs(userId: string, input: UpdateCampaignPrefsInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    return toCreatorProfileDto(await this.repo.updateCampaignPrefs(userId, input));
  }

  // ── Earnings Summary ───────────────────────────────────────────────────────

  async getEarningsSummary(userId: string) {
    return this.repo.getEarningsSummary(userId);
  }
}
