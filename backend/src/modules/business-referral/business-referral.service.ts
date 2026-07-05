import { AppError } from '../../middleware/error';
import { BusinessReferralRepository } from './business-referral.repository';

export const BUSINESS_REFERRAL_REWARD_AMOUNT = 500;
const REFERRAL_WINDOW_DAYS = 90; // ~3 months
export const REFERRAL_HOLD_DAYS = 14;

type MinimalBusinessProfile = {
  businessName: string | null;
  description: string | null;
  logoUrl: string | null;
  location: string | null;
  categories: string[];
};

export function isBusinessProfileComplete(profile: MinimalBusinessProfile): boolean {
  return !!(
    profile.businessName &&
    profile.description &&
    profile.logoUrl &&
    profile.location &&
    profile.categories.length > 0
  );
}

export class BusinessReferralService {
  private repo: BusinessReferralRepository;

  constructor() {
    this.repo = new BusinessReferralRepository();
  }

  /** Shared by both the signup-with-code path and the manual apply-code path. */
  async linkBusinessToReferrer(referredProfileId: string, code: string) {
    const trimmedCode = code.trim().toUpperCase();

    const referrer = await this.repo.findBusinessProfileByReferralCode(trimmedCode);
    if (!referrer) throw new AppError('Invalid referral code', 404);
    if (referrer.id === referredProfileId) throw new AppError('You cannot use your own referral code', 400);

    const existing = await this.repo.findReferralByReferredId(referredProfileId);
    if (existing) throw new AppError('This account is already linked to a referral', 409);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFERRAL_WINDOW_DAYS);

    return this.repo.createReferral({
      referrerId: referrer.id,
      referredId: referredProfileId,
      code: trimmedCode,
      expiresAt,
      rewardAmount: BUSINESS_REFERRAL_REWARD_AMOUNT,
    });
  }

  async applyReferralCode(userId: string, code: string) {
    const profile = await this.repo.findBusinessProfileByUserId(userId);
    if (!profile) throw new AppError('Business profile not found', 404);
    return this.linkBusinessToReferrer(profile.id, code);
  }

  private async materializeExpiry<T extends { id: string; status: string; expiresAt: Date }>(referral: T): Promise<T> {
    if (referral.status === 'PENDING' && new Date() > referral.expiresAt) {
      const updated = await this.repo.updateReferralStatus(referral.id, { status: 'EXPIRED' });
      return { ...referral, ...updated };
    }
    return referral;
  }

  async resendReferral(userId: string, referralId: string) {
    const profile = await this.repo.findBusinessProfileByUserId(userId);
    if (!profile) throw new AppError('Business profile not found', 404);

    const referral = await this.repo.findReferralById(referralId);
    if (!referral) throw new AppError('Referral not found', 404);
    if (referral.referrerId !== profile.id) throw new AppError('You can only resend your own referrals', 403);
    if (referral.status !== 'EXPIRED') throw new AppError('Only expired referrals can be resent', 400);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFERRAL_WINDOW_DAYS);
    return this.repo.updateReferralStatus(referralId, { status: 'PENDING', expiresAt });
  }

  async getMyReferralOverview(userId: string) {
    const profile = await this.repo.findBusinessProfileByUserId(userId);
    if (!profile) throw new AppError('Business profile not found', 404);

    const code = await this.repo.getOrCreateReferralCode(profile.id);

    const [inbound, madeRaw] = await Promise.all([
      this.repo.findReferralWithReferrerByReferredId(profile.id),
      this.repo.listReferralsMadeByBusiness(profile.id),
    ]);

    const made = await Promise.all(madeRaw.map((r) => this.materializeExpiry(r)));

    return {
      code,
      rewardAmount: BUSINESS_REFERRAL_REWARD_AMOUNT,
      referredBy: inbound?.referrer ? { name: inbound.referrer.businessName } : null,
      referrals: made.map((r) => ({
        id: r.id,
        referredName: r.referred.businessName ?? 'Business',
        referredLogoUrl: r.referred.logoUrl,
        status: r.status,
        linkedAt: r.linkedAt,
        expiresAt: r.expiresAt,
        completedAt: r.completedAt,
      })),
    };
  }
}
