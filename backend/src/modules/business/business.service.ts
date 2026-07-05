import { AppError } from '../../middleware/error';
import { toBusinessProfileDto, toPublicBusinessDto, toBusinessListItemDto, toPrivateBusinessDto } from './business.dto';
import { BusinessRepository } from './business.repository';
import type { UpdateBusinessProfileInput } from './business.schema';
import { translateFields, translateMany } from '../../utils/translation';

const BUSINESS_FIELDS = ['description', 'location', 'categories'] as const;

export class BusinessService {
  private repo: BusinessRepository;

  constructor() {
    this.repo = new BusinessRepository();
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
    return translateFields(dto, [...BUSINESS_FIELDS], lang);
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
}
