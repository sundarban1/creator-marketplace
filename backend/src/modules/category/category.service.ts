import { CategoryScope, CategoryStatus } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { CategoryRepository } from './category.repository';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.schema';

export class CategoryService {
  private repo: CategoryRepository;

  constructor() {
    this.repo = new CategoryRepository();
  }

  async listPublic(scope?: CategoryScope) {
    return this.repo.findManyPublic(scope);
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
    return this.repo.create(input);
  }

  async update(id: string, input: UpdateCategoryInput) {
    const category = await this.repo.findById(id);
    if (!category) throw new AppError('Category not found', 404);

    if (input.key !== category.key) {
      const existing = await this.repo.findByKey(input.key);
      if (existing) throw new AppError('A category with this key already exists', 409);
    }
    return this.repo.update(id, input);
  }

  async updateStatus(id: string, status: CategoryStatus) {
    const category = await this.repo.findById(id);
    if (!category) throw new AppError('Category not found', 404);
    return this.repo.updateStatus(id, status);
  }

  async remove(id: string) {
    const category = await this.repo.findById(id);
    if (!category) throw new AppError('Category not found', 404);
    await this.repo.delete(id);
  }
}
