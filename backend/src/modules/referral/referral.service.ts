import { AppError } from '../../middleware/error';
import { ReferralRepository } from './referral.repository';
import { getDict } from '../../i18n';

import { HttpStatus } from '../../constants/httpStatus';

export const REFERRAL_REWARD_AMOUNT = 500;
export const REFERRED_FIRST_EVENT_BONUS = 200; // paid to the referred creator themselves, once, for completing their first event
const REFERRAL_WINDOW_DAYS = 90; // ~3 months

type MinimalCreatorProfile = {
  username: string | null;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  categories: string[];
};

export function isCreatorProfileComplete(profile: MinimalCreatorProfile): boolean {
  return !!(
    profile.username &&
    profile.fullName &&
    profile.bio &&
    profile.avatarUrl &&
    profile.location &&
    profile.categories.length > 0
  );
}

export class ReferralService {
  private repo: ReferralRepository;

  constructor() {
    this.repo = new ReferralRepository();
  }

  /** Shared by both the signup-with-code path and the manual apply-code path. */
  async linkCreatorToReferrer(referredProfileId: string, code: string) {
    const trimmedCode = code.trim().toUpperCase();

    const referrer = await this.repo.findCreatorProfileByReferralCode(trimmedCode);
    if (!referrer) throw new AppError(getDict().referral.invalidReferralCode, HttpStatus.NOT_FOUND);
    if (referrer.id === referredProfileId) throw new AppError(getDict().referral.cannotUseOwnReferralCode, HttpStatus.BAD_REQUEST);

    const existing = await this.repo.findReferralByReferredId(referredProfileId);
    if (existing) throw new AppError(getDict().referral.accountAlreadyLinkedToReferral, HttpStatus.CONFLICT);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFERRAL_WINDOW_DAYS);

    return this.repo.createReferral({
      referrerId: referrer.id,
      referredId: referredProfileId,
      code: trimmedCode,
      expiresAt,
      rewardAmount: REFERRAL_REWARD_AMOUNT,
    });
  }

  async applyReferralCode(userId: string, code: string) {
    const profile = await this.repo.findCreatorProfileByUserId(userId);
    if (!profile) throw new AppError(getDict().referral.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    return this.linkCreatorToReferrer(profile.id, code);
  }

  private async materializeExpiry<T extends { id: string; status: string; expiresAt: Date }>(referral: T): Promise<T> {
    if (referral.status === 'PENDING' && new Date() > referral.expiresAt) {
      const updated = await this.repo.updateReferralStatus(referral.id, { status: 'EXPIRED' });
      return { ...referral, ...updated };
    }
    return referral;
  }

  async getMyReferralOverview(userId: string) {
    const profile = await this.repo.findCreatorProfileByUserId(userId);
    if (!profile) throw new AppError(getDict().referral.creatorProfileNotFound, HttpStatus.NOT_FOUND);

    const code = await this.repo.getOrCreateReferralCode(profile.id);

    const [inbound, madeRaw] = await Promise.all([
      this.repo.findReferralWithReferrerByReferredId(profile.id),
      this.repo.listReferralsMadeByCreator(profile.id),
    ]);

    const made = await Promise.all(madeRaw.map((r) => this.materializeExpiry(r)));

    return {
      code,
      rewardAmount: REFERRAL_REWARD_AMOUNT,
      referredBy: inbound?.referrer ? { name: inbound.referrer.fullName ?? inbound.referrer.username } : null,
      referrals: made.map((r) => ({
        id: r.id,
        referredName: r.referred.fullName ?? r.referred.username ?? 'Creator',
        referredAvatarUrl: r.referred.avatarUrl,
        status: r.status,
        linkedAt: r.linkedAt,
        expiresAt: r.expiresAt,
        completedAt: r.completedAt,
      })),
    };
  }
}
