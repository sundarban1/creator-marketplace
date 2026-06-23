import { CampaignStatus } from '@prisma/client';
export declare class AdminRepository {
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
                fullName: string | null;
            } | null;
            businessProfile: {
                businessName: string | null;
            } | null;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            createdAt: Date;
        }[];
    }>;
    getAllUsers(page: number, limit: number, role?: string, search?: string): Promise<{
        users: {
            email: string;
            creatorProfile: {
                isVerified: boolean;
                fullName: string | null;
                avatarUrl: string | null;
            } | null;
            businessProfile: {
                businessName: string | null;
                logoUrl: string | null;
                isVerified: boolean;
            } | null;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isEmailVerified: boolean;
            createdAt: Date;
        }[];
        total: number;
    }>;
    getAllCreators(page: number, limit: number, search?: string): Promise<{
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
            categories: string[];
            location: string | null;
            isVerified: boolean;
            fullName: string | null;
            bio: string | null;
            avatarUrl: string | null;
            socialLinks: import("@prisma/client/runtime/library").JsonValue;
            portfolioLinks: import("@prisma/client/runtime/library").JsonValue;
            username: string | null;
            paymentMethods: string[];
            prefPlatforms: string[];
            prefLocations: string[];
            prefBudgetMin: number;
            prefBudgetMax: number;
            locationLat: number | null;
            locationLng: number | null;
        })[];
        total: number;
    }>;
    getAllBusinesses(page: number, limit: number, search?: string): Promise<{
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
            businessName: string | null;
            logoUrl: string | null;
            website: string | null;
            categories: string[];
            panNo: string | null;
            location: string | null;
            isVerified: boolean;
            allowDirectMessages: boolean;
            hideContactDetails: boolean;
            showPublicProfile: boolean;
        })[];
        total: number;
    }>;
    getAllCampaigns(page: number, limit: number, status?: string, search?: string): Promise<{
        campaigns: ({
            _count: {
                applications: number;
            };
            business: {
                businessName: string | null;
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
            template: string | null;
            category: string;
            goals: import("@prisma/client/runtime/library").JsonValue;
            minFollowers: number;
            contentType: string;
            deliverables: string;
            deadline: Date;
            budgetMin: number;
            budgetMax: number;
            paymentType: string;
            isFeatured: boolean;
            creatorsNeeded: number;
        })[];
        total: number;
    }>;
    updateUserVerification(userId: string, isEmailVerified: boolean): Promise<{
        email: string;
        id: string;
        isEmailVerified: boolean;
    }>;
    updateCampaignStatus(campaignId: string, status: CampaignStatus): Promise<{
        status: import(".prisma/client").$Enums.CampaignStatus;
        id: string;
        title: string;
    }>;
    deleteUser(userId: string): Promise<{
        email: string;
        id: string;
        phone: string | null;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
        isOnboarded: boolean;
        isActive: boolean;
    }>;
}
//# sourceMappingURL=admin.repository.d.ts.map