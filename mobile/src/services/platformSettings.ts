import { request } from '@/lib/api';

export type PlatformFlags = {
  businessRegistrationEnabled: boolean;
  creatorRegistrationEnabled: boolean;
  businessOnboardingEnabled: boolean;
  creatorOnboardingEnabled: boolean;
  messagingEnabled: boolean;
  supportEmail?: string;
  platformCommission: number;
  comingSoon: boolean;
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
