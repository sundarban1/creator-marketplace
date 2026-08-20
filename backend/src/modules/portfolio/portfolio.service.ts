import { AppError } from '../../middleware/error';
import { PortfolioRepository } from './portfolio.repository';
import { CreatorRepository } from '../creator/creator.repository';
import type { CreatePortfolioItemInput, UpdatePortfolioItemInput } from './portfolio.schema';

export class PortfolioService {
  private repo = new PortfolioRepository();
  private creatorRepo = new CreatorRepository();

  async listMine(userId: string) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    return this.repo.findByCreatorProfileId(profile.id);
  }

  async create(userId: string, input: CreatePortfolioItemInput) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    return this.repo.create(profile.id, input);
  }

  private async findOwned(userId: string, itemId: string) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    const item = await this.repo.findById(itemId);
    if (!item) throw new AppError('Portfolio item not found', 404);
    if (item.creatorProfileId !== profile.id) throw new AppError('Not authorized to modify this portfolio item', 403);
    return item;
  }

  async update(userId: string, itemId: string, input: UpdatePortfolioItemInput) {
    await this.findOwned(userId, itemId);
    return this.repo.update(itemId, input);
  }

  async remove(userId: string, itemId: string) {
    await this.findOwned(userId, itemId);
    await this.repo.delete(itemId);
  }
}
