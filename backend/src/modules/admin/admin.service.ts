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

  suspendUser(userId: string, isActive: boolean) {
    return this.repo.updateUserActiveStatus(userId, isActive);
  }

  getUser(userId: string) {
    return this.repo.getUserById(userId);
  }

  getCampaignDetail(campaignId: string) {
    return this.repo.getCampaignDetail(campaignId);
  }

  setCampaignStatus(campaignId: string, status: CampaignStatus) {
    return this.repo.updateCampaignStatus(campaignId, status);
  }

  removeUser(userId: string) {
    return this.repo.deleteUser(userId);
  }

  // ── Settings ────────────────────────────────────────────────────────────────

  getSettings() {
    return this.repo.getSettings();
  }

  updateSettings(settings: Record<string, unknown>) {
    return this.repo.upsertSettings(settings);
  }

  getSetting(key: string) {
    return this.repo.getSetting(key);
  }

  // ── Conversations ────────────────────────────────────────────────────────────

  getConversationStats() {
    return this.repo.getConversationStats();
  }

  getConversations(page: number, limit: number, status?: string, search?: string) {
    return this.repo.getAllConversations(page, limit, status, search);
  }

  removeConversation(id: string) {
    return this.repo.deleteConversation(id);
  }
}
