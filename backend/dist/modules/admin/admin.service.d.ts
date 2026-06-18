import { CampaignStatus } from '@prisma/client';
export declare class AdminService {
    private repo;
    constructor();
    getStats(): Promise<{
        totalUsers: number;
        totalCreators: number;
        totalBusinesses: number;
        activeCampaigns: number;
        totalCampaigns: number;
        pendingApplications: number;
        recentUsers: {
            email: string;
            creatorProfile: {
                fullName: string;
            } | null;
            businessProfile: {
                businessName: string;
            } | null;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            createdAt: Date;
        }[];
    }>;
    getUsers(page: number, limit: number, role?: string, search?: string): Promise<{
        users: {
            email: string;
            creatorProfile: {
                fullName: string;
                avatarUrl: string | null;
                isVerified: boolean;
            } | null;
            businessProfile: {
                isVerified: boolean;
                businessName: string;
                logoUrl: string | null;
            } | null;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isEmailVerified: boolean;
            createdAt: Date;
        }[];
        total: number;
    }>;
    getCreators(page: number, limit: number, search?: string): Promise<{
        creators: ({
            user: {
                email: string;
                isEmailVerified: boolean;
                createdAt: Date;
            };
            _count: {
                applications: number;
            };
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
            socialLinks: import("@prisma/client/runtime/library").JsonValue;
            portfolioLinks: import("@prisma/client/runtime/library").JsonValue;
            isVerified: boolean;
            paymentMethods: string[];
            prefPlatforms: string[];
            prefLocations: string[];
            prefBudgetMin: number;
            prefBudgetMax: number;
        })[];
        total: number;
    }>;
    getBusinesses(page: number, limit: number, search?: string): Promise<{
        businesses: ({
            user: {
                email: string;
                isEmailVerified: boolean;
                createdAt: Date;
            };
            _count: {
                campaigns: number;
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
        })[];
        total: number;
    }>;
    getCampaigns(page: number, limit: number, status?: string, search?: string): Promise<{
        campaigns: ({
            _count: {
                applications: number;
            };
            business: {
                businessName: string;
                logoUrl: string | null;
            };
        } & {
            status: import(".prisma/client").$Enums.CampaignStatus;
            description: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            location: string | null;
            platform: string;
            businessId: string;
            title: string;
            category: string;
            minFollowers: number;
            contentType: string;
            deliverables: string;
            deadline: Date;
            budgetMin: number;
            budgetMax: number;
            paymentType: string;
            creatorsNeeded: number;
            isFeatured: boolean;
        })[];
        total: number;
    }>;
    verifyUser(userId: string, verified: boolean): Promise<{
        email: string;
        id: string;
        isEmailVerified: boolean;
    }>;
    setCampaignStatus(campaignId: string, status: CampaignStatus): Promise<{
        status: import(".prisma/client").$Enums.CampaignStatus;
        id: string;
        title: string;
    }>;
    removeUser(userId: string): Promise<{
        email: string;
        id: string;
        phone: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        isOnboarded: boolean;
        isActive: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
//# sourceMappingURL=admin.service.d.ts.map