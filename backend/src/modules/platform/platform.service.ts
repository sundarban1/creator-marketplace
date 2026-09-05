import { PlatformStatus } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { PlatformRepository } from './platform.repository';
import type { CreatePlatformInput, UpdatePlatformInput } from './platform.schema';
import { cached, invalidate } from '../../utils/cache';

import { HttpStatus } from '../../constants/httpStatus';

// The public platform list changes only on an admin edit — cache for an hour,
// drop it on any write.
const PUBLIC_CACHE_KEY = 'platforms:public';
const PUBLIC_CACHE_TTL_SEC = 3600;

export class PlatformService {
  private repo: PlatformRepository;

  constructor() {
    this.repo = new PlatformRepository();
  }

  async listPublic() {
    return cached(PUBLIC_CACHE_KEY, PUBLIC_CACHE_TTL_SEC, () => this.repo.findManyPublic());
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
    if (existing) throw new AppError('A platform with this key already exists', HttpStatus.CONFLICT);
    const created = await this.repo.create(input);
    await invalidate(PUBLIC_CACHE_KEY);
    return created;
  }

  async update(id: string, input: UpdatePlatformInput) {
    const platform = await this.repo.findById(id);
    if (!platform) throw new AppError('Platform not found', HttpStatus.NOT_FOUND);

    if (input.key !== platform.key) {
      const existing = await this.repo.findByKey(input.key);
      if (existing) throw new AppError('A platform with this key already exists', HttpStatus.CONFLICT);
    }
    const updated = await this.repo.update(id, input);
    await invalidate(PUBLIC_CACHE_KEY);
    return updated;
  }

  async updateStatus(id: string, status: PlatformStatus) {
    const platform = await this.repo.findById(id);
    if (!platform) throw new AppError('Platform not found', HttpStatus.NOT_FOUND);
    const updated = await this.repo.updateStatus(id, status);
    await invalidate(PUBLIC_CACHE_KEY);
    return updated;
  }

  async remove(id: string) {
    const platform = await this.repo.findById(id);
    if (!platform) throw new AppError('Platform not found', HttpStatus.NOT_FOUND);
    await this.repo.delete(id);
    await invalidate(PUBLIC_CACHE_KEY);
  }
}
