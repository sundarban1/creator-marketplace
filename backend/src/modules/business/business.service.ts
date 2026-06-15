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
}
