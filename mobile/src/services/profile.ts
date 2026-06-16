import { request } from '@/lib/api';

export type BusinessProfile = {
  id:           string;
  businessName: string;
  description:  string | null;
  logoUrl:      string | null;
  website:      string | null;
  categories:   string[];
  isVerified:   boolean;
  createdAt:    string;
  user: { email: string };
};

export const profileService = {
  async getBusinessProfile(): Promise<BusinessProfile> {
    const res = await request<BusinessProfile>('GET', '/api/business/profile');
    return res.data;
  },
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
