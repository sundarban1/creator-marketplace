import { CategoryScope, CategoryStatus } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { CategoryRepository } from './category.repository';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.schema';
import { cached, invalidatePrefix } from '../../utils/cache';

// Public category lists are read constantly by both clients and change only
// when an admin edits them — cache for an hour and blow the whole namespace
// away on any write.
const PUBLIC_CACHE_PREFIX = 'categories:public:';
const PUBLIC_CACHE_TTL_SEC = 3600;

export class CategoryService {
  private repo: CategoryRepository;

  constructor() {
    this.repo = new CategoryRepository();
  }

  async listPublic(scope?: CategoryScope, strict?: boolean) {
    const key = `${PUBLIC_CACHE_PREFIX}${scope ?? 'all'}:${strict ? 'strict' : 'loose'}`;
    return cached(key, PUBLIC_CACHE_TTL_SEC, () => this.repo.findManyPublic(scope, strict));
  }

  private async invalidatePublicCache() {
    await invalidatePrefix(PUBLIC_CACHE_PREFIX);
  }

  async listForAdmin() {
    const categories = await this.repo.findAllForAdmin();
    return Promise.all(categories.map(async (c) => ({
      ...c,
      itemCount: await this.repo.countUsage(c.name),
    })));
  }

  async create(input: CreateCategoryInput) {
    const existing = await this.repo.findByKey(input.key);
    if (existing) throw new AppError('A category with this key already exists', 409);
    const created = await this.repo.create(input);
    await this.invalidatePublicCache();
    return created;
  }

  async update(id: string, input: UpdateCategoryInput) {
    const category = await this.repo.findById(id);
    if (!category) throw new AppError('Category not found', 404);

    if (input.key !== category.key) {
      const existing = await this.repo.findByKey(input.key);
      if (existing) throw new AppError('A category with this key already exists', 409);
    }
    const updated = await this.repo.update(id, input);
    await this.invalidatePublicCache();
    return updated;
  }

  async updateStatus(id: string, status: CategoryStatus) {
    const category = await this.repo.findById(id);
    if (!category) throw new AppError('Category not found', 404);
    const updated = await this.repo.updateStatus(id, status);
    await this.invalidatePublicCache();
    return updated;
  }

  async remove(id: string) {
    const category = await this.repo.findById(id);
    if (!category) throw new AppError('Category not found', 404);
    await this.repo.delete(id);
    await this.invalidatePublicCache();
  }
}
