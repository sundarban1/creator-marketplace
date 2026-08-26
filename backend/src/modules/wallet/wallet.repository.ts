import prisma from '../../prisma';

const RESERVED_WITHDRAWAL_STATUSES = ['PENDING', 'PROCESSING'] as const;

// Excludes visually ambiguous characters (0/O, 1/I) so a reference read off a
// screen or spoken to support can't be mistyped. Mirrors the referral-code alphabet.
const REFERENCE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REFERENCE_LENGTH = 8;

function withdrawalReferenceCandidate(): string {
  let body = '';
  for (let i = 0; i < REFERENCE_LENGTH; i++) {
    body += REFERENCE_CHARS[Math.floor(Math.random() * REFERENCE_CHARS.length)];
  }
  return `WD-${body}`;
}

export class WalletRepository {
  async findCreatorProfileByUserId(userId: string) {
    return prisma.creatorProfile.findUnique({ where: { userId } });
  }

  // Escrowed but not yet released — money the creator has earned on approved
  // work that an admin hasn't released into the wallet yet. Stays derived from
  // Application (it isn't "in the wallet", so no ledger row exists for it).
  async sumProposedRateByPaymentStatus(creatorId: string, paymentStatus: 'PAID' | 'RELEASED') {
    const result = await prisma.application.aggregate({
      where: { creatorId, paymentStatus },
      _sum: { proposedRate: true },
    });
    return result._sum.proposedRate ?? 0;
  }

  /** Realized wallet ledger totals — the source of truth for wallet balance. */
  async sumLedger(creatorId: string) {
    const grouped = await prisma.walletTransaction.groupBy({
      by:      ['direction'],
      where:   { creatorId, status: 'COMPLETED' },
      _sum:    { amount: true },
    });
    let credits = 0;
    let debits = 0;
    for (const row of grouped) {
      if (row.direction === 'CREDIT') credits = row._sum.amount ?? 0;
      if (row.direction === 'DEBIT')  debits = row._sum.amount ?? 0;
    }
    return { credits, debits, net: credits - debits };
  }

  /** Amount reserved by in-flight withdrawal requests (not yet paid, not rejected). */
  async sumReservedWithdrawals(creatorId: string) {
    const result = await prisma.withdrawal.aggregate({
      where: { creatorId, status: { in: [...RESERVED_WITHDRAWAL_STATUSES] } },
      _sum:  { amount: true },
    });
    return result._sum.amount ?? 0;
  }

  /**
   * A unique, human-readable reference for a new withdrawal request. The
   * pre-check keeps the space clean; the `referenceCode` unique index is the
   * real backstop if two requests ever race on the same candidate.
   */
  async generateWithdrawalReference(): Promise<string> {
    for (let attempt = 0; attempt < 6; attempt++) {
      const candidate = withdrawalReferenceCandidate();
      const taken = await prisma.withdrawal.findUnique({
        where:  { referenceCode: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
    }
    throw new Error('Could not generate a unique withdrawal reference, please try again');
  }

  async listWithdrawals(creatorId: string) {
    return prisma.withdrawal.findMany({
      where:   { creatorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listLedger(creatorId: string) {
    return prisma.walletTransaction.findMany({
      where:   { creatorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Rs. 500 rewards earned as the referrer, once each referral is admin-released. */
  async sumCompletedReferrerRewards(creatorId: string) {
    const result = await prisma.referral.aggregate({
      where: { referrerId: creatorId, status: 'COMPLETED' },
      _sum:  { rewardAmount: true },
    });
    return Number(result._sum.rewardAmount ?? 0);
  }

  /** Was this creator referred by someone, and did that referral get released? At most one, ever (referredId is unique). */
  async hasCompletedReferredBonus(creatorId: string) {
    const referral = await prisma.referral.findFirst({
      where:  { referredId: creatorId, status: 'COMPLETED' },
      select: { id: true },
    });
    return !!referral;
  }
}
