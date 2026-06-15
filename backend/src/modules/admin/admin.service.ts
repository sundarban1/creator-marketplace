import { CampaignStatus } from '@prisma/client';
import { AdminRepository } from './admin.repository';

export class AdminService {
  private repo: AdminRepository;

  constructor() {
    this.repo = new AdminRepository();
  }

  getStats() {
    return this.repo.getStats();
  }

  getUsers(page: number, limit: number, role?: string, search?: string) {
    return this.repo.getAllUsers(page, limit, role, search);
  }

  getCreators(page: number, limit: number, search?: string) {
    return this.repo.getAllCreators(page, limit, search);
  }

  getBusinesses(page: number, limit: number, search?: string) {
    return this.repo.getAllBusinesses(page, limit, search);
  }

  getCampaigns(page: number, limit: number, status?: string, search?: string) {
    return this.repo.getAllCampaigns(page, limit, status, search);
  }

  verifyUser(userId: string, verified: boolean) {
    return this.repo.updateUserVerification(userId, verified);
  }

  setCampaignStatus(campaignId: string, status: CampaignStatus) {
    return this.repo.updateCampaignStatus(campaignId, status);
  }

  removeUser(userId: string) {
    return this.repo.deleteUser(userId);
  }
}
