import { request } from '@/lib/api';

export type SocialLinks = {
  facebook?:  string;
  instagram?: string;
  tiktok?:    string;
  linkedin?:  string;
};

export type DocStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type BusinessProfile = {
  id:           string;
  businessName: string;
  description:  string | null;
  logoUrl:      string | null;
  coverImageUrl: string | null;
  website:      string | null;
  phone:        string | null;
  categories:   string[];
  panNo:        string | null;
  location:     string | null;
  isVerified:   boolean;
  fullyVerified: boolean;
  createdAt:    string;
  socialLinks:  SocialLinks;
  presenceServices:         string[];
  paymentMethods:           string[];
  defaultPlatforms:         string[];
  defaultCreatorCategories: string[];
  defaultBudgetRange:       string | null;
  panDocUrl:           string | null;
  panDocStatus:        DocStatus;
  companyRegDocUrl:    string | null;
  companyRegDocStatus: DocStatus;
  verificationRejectReason: string | null;
  favoritedByCount: number;
  user: { email: string; phone: string | null; isEmailVerified: boolean; isPhoneVerified: boolean };
};

export type Category = { emoji: string; label: string };

export const profileService = {
  async getCategories(): Promise<Category[]> {
    const res = await request<Category[]>('GET', '/api/campaigns/master-categories');
    return res.data;
  },

  async getBusinessProfile(): Promise<BusinessProfile> {
    const res = await request<BusinessProfile>('GET', '/api/business/profile');
    return res.data;
  },
  async updateCreatorProfile(data: {
    username?:   string;
    fullName?:   string;
    bio?:        string;
    location?:   string;
    locationLat?: number;
    locationLng?: number;
    phone?:      string;
    gender?:     string;
    avatarUrl?:  string;
    categories?: string[];
  }): Promise<void> {
    await request('PUT', '/api/creator/profile', data);
  },

  async updateBusinessProfile(data: {
    businessName?:  string;
    description?:   string;
    logoUrl?:       string;
    coverImageUrl?: string;
    website?:       string;
    phone?:         string;
    panNo?:         string;
    location?:      string | null;
    categories?:    string[];
    socialLinks?:   SocialLinks;
    presenceServices?:         string[];
    paymentMethods?:           string[];
    defaultPlatforms?:         string[];
    defaultCreatorCategories?: string[];
    defaultBudgetRange?:       string | null;
  }): Promise<void> {
    await request('PUT', '/api/business/profile', data);
  },
};
