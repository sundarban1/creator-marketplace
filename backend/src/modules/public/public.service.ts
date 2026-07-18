import { PublicRepository } from './public.repository';
import { AdminRepository } from '../admin/admin.repository';

export class PublicService {
  private repo: PublicRepository;
  private adminRepo: AdminRepository;

  constructor() {
    this.repo = new PublicRepository();
    this.adminRepo = new AdminRepository();
  }

  async getLandingStats() {
    return this.repo.getLandingStats();
  }

  async getComingSoon() {
    return this.repo.getComingSoon();
  }

  // Safe-to-expose subset of admin platform settings — no auth required, so
  // security/notification-admin keys are deliberately excluded here.
  async getPlatformFlags() {
    const s = await this.adminRepo.getSettings();
    return {
      businessRegistrationEnabled: s['business.registrationEnabled'] as boolean,
      creatorRegistrationEnabled:  s['creator.registrationEnabled']  as boolean,
      businessOnboardingEnabled:   s['business.onboarding'] as boolean,
      creatorOnboardingEnabled:    s['creator.onboarding']  as boolean,
      messagingEnabled:            s['messaging.enabled'] as boolean,
      supportEmail:                s['platform.supportEmail'] as string | undefined,
      platformCommission:          Number(s['platform.commission']) || 0,
      comingSoon:                  s['platform.comingSoon'] as boolean,
    };
  }
}
