import prisma from '../../prisma';
import { WalletRepository } from '../wallet/wallet.repository';
import { computeWithdrawableBalance } from '../wallet/wallet.service';

// Kolab Points are the creator's wallet balance, not a separate ledger — see
// the Kolab Rewards comment in schema.prisma. The "points" activity feed only
// ever needs to show the subset of wallet movement a creator would recognize
// as points activity (spending at a business, or a manual adjustment); a
// campaign payout or a cash withdrawal already has its own screen (the
// wallet statement) and would be confusing duplicated here.
const POINTS_LEDGER_TYPES = ['PROMO_REDEMPTION_DEBIT', 'ADJUSTMENT'] as const;

export class PointsRepository {
  private walletRepo = new WalletRepository();

  async findCreatorProfileByUserId(userId: string) {
    return prisma.creatorProfile.findUnique({ where: { userId } });
  }

  /**
   * `balance` is withdrawableBalance — what redemption.service.ts's confirm()
   * checks against — so this screen never shows a number the creator can't
   * actually spend. `lifetimeEarned`/`lifetimeSpent` are the full wallet
   * ledger's totals (every credit / every debit, including withdrawals),
   * since it's genuinely the same money either way.
   */
  async getAccount(creatorId: string) {
    const [balance, ledger] = await Promise.all([
      computeWithdrawableBalance(prisma, creatorId),
      this.walletRepo.sumLedger(creatorId),
    ]);
    return { balance, lifetimeEarned: ledger.credits, lifetimeSpent: ledger.debits };
  }

  async listLedger(creatorId: string) {
    return prisma.walletTransaction.findMany({
      where:   { creatorId, status: 'COMPLETED', type: { in: [...POINTS_LEDGER_TYPES] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Points earned (CREDIT rows) since `since` — powers the "+N this month" figure. */
  async sumCreditsSince(creatorId: string, since: Date) {
    const result = await prisma.walletTransaction.aggregate({
      where: { creatorId, status: 'COMPLETED', direction: 'CREDIT', createdAt: { gte: since } },
      _sum:  { amount: true },
    });
    return result._sum.amount ?? 0;
  }
}
