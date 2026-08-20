import { CategoryScope, CategoryStatus, ServiceStatus } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { ServiceRepository } from './service.repository';
import { CreatorRepository } from '../creator/creator.repository';
import { CategoryRepository } from '../category/category.repository';
import type { CreateServiceInput, UpdateServiceInput } from './service.schema';

export class ServiceService {
  private repo = new ServiceRepository();
  private creatorRepo = new CreatorRepository();
  private categoryRepo = new CategoryRepository();

  // Strict CREATOR-only — not "CREATOR or BOTH" like most other scope checks
  // in this codebase. BOTH-scope rows are content niches (Restaurants,
  // Automotive, ...) shared with campaign/profile category pickers, not
  // provider *types*; a Service must be categorized as an actual provider
  // type (Photographer, Videographer, ...), never a niche. See the comment
  // above CATEGORIES in prisma/seeds/categories.ts for the same distinction.
  private async assertCategoryUsable(categoryId: string) {
    const category = await this.categoryRepo.findById(categoryId);
    if (!category) throw new AppError('Category not found', 404);
    if (category.status !== CategoryStatus.ACTIVE) throw new AppError('Category is not active', 400);
    if (category.scope !== CategoryScope.CREATOR) throw new AppError('Category is not usable for provider services', 400);
    return category;
  }

  async listMine(userId: string) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    return this.repo.findByCreatorProfileId(profile.id);
  }

  async create(userId: string, input: CreateServiceInput) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    await this.assertCategoryUsable(input.categoryId);
    return this.repo.create(profile.id, input);
  }

  private async findOwned(userId: string, serviceId: string) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    const service = await this.repo.findById(serviceId);
    if (!service) throw new AppError('Service not found', 404);
    if (service.creatorProfileId !== profile.id) throw new AppError('Not authorized to modify this service', 403);
    return service;
  }

  async update(userId: string, serviceId: string, input: UpdateServiceInput) {
    await this.findOwned(userId, serviceId);
    if (input.categoryId) await this.assertCategoryUsable(input.categoryId);
    return this.repo.update(serviceId, input);
  }

  async remove(userId: string, serviceId: string) {
    await this.findOwned(userId, serviceId);
    await this.repo.delete(serviceId);
  }

  async listPublic(params: { categoryId?: string; search?: string; page: number; limit: number }) {
    return this.repo.findManyPublic(params);
  }

  async getPublicDetail(serviceId: string) {
    const service = await this.repo.findById(serviceId);
    if (!service || service.status !== ServiceStatus.ACTIVE) throw new AppError('Service not found', 404);
    return service;
  }

  async listForAdmin(params: { status?: ServiceStatus; page: number; limit: number }) {
    return this.repo.findAllForAdmin(params);
  }

  async updateStatusAsAdmin(serviceId: string, status: ServiceStatus) {
    const service = await this.repo.findById(serviceId);
    if (!service) throw new AppError('Service not found', 404);
    return this.repo.updateStatus(serviceId, status);
  }
}
