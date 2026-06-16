import { AppError } from '../../middleware/error';
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
    return profile;
  }

  async updateProfile(userId: string, input: UpdateBusinessProfileInput) {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) {
      throw new AppError('Business profile not found', 404);
    }

    const updated = await this.repo.update(userId, input);
    return updated;
  }

  async listBusinesses(params: {
    search?:    string;
    category?:  string;
    platform?:  string;
    locations?: string[];
    page:       number;
    limit:      number;
  }) {
    return this.repo.findMany(params);
  }

  async getBusinessPublic(id: string) {
    const business = await this.repo.findPublicById(id);
    if (!business) throw new AppError('Business not found', 404);
    return business;
  }
}
