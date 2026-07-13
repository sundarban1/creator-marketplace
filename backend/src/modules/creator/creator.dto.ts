import { Prisma } from '@prisma/client';
import { isCreatorFullyVerified } from '../../utils/verification';

export interface SocialAccountDto {
  id: string;
  creatorProfileId: string;
  platform: string;
  profileUrl: string;
  followers: number;
  connectedViaOAuth: boolean;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorProfileDto {
  id: string;
  userId: string;
  username: string | null;
  fullName: string | null;
  bio: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  nearbyRadiusKm: number;
  nearbyUseHomeLocation: boolean;
  avatarUrl: string | null;
  categories: string[];
  socialLinks: Record<string, string>;
  portfolioLinks: Array<{ id: string; label: string; url: string }>;
  isVerified: boolean;
  fullyVerified: boolean;
  paymentMethods: string[];
  prefPlatforms: string[];
  prefLocations: string[];
  prefBudgetMin: number | null;
  prefBudgetMax: number | null;
  citizenshipDocUrl: string | null;
  citizenshipStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    phone: string | null;
    role: string;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    isOnboarded: boolean;
  } | null;
  socialAccounts: SocialAccountDto[];
}

export interface PublicCreatorDto {
  id: string;
  userId: string;
  username: string | null;
  fullName: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  categories: string[];
  isVerified: boolean;
  fullyVerified: boolean;
  prefPlatforms: string[];
  socialLinks: Record<string, string>;
  portfolioLinks: Array<{ id: string; label: string; url: string }>;
  socialAccounts: Array<{
    id: string;
    platform: string;
    followers: number;
    profileUrl: string;
    connectedViaOAuth: boolean;
  }>;
}

export interface CreatorListItemDto {
  id: string;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  categories: string[];
  isVerified: boolean;
  fullyVerified: boolean;
  socialAccounts: Array<{ platform: string; followers: number }>;
  distanceKm?: number;
}

type RawSocialAccount = {
  id: string;
  creatorProfileId: string;
  platform: string;
  profileUrl: string;
  followers: number;
  connectedViaOAuth?: boolean;
  avatarUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toSocialAccountDto(a: RawSocialAccount): SocialAccountDto {
  return {
    id:               a.id,
    creatorProfileId: a.creatorProfileId,
    platform:         a.platform,
    profileUrl:       a.profileUrl,
    followers:        a.followers,
    connectedViaOAuth: a.connectedViaOAuth ?? false,
    avatarUrl:        a.avatarUrl ?? null,
    createdAt:        a.createdAt.toISOString(),
    updatedAt:        a.updatedAt.toISOString(),
  };
}

type RawCreatorProfile = {
  id: string;
  userId: string;
  username: string | null;
  fullName: string | null;
  bio: string | null;
  location: string | null;
  locationLat: number | null;
  locationLng: number | null;
  nearbyRadiusKm: number;
  nearbyUseHomeLocation: boolean;
  avatarUrl: string | null;
  categories: string[];
  socialLinks: Prisma.JsonValue;
  portfolioLinks: Prisma.JsonValue;
  isVerified: boolean;
  paymentMethods: Prisma.JsonValue;
  prefPlatforms: string[];
  prefLocations: string[];
  prefBudgetMin: number | null;
  prefBudgetMax: number | null;
  citizenshipDocUrl: string | null;
  citizenshipStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: Date;
  updatedAt: Date;
  user?: { id: string; email: string; phone: string | null; role: string; isEmailVerified: boolean; isPhoneVerified: boolean; isOnboarded: boolean } | null;
  socialAccounts?: RawSocialAccount[];
};

export function toCreatorProfileDto(p: RawCreatorProfile): CreatorProfileDto {
  return {
    id:            p.id,
    userId:        p.userId,
    username:      p.username,
    fullName:      p.fullName,
    bio:           p.bio,
    location:      p.location,
    locationLat:   p.locationLat,
    locationLng:   p.locationLng,
    nearbyRadiusKm:        p.nearbyRadiusKm,
    nearbyUseHomeLocation: p.nearbyUseHomeLocation,
    avatarUrl:     p.avatarUrl,
    categories:    p.categories,
    socialLinks:   (p.socialLinks ?? {}) as Record<string, string>,
    portfolioLinks: (p.portfolioLinks ?? []) as Array<{ id: string; label: string; url: string }>,
    isVerified:    p.isVerified,
    fullyVerified: p.user ? isCreatorFullyVerified(p.user, p) : false,
    paymentMethods: (p.paymentMethods ?? []) as string[],
    prefPlatforms: p.prefPlatforms,
    prefLocations: p.prefLocations,
    prefBudgetMin: p.prefBudgetMin,
    prefBudgetMax: p.prefBudgetMax,
    citizenshipDocUrl: p.citizenshipDocUrl,
    citizenshipStatus: p.citizenshipStatus,
    createdAt:     p.createdAt.toISOString(),
    updatedAt:     p.updatedAt.toISOString(),
    user:          p.user ?? null,
    socialAccounts: (p.socialAccounts ?? []).map(toSocialAccountDto),
  };
}

type RawPublicCreator = {
  id: string;
  userId: string;
  username: string | null;
  fullName: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  categories: string[];
  isVerified: boolean;
  citizenshipStatus: string;
  prefPlatforms: string[];
  socialLinks: Prisma.JsonValue;
  portfolioLinks: Prisma.JsonValue;
  socialAccounts: Array<{ id: string; platform: string; followers: number; profileUrl: string; connectedViaOAuth?: boolean }>;
  user: { isEmailVerified: boolean; isPhoneVerified: boolean } | null;
};

export function toPublicCreatorDto(p: RawPublicCreator): PublicCreatorDto {
  return {
    id:            p.id,
    userId:        p.userId,
    username:      p.username,
    fullName:      p.fullName,
    bio:           p.bio,
    location:      p.location,
    avatarUrl:     p.avatarUrl,
    categories:    p.categories,
    isVerified:    p.isVerified,
    fullyVerified: p.user ? isCreatorFullyVerified(p.user, p) : false,
    prefPlatforms: p.prefPlatforms,
    socialLinks:   (p.socialLinks ?? {}) as Record<string, string>,
    portfolioLinks: (p.portfolioLinks ?? []) as Array<{ id: string; label: string; url: string }>,
    socialAccounts: p.socialAccounts.map((a) => ({ ...a, connectedViaOAuth: a.connectedViaOAuth ?? false })),
  };
}

type RawCreatorListItem = {
  id: string;
  fullName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  categories: string[];
  isVerified: boolean;
  citizenshipStatus: string;
  socialAccounts: Array<{ platform: string; followers: number }>;
  distanceKm?: number;
  user: { isEmailVerified: boolean; isPhoneVerified: boolean } | null;
};

export function toCreatorListItemDto(p: RawCreatorListItem): CreatorListItemDto {
  const dto: CreatorListItemDto = {
    id:            p.id,
    fullName:      p.fullName,
    bio:           p.bio,
    avatarUrl:     p.avatarUrl,
    location:      p.location,
    categories:    p.categories,
    isVerified:    p.isVerified,
    fullyVerified: p.user ? isCreatorFullyVerified(p.user, p) : false,
    socialAccounts: p.socialAccounts,
  };
  if (p.distanceKm != null) dto.distanceKm = Math.round(p.distanceKm * 10) / 10;
  return dto;
}
