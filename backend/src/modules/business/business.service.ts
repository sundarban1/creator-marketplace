import { AppError } from '../../middleware/error';
import { toBusinessProfileDto, toPublicBusinessDto, toBusinessListItemDto } from './business.dto';
import { BusinessRepository } from './business.repository';
import type { UpdateBusinessProfileInput } from './business.schema';

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
  }) {
    const { businesses, total } = await this.repo.findMany(params);
    return { businesses: businesses.map(toBusinessListItemDto), total };
  }

  async getBusinessPublic(id: string) {
    const business = await this.repo.findPublicById(id);
    if (!business || !business.showPublicProfile) throw new AppError('Business not found', 404);
    return toPublicBusinessDto(business);
  }
}
