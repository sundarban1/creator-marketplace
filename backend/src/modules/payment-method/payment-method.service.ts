import { PaymentMethodStatus } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { PaymentMethodRepository } from './payment-method.repository';
import type { CreatePaymentMethodInput, UpdatePaymentMethodInput } from './payment-method.schema';

export class PaymentMethodService {
  private repo: PaymentMethodRepository;

  constructor() {
    this.repo = new PaymentMethodRepository();
  }

  async listPublic() {
    return this.repo.findManyPublic();
  }

  async listForAdmin() {
    const methods = await this.repo.findAllForAdmin();
    return Promise.all(methods.map(async (m) => ({
      ...m,
      usageCount: await this.repo.countUsage(m.key),
    })));
  }

  async create(input: CreatePaymentMethodInput) {
    const existing = await this.repo.findByKey(input.key);
    if (existing) throw new AppError('A payment method with this key already exists', 409);
    return this.repo.create(input);
  }

  async update(id: string, input: UpdatePaymentMethodInput) {
    const method = await this.repo.findById(id);
    if (!method) throw new AppError('Payment method not found', 404);

    if (input.key !== method.key) {
      const existing = await this.repo.findByKey(input.key);
      if (existing) throw new AppError('A payment method with this key already exists', 409);
    }
    return this.repo.update(id, input);
  }

  async updateStatus(id: string, status: PaymentMethodStatus) {
    const method = await this.repo.findById(id);
    if (!method) throw new AppError('Payment method not found', 404);
    return this.repo.updateStatus(id, status);
  }

  async remove(id: string) {
    const method = await this.repo.findById(id);
    if (!method) throw new AppError('Payment method not found', 404);
    await this.repo.delete(id);
  }
}
