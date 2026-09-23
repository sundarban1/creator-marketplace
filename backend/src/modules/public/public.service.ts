import { PublicRepository } from './public.repository';
import { AdminRepository } from '../admin/admin.repository';
import { CampaignService } from '../campaign/campaign.service';
import { CreatorService } from '../creator/creator.service';
import { BusinessService } from '../business/business.service';
import { cached } from '../../utils/cache';

export class PublicService {
  private repo: PublicRepository;
  private adminRepo: AdminRepository;
  private campaignService: CampaignService;
  private creatorService: CreatorService;
  private businessService: BusinessService;

  constructor() {
    this.repo = new PublicRepository();
    this.adminRepo = new AdminRepository();
    this.campaignService = new CampaignService();
    this.creatorService = new CreatorService();
    this.businessService = new BusinessService();
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
    const comingSoon = await this.repo.getComingSoon();
    return {
      businessRegistrationEnabled: s['business.registrationEnabled'] as boolean,
      creatorRegistrationEnabled:  s['creator.registrationEnabled']  as boolean,
      businessOnboardingEnabled:   s['business.onboarding'] as boolean,
      creatorOnboardingEnabled:    s['creator.onboarding']  as boolean,
      messagingEnabled:            s['messaging.enabled'] as boolean,
      socialAccountsTiktokEnabled:    s['socialAccounts.tiktok.enabled']    as boolean,
      socialAccountsFacebookEnabled:  s['socialAccounts.facebook.enabled']  as boolean,
      socialAccountsInstagramEnabled: s['socialAccounts.instagram.enabled'] as boolean,
      socialAccountsYoutubeEnabled:   s['socialAccounts.youtube.enabled']   as boolean,
      supportEmail:                s['platform.supportEmail'] as string | undefined,
      platformCommission:          Number(s['platform.commission']) || 0,
      paymentFeePercent:           Number(s['platform.paymentFeePercent']) || 5,
      paymentTaxPercent:           Number(s['platform.paymentTaxPercent']) || 13,
      comingSoonIos:               comingSoon.ios,
      comingSoonAndroid:           comingSoon.android,
      comingSoon:                  comingSoon.ios && comingSoon.android,
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

  // Landing page's three preview rows (events/creators/businesses) in one
  // round trip — each section only ever shows 4 cards, so this fetches
  // exactly that instead of the old three separate public-marketplace calls
  // that over-fetched. All three rows are sorted newest-first (events already
  // default to createdAt desc) so the landing page always reflects the latest
  // published event / newly joined creator / newly joined business.
  async getShowcase(lang = 'en') {
    const [events, creatorsResult, businessesResult] = await Promise.all([
      this.campaignService.showcase(3, 1, lang),
      // hasAvatar: this row feeds the Hero avatar stack and FinalCTA photo
      // strip, both of which only show real faces (no initials fallback) —
      // a newest-4 pull without this filter surfaces creators who registered
      // but never uploaded a photo, forcing those sections back onto stock imagery.
      this.creatorService.listCreators({ page: 1, limit: 4, sort: 'newest', hasAvatar: true, lang }),
      this.businessService.listBusinesses({ page: 1, limit: 4, sort: 'newest', lang }),
    ]);

    return {
      events: [...events.paid, ...events.open],
      creators: creatorsResult.creators,
      businesses: businessesResult.businesses,
    };
  }
}
