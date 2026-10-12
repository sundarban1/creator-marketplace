import { SuccessStoryStatus } from '@prisma/client';
import { AppError } from '../../middleware/error';
import { PartnerRepository } from './partner.repository';
import type { CreatePartnerInput, UpdatePartnerInput } from './partner.schema';

import { HttpStatus } from '../../constants/httpStatus';

export class PartnerService {
  private repo: PartnerRepository;

  constructor() {
    this.repo = new PartnerRepository();
  }

  async listPublic() {
    return this.repo.findManyPublic();
  }

  async listForAdmin() {
    return this.repo.findAllForAdmin();
  }

  async create(input: CreatePartnerInput) {
    return this.repo.create(input);
  }

  async update(id: string, input: UpdatePartnerInput) {
    await this.assertExists(id);
    return this.repo.update(id, input);
  }

  async updateStatus(id: string, status: SuccessStoryStatus) {
    await this.assertExists(id);
    return this.repo.updateStatus(id, status);
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.repo.delete(id);
  }

  private async assertExists(id: string) {
    const partner = await this.repo.findById(id);
    if (!partner) throw new AppError('Partner not found', HttpStatus.NOT_FOUND);
  }
}
