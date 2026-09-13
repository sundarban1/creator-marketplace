import { AppError } from '../../middleware/error';
import { getDict } from '../../i18n';
import { PointsRepository } from './points.repository';
import { toPointsLedgerDto } from './points.dto';

import { HttpStatus } from '../../constants/httpStatus';

function startOfCurrentMonth(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export class PointsService {
  private repo: PointsRepository;

  constructor() {
    this.repo = new PointsRepository();
  }

  private async resolveCreatorId(userId: string) {
    const profile = await this.repo.findCreatorProfileByUserId(userId);
    if (!profile) throw new AppError(getDict().points.creatorProfileNotFound, HttpStatus.NOT_FOUND);
    return profile;
  }

  async getBalance(userId: string) {
    const profile = await this.resolveCreatorId(userId);
    const [account, earnedThisMonth] = await Promise.all([
      this.repo.getAccount(profile.id),
      this.repo.sumCreditsSince(profile.id, startOfCurrentMonth()),
    ]);
    return {
      balance:        account?.balance ?? 0,
      lifetimeEarned: account?.lifetimeEarned ?? 0,
      lifetimeSpent:  account?.lifetimeSpent ?? 0,
      earnedThisMonth,
    };
  }

  async listHistory(userId: string) {
    const profile = await this.resolveCreatorId(userId);
    const ledger = await this.repo.listLedger(profile.id);
    return ledger.map(toPointsLedgerDto);
  }
}
