import type { UpdateBusinessProfileInput } from './business.schema';
export declare class BusinessService {
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
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        businessName: string;
        logoUrl: string | null;
        website: string | null;
        categories: string[];
        panNo: string | null;
        isVerified: boolean;
        allowDirectMessages: boolean;
        hideContactDetails: boolean;
        showPublicProfile: boolean;
    }>;
    updateProfile(userId: string, input: UpdateBusinessProfileInput): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        businessName: string;
        logoUrl: string | null;
        website: string | null;
        categories: string[];
        panNo: string | null;
        isVerified: boolean;
        allowDirectMessages: boolean;
        hideContactDetails: boolean;
        showPublicProfile: boolean;
    }>;
    listBusinesses(params: {
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
            businessName: string;
            logoUrl: string | null;
            website: string | null;
            categories: string[];
            isVerified: boolean;
            _count: {
                campaigns: number;
            };
        }[];
        total: number;
    }>;
    getBusinessPublic(id: string): Promise<{
        description: string | null;
        id: string;
        createdAt: Date;
        userId: string;
        businessName: string;
        logoUrl: string | null;
        website: string | null;
        categories: string[];
        isVerified: boolean;
        allowDirectMessages: boolean;
        hideContactDetails: boolean;
        showPublicProfile: boolean;
        campaigns: {
            id: string;
            _count: {
                applications: number;
            };
            location: string | null;
            platform: string;
            title: string;
            category: string;
            contentType: string;
            deadline: Date;
            budgetMin: number;
            budgetMax: number;
            isFeatured: boolean;
        }[];
        _count: {
            campaigns: number;
        };
    }>;
}
//# sourceMappingURL=business.service.d.ts.map