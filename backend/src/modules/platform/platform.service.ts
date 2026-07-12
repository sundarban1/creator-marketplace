import { PlatformStatus } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { PlatformRepository } from './platform.repository';
import type { CreatePlatformInput, UpdatePlatformInput } from './platform.schema';

export class PlatformService {
  private repo: PlatformRepository;

  constructor() {
    this.repo = new PlatformRepository();
  }

  async listPublic() {
    return this.repo.findManyPublic();
  }

  async listForAdmin() {
    const platforms = await this.repo.findAllForAdmin();
    return Promise.all(platforms.map(async (p) => ({
      ...p,
      campaignCount: await this.repo.countUsage(p.name),
    })));
  }

  async create(input: CreatePlatformInput) {
    const existing = await this.repo.findByKey(input.key);
    if (existing) throw new AppError('A platform with this key already exists', 409);
    return this.repo.create(input);
  }

  async update(id: string, input: UpdatePlatformInput) {
    const platform = await this.repo.findById(id);
    if (!platform) throw new AppError('Platform not found', 404);

    if (input.key !== platform.key) {
      const existing = await this.repo.findByKey(input.key);
      if (existing) throw new AppError('A platform with this key already exists', 409);
    }
    return this.repo.update(id, input);
  }

  async updateStatus(id: string, status: PlatformStatus) {
    const platform = await this.repo.findById(id);
    if (!platform) throw new AppError('Platform not found', 404);
    return this.repo.updateStatus(id, status);
  }

  async remove(id: string) {
    const platform = await this.repo.findById(id);
    if (!platform) throw new AppError('Platform not found', 404);
    await this.repo.delete(id);
  }
}
