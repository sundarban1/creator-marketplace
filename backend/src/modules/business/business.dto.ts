import { Prisma } from '@prisma/client';

export interface BusinessProfileDto {
  id: string;
  userId: string;
  businessName: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  categories: string[];
  panNo: string | null;
  location: string | null;
  isVerified: boolean;
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  allowDirectMessages: boolean;
  socialLinks: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; role: string; isEmailVerified: boolean } | null;
}

export interface PublicBusinessDto {
  id: string;
  userId: string;
  businessName: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  categories: string[];
  isVerified: boolean;
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  allowDirectMessages: boolean;
  createdAt: string;
  campaigns: Array<{
    id: string;
    title: string;
    platform: string;
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
}

export interface BusinessListItemDto {
  id: string;
  businessName: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  categories: string[];
  isVerified: boolean;
  _count: { campaigns: number };
}

type RawBusinessProfile = {
  id: string;
  userId: string;
  businessName: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  categories: string[];
  panNo: string | null;
  location: string | null;
  isVerified: boolean;
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  allowDirectMessages: boolean;
  socialLinks?: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: string; email: string; role: string; isEmailVerified: boolean } | null;
};

export function toBusinessProfileDto(b: RawBusinessProfile): BusinessProfileDto {
  return {
    id:                  b.id,
    userId:              b.userId,
    businessName:        b.businessName,
    description:         b.description,
    logoUrl:             b.logoUrl,
    website:             b.website,
    categories:          b.categories,
    panNo:               b.panNo,
    location:            b.location,
    isVerified:          b.isVerified,
    showPublicProfile:   b.showPublicProfile,
    hideContactDetails:  b.hideContactDetails,
    allowDirectMessages: b.allowDirectMessages,
    socialLinks:         (b.socialLinks ?? {}) as Record<string, string>,
    createdAt:           b.createdAt.toISOString(),
    updatedAt:           b.updatedAt.toISOString(),
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
  categories: string[];
  isVerified: boolean;
  showPublicProfile: boolean;
  hideContactDetails: boolean;
  allowDirectMessages: boolean;
  createdAt: Date;
  campaigns: Array<{
    id: string;
    title: string;
    platform: string;
    category: string;
    budgetMin: number;
    budgetMax: number;
    deadline: Date;
    contentType: string;
    isFeatured: boolean;
    location: string | null;
    _count: { applications: number };
  }>;
  _count: { campaigns: number };
};

export function toPublicBusinessDto(b: RawPublicBusiness): PublicBusinessDto {
  return {
    id:                  b.id,
    userId:              b.userId,
    businessName:        b.businessName,
    description:         b.description,
    logoUrl:             b.logoUrl,
    website:             b.website,
    categories:          b.categories,
    isVerified:          b.isVerified,
    showPublicProfile:   b.showPublicProfile,
    hideContactDetails:  b.hideContactDetails,
    allowDirectMessages: b.allowDirectMessages,
    createdAt:           b.createdAt.toISOString(),
    campaigns:           b.campaigns.map((c) => ({ ...c, deadline: c.deadline.toISOString() })),
    _count:              b._count,
  };
}

type RawBusinessListItem = {
  id: string;
  businessName: string | null;
  description: string | null;
  logoUrl: string | null;
  website: string | null;
  categories: string[];
  isVerified: boolean;
  _count: { campaigns: number };
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
    _count:       b._count,
  };
}
