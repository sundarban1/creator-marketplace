import { AppError } from '../../middleware/error';
import { getDict } from '../../i18n';
import { CreditsRepository } from './credits.repository';
import { toCreditsLedgerDto } from './credits.dto';

import { HttpStatus } from '../../constants/httpStatus';

export class CreditsService {
  private repo: CreditsRepository;

  constructor() {
    this.repo = new CreditsRepository();
  }

  private async resolveBusinessId(userId: string) {
    const profile = await this.repo.findBusinessProfileByUserId(userId);
    if (!profile) throw new AppError(getDict().credits.businessProfileNotFound, HttpStatus.NOT_FOUND);
    return profile;
  }

  async getBalance(userId: string) {
    const profile = await this.resolveBusinessId(userId);
    const account = await this.repo.getAccount(profile.id);
    return {
      balance:        account?.balance ?? 0,
      lifetimeEarned: account?.lifetimeEarned ?? 0,
      lifetimeSpent:  account?.lifetimeSpent ?? 0,
    };
  }

  async listHistory(userId: string) {
    const profile = await this.resolveBusinessId(userId);
    const ledger = await this.repo.listLedger(profile.id);
    return ledger.map(toCreditsLedgerDto);
  }
}
