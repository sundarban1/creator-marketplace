import type { UpdateCreatorProfileInput, AddPortfolioLinkInput, UpdateSocialLinksInput } from './creator.schema';
export declare class CreatorService {
    private repo;
    constructor();
    getProfile(userId: string): Promise<{
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isEmailVerified: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fullName: string;
        bio: string | null;
        location: string | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: import("@prisma/client/runtime/library").JsonValue;
        portfolioLinks: import("@prisma/client/runtime/library").JsonValue;
        isVerified: boolean;
    }>;
    updateProfile(userId: string, input: UpdateCreatorProfileInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fullName: string;
        bio: string | null;
        location: string | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: import("@prisma/client/runtime/library").JsonValue;
        portfolioLinks: import("@prisma/client/runtime/library").JsonValue;
        isVerified: boolean;
    }>;
    addPortfolioLink(userId: string, input: AddPortfolioLinkInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fullName: string;
        bio: string | null;
        location: string | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: import("@prisma/client/runtime/library").JsonValue;
        portfolioLinks: import("@prisma/client/runtime/library").JsonValue;
        isVerified: boolean;
    }>;
    removePortfolioLink(userId: string, linkId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fullName: string;
        bio: string | null;
        location: string | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: import("@prisma/client/runtime/library").JsonValue;
        portfolioLinks: import("@prisma/client/runtime/library").JsonValue;
        isVerified: boolean;
    }>;
    updateSocialLinks(userId: string, input: UpdateSocialLinksInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        fullName: string;
        bio: string | null;
        location: string | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: import("@prisma/client/runtime/library").JsonValue;
        portfolioLinks: import("@prisma/client/runtime/library").JsonValue;
        isVerified: boolean;
    }>;
}
//# sourceMappingURL=creator.service.d.ts.map