import { request } from '@/lib/api';

export type SocialLinks = {
  facebook?:  string;
  instagram?: string;
  tiktok?:    string;
  linkedin?:  string;
};

export type DocStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type BusinessPurpose = 'BRAND_MARKETING' | 'CONTENT_CREATION' | 'EVENT' | 'WEDDING' | 'PHOTOSHOOT' | 'PERFORMANCE' | 'COLLABORATION' | 'OTHER';

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
  locationLat:  number | null;
  locationLng:  number | null;
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
  representingType: 'ORGANIZATION' | 'INDIVIDUAL' | null;
  purpose: BusinessPurpose | null;
  favoritedByCount: number;
  user: { email: string; phone: string | null; isEmailVerified: boolean; isPhoneVerified: boolean };
};

export type Category = { label: string };

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
    email?:      string;
    bio?:        string;
    location?:   string;
    locationLat?: number;
    locationLng?: number;
    phone?:      string;
    gender?:     string;
    avatarUrl?:  string;
    categories?: string[];
    providerType?: 'INDIVIDUAL' | 'TEAM' | 'AGENCY';
  }): Promise<void> {
    await request('PUT', '/api/creator/profile', data);
  },

  async updateBusinessProfile(data: {
    businessName?:  string;
    email?:         string;
    description?:   string;
    logoUrl?:       string;
    coverImageUrl?: string;
    website?:       string;
    phone?:         string;
    panNo?:         string;
    location?:      string | null;
    locationLat?:   number | null;
    locationLng?:   number | null;
    categories?:    string[];
    socialLinks?:   SocialLinks;
    presenceServices?:         string[];
    paymentMethods?:           string[];
    defaultPlatforms?:         string[];
    defaultCreatorCategories?: string[];
    defaultBudgetRange?:       string | null;
    representingType?: 'ORGANIZATION' | 'INDIVIDUAL';
    purpose?: BusinessPurpose;
    businessSize?: 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'AGENCY' | 'ENTERPRISE';
  }): Promise<void> {
    await request('PUT', '/api/business/profile', data);
  },
};
