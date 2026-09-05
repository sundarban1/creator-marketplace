import { SuccessStoryStatus } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { SuccessStoryRepository } from './success-story.repository';
import type { CreateSuccessStoryInput, UpdateSuccessStoryInput } from './success-story.schema';

import { HttpStatus } from '../../constants/httpStatus';

export class SuccessStoryService {
  private repo: SuccessStoryRepository;

  constructor() {
    this.repo = new SuccessStoryRepository();
  }

  async listPublic() {
    return this.repo.findManyPublic();
  }

  async listForAdmin() {
    return this.repo.findAllForAdmin();
  }

  async create(input: CreateSuccessStoryInput) {
    return this.repo.create(input);
  }

  async update(id: string, input: UpdateSuccessStoryInput) {
    const story = await this.repo.findById(id);
    if (!story) throw new AppError('Success story not found', HttpStatus.NOT_FOUND);
    return this.repo.update(id, input);
  }

  async updateStatus(id: string, status: SuccessStoryStatus) {
    const story = await this.repo.findById(id);
    if (!story) throw new AppError('Success story not found', HttpStatus.NOT_FOUND);
    return this.repo.updateStatus(id, status);
  }

  async remove(id: string) {
    const story = await this.repo.findById(id);
    if (!story) throw new AppError('Success story not found', HttpStatus.NOT_FOUND);
    await this.repo.delete(id);
  }
}
