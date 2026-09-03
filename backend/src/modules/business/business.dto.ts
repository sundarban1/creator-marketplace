import { Prisma } from '@prisma/client';
import { isBusinessFullyVerified, businessVerificationStatus } from '../../utils/verification';
import { maskLocationByVisibility } from '../../utils/geo';

// Every consumer of the verification rules needs the same four fields; the
// nullish defaults keep the older raw shapes (which don't select all of them)
// falling back to the stricter ORGANIZATION path rather than throwing.
function verificationInputs(b: {
  panDocStatus?: string;
  companyRegDocStatus?: string;
  identityDocStatus?: string;
  representingType?: 'ORGANIZATION' | 'INDIVIDUAL' | null;
}) {
  return {
    panDocStatus:        b.panDocStatus ?? 'NONE',
    companyRegDocStatus: b.companyRegDocStatus ?? 'NONE',
    identityDocStatus:   b.identityDocStatus ?? 'NONE',
    representingType:    b.representingType ?? null,
  };
}

export type OrganizationType = 'COMPANY' | 'BRAND' | 'RESTAURANT_CAFE' | 'HOTEL_RESORT' | 'AGENCY' | 'STARTUP' | 'NGO' | 'INGO' | 'EDUCATION' | 'EVENT_ORGANIZER' | 'MEDIA_PRODUCTION' | 'RETAIL_SHOP' | 'ECOMMERCE' | 'COMMUNITY_CLUB' | 'GOVERNMENT' | 'OTHER';

export type BusinessPurpose = 'BRAND_MARKETING' | 'CONTENT_CREATION' | 'EVENT' | 'WEDDING' | 'PHOTOSHOOT' | 'PERFORMANCE' | 'COLLABORATION' | 'OTHER';

export interface BusinessProfileDto {
  id: string;
  userId: string;
  businessName: string | null;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  website: string | null;
  categories: string[];
  panNo: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  phone: string | null;
  province: string | null;
  district: string | null;
  city: string | null;
  area: string | null;
  address: string | null;
  locationVisibility: 'EXACT' | 'CITY' | 'DISTRICT';
  isVerified: boolean;
  fullyVerified: boolean;
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  hideSocialLinks: boolean;
  allowDirectMessages: boolean;
  socialLinks: Record<string, string>;
  presenceServices: string[];
  paymentMethods: string[];
  defaultPlatforms: string[];
  defaultCreatorCategories: string[];
  defaultBudgetRange: string | null;
  panDocUrl: string | null;
  panDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  companyRegDocUrl: string | null;
  companyRegDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  identityDocUrl: string | null;
  identityDocStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  // §7 — the single tri-state clients render, derived server-side so every
  // surface agrees instead of each recomputing it from raw doc statuses.
  verificationStatus: 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED';
  verificationRejectReason: string | null;
  representingType: 'ORGANIZATION' | 'INDIVIDUAL' | null;
  organizationType: OrganizationType | null;
  organizationTypeOther: string | null;
  contactPersonName: string | null;
  purpose: BusinessPurpose | null;
  businessSize: 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'AGENCY' | 'ENTERPRISE' | null;
  createdAt: string;
  updatedAt: string;
  favoritedByCount: number;
  user: { id: string; email: string; phone: string | null; role: string; isEmailVerified: boolean; isPhoneVerified: boolean } | null;
}

export interface PrivateBusinessDto {
  id: string;
  businessName: string | null;
  logoUrl: string | null;
  isPrivate: true;
}

export interface PublicBusinessDto {
  id: string;
  userId: string;
  businessName: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  province: string | null;
  district: string | null;
  city: string | null;
  socialLinks: Record<string, string>;
  categories: string[];
  isVerified: boolean;
  fullyVerified: boolean;
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  hideSocialLinks: boolean;
  allowDirectMessages: boolean;
  createdAt: string;
  campaigns: Array<{
    id: string;
    title: string;
    platforms: string[];
    category: string;
    budgetMin: number;
    budgetMax: number;
    deadline: string;
    contentType: string;
    isFeatured: boolean;
    location: string | null;
    featureImageUrl: string | null;
    template: string | null;
    campaignType: string;
    benefits: string[];
    _count: { applications: number };
  }>;
  _count: { campaigns: number };
  favoritedByCount: number;
  savedCreatorsCount: number;
}

export interface BusinessListItemDto {
  id: string;
  businessName: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  categories: string[];
  isVerified: boolean;
  fullyVerified: boolean;
  city: string | null;
  district: string | null;
  _count: { campaigns: number };
}

type RawBusinessProfile = {
  id: string;
  userId: string;
  businessName: string | null;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl?: string | null;
  website: string | null;
  categories: string[];
  panNo: string | null;
  location: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  phone?: string | null;
  province?: string | null;
  district?: string | null;
  city?: string | null;
  area?: string | null;
  address?: string | null;
  locationVisibility?: 'EXACT' | 'CITY' | 'DISTRICT';
  isVerified: boolean;
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  hideSocialLinks?: boolean;
  allowDirectMessages: boolean;
  socialLinks?: Prisma.JsonValue;
  presenceServices?: string[];
  paymentMethods?: string[];
  defaultPlatforms?: string[];
  defaultCreatorCategories?: string[];
  defaultBudgetRange?: string | null;
  panDocUrl?: string | null;
  panDocStatus?: string;
  identityDocUrl?: string | null;
  identityDocStatus?: string;
  companyRegDocUrl?: string | null;
  companyRegDocStatus?: string;
  verificationRejectReason?: string | null;
  representingType?: 'ORGANIZATION' | 'INDIVIDUAL' | null;
  organizationType?: OrganizationType | null;
  organizationTypeOther?: string | null;
  contactPersonName?: string | null;
  purpose?: BusinessPurpose | null;
  businessSize?: 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'AGENCY' | 'ENTERPRISE' | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { favoritedBy: number };
  user?: { id: string; email: string; phone: string | null; role: string; isEmailVerified: boolean; isPhoneVerified: boolean } | null;
};

export function toBusinessProfileDto(b: RawBusinessProfile): BusinessProfileDto {
  return {
    id:                  b.id,
    userId:              b.userId,
    businessName:        b.businessName,
    description:         b.description,
    logoUrl:             b.logoUrl,
    coverImageUrl:       b.coverImageUrl ?? null,
    website:             b.website,
    categories:          b.categories,
    panNo:               b.panNo,
    location:            b.location,
    locationLat:         b.locationLat ?? null,
    locationLng:         b.locationLng ?? null,
    phone:               b.phone ?? null,
    province:            b.province ?? null,
    district:            b.district ?? null,
    city:                b.city ?? null,
    area:                b.area ?? null,
    address:             b.address ?? null,
    locationVisibility:  b.locationVisibility ?? 'CITY',
    isVerified:          b.isVerified,
    fullyVerified:       b.user ? isBusinessFullyVerified(b.user, verificationInputs(b)) : false,
    showPublicProfile:   b.showPublicProfile,
    hideContactDetails:  b.hideContactDetails,
    hideSocialLinks:     b.hideSocialLinks ?? false,
    allowDirectMessages: b.allowDirectMessages,
    socialLinks:         (b.socialLinks ?? {}) as Record<string, string>,
    presenceServices:         b.presenceServices ?? [],
    paymentMethods:           b.paymentMethods ?? [],
    defaultPlatforms:         b.defaultPlatforms ?? [],
    defaultCreatorCategories: b.defaultCreatorCategories ?? [],
    defaultBudgetRange:       b.defaultBudgetRange ?? null,
    panDocUrl:           b.panDocUrl ?? null,
    panDocStatus:        (b.panDocStatus ?? 'NONE') as BusinessProfileDto['panDocStatus'],
    companyRegDocUrl:    b.companyRegDocUrl ?? null,
    companyRegDocStatus: (b.companyRegDocStatus ?? 'NONE') as BusinessProfileDto['companyRegDocStatus'],
    identityDocUrl:      b.identityDocUrl ?? null,
    identityDocStatus:   (b.identityDocStatus ?? 'NONE') as BusinessProfileDto['identityDocStatus'],
    verificationStatus:  b.user ? businessVerificationStatus(b.user, verificationInputs(b)) : 'NOT_VERIFIED',
    verificationRejectReason: b.verificationRejectReason ?? null,
    representingType:    b.representingType ?? null,
    organizationType:      b.organizationType ?? null,
    organizationTypeOther: b.organizationTypeOther ?? null,
    contactPersonName:     b.contactPersonName ?? null,
    purpose:             b.purpose ?? null,
    businessSize:        b.businessSize ?? null,
    createdAt:           b.createdAt.toISOString(),
    updatedAt:           b.updatedAt.toISOString(),
    favoritedByCount:    b._count?.favoritedBy ?? 0,
    user:                b.user ?? null,
  };
}

type RawPublicBusiness = {
  id: string;
  userId: string;
  businessName: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  phone: string | null;
  province: string | null;
  district: string | null;
  city: string | null;
  area: string | null;
  address: string | null;
  locationVisibility: 'EXACT' | 'CITY' | 'DISTRICT';
  socialLinks?: Prisma.JsonValue;
  categories: string[];
  isVerified: boolean;
  panDocStatus?: string;
  identityDocStatus?: string;
  companyRegDocStatus?: string;
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  hideSocialLinks: boolean;
  allowDirectMessages: boolean;
  createdAt: Date;
  campaigns: Array<{
    id: string;
    title: string;
    platforms: string[];
    category: string;
    budgetMin: number;
    budgetMax: number;
    deadline: Date;
    contentType: string;
    isFeatured: boolean;
    location: string | null;
    featureImageUrl: string | null;
    template: string | null;
    campaignType: string;
    benefits: Prisma.JsonValue;
    _count: { applications: number };
  }>;
  _count: { campaigns: number; favoritedBy?: number; savedCreators?: number };
  user: { isEmailVerified: boolean; isPhoneVerified: boolean } | null;
};

export function toPublicBusinessDto(b: RawPublicBusiness): PublicBusinessDto {
  // Business location is always shown in full — Kolab operates across all of
  // Nepal, so a business's location is never masked/restricted (the stored
  // `locationVisibility` value is ignored).
  const loc = maskLocationByVisibility(b, 'EXACT');
  return {
    id:                  b.id,
    userId:              b.userId,
    businessName:        b.businessName,
    description:         b.description,
    logoUrl:             b.logoUrl,
    website:             b.website,
    // hideContactDetails previously had nothing to gate — phone was always
    // shown regardless of the flag. Now that the flag actually has an effect,
    // hiding contact details this way is intended, not a regression.
    phone:               b.hideContactDetails ? null : b.phone,
    province:            loc.province,
    district:            loc.district,
    city:                loc.city,
    socialLinks:         b.hideSocialLinks ? {} : ((b.socialLinks ?? {}) as Record<string, string>),
    categories:          b.categories,
    isVerified:          b.isVerified,
    fullyVerified:       b.user ? isBusinessFullyVerified(b.user, verificationInputs(b)) : false,
    showPublicProfile:   b.showPublicProfile,
    hideContactDetails:  b.hideContactDetails,
    hideSocialLinks:     b.hideSocialLinks,
    allowDirectMessages: b.allowDirectMessages,
    createdAt:           b.createdAt.toISOString(),
    campaigns:           b.campaigns.map((c) => ({
      ...c,
      benefits: (c.benefits ?? []) as string[],
      deadline: c.deadline.toISOString(),
    })),
    _count:              { campaigns: b._count.campaigns },
    favoritedByCount:    b._count.favoritedBy ?? 0,
    savedCreatorsCount:  b._count.savedCreators ?? 0,
  };
}

export function toPrivateBusinessDto(b: { id: string; businessName: string | null; logoUrl: string | null }): PrivateBusinessDto {
  return { id: b.id, businessName: b.businessName, logoUrl: b.logoUrl, isPrivate: true };
}

type RawBusinessListItem = {
  id: string;
  businessName: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  categories: string[];
  isVerified: boolean;
  panDocStatus?: string;
  identityDocStatus?: string;
  companyRegDocStatus?: string;
  province: string | null;
  district: string | null;
  city: string | null;
  area: string | null;
  address: string | null;
  locationVisibility?: 'EXACT' | 'CITY' | 'DISTRICT';
  _count: { campaigns: number };
  user: { isEmailVerified: boolean; isPhoneVerified: boolean } | null;
};

export function toBusinessListItemDto(b: RawBusinessListItem): BusinessListItemDto {
  // Location is never masked for businesses — see toPublicBusinessDto.
  const loc = maskLocationByVisibility(b, 'EXACT');
  return {
    id:           b.id,
    businessName: b.businessName,
    description:  b.description,
    logoUrl:      b.logoUrl,
    website:      b.website,
    categories:   b.categories,
    isVerified:   b.isVerified,
    fullyVerified: b.user ? isBusinessFullyVerified(b.user, verificationInputs(b)) : false,
    city:         loc.city,
    district:     loc.district,
    _count:       b._count,
  };
}
