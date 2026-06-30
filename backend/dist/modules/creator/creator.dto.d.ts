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
    portfolioLinks: Array<{
        id: string;
        label: string;
        url: string;
    }>;
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
    portfolioLinks: Array<{
        id: string;
        label: string;
        url: string;
    }>;
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
    socialAccounts: Array<{
        platform: string;
        followers: number;
    }>;
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
export declare function toSocialAccountDto(a: RawSocialAccount): SocialAccountDto;
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
    user?: {
        id: string;
        email: string;
        role: string;
        isEmailVerified: boolean;
        isOnboarded: boolean;
    } | null;
    socialAccounts?: RawSocialAccount[];
};
export declare function toCreatorProfileDto(p: RawCreatorProfile): CreatorProfileDto;
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
    socialAccounts: Array<{
        id: string;
        platform: string;
        followers: number;
        profileUrl: string;
    }>;
};
export declare function toPublicCreatorDto(p: RawPublicCreator): PublicCreatorDto;
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
    socialAccounts: Array<{
        platform: string;
        followers: number;
    }>;
};
export declare function toCreatorListItemDto(p: RawCreatorListItem): CreatorListItemDto;
export {};
//# sourceMappingURL=creator.dto.d.ts.map