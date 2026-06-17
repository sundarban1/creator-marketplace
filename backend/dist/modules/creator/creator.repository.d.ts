import { Prisma } from '@prisma/client';
export declare class CreatorRepository {
    findMany(filters: {
        search?: string;
        categories?: string[];
        location?: string;
        platforms?: string[];
        priceMin?: number;
        priceMax?: number;
        page: number;
        limit: number;
    }): Promise<{
        creators: {
            id: string;
            fullName: string;
            bio: string | null;
            location: string | null;
            avatarUrl: string | null;
            categories: string[];
            isVerified: boolean;
            prefBudgetMin: number;
            prefBudgetMax: number;
            socialAccounts: {
                platform: string;
                followers: number;
            }[];
        }[];
        total: number;
    }>;
    getFilterOptions(): Promise<{
        categories: string[];
        platforms: string[];
    }>;
    findByUserId(userId: string): Promise<({
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isEmailVerified: boolean;
            isOnboarded: boolean;
        };
        socialAccounts: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            creatorProfileId: string;
            platform: string;
            profileUrl: string;
            followers: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        username: string | null;
        fullName: string;
        bio: string | null;
        location: string | null;
        locationLat: number | null;
        locationLng: number | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: Prisma.JsonValue;
        portfolioLinks: Prisma.JsonValue;
        isVerified: boolean;
        paymentMethods: string[];
        prefPlatforms: string[];
        prefLocations: string[];
        prefBudgetMin: number;
        prefBudgetMax: number;
    }) | null>;
    findById(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        username: string | null;
        fullName: string;
        bio: string | null;
        location: string | null;
        locationLat: number | null;
        locationLng: number | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: Prisma.JsonValue;
        portfolioLinks: Prisma.JsonValue;
        isVerified: boolean;
        paymentMethods: string[];
        prefPlatforms: string[];
        prefLocations: string[];
        prefBudgetMin: number;
        prefBudgetMax: number;
    } | null>;
    findByIdPublic(id: string): Promise<{
        id: string;
        userId: string;
        username: string | null;
        fullName: string;
        bio: string | null;
        location: string | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: Prisma.JsonValue;
        portfolioLinks: Prisma.JsonValue;
        isVerified: boolean;
        prefPlatforms: string[];
        prefBudgetMin: number;
        prefBudgetMax: number;
        socialAccounts: {
            id: string;
            platform: string;
            profileUrl: string;
            followers: number;
        }[];
    } | null>;
    findByUsername(username: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        username: string | null;
        fullName: string;
        bio: string | null;
        location: string | null;
        locationLat: number | null;
        locationLng: number | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: Prisma.JsonValue;
        portfolioLinks: Prisma.JsonValue;
        isVerified: boolean;
        paymentMethods: string[];
        prefPlatforms: string[];
        prefLocations: string[];
        prefBudgetMin: number;
        prefBudgetMax: number;
    } | null>;
    update(userId: string, data: Partial<{
        username: string;
        fullName: string;
        bio: string;
        location: string;
        locationLat: number;
        locationLng: number;
        avatarUrl: string;
        categories: string[];
    }>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        username: string | null;
        fullName: string;
        bio: string | null;
        location: string | null;
        locationLat: number | null;
        locationLng: number | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: Prisma.JsonValue;
        portfolioLinks: Prisma.JsonValue;
        isVerified: boolean;
        paymentMethods: string[];
        prefPlatforms: string[];
        prefLocations: string[];
        prefBudgetMin: number;
        prefBudgetMax: number;
    }>;
    addPortfolioLink(userId: string, link: {
        id: string;
        label: string;
        url: string;
    }, currentLinks: {
        id: string;
        label: string;
        url: string;
    }[]): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        username: string | null;
        fullName: string;
        bio: string | null;
        location: string | null;
        locationLat: number | null;
        locationLng: number | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: Prisma.JsonValue;
        portfolioLinks: Prisma.JsonValue;
        isVerified: boolean;
        paymentMethods: string[];
        prefPlatforms: string[];
        prefLocations: string[];
        prefBudgetMin: number;
        prefBudgetMax: number;
    }>;
    removePortfolioLink(userId: string, linkId: string, currentLinks: {
        id: string;
        label: string;
        url: string;
    }[]): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        username: string | null;
        fullName: string;
        bio: string | null;
        location: string | null;
        locationLat: number | null;
        locationLng: number | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: Prisma.JsonValue;
        portfolioLinks: Prisma.JsonValue;
        isVerified: boolean;
        paymentMethods: string[];
        prefPlatforms: string[];
        prefLocations: string[];
        prefBudgetMin: number;
        prefBudgetMax: number;
    }>;
    updateSocialLinks(userId: string, socialLinks: Record<string, string | null | undefined>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        username: string | null;
        fullName: string;
        bio: string | null;
        location: string | null;
        locationLat: number | null;
        locationLng: number | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: Prisma.JsonValue;
        portfolioLinks: Prisma.JsonValue;
        isVerified: boolean;
        paymentMethods: string[];
        prefPlatforms: string[];
        prefLocations: string[];
        prefBudgetMin: number;
        prefBudgetMax: number;
    }>;
    findSocialAccountsByUserId(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        creatorProfileId: string;
        platform: string;
        profileUrl: string;
        followers: number;
    }[]>;
    findSocialAccountById(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        creatorProfileId: string;
        platform: string;
        profileUrl: string;
        followers: number;
    } | null>;
    addSocialAccount(creatorProfileId: string, data: {
        platform: string;
        profileUrl: string;
        followers: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        creatorProfileId: string;
        platform: string;
        profileUrl: string;
        followers: number;
    }>;
    updateSocialAccount(id: string, data: {
        profileUrl?: string;
        followers?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        creatorProfileId: string;
        platform: string;
        profileUrl: string;
        followers: number;
    }>;
    deleteSocialAccount(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        creatorProfileId: string;
        platform: string;
        profileUrl: string;
        followers: number;
    }>;
    findSocialAccountByPlatform(creatorProfileId: string, platform: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        creatorProfileId: string;
        platform: string;
        profileUrl: string;
        followers: number;
    } | null>;
    updatePaymentMethods(userId: string, methods: string[]): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        username: string | null;
        fullName: string;
        bio: string | null;
        location: string | null;
        locationLat: number | null;
        locationLng: number | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: Prisma.JsonValue;
        portfolioLinks: Prisma.JsonValue;
        isVerified: boolean;
        paymentMethods: string[];
        prefPlatforms: string[];
        prefLocations: string[];
        prefBudgetMin: number;
        prefBudgetMax: number;
    }>;
    updateCampaignPrefs(userId: string, data: {
        categories?: string[];
        prefPlatforms?: string[];
        prefLocations?: string[];
        prefBudgetMin?: number;
        prefBudgetMax?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        username: string | null;
        fullName: string;
        bio: string | null;
        location: string | null;
        locationLat: number | null;
        locationLng: number | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: Prisma.JsonValue;
        portfolioLinks: Prisma.JsonValue;
        isVerified: boolean;
        paymentMethods: string[];
        prefPlatforms: string[];
        prefLocations: string[];
        prefBudgetMin: number;
        prefBudgetMax: number;
    }>;
    getEarningsSummary(userId: string): Promise<{
        totalEarned: number;
        pendingEarnings: number;
        totalApplications: number;
    }>;
}
//# sourceMappingURL=creator.repository.d.ts.map