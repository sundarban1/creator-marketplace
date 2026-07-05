import { AppError } from '../../middleware/error';
import { WalletRepository } from './wallet.repository';
import { REFERRED_FIRST_EVENT_BONUS } from '../referral/referral.service';
import type { WithdrawInput } from './wallet.schema';

export class WalletService {
  private repo: WalletRepository;

  constructor() {
    this.repo = new WalletRepository();
  }

  private async computeBalances(creatorId: string) {
    const [pendingEarnings, releasedTotal, withdrawn, referrerRewards, hasReferredBonus] = await Promise.all([
      this.repo.sumProposedRateByPaymentStatus(creatorId, 'PAID'),
      this.repo.sumProposedRateByPaymentStatus(creatorId, 'RELEASED'),
      this.repo.sumWithdrawn(creatorId),
      this.repo.sumCompletedReferrerRewards(creatorId),
      this.repo.hasCompletedReferredBonus(creatorId),
    ]);
    const referredBonus = hasReferredBonus ? REFERRED_FIRST_EVENT_BONUS : 0;

    return {
      totalEarned: pendingEarnings + releasedTotal + referrerRewards + referredBonus,
      pendingEarnings,
      availableBalance: releasedTotal - withdrawn + referrerRewards + referredBonus,
    };
  }

  async getWalletSummary(userId: string) {
    const profile = await this.repo.findCreatorProfileByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    const balances = await this.computeBalances(profile.id);
    return { ...balances, paymentMethods: profile.paymentMethods };
  }

  async withdraw(userId: string, input: WithdrawInput) {
    const profile = await this.repo.findCreatorProfileByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);

    if (!profile.paymentMethods.includes(input.method)) {
      throw new AppError(`Add ${input.method} as a payment method before withdrawing to it`, 400);
    }

    const { availableBalance } = await this.computeBalances(profile.id);
    if (input.amount > availableBalance) {
      throw new AppError('Insufficient balance for this withdrawal', 400);
    }

    await this.repo.createWithdrawal(profile.id, input.amount, input.method);
    const balances = await this.computeBalances(profile.id);
    return { ...balances, paymentMethods: profile.paymentMethods };
  }

  async listTransactions(userId: string) {
    const profile = await this.repo.findCreatorProfileByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    return this.repo.listWithdrawals(profile.id);
  }
}
