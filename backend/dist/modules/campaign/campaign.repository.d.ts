import { CampaignStatus, Prisma } from '@prisma/client';
export declare class CampaignRepository {
    create(data: {
        businessId: string;
        title: string;
        description: string;
        category: string;
        platform: string;
        minFollowers: number;
        contentType: string;
        deliverables: string;
        deadline: Date;
        location?: string;
        budgetMin: number;
        budgetMax: number;
        paymentType: string;
        creatorsNeeded?: number;
        isFeatured?: boolean;
    }): Promise<{
        _count: {
            applications: number;
        };
        business: {
            businessName: string;
            logoUrl: string | null;
        };
    } & {
        status: import(".prisma/client").$Enums.CampaignStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        location: string | null;
        description: string;
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
    }>;
    findMany(filters: {
        category?: string;
        platform?: string;
        minBudget?: number;
        maxBudget?: number;
        status?: CampaignStatus;
        isFeatured?: boolean;
        deadlineFrom?: Date;
        deadlineTo?: Date;
        page: number;
        limit: number;
    }): Promise<{
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
            id: string;
            createdAt: Date;
            updatedAt: Date;
            location: string | null;
            description: string;
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
    findById(id: string): Promise<({
        _count: {
            applications: number;
        };
        business: {
            businessName: string;
            description: string | null;
            logoUrl: string | null;
            website: string | null;
        };
    } & {
        status: import(".prisma/client").$Enums.CampaignStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        location: string | null;
        description: string;
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
    }) | null>;
    findByBusinessId(businessId: string, page: number, limit: number): Promise<{
        campaigns: ({
            _count: {
                applications: number;
            };
        } & {
            status: import(".prisma/client").$Enums.CampaignStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            location: string | null;
            description: string;
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
    update(id: string, data: Partial<{
        title: string;
        description: string;
        category: string;
        platform: string;
        minFollowers: number;
        contentType: string;
        deliverables: string;
        deadline: Date;
        location: string | null;
        budgetMin: number;
        budgetMax: number;
        paymentType: string;
        status: CampaignStatus;
        isFeatured: boolean;
    }>): Promise<{
        status: import(".prisma/client").$Enums.CampaignStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        location: string | null;
        description: string;
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
    }>;
    delete(id: string): Promise<{
        status: import(".prisma/client").$Enums.CampaignStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        location: string | null;
        description: string;
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
    }>;
    getDistinctCategories(): Promise<string[]>;
    findApplication(campaignId: string, creatorId: string): Promise<{
        status: import(".prisma/client").$Enums.ApplicationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        creatorId: string;
        proposedRate: number;
        campaignId: string;
        coverLetter: string;
        timeline: string;
        socialHandles: Prisma.JsonValue;
        portfolioUrl: string | null;
    } | null>;
    createApplication(data: {
        campaignId: string;
        creatorId: string;
        coverLetter: string;
        proposedRate: number;
        timeline: string;
        socialHandles: Record<string, string>;
        portfolioUrl?: string;
    }): Promise<{
        campaign: {
            title: string;
        };
        creator: {
            fullName: string;
        };
    } & {
        status: import(".prisma/client").$Enums.ApplicationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        creatorId: string;
        proposedRate: number;
        campaignId: string;
        coverLetter: string;
        timeline: string;
        socialHandles: Prisma.JsonValue;
        portfolioUrl: string | null;
    }>;
    findApplicationsByCampaign(campaignId: string, page: number, limit: number): Promise<{
        applications: ({
            creator: {
                fullName: string;
                location: string | null;
                avatarUrl: string | null;
                categories: string[];
                socialLinks: Prisma.JsonValue;
            };
        } & {
            status: import(".prisma/client").$Enums.ApplicationStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            creatorId: string;
            proposedRate: number;
            campaignId: string;
            coverLetter: string;
            timeline: string;
            socialHandles: Prisma.JsonValue;
            portfolioUrl: string | null;
        })[];
        total: number;
    }>;
    findApplicationsByBusinessId(businessId: string, page: number, limit: number): Promise<{
        applications: ({
            campaign: {
                id: string;
                platform: string;
                title: string;
            };
            creator: {
                id: string;
                fullName: string;
                location: string | null;
                avatarUrl: string | null;
            };
        } & {
            status: import(".prisma/client").$Enums.ApplicationStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            creatorId: string;
            proposedRate: number;
            campaignId: string;
            coverLetter: string;
            timeline: string;
            socialHandles: Prisma.JsonValue;
            portfolioUrl: string | null;
        })[];
        total: number;
    }>;
    findApplicationById(id: string): Promise<({
        campaign: {
            status: import(".prisma/client").$Enums.CampaignStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            location: string | null;
            description: string;
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
        };
        creator: {
            userId: string;
            fullName: string;
        };
    } & {
        status: import(".prisma/client").$Enums.ApplicationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        creatorId: string;
        proposedRate: number;
        campaignId: string;
        coverLetter: string;
        timeline: string;
        socialHandles: Prisma.JsonValue;
        portfolioUrl: string | null;
    }) | null>;
    updateApplicationStatus(id: string, status: 'ACCEPTED' | 'REJECTED'): Promise<{
        status: import(".prisma/client").$Enums.ApplicationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        creatorId: string;
        proposedRate: number;
        campaignId: string;
        coverLetter: string;
        timeline: string;
        socialHandles: Prisma.JsonValue;
        portfolioUrl: string | null;
    }>;
    findPendingApplicationsByCampaign(campaignId: string, excludeAppId: string): Promise<({
        creator: {
            userId: string;
        };
    } & {
        status: import(".prisma/client").$Enums.ApplicationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        creatorId: string;
        proposedRate: number;
        campaignId: string;
        coverLetter: string;
        timeline: string;
        socialHandles: Prisma.JsonValue;
        portfolioUrl: string | null;
    })[]>;
    findApplicationsByCreator(creatorId: string, page: number, limit: number): Promise<{
        applications: ({
            campaign: {
                status: import(".prisma/client").$Enums.CampaignStatus;
                id: string;
                platform: string;
                title: string;
                category: string;
                deadline: Date;
                budgetMin: number;
                budgetMax: number;
                business: {
                    businessName: string;
                    logoUrl: string | null;
                };
            };
        } & {
            status: import(".prisma/client").$Enums.ApplicationStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            creatorId: string;
            proposedRate: number;
            campaignId: string;
            coverLetter: string;
            timeline: string;
            socialHandles: Prisma.JsonValue;
            portfolioUrl: string | null;
        })[];
        total: number;
    }>;
}
//# sourceMappingURL=campaign.repository.d.ts.map