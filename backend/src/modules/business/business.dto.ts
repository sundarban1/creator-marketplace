import { Prisma } from '@prisma/client';
import { isBusinessFullyVerified } from '../../utils/verification';

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
  phone: string | null;
  isVerified: boolean;
  fullyVerified: boolean;
  showPublicProfile: boolean;
  hideContactDetails: boolean;
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
  verificationRejectReason: string | null;
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
  categories: string[];
  isVerified: boolean;
  fullyVerified: boolean;
  showPublicProfile: boolean;
  hideContactDetails: boolean;
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
  phone?: string | null;
  isVerified: boolean;
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  allowDirectMessages: boolean;
  socialLinks?: Prisma.JsonValue;
  presenceServices?: string[];
  paymentMethods?: string[];
  defaultPlatforms?: string[];
  defaultCreatorCategories?: string[];
  defaultBudgetRange?: string | null;
  panDocUrl?: string | null;
  panDocStatus?: string;
  companyRegDocUrl?: string | null;
  companyRegDocStatus?: string;
  verificationRejectReason?: string | null;
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
    phone:               b.phone ?? null,
    isVerified:          b.isVerified,
    fullyVerified:       b.user ? isBusinessFullyVerified(b.user, { panDocStatus: b.panDocStatus ?? 'NONE', companyRegDocStatus: b.companyRegDocStatus ?? 'NONE' }) : false,
    showPublicProfile:   b.showPublicProfile,
    hideContactDetails:  b.hideContactDetails,
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
    verificationRejectReason: b.verificationRejectReason ?? null,
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
  categories: string[];
  isVerified: boolean;
  panDocStatus?: string;
  companyRegDocStatus?: string;
  showPublicProfile: boolean;
  hideContactDetails: boolean;
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
    _count: { applications: number };
  }>;
  _count: { campaigns: number; favoritedBy?: number; savedCreators?: number };
  user: { isEmailVerified: boolean; isPhoneVerified: boolean } | null;
};

export function toPublicBusinessDto(b: RawPublicBusiness): PublicBusinessDto {
  return {
    id:                  b.id,
    userId:              b.userId,
    businessName:        b.businessName,
    description:         b.description,
    logoUrl:             b.logoUrl,
    website:             b.website,
    phone:               b.phone,
    categories:          b.categories,
    isVerified:          b.isVerified,
    fullyVerified:       b.user ? isBusinessFullyVerified(b.user, { panDocStatus: b.panDocStatus ?? 'NONE', companyRegDocStatus: b.companyRegDocStatus ?? 'NONE' }) : false,
    showPublicProfile:   b.showPublicProfile,
    hideContactDetails:  b.hideContactDetails,
    allowDirectMessages: b.allowDirectMessages,
    createdAt:           b.createdAt.toISOString(),
    campaigns:           b.campaigns.map((c) => ({ ...c, deadline: c.deadline.toISOString() })),
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
  companyRegDocStatus?: string;
  _count: { campaigns: number };
  user: { isEmailVerified: boolean; isPhoneVerified: boolean } | null;
};

export function toBusinessListItemDto(b: RawBusinessListItem): BusinessListItemDto {
  return {
    id:           b.id,
    businessName: b.businessName,
    description:  b.description,
    logoUrl:      b.logoUrl,
    website:      b.website,
    categories:   b.categories,
    isVerified:   b.isVerified,
    fullyVerified: b.user ? isBusinessFullyVerified(b.user, { panDocStatus: b.panDocStatus ?? 'NONE', companyRegDocStatus: b.companyRegDocStatus ?? 'NONE' }) : false,
    _count:       b._count,
  };
}
