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
};

export const platformSettingsService = {
  async getFlags(): Promise<PlatformFlags> {
    const res = await request<PlatformFlags>('GET', '/api/public/platform-flags');
    return res.data;
  },
};
