import { randomUUID } from 'crypto';
import { AppError } from '../../middleware/error';
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
  }) {
    const { page, limit, search, categories, location, platforms, priceMin, priceMax } = params;
    const { creators, total } = await this.repo.findMany({
      page, limit: Math.min(limit, 20),
      search, categories, location, platforms, priceMin, priceMax,
    });
    return { creators, total, page, limit };
  }

  async getCreatorPublicProfile(creatorId: string) {
    const profile = await this.repo.findByIdPublic(creatorId);
    if (!profile) throw new AppError('Creator not found', 404);
    return profile;
  }

  async getFilterOptions() {
    return this.repo.getFilterOptions();
  }

  async getProfile(userId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    return profile;
  }

  async updateProfile(userId: string, input: UpdateCreatorProfileInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    // Enforce username uniqueness (only if changing)
    if (input.username && input.username !== profile.username) {
      const taken = await this.repo.findByUsername(input.username);
      if (taken) throw new AppError('This username is already taken', 409);
    }

    return this.repo.update(userId, input);
  }

  async addPortfolioLink(userId: string, input: AddPortfolioLinkInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const currentLinks = (profile.portfolioLinks as { id: string; label: string; url: string }[]) || [];
    const newLink = { id: randomUUID(), label: input.label, url: input.url };
    return this.repo.addPortfolioLink(userId, newLink, currentLinks);
  }

  async removePortfolioLink(userId: string, linkId: string) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const currentLinks = (profile.portfolioLinks as { id: string; label: string; url: string }[]) || [];
    if (!currentLinks.some((l) => l.id === linkId)) throw new AppError('Portfolio link not found', 404);
    return this.repo.removePortfolioLink(userId, linkId, currentLinks);
  }

  async updateSocialLinks(userId: string, input: UpdateSocialLinksInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const currentLinks = (profile.socialLinks as Record<string, string>) || {};
    return this.repo.updateSocialLinks(userId, { ...currentLinks, ...input });
  }

  // ── Social Accounts ────────────────────────────────────────────────────────

  async getSocialAccounts(userId: string) {
    return this.repo.findSocialAccountsByUserId(userId);
  }

  async addSocialAccount(userId: string, input: AddSocialAccountInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const existing = await this.repo.findSocialAccountByPlatform(profile.id, input.platform);
    if (existing) throw new AppError(`${input.platform} account is already added`, 409);

    return this.repo.addSocialAccount(profile.id, input);
  }

  async updateSocialAccount(userId: string, accountId: string, input: UpdateSocialAccountInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const account = await this.repo.findSocialAccountById(accountId);
    if (!account || account.creatorProfileId !== profile.id) throw new AppError('Social account not found', 404);

    return this.repo.updateSocialAccount(accountId, input);
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
    return this.repo.updatePaymentMethods(userId, input.methods);
  }

  // ── Campaign Preferences ────────────────────────────────────────────────────

  async updateCampaignPrefs(userId: string, input: UpdateCampaignPrefsInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    return this.repo.updateCampaignPrefs(userId, input);
  }

  // ── Earnings Summary ───────────────────────────────────────────────────────

  async getEarningsSummary(userId: string) {
    return this.repo.getEarningsSummary(userId);
  }
}
