import { request } from '@/lib/api';

export const profileService = {
  async updateCreatorProfile(data: {
    username?:  string;
    fullName?:  string;
    bio?:       string;
    location?:  string;
    avatarUrl?: string;
    categories?: string[];
  }): Promise<void> {
    await request('PUT', '/api/creator/profile', data);
  },

  async updateBusinessProfile(data: {
    businessName?: string;
    description?:  string;
    logoUrl?:      string;
    website?:      string;
    panNo?:        string;
    categories?:   string[];
  }): Promise<void> {
    await request('PUT', '/api/business/profile', data);
  },
};
