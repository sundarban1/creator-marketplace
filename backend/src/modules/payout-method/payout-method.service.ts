import { AppError } from '../../middleware/error';
import { WalletRepository } from '../wallet/wallet.repository';
import { PayoutMethodRepository } from './payout-method.repository';
import type { CreatePayoutMethodInput } from './payout-method.schema';

// Maps the validated (discriminated) input to the flat column set, nulling the
// fields that don't apply to the chosen channel.
function toColumns(input: CreatePayoutMethodInput) {
  const isBank = input.type === 'BANK';
  return {
    type:          input.type,
    label:         input.label ?? null,
    accountName:   input.accountName,
    bankName:      isBank ? input.bankName : null,
    branch:        isBank ? (input.branch ?? null) : null,
    accountNumber: isBank ? input.accountNumber : null,
    walletId:      isBank ? null : input.walletId,
  };
}

export class PayoutMethodService {
  private repo = new PayoutMethodRepository();
  private walletRepo = new WalletRepository();

  private async resolveCreatorId(userId: string) {
    const profile = await this.walletRepo.findCreatorProfileByUserId(userId);
    if (!profile) throw new AppError('Creator profile not found', 404);
    return profile.id;
  }

  private async ownedOrThrow(creatorId: string, id: string) {
    const method = await this.repo.findById(id);
    if (!method || method.creatorId !== creatorId) throw new AppError('Payout method not found', 404);
    return method;
  }

  async list(userId: string) {
    const creatorId = await this.resolveCreatorId(userId);
    return this.repo.findByCreator(creatorId);
  }

  async create(userId: string, input: CreatePayoutMethodInput) {
    const creatorId = await this.resolveCreatorId(userId);
    const existing = await this.repo.findByCreator(creatorId);
    // One payout method per channel — the creator edits the existing one instead.
    if (existing.some((m) => m.type === input.type)) {
      throw new AppError('You already have a payout method of this type. Edit the existing one instead.', 409);
    }
    // First method is always the default; otherwise honour the explicit flag.
    const makeDefault = input.isDefault === true || existing.length === 0;
    if (makeDefault) await this.repo.clearDefault(creatorId);
    return this.repo.create({ creatorId, isDefault: makeDefault, ...toColumns(input) });
  }

  async update(userId: string, id: string, input: CreatePayoutMethodInput) {
    const creatorId = await this.resolveCreatorId(userId);
    const existing = await this.ownedOrThrow(creatorId, id);
    const makeDefault = input.isDefault ?? existing.isDefault;
    if (makeDefault) await this.repo.clearDefault(creatorId, id);
    return this.repo.update(id, { isDefault: makeDefault, ...toColumns(input) });
  }

  async remove(userId: string, id: string) {
    const creatorId = await this.resolveCreatorId(userId);
    const existing = await this.ownedOrThrow(creatorId, id);

    if (await this.repo.hasBlockingWithdrawal(id)) {
      throw new AppError("This payout method has a withdrawal in progress and can't be removed yet", 400);
    }
    await this.repo.delete(id);

    // Deleting the default promotes the most-recent remaining method.
    if (existing.isDefault) {
      const rest = await this.repo.findByCreator(creatorId);
      if (rest.length > 0) await this.repo.update(rest[0].id, { isDefault: true });
    }
  }
}
