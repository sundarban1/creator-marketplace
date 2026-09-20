import { request } from '@/lib/api';

export type PlatformFlags = {
  businessRegistrationEnabled: boolean;
  creatorRegistrationEnabled: boolean;
  businessOnboardingEnabled: boolean;
  creatorOnboardingEnabled: boolean;
  messagingEnabled: boolean;
  supportEmail?: string;
  platformCommission: number;
  // Fee/tax breakdown shown in the business's Complete Payment modal.
  paymentFeePercent: number;
  paymentTaxPercent: number;
  // Landing-page download buttons, per store. `comingSoon` = both at once.
  comingSoonIos: boolean;
  comingSoonAndroid: boolean;
  comingSoon: boolean;
  // Master switch for the OAuth "Connect Accounts" flow (TikTok/Facebook/
  // Instagram/YouTube) on both creator and business settings. Off = every
  // connect button is disabled and a "coming soon" notice is shown instead.
  socialAccountsEnabled: boolean;
  // Empty string = no enforcement.
  minVersionIos: string;
  minVersionAndroid: string;
};

export const platformSettingsService = {
  async getFlags(): Promise<PlatformFlags> {
    const res = await request<PlatformFlags>('GET', '/api/public/platform-flags');
    return res.data;
  },
};
