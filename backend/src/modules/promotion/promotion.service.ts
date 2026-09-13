import { AppError } from '../../middleware/error';
import { getDict } from '../../i18n';
import { PromotionRepository } from './promotion.repository';
import { toPromotionDto, toPromotionManageDto } from './promotion.dto';
import { notificationService } from '../notifications/notification.service';
import prisma from '../../prisma';
import type { CreatePromotionInput, UpdatePromotionInput } from './promotion.schema';
import type { Promotion } from '@prisma/client';

import { HttpStatus } from '../../constants/httpStatus';

const EDITABLE_STATUSES = ['DRAFT', 'PAUSED'] as const;

export class PromotionService {
  private repo: PromotionRepository;

  constructor() {
    this.repo = new PromotionRepository();
  }

  private async resolveBusinessId(userId: string) {
    const profile = await this.repo.findBusinessProfileByUserId(userId);
    if (!profile) throw new AppError(getDict().promotion.businessProfileNotFound, HttpStatus.NOT_FOUND);
    return profile;
  }

  /** ACTIVE promotions whose window has quietly passed flip to EXPIRED lazily, no cron needed (mirrors referral.service.ts's materializeExpiry). */
  private async materializeExpiredPromotions(now: Date) {
    const stale = await this.repo.findStaleActiveExpired(now);
    if (stale.length === 0) return;
    await prisma.promotion.updateMany({
      where: { id: { in: stale.map((p) => p.id) }, status: 'ACTIVE' },
      data:  { status: 'EXPIRED' },
    });
  }

  private async getOwnedPromotionOrThrow(id: string, businessId: string): Promise<Promotion> {
    const promotion = await this.repo.findById(id);
    if (!promotion) throw new AppError(getDict().promotion.promotionNotFound, HttpStatus.NOT_FOUND);
    if (promotion.businessId !== businessId) {
      throw new AppError(getDict().promotion.notYourPromotion, HttpStatus.FORBIDDEN);
    }
    return promotion;
  }

  async create(userId: string, input: CreatePromotionInput) {
    const profile = await this.resolveBusinessId(userId);
    const row = await this.repo.create(profile.id, { ...input, status: 'DRAFT' });
    const withBusiness = await this.repo.findById(row.id);
    return toPromotionDto(withBusiness!);
  }

  async update(userId: string, id: string, input: UpdatePromotionInput) {
    const profile = await this.resolveBusinessId(userId);
    const existing = await this.getOwnedPromotionOrThrow(id, profile.id);
    const isActive = existing.status === 'ACTIVE';
    if (!isActive && !EDITABLE_STATUSES.includes(existing.status as (typeof EDITABLE_STATUSES)[number])) {
      throw new AppError(getDict().promotion.cannotEditPromotionInStatus(existing.status), HttpStatus.CONFLICT);
    }
    // Editing a live promotion auto-pauses it — no new redemptions are issued
    // against terms the business is mid-edit on. Sessions already issued keep
    // their own frozen snapshot, so this can't corrupt an in-flight redemption.
    const updated = await this.repo.update(id, isActive ? { ...input, status: 'PAUSED' } : input);
    const withBusiness = await this.repo.findById(updated.id);
    return toPromotionDto(withBusiness!);
  }

  async publish(userId: string, id: string) {
    const profile = await this.resolveBusinessId(userId);
    const existing = await this.getOwnedPromotionOrThrow(id, profile.id);
    if (!EDITABLE_STATUSES.includes(existing.status as (typeof EDITABLE_STATUSES)[number])) {
      throw new AppError(getDict().promotion.cannotEditPromotionInStatus(existing.status), HttpStatus.CONFLICT);
    }
    if (existing.validUntil < new Date()) {
      throw new AppError(getDict().promotion.cannotPublishInPast, HttpStatus.BAD_REQUEST);
    }
    const updated = await this.repo.updateStatus(id, 'ACTIVE');

    // Notify creators who've favorited this business — the closest existing
    // relationship to "follows a business" in this codebase.
    void this.notifyFavoritingCreators(updated);

    const withBusiness = await this.repo.findById(updated.id);
    return toPromotionDto(withBusiness!);
  }

  private async notifyFavoritingCreators(promotion: Promotion) {
    const favorites = await prisma.favoriteBusiness.findMany({
      where:  { businessId: promotion.businessId },
      select: { creator: { select: { userId: true } } },
    });
    if (favorites.length === 0) return;
    await notificationService.createMany(
      favorites.map((f) => ({
        userId:  f.creator.userId,
        type:    'favorite_business_new_promotion',
        title:   'New deal from a business you follow',
        body:    `${promotion.title} is now available.`,
        refId:   promotion.id,
        refType: 'promotion',
      })),
    );
  }

  async delete(userId: string, id: string) {
    const profile = await this.resolveBusinessId(userId);
    const existing = await this.getOwnedPromotionOrThrow(id, profile.id);
    if (!EDITABLE_STATUSES.includes(existing.status as (typeof EDITABLE_STATUSES)[number])) {
      throw new AppError(getDict().promotion.cannotDeletePromotionInStatus(existing.status), HttpStatus.CONFLICT);
    }
    if (await this.repo.hasAnyRedemptions(id)) {
      throw new AppError(getDict().promotion.cannotDeletePromotionWithRedemptions, HttpStatus.CONFLICT);
    }
    await this.repo.delete(id);
    return { message: getDict().promotion.promotionDeletedSuccessfully };
  }

  async pause(userId: string, id: string) {
    const profile = await this.resolveBusinessId(userId);
    const existing = await this.getOwnedPromotionOrThrow(id, profile.id);
    if (existing.status !== 'ACTIVE') {
      throw new AppError(getDict().promotion.cannotEditPromotionInStatus(existing.status), HttpStatus.CONFLICT);
    }
    const updated = await this.repo.updateStatus(id, 'PAUSED');
    const withBusiness = await this.repo.findById(updated.id);
    return toPromotionDto(withBusiness!);
  }

  async listMine(userId: string) {
    const profile = await this.resolveBusinessId(userId);
    await this.materializeExpiredPromotions(new Date());
    const rows = await this.repo.listForBusiness(profile.id);
    return Promise.all(
      rows.map(async (row) => {
        const withBusiness = await this.repo.findById(row.id);
        const [redemptions, creditsEarned] = await Promise.all([
          this.repo.countConfirmedRedemptions(row.id),
          this.repo.sumCreditsEarned(row.id),
        ]);
        return toPromotionManageDto(withBusiness!, { redemptions, creditsEarned });
      }),
    );
  }

  /** Creator-facing discovery list — ACTIVE and inside the current date window. */
  async listDiscoverable() {
    const now = new Date();
    await this.materializeExpiredPromotions(now);
    const rows = await this.repo.listActive(now);
    return rows.map(toPromotionDto);
  }

  async getById(userId: string, id: string) {
    await this.materializeExpiredPromotions(new Date());
    const promotion = await this.repo.findById(id);
    if (!promotion) throw new AppError(getDict().promotion.promotionNotFound, HttpStatus.NOT_FOUND);

    if (promotion.business.userId === userId) {
      const [redemptions, creditsEarned] = await Promise.all([
        this.repo.countConfirmedRedemptions(promotion.id),
        this.repo.sumCreditsEarned(promotion.id),
      ]);
      return toPromotionManageDto(promotion, { redemptions, creditsEarned });
    }
    return toPromotionDto(promotion);
  }
}
