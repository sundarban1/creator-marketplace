export declare class CreatorRepository {
    findByUserId(userId: string): Promise<({
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
    }) | null>;
    findById(id: string): Promise<{
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
    } | null>;
    update(userId: string, data: Partial<{
        fullName: string;
        bio: string;
        location: string;
        avatarUrl: string;
        categories: string[];
    }>): Promise<{
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
        fullName: string;
        bio: string | null;
        location: string | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: import("@prisma/client/runtime/library").JsonValue;
        portfolioLinks: import("@prisma/client/runtime/library").JsonValue;
        isVerified: boolean;
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
        fullName: string;
        bio: string | null;
        location: string | null;
        avatarUrl: string | null;
        categories: string[];
        socialLinks: import("@prisma/client/runtime/library").JsonValue;
        portfolioLinks: import("@prisma/client/runtime/library").JsonValue;
        isVerified: boolean;
    }>;
    updateSocialLinks(userId: string, socialLinks: Record<string, string | null | undefined>): Promise<{
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
//# sourceMappingURL=creator.repository.d.ts.map