import prisma from '../../prisma';
import { AppError } from '../../middleware/error';
import { WalletRepository } from './wallet.repository';
import { PayoutMethodRepository } from '../payout-method/payout-method.repository';
import { buildUnifiedStatement, toWithdrawalDto } from './wallet.dto';
import { REFERRED_FIRST_EVENT_BONUS } from '../referral/referral.service';
import { notificationService } from '../notifications/notification.service';
import { getCachedSettings } from '../../utils/settingsCache';
import type { PayoutMethod, Prisma } from '@prisma/client';
import type { CreateWithdrawalInput } from './wallet.schema';

const DEFAULT_MIN_WITHDRAWAL = 500;
const DEFAULT_MAX_WITHDRAWAL = 10000;
const DEFAULT_DAILY_LIMIT = 25000;

function positiveSetting(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// The daily withdrawal cap is a per-calendar-day limit that resets at local
// midnight in Nepal. Nepal Time is a fixed +05:45 offset (no DST), so the start
// of "today" in Kathmandu maps to an exact UTC instant.
function startOfTodayNepal(now = new Date()): Date {
  const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(now);
  return new Date(`${localDate}T00:00:00+05:45`);
}

function snapshotOf(m: PayoutMethod): Prisma.InputJsonValue {
  return {
    type:          m.type,
    label:         m.label,
    accountName:   m.accountName,
    bankName:      m.bankName,
    branch:        m.branch,
    accountNumber: m.accountNumber,
    walletId:      m.walletId,
  };
}

export class WalletService {
  private repo: WalletRepository;
  private payoutRepo: PayoutMethodRepository;

  constructor() {
    this.repo = new WalletRepository();
    this.payoutRepo = new PayoutMethodRepository();
  }

  // Wallet balance model (Kolab V1):
  //  - availableBalance   = realized ledger (Σ COMPLETED credits − Σ COMPLETED
  //                         debits). Debits are PAID withdrawals only, so this
  //                         still includes money reserved by an in-flight
  //                         withdrawal request.
  //  - pendingWithdrawals = amount reserved by PENDING/PROCESSING requests.
  //  - withdrawableBalance= what the creator can actually request right now.
  //  - pendingEarnings    = escrowed, not yet released by an admin — derived
  //                         from Application, never in the ledger.
  private async computeBalances(creatorId: string) {
    const [pendingEarnings, ledger, reserved] = await Promise.all([
      this.repo.sumProposedRateByPaymentStatus(creatorId, 'PAID'),
      this.repo.sumLedger(creatorId),
      this.repo.sumReservedWithdrawals(creatorId),
    ]);

    const availableBalance = ledger.net;
    const withdrawableBalance = Math.max(0, availableBalance - reserved);

    return {
      totalEarned:        ledger.credits + pendingEarnings,
      pendingEarnings,
      availableBalance,
      pendingWithdrawals: reserved,
      withdrawableBalance,
    };
  }

  private async getWithdrawalLimits() {
    const settings = await getCachedSettings();
    return {
      min:   positiveSetting(settings['wallet.minWithdrawal'], DEFAULT_MIN_WITHDRAWAL),
      max:   positiveSetting(settings['wallet.maxWithdrawal'], DEFAULT_MAX_WITHDRAWAL),
      daily: positiveSetting(settings['wallet.dailyLimit'], DEFAULT_DAILY_LIMIT),
    };
  }

  /**
   * The full wallet-summary payload the mobile client refreshes its state from
   * — balances, the configured limits, and the creator's current usage against
   * the "one pending at a time" and daily-cap rules.
   */
  private async buildSummary(creatorId: string) {
    const [balances, limits, pendingCount, dailyUsed] = await Promise.all([
      this.computeBalances(creatorId),
      this.getWithdrawalLimits(),
      this.repo.countReservedWithdrawals(creatorId),
      this.repo.sumWithdrawalsRequestedSince(creatorId, startOfTodayNepal()),
    ]);
    // Today's requests (pending, processing and paid alike) all count toward the
    // daily cap. Once the remaining headroom drops below the minimum, no further
    // request can be made today.
    const dailyWithdrawalLeft = Math.max(0, limits.daily - dailyUsed);
    return {
      ...balances,
      minWithdrawal:        limits.min,
      maxWithdrawal:        limits.max,
      dailyLimit:           limits.daily,
      dailyWithdrawalUsed:  dailyUsed,
      dailyWithdrawalLeft,
      dailyLimitReached:    dailyWithdrawalLeft < limits.min,
      hasPendingWithdrawal: pendingCount > 0,
    };
  }

  private async resolveCreatorId(userId: string) {
    const profile = await this.repo.findCreatorProfileByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    return profile;
  }

  async getWalletSummary(userId: string) {
    const profile = await this.resolveCreatorId(userId);
    return this.buildSummary(profile.id);
  }

  async createWithdrawalRequest(userId: string, input: CreateWithdrawalInput) {
    const profile = await this.resolveCreatorId(userId);

    const payoutMethod = await this.payoutRepo.findById(input.payoutMethodId);
    if (!payoutMethod || payoutMethod.creatorId !== profile.id) {
      throw new AppError('Payout method not found', 404);
    }

    const limits = await this.getWithdrawalLimits();
    if (input.amount < limits.min) {
      throw new AppError(`The minimum you can withdraw is Rs. ${limits.min.toLocaleString()}.`, 400);
    }
    if (input.amount > limits.max) {
      throw new AppError(`You can withdraw at most Rs. ${limits.max.toLocaleString()} in a single request.`, 400);
    }

    // Auto-generated at request time — the creator sees it immediately and the
    // admin sees the same code on the request. Not the external transfer id.
    const referenceCode = await this.repo.generateWithdrawalReference();

    // Serialize withdrawal creation per-creator with a transaction-scoped
    // advisory lock so two concurrent requests can't each reserve the same
    // funds (spec §5/§24). The lock is held until this transaction commits;
    // the next waiter then sees this new PENDING row in its own balance check.
    const withdrawal = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`withdrawal:${profile.id}`}))`;

      // One pending request at a time — the creator must wait for the current
      // one to be paid or rejected before asking for more.
      const pendingCount = await this.repo.countReservedWithdrawals(profile.id);
      if (pendingCount > 0) {
        throw new AppError(
          'You already have a withdrawal request being processed. Please wait for it to be completed before requesting another.',
          409,
        );
      }

      const { withdrawableBalance } = await this.computeBalances(profile.id);
      if (input.amount > withdrawableBalance) {
        throw new AppError(
          `You can only withdraw up to your available balance of Rs. ${withdrawableBalance.toLocaleString()}.`,
          400,
        );
      }

      // Per-day cap (resets at local midnight in Nepal) across every request
      // that still counts today — pending, processing and paid alike, only
      // rejected/cancelled are excluded.
      const dailyUsed = await this.repo.sumWithdrawalsRequestedSince(
        profile.id,
        startOfTodayNepal(),
      );
      const left = Math.max(0, limits.daily - dailyUsed);
      if (dailyUsed + input.amount > limits.daily) {
        throw new AppError(
          left < limits.min
            ? `You've reached your withdrawal limit for today (Rs. ${limits.daily.toLocaleString()}). Please come back and request again tomorrow.`
            : `This would take you over today's withdrawal limit of Rs. ${limits.daily.toLocaleString()}. You can still withdraw up to Rs. ${left.toLocaleString()} today.`,
          400,
        );
      }

      return tx.withdrawal.create({
        data: {
          creatorId:      profile.id,
          amount:         input.amount,
          method:         payoutMethod.type,
          referenceCode,
          payoutMethodId: payoutMethod.id,
          payoutSnapshot: snapshotOf(payoutMethod),
          status:         'PENDING',
        },
      });
    });

    notificationService.createForAdmins({
      type:    'withdrawal_requested',
      title:   'New Withdrawal Request',
      body:    `${profile.fullName ?? 'A creator'} requested Rs. ${input.amount.toLocaleString()} via ${payoutMethod.type} (${withdrawal.referenceCode}).`,
      refId:   withdrawal.id,
      refType: 'withdrawal',
    }).catch(() => {});

    // Return the full wallet-summary shape so the mobile client can refresh its
    // state (balances, limits, pending flag) straight from the response.
    return { withdrawal: toWithdrawalDto(withdrawal), ...(await this.buildSummary(profile.id)) };
  }

  async listWithdrawals(userId: string) {
    const profile = await this.resolveCreatorId(userId);
    const withdrawals = await this.repo.listWithdrawals(profile.id);
    return withdrawals.map(toWithdrawalDto);
  }

  async listTransactions(userId: string) {
    const profile = await this.resolveCreatorId(userId);
    const [ledger, withdrawals] = await Promise.all([
      this.repo.listLedger(profile.id),
      this.repo.listWithdrawals(profile.id),
    ]);
    const applicationIds = ledger
      .filter((tx) => tx.referenceType === 'application' && tx.referenceId)
      .map((tx) => tx.referenceId as string);
    const campaignTitles = await this.repo.campaignTitlesForApplications(applicationIds);
    return buildUnifiedStatement(ledger, withdrawals, campaignTitles);
  }
}
