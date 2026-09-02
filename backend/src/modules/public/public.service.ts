import { PublicRepository } from './public.repository';
import { AdminRepository } from '../admin/admin.repository';
import { cached } from '../../utils/cache';

export class PublicService {
  private repo: PublicRepository;
  private adminRepo: AdminRepository;

  constructor() {
    this.repo = new PublicRepository();
    this.adminRepo = new AdminRepository();
  }

  async getLandingStats() {
    // Unauthenticated, hit by every marketing-site visitor, and just aggregate
    // counts that change slowly — a few minutes stale is fine. Best-effort:
    // falls straight through to the query on a Redis miss/outage.
    return cached('landing-stats', 300, () => this.repo.getLandingStats());
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
      paymentFeePercent:           Number(s['platform.paymentFeePercent']) || 5,
      paymentTaxPercent:           Number(s['platform.paymentTaxPercent']) || 13,
      comingSoon:                  s['platform.comingSoon'] as boolean,
      minVersionIos:               (s['app.minVersion.ios'] as string) || '',
      minVersionAndroid:           (s['app.minVersion.android'] as string) || '',
    };
  }

  // Contact details + social links for the landing page footer — admin-
  // managed via the "Contact" settings page. Empty string = not set, so the
  // footer can just check truthiness to decide whether to render each item.
  async getSiteInfo() {
    const s = await this.adminRepo.getSettings();
    return {
      address: (s['platform.address'] as string) || '',
      phone:   (s['platform.phone'] as string) || '',
      email:   (s['platform.supportEmail'] as string) || '',
      companyRegistrationNumber: (s['platform.companyRegistrationNumber'] as string) || '',
      companyPan:                (s['platform.companyPan'] as string) || '',
      social: {
        facebook:  (s['platform.social.facebook'] as string) || '',
        instagram: (s['platform.social.instagram'] as string) || '',
        tiktok:    (s['platform.social.tiktok'] as string) || '',
        youtube:   (s['platform.social.youtube'] as string) || '',
      },
    };
  }
}
