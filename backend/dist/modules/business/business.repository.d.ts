export declare class BusinessRepository {
    findMany(params: {
        search?: string;
        category?: string;
        platform?: string;
        locations?: string[];
        page: number;
        limit: number;
    }): Promise<{
        businesses: {
            description: string | null;
            id: string;
            categories: string[];
            isVerified: boolean;
            _count: {
                campaigns: number;
            };
            businessName: string;
            logoUrl: string | null;
            website: string | null;
        }[];
        total: number;
    }>;
    findPublicById(id: string): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        userId: string;
        categories: string[];
        isVerified: boolean;
        _count: {
            campaigns: number;
        };
        businessName: string;
        logoUrl: string | null;
        website: string | null;
        showPublicProfile: boolean;
        hideContactDetails: boolean;
        allowDirectMessages: boolean;
        campaigns: {
            id: string;
            location: string | null;
            _count: {
                applications: number;
            };
            platform: string;
            title: string;
            category: string;
            contentType: string;
            deadline: Date;
            budgetMin: number;
            budgetMax: number;
            isFeatured: boolean;
        }[];
    } | null>;
    findByUserId(userId: string): Promise<({
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isEmailVerified: boolean;
        };
    } & {
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        categories: string[];
        isVerified: boolean;
        businessName: string;
        logoUrl: string | null;
        website: string | null;
        panNo: string | null;
        showPublicProfile: boolean;
        hideContactDetails: boolean;
        allowDirectMessages: boolean;
    }) | null>;
    findById(id: string): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        categories: string[];
        isVerified: boolean;
        businessName: string;
        logoUrl: string | null;
        website: string | null;
        panNo: string | null;
        showPublicProfile: boolean;
        hideContactDetails: boolean;
        allowDirectMessages: boolean;
    } | null>;
    update(userId: string, data: Partial<{
        businessName: string;
        description: string | null;
        logoUrl: string | null;
        website: string | null;
        categories: string[];
        panNo: string | null;
        showPublicProfile: boolean;
        hideContactDetails: boolean;
        allowDirectMessages: boolean;
    }>): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        categories: string[];
        isVerified: boolean;
        businessName: string;
        logoUrl: string | null;
        website: string | null;
        panNo: string | null;
        showPublicProfile: boolean;
        hideContactDetails: boolean;
        allowDirectMessages: boolean;
    }>;
}
//# sourceMappingURL=business.repository.d.ts.map