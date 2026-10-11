import { AppError } from '../../middleware/error';
import { PortfolioRepository } from './portfolio.repository';
import { CreatorRepository } from '../creator/creator.repository';
import type { CreatePortfolioItemInput, UpdatePortfolioItemInput } from './portfolio.schema';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

export class PortfolioService {
  private repo = new PortfolioRepository();
  private creatorRepo = new CreatorRepository();

  async listMine(userId: string) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().portfolio.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    return this.repo.findByCreatorProfileId(profile.id);
  }

  async create(userId: string, input: CreatePortfolioItemInput) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().portfolio.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    return this.repo.create(profile.id, input);
  }

  private async findOwned(userId: string, itemId: string) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().portfolio.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    const item = await this.repo.findById(itemId);
    if (!item) throw new AppError(getDict().portfolio.itemNotFound, HttpStatus.NOT_FOUND);
    if (item.creatorProfileId !== profile.id) throw new AppError(getDict().portfolio.notAuthorizedToModifyItem, HttpStatus.FORBIDDEN);
    return item;
  }

  async update(userId: string, itemId: string, input: UpdatePortfolioItemInput) {
    const item = await this.findOwned(userId, itemId);
    // An item must keep a photo or a link after the edit (same rule as create).
    const mediaUrl = input.mediaUrl === undefined ? item.mediaUrl : input.mediaUrl;
    const externalUrl = input.externalUrl === undefined ? item.externalUrl : input.externalUrl;
    if (!mediaUrl && !externalUrl) {
      throw new AppError('Either mediaUrl or externalUrl is required', HttpStatus.BAD_REQUEST);
    }
    return this.repo.update(itemId, input);
  }

  async remove(userId: string, itemId: string) {
    await this.findOwned(userId, itemId);
    await this.repo.delete(itemId);
  }
}
