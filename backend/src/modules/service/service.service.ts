import { CategoryScope, CategoryStatus, ServiceStatus } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { ServiceRepository } from './service.repository';
import { CreatorRepository } from '../creator/creator.repository';
import { CategoryRepository } from '../category/category.repository';
import type { CreateServiceInput, UpdateServiceInput } from './service.schema';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

export class ServiceService {
  private repo = new ServiceRepository();
  private creatorRepo = new CreatorRepository();
  private categoryRepo = new CategoryRepository();

  // Strict BOTH-only, per product direction — a Service is tagged with a
  // content niche (Restaurants, Automotive, ...), not a CREATOR-scope
  // provider-role category (Photographer, Videographer, ...).
  private async assertCategoryUsable(categoryId: string) {
    const category = await this.categoryRepo.findById(categoryId);
    if (!category) throw new AppError(getDict().service.categoryNotFound, HttpStatus.NOT_FOUND);
    if (category.status !== CategoryStatus.ACTIVE) throw new AppError(getDict().service.categoryNotActive, HttpStatus.BAD_REQUEST);
    if (category.scope !== CategoryScope.BOTH) throw new AppError(getDict().service.categoryNotUsableForServices, HttpStatus.BAD_REQUEST);
    return category;
  }

  async listMine(userId: string) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().service.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    return this.repo.findByCreatorProfileId(profile.id);
  }

  async create(userId: string, input: CreateServiceInput) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().service.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    await this.assertCategoryUsable(input.categoryId);
    return this.repo.create(profile.id, input);
  }

  private async findOwned(userId: string, serviceId: string) {
    const profile = await this.creatorRepo.findByUserId(userId);
    if (!profile) throw new AppError(getDict().service.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    const service = await this.repo.findById(serviceId);
    if (!service) throw new AppError(getDict().service.serviceNotFound, HttpStatus.NOT_FOUND);
    if (service.creatorProfileId !== profile.id) throw new AppError(getDict().service.notAuthorizedToModifyService, HttpStatus.FORBIDDEN);
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
    if (!service || service.status !== ServiceStatus.ACTIVE) throw new AppError(getDict().service.serviceNotFound, HttpStatus.NOT_FOUND);
    return service;
  }

  async listForAdmin(params: { status?: ServiceStatus; page: number; limit: number }) {
    return this.repo.findAllForAdmin(params);
  }

  async updateStatusAsAdmin(serviceId: string, status: ServiceStatus) {
    const service = await this.repo.findById(serviceId);
    if (!service) throw new AppError(getDict().service.serviceNotFound, HttpStatus.NOT_FOUND);
    return this.repo.updateStatus(serviceId, status);
  }
}
