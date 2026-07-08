import { randomUUID } from 'crypto';
import { AppError } from '../../middleware/error';
import { toCreatorProfileDto, toPublicCreatorDto, toCreatorListItemDto, toSocialAccountDto } from './creator.dto';
import { translateFields, translateMany } from '../../utils/translation';
import { haversineKm } from '../../utils/geo';

const CREATOR_FIELDS = ['bio', 'location', 'categories'] as const;
import { CreatorRepository } from './creator.repository';
import type {
  UpdateCreatorProfileInput,
  AddPortfolioLinkInput,
  UpdateSocialLinksInput,
  AddSocialAccountInput,
  UpdateSocialAccountInput,
  UpdatePaymentMethodsInput,
  UpdateCampaignPrefsInput,
} from './creator.schema';

export class CreatorService {
  private repo: CreatorRepository;

  constructor() {
    this.repo = new CreatorRepository();
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

  async getCreatorPublicProfile(creatorId: string, lang = 'en') {
    const profile = await this.repo.findByIdPublic(creatorId);
    if (!profile) throw new AppError('Creator not found', 404);
    const dto = toPublicCreatorDto(profile);
    return translateFields(dto, [...CREATOR_FIELDS], lang);
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
