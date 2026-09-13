import crypto from 'crypto';
import QRCode from 'qrcode';
import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { getDict } from '../../i18n';
import { RedemptionRepository } from './redemption.repository';
import { PromotionRepository } from '../promotion/promotion.repository';
import { toRedemptionSessionDto } from './redemption.dto';
import { recordPointsTransaction } from '../points/points.ledger';
import { recordCreditsTransaction } from '../credits/credits.ledger';
import { notificationService } from '../notifications/notification.service';
import { emitToUser } from '../../socket';
import type { Role } from '@prisma/client';

import { HttpStatus } from '../../constants/httpStatus';

const SESSION_TTL_MS = 5 * 60 * 1000;
const LIVE_STATUSES = ['ISSUED', 'SCANNED', 'BILL_ENTERED'] as const;

type PromotionSnapshot = {
  title: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minSpend: number;
  maxDiscountCap: number | null;
};

// Nepal Time is a fixed +05:45 offset (no DST) — same "reset at local midnight
// in Kathmandu" convention wallet.service.ts uses for its daily withdrawal cap,
// reused here for the promotion daily-redemption-limit window.
function startOfTodayNepal(now = new Date()): Date {
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(now);
  return new Date(`${localDate}T00:00:00+05:45`);
}

function computeDiscount(snapshot: PromotionSnapshot, billAmount: number): number {
  const raw = snapshot.discountType === 'PERCENTAGE' ? billAmount * (snapshot.discountValue / 100) : snapshot.discountValue;
  const capped = snapshot.maxDiscountCap != null ? Math.min(raw, snapshot.maxDiscountCap) : raw;
  return Math.round(Math.min(capped, billAmount) * 100) / 100;
}

export class RedemptionService {
  private repo: RedemptionRepository;
  private promotionRepo: PromotionRepository;

  constructor() {
    this.repo = new RedemptionRepository();
    this.promotionRepo = new PromotionRepository();
  }

  private async resolveCreatorId(userId: string) {
    const profile = await this.repo.findCreatorProfileByUserId(userId);
    if (!profile) throw new AppError(getDict().redemption.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    return profile;
  }

  private async resolveBusinessId(userId: string) {
    const profile = await this.repo.findBusinessProfileByUserId(userId);
    if (!profile) throw new AppError(getDict().redemption.businessProfileNotFound, HttpStatus.NOT_FOUND);
    return profile;
  }

  private async generateQr(token: string): Promise<string> {
    // Encodes only the opaque token — never a JWT, never PII. The business
    // scanner resolves it server-side via the /scan endpoint.
    return QRCode.toDataURL(token, { margin: 1, width: 320 });
  }

  private async loadDto(id: string) {
    const full = await this.repo.findFullById(id);
    return toRedemptionSessionDto(full!);
  }

  async issue(userId: string, promotionId: string) {
    const creator = await this.resolveCreatorId(userId);
    const promotion = await this.promotionRepo.findById(promotionId);
    if (!promotion) throw new AppError(getDict().redemption.promotionNotFound, HttpStatus.NOT_FOUND);

    const now = new Date();
    if (promotion.status === 'ACTIVE' && promotion.validUntil < now) {
      await this.promotionRepo.updateStatus(promotion.id, 'EXPIRED');
      promotion.status = 'EXPIRED';
    }
    if (promotion.status !== 'ACTIVE' || promotion.validFrom > now || promotion.validUntil < now) {
      throw new AppError(getDict().redemption.promotionNotActive, HttpStatus.CONFLICT);
    }

    // Hard V1 rule: a creator may redeem a given promotion at most once.
    const alreadyRedeemed = await this.repo.countConfirmedByCreator(promotion.id, creator.id);
    if (alreadyRedeemed > 0) {
      throw new AppError(getDict().redemption.alreadyRedeemedPromotion, HttpStatus.CONFLICT);
    }

    // Idempotent get-or-create — re-opening the promotion returns the same
    // live QR instead of minting a new one every tap.
    const existing = await this.repo.findLiveSessionForCreatorPromotion(creator.id, promotion.id);
    if (existing) {
      if (existing.expiresAt > now) {
        const qrCodeDataUrl = await this.generateQr(existing.token);
        return { session: await this.loadDto(existing.id), qrCodeDataUrl };
      }
      await prisma.redemptionSession.update({ where: { id: existing.id }, data: { status: 'EXPIRED' } });
    }

    if (promotion.dailyRedemptionLimit != null) {
      const todayCount = await this.repo.countConfirmedToday(promotion.id, startOfTodayNepal(now));
      if (todayCount >= promotion.dailyRedemptionLimit) {
        throw new AppError(getDict().redemption.dailyRedemptionLimitReached, HttpStatus.CONFLICT);
      }
    }
    if (promotion.totalRedemptionLimit != null) {
      const totalCount = await this.repo.countConfirmedTotal(promotion.id);
      if (totalCount >= promotion.totalRedemptionLimit) {
        throw new AppError(getDict().redemption.totalRedemptionLimitReached, HttpStatus.CONFLICT);
      }
    }

    const token = crypto.randomBytes(24).toString('base64url');
    const snapshot: PromotionSnapshot = {
      title:           promotion.title,
      discountType:    promotion.discountType,
      discountValue:   promotion.discountValue,
      minSpend:        promotion.minSpend,
      maxDiscountCap:  promotion.maxDiscountCap,
    };
    const created = await this.repo.create({
      promotionId:       promotion.id,
      creatorId:         creator.id,
      businessId:        promotion.businessId,
      token,
      expiresAt:         new Date(now.getTime() + SESSION_TTL_MS),
      promotionSnapshot: snapshot,
    });

    const qrCodeDataUrl = await this.generateQr(token);
    return { session: await this.loadDto(created.id), qrCodeDataUrl };
  }

  async scan(userId: string, token: string) {
    const business = await this.resolveBusinessId(userId);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const row = await this.repo.lockByToken(tx, token);
      if (!row) throw new AppError(getDict().redemption.sessionNotFound, HttpStatus.NOT_FOUND);
      if (row.businessId !== business.id) throw new AppError(getDict().redemption.notYourSession, HttpStatus.FORBIDDEN);

      if (!(LIVE_STATUSES as readonly string[]).includes(row.status)) {
        throw new AppError(getDict().redemption.sessionNotInExpectedState(row.status), HttpStatus.CONFLICT);
      }
      if (row.expiresAt < now) {
        // Committed as its own outcome, not thrown from inside the
        // transaction — throwing here would roll this very update back,
        // leaving the row silently stuck at ISSUED/SCANNED forever instead
        // of actually recording EXPIRED (caught by rewards.int.test.ts).
        await this.repo.markExpired(tx, row.id);
        return { id: row.id, expired: true as const };
      }
      if (row.status === 'ISSUED') {
        await this.repo.markScanned(tx, row.id, userId);
      }
      // SCANNED/BILL_ENTERED — idempotent re-scan, business re-opening the screen.
      return { id: row.id, expired: false as const };
    }, { isolationLevel: 'Serializable' });

    if (result.expired) throw new AppError(getDict().redemption.sessionExpired, HttpStatus.CONFLICT);
    return this.loadDto(result.id);
  }

  async enterBill(userId: string, sessionId: string, billAmount: number) {
    const business = await this.resolveBusinessId(userId);
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const row = await this.repo.lockById(tx, sessionId);
      if (!row) throw new AppError(getDict().redemption.sessionNotFound, HttpStatus.NOT_FOUND);
      if (row.businessId !== business.id) throw new AppError(getDict().redemption.notYourSession, HttpStatus.FORBIDDEN);
      if (row.expiresAt < now && (LIVE_STATUSES as readonly string[]).includes(row.status)) {
        // See scan()'s comment — committed as its own outcome, not thrown
        // from inside the transaction, so the EXPIRED flip actually persists.
        await this.repo.markExpired(tx, row.id);
        return { id: row.id, expired: true as const };
      }
      if (row.status !== 'SCANNED' && row.status !== 'BILL_ENTERED') {
        throw new AppError(getDict().redemption.sessionNotInExpectedState(row.status), HttpStatus.CONFLICT);
      }

      const snapshot = row.promotionSnapshot as unknown as PromotionSnapshot;
      if (billAmount < snapshot.minSpend) {
        throw new AppError(getDict().redemption.billBelowMinimumSpend(snapshot.minSpend.toString()), HttpStatus.BAD_REQUEST);
      }

      const discountAmount = computeDiscount(snapshot, billAmount);
      // Points pay the full discounted total, not just the discount slice —
      // e.g. a Rs. 1000 bill at 10% off costs the creator 900 points, not 100.
      const pointsCost = Math.round(billAmount - discountAmount);
      await this.repo.markBillEntered(tx, row.id, { billAmount, discountAmount, pointsCost, creditsEarned: pointsCost });
      return { id: row.id, expired: false as const };
    }, { isolationLevel: 'Serializable' });

    if (result.expired) throw new AppError(getDict().redemption.sessionExpired, HttpStatus.CONFLICT);
    const dto = await this.loadDto(result.id);
    const full = await this.repo.findFullById(result.id);
    emitToUser(full!.creator.userId, 'redemption:updated', dto);
    return dto;
  }

  async confirm(userId: string, sessionId: string) {
    const creator = await this.resolveCreatorId(userId);
    const now = new Date();

    const outcome = await prisma.$transaction(async (tx) => {
      const row = await this.repo.lockById(tx, sessionId);
      if (!row) throw new AppError(getDict().redemption.sessionNotFound, HttpStatus.NOT_FOUND);
      if (row.creatorId !== creator.id) throw new AppError(getDict().redemption.notYourSession, HttpStatus.FORBIDDEN);
      if (row.expiresAt < now) {
        // See scan()'s comment — committed as its own outcome, not thrown
        // from inside the transaction, so the EXPIRED flip actually persists.
        await this.repo.markExpired(tx, row.id);
        return { id: row.id, expired: true as const, discountAmount: 0, pointsCost: 0, creditsEarned: 0 };
      }
      if (row.status !== 'BILL_ENTERED') {
        throw new AppError(getDict().redemption.sessionNotInExpectedState(row.status), HttpStatus.CONFLICT);
      }

      // Belt-and-suspenders re-check of every limit under the row lock, in
      // case two sessions for the same promotion/creator were issued
      // concurrently before either reached CONFIRMED.
      const promotion = await tx.promotion.findUnique({
        where:  { id: row.promotionId },
        select: { dailyRedemptionLimit: true, totalRedemptionLimit: true },
      });
      if (promotion?.dailyRedemptionLimit != null) {
        const count = await tx.redemptionSession.count({
          where: { promotionId: row.promotionId, status: 'CONFIRMED', confirmedAt: { gte: startOfTodayNepal(now) } },
        });
        if (count >= promotion.dailyRedemptionLimit) {
          throw new AppError(getDict().redemption.dailyRedemptionLimitReached, HttpStatus.CONFLICT);
        }
      }
      if (promotion?.totalRedemptionLimit != null) {
        const count = await tx.redemptionSession.count({ where: { promotionId: row.promotionId, status: 'CONFIRMED' } });
        if (count >= promotion.totalRedemptionLimit) {
          throw new AppError(getDict().redemption.totalRedemptionLimitReached, HttpStatus.CONFLICT);
        }
      }
      const alreadyByCreator = await tx.redemptionSession.count({
        where: { promotionId: row.promotionId, creatorId: row.creatorId, status: 'CONFIRMED' },
      });
      if (alreadyByCreator > 0) {
        throw new AppError(getDict().redemption.alreadyRedeemedPromotion, HttpStatus.CONFLICT);
      }

      const pointsCost = row.pointsCost ?? 0;
      if (pointsCost > 0) {
        const account = await this.repo.lockPointsAccount(tx, row.creatorId);
        if ((account?.balance ?? 0) < pointsCost) {
          throw new AppError(getDict().redemption.insufficientPoints, HttpStatus.BAD_REQUEST);
        }
      }

      await this.repo.markConfirmed(tx, row.id);

      if (pointsCost > 0) {
        await recordPointsTransaction(tx, {
          creatorId:     row.creatorId,
          type:          'PROMO_REDEMPTION_DEBIT',
          direction:     'DEBIT',
          amount:        pointsCost,
          description:   'Redeemed at a Kolab promotion',
          referenceType: 'redemption_session',
          referenceId:   row.id,
        });
      }
      const creditsEarned = row.creditsEarned ?? 0;
      if (creditsEarned > 0) {
        await recordCreditsTransaction(tx, {
          businessId:    row.businessId,
          type:          'PROMO_REDEMPTION_CREDIT',
          direction:     'CREDIT',
          amount:        creditsEarned,
          description:   'Creator promotion redemption',
          referenceType: 'redemption_session',
          referenceId:   row.id,
        });
      }

      return { id: row.id, expired: false as const, discountAmount: row.discountAmount ?? 0, pointsCost, creditsEarned };
    }, { isolationLevel: 'Serializable' });

    if (outcome.expired) throw new AppError(getDict().redemption.sessionExpired, HttpStatus.CONFLICT);
    const dto = await this.loadDto(outcome.id);
    const full = await this.repo.findFullById(outcome.id);
    notificationService.create({
      userId:  full!.creator.userId,
      type:    'redemption_success',
      title:   'Redemption successful',
      body:    `You saved Rs. ${outcome.discountAmount.toLocaleString()} at ${full!.promotion.title}.`,
      refId:   outcome.id,
      refType: 'redemption_session',
    }).catch(() => {});
    notificationService.create({
      userId:  full!.business.userId,
      type:    'credits_received',
      title:   'Credits received',
      body:    `You earned ${outcome.creditsEarned} Kolab Credits from a redemption.`,
      refId:   outcome.id,
      refType: 'redemption_session',
    }).catch(() => {});
    emitToUser(full!.business.userId, 'redemption:updated', dto);
    return dto;
  }

  async cancel(userId: string, role: Role, sessionId: string, reason?: string) {
    const ownerId = role === 'CREATOR'
      ? (await this.resolveCreatorId(userId)).id
      : (await this.resolveBusinessId(userId)).id;

    const resultId = await prisma.$transaction(async (tx) => {
      const row = await this.repo.lockById(tx, sessionId);
      if (!row) throw new AppError(getDict().redemption.sessionNotFound, HttpStatus.NOT_FOUND);
      const owns = role === 'CREATOR' ? row.creatorId === ownerId : row.businessId === ownerId;
      if (!owns) throw new AppError(getDict().redemption.notYourSession, HttpStatus.FORBIDDEN);
      if (!(LIVE_STATUSES as readonly string[]).includes(row.status)) {
        throw new AppError(getDict().redemption.sessionNotInExpectedState(row.status), HttpStatus.CONFLICT);
      }
      await this.repo.markCancelled(tx, row.id, reason);
      return row.id;
    });

    const dto = await this.loadDto(resultId);
    const full = await this.repo.findFullById(resultId);
    const notifyUserId = role === 'CREATOR' ? full!.business.userId : full!.creator.userId;
    emitToUser(notifyUserId, 'redemption:updated', dto);
    return dto;
  }
}
