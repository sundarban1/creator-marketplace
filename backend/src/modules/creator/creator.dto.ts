import { Prisma } from '@prisma/client';

export interface SocialAccountDto {
  id: string;
  creatorProfileId: string;
  platform: string;
  profileUrl: string;
  followers: number;
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
  avatarUrl: string | null;
  categories: string[];
  socialLinks: Record<string, string>;
  portfolioLinks: Array<{ id: string; label: string; url: string }>;
  isVerified: boolean;
  paymentMethods: string[];
  prefPlatforms: string[];
  prefLocations: string[];
  prefBudgetMin: number | null;
  prefBudgetMax: number | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
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
  prefBudgetMin: number | null;
  prefBudgetMax: number | null;
  prefPlatforms: string[];
  socialLinks: Record<string, string>;
  portfolioLinks: Array<{ id: string; label: string; url: string }>;
  socialAccounts: Array<{
    id: string;
    platform: string;
    followers: number;
    profileUrl: string;
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
  prefBudgetMin: number | null;
  prefBudgetMax: number | null;
  socialAccounts: Array<{ platform: string; followers: number }>;
}

type RawSocialAccount = {
  id: string;
  creatorProfileId: string;
  platform: string;
  profileUrl: string;
  followers: number;
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
  createdAt: Date;
  updatedAt: Date;
  user?: { id: string; email: string; role: string; isEmailVerified: boolean; isOnboarded: boolean } | null;
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
    avatarUrl:     p.avatarUrl,
    categories:    p.categories,
    socialLinks:   (p.socialLinks ?? {}) as Record<string, string>,
    portfolioLinks: (p.portfolioLinks ?? []) as Array<{ id: string; label: string; url: string }>,
    isVerified:    p.isVerified,
    paymentMethods: (p.paymentMethods ?? []) as string[],
    prefPlatforms: p.prefPlatforms,
    prefLocations: p.prefLocations,
    prefBudgetMin: p.prefBudgetMin,
    prefBudgetMax: p.prefBudgetMax,
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
  prefBudgetMin: number | null;
  prefBudgetMax: number | null;
  prefPlatforms: string[];
  socialLinks: Prisma.JsonValue;
  portfolioLinks: Prisma.JsonValue;
  socialAccounts: Array<{ id: string; platform: string; followers: number; profileUrl: string }>;
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
    prefBudgetMin: p.prefBudgetMin,
    prefBudgetMax: p.prefBudgetMax,
    prefPlatforms: p.prefPlatforms,
    socialLinks:   (p.socialLinks ?? {}) as Record<string, string>,
    portfolioLinks: (p.portfolioLinks ?? []) as Array<{ id: string; label: string; url: string }>,
    socialAccounts: p.socialAccounts,
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
  prefBudgetMin: number | null;
  prefBudgetMax: number | null;
  socialAccounts: Array<{ platform: string; followers: number }>;
};

export function toCreatorListItemDto(p: RawCreatorListItem): CreatorListItemDto {
  return {
    id:            p.id,
    fullName:      p.fullName,
    bio:           p.bio,
    avatarUrl:     p.avatarUrl,
    location:      p.location,
    categories:    p.categories,
    isVerified:    p.isVerified,
    prefBudgetMin: p.prefBudgetMin,
    prefBudgetMax: p.prefBudgetMax,
    socialAccounts: p.socialAccounts,
  };
}
