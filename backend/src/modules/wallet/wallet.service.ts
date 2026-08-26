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

  private async getMinWithdrawal() {
    const settings = await getCachedSettings();
    const value = Number(settings['wallet.minWithdrawal']);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_MIN_WITHDRAWAL;
  }

  private async resolveCreatorId(userId: string) {
    const profile = await this.repo.findCreatorProfileByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    return profile;
  }

  async getWalletSummary(userId: string) {
    const profile = await this.resolveCreatorId(userId);
    const [balances, minWithdrawal] = await Promise.all([
      this.computeBalances(profile.id),
      this.getMinWithdrawal(),
    ]);
    return { ...balances, minWithdrawal };
  }

  async createWithdrawalRequest(userId: string, input: CreateWithdrawalInput) {
    const profile = await this.resolveCreatorId(userId);

    const payoutMethod = await this.payoutRepo.findById(input.payoutMethodId);
    if (!payoutMethod || payoutMethod.creatorId !== profile.id) {
      throw new AppError('Payout method not found', 404);
    }

    const minWithdrawal = await this.getMinWithdrawal();
    if (input.amount < minWithdrawal) {
      throw new AppError(`Minimum withdrawal is Rs. ${minWithdrawal.toLocaleString()}`, 400);
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

      const { withdrawableBalance } = await this.computeBalances(profile.id);
      if (input.amount > withdrawableBalance) {
        throw new AppError('Amount exceeds your withdrawable balance', 400);
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

    const balances = await this.computeBalances(profile.id);
    // `minWithdrawal` (resolved above) is included so the payload matches the
    // full wallet-summary shape the mobile client refreshes its state from.
    return { withdrawal: toWithdrawalDto(withdrawal), ...balances, minWithdrawal };
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
