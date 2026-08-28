import { request } from '@/lib/api';
import type { ApiReviewReceived } from '@/services/creator';

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
  province:     string | null;
  district:     string | null;
  city:         string | null;
  area:         string | null;
  address:      string | null;
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
  // INDIVIDUAL service takers verify with one identity document instead of
  // PAN + company registration — see the backend's isBusinessFullyVerified.
  identityDocUrl:      string | null;
  identityDocStatus:   DocStatus;
  // §7 tri-state, derived server-side so every surface agrees.
  verificationStatus:  'NOT_VERIFIED' | 'PENDING' | 'VERIFIED';
  verificationRejectReason: string | null;
  representingType: 'ORGANIZATION' | 'INDIVIDUAL' | null;
  // ORGANIZATION-only — always null on an INDIVIDUAL profile (the backend
  // clears them when the hiring type is set to INDIVIDUAL).
  organizationType: OrganizationType | null;
  organizationTypeOther: string | null;
  contactPersonName: string | null;
  purpose: BusinessPurpose | null;
  favoritedByCount: number;
  user: { email: string; phone: string | null; isEmailVerified: boolean; isPhoneVerified: boolean };
  // Every review this business has received — rendered as the last section on
  // their own profile screen, latest first. Absent on older cached responses.
  reviews?: ApiReviewReceived[];
  reviewSummary?: { averageRating: number; reviewCount: number };
};

export type OrganizationType = 'COMPANY' | 'BRAND' | 'RESTAURANT_CAFE' | 'HOTEL_RESORT' | 'AGENCY' | 'STARTUP' | 'NGO' | 'INGO' | 'EDUCATION' | 'EVENT_ORGANIZER' | 'MEDIA_PRODUCTION' | 'RETAIL_SHOP' | 'ECOMMERCE' | 'COMMUNITY_CLUB' | 'GOVERNMENT' | 'OTHER';

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
    providerType?: 'INDIVIDUAL' | 'TEAM';
    teamSize?: number | null;
    industries?: string[];
    serviceMode?: 'CLIENT_LOCATION' | 'MY_LOCATION' | 'ONLINE' | 'HYBRID' | null;
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
    // Nepal's Province → District → City / Municipality hierarchy. Nothing asks
    // the user for these directly any more — business onboarding backfills them
    // from the chosen Google Place's address components (resolvePlaceDetails).
    province?:      string | null;
    district?:      string | null;
    city?:          string | null;
    area?:          string | null;
    address?:       string | null;
    categories?:    string[];
    socialLinks?:   SocialLinks;
    presenceServices?:         string[];
    paymentMethods?:           string[];
    defaultPlatforms?:         string[];
    defaultCreatorCategories?: string[];
    defaultBudgetRange?:       string | null;
    representingType?: 'ORGANIZATION' | 'INDIVIDUAL';
    organizationType?: OrganizationType | null;
    organizationTypeOther?: string | null;
    contactPersonName?: string | null;
    purpose?: BusinessPurpose;
    businessSize?: 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'AGENCY' | 'ENTERPRISE';
  }): Promise<void> {
    await request('PUT', '/api/business/profile', data);
  },
};
