import { AppError } from '../../middleware/error';
import { toBusinessProfileDto, toPublicBusinessDto, toBusinessListItemDto } from './business.dto';
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
    if (!business || !business.showPublicProfile) throw new AppError('Business not found', 404);
    const dto = toPublicBusinessDto(business);
    return translateFields(dto, [...BUSINESS_FIELDS], lang);
  }
}
