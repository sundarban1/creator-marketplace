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
    }): Promise<{
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
        title: string;
        category: string;
        platform: string;
        minFollowers: number;
        contentType: string;
        deliverables: string;
        deadline: Date;
        budgetMin: number;
        budgetMax: number;
        paymentType: string;
        businessId: string;
    }>;
    findMany(filters: {
        category?: string;
        platform?: string;
        minBudget?: number;
        maxBudget?: number;
        status?: CampaignStatus;
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
            title: string;
            category: string;
            platform: string;
            minFollowers: number;
            contentType: string;
            deliverables: string;
            deadline: Date;
            budgetMin: number;
            budgetMax: number;
            paymentType: string;
            businessId: string;
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
        title: string;
        category: string;
        platform: string;
        minFollowers: number;
        contentType: string;
        deliverables: string;
        deadline: Date;
        budgetMin: number;
        budgetMax: number;
        paymentType: string;
        businessId: string;
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
            title: string;
            category: string;
            platform: string;
            minFollowers: number;
            contentType: string;
            deliverables: string;
            deadline: Date;
            budgetMin: number;
            budgetMax: number;
            paymentType: string;
            businessId: string;
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
    }>): Promise<{
        status: import(".prisma/client").$Enums.CampaignStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        location: string | null;
        description: string;
        title: string;
        category: string;
        platform: string;
        minFollowers: number;
        contentType: string;
        deliverables: string;
        deadline: Date;
        budgetMin: number;
        budgetMax: number;
        paymentType: string;
        businessId: string;
    }>;
    delete(id: string): Promise<{
        status: import(".prisma/client").$Enums.CampaignStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        location: string | null;
        description: string;
        title: string;
        category: string;
        platform: string;
        minFollowers: number;
        contentType: string;
        deliverables: string;
        deadline: Date;
        budgetMin: number;
        budgetMax: number;
        paymentType: string;
        businessId: string;
    }>;
    findApplication(campaignId: string, creatorId: string): Promise<{
        status: import(".prisma/client").$Enums.ApplicationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string;
        creatorId: string;
        coverLetter: string;
        proposedRate: number;
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
        campaignId: string;
        creatorId: string;
        coverLetter: string;
        proposedRate: number;
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
            campaignId: string;
            creatorId: string;
            coverLetter: string;
            proposedRate: number;
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
            title: string;
            category: string;
            platform: string;
            minFollowers: number;
            contentType: string;
            deliverables: string;
            deadline: Date;
            budgetMin: number;
            budgetMax: number;
            paymentType: string;
            businessId: string;
        };
    } & {
        status: import(".prisma/client").$Enums.ApplicationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string;
        creatorId: string;
        coverLetter: string;
        proposedRate: number;
        timeline: string;
        socialHandles: Prisma.JsonValue;
        portfolioUrl: string | null;
    }) | null>;
    updateApplicationStatus(id: string, status: 'ACCEPTED' | 'REJECTED'): Promise<{
        status: import(".prisma/client").$Enums.ApplicationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string;
        creatorId: string;
        coverLetter: string;
        proposedRate: number;
        timeline: string;
        socialHandles: Prisma.JsonValue;
        portfolioUrl: string | null;
    }>;
    findApplicationsByCreator(creatorId: string, page: number, limit: number): Promise<{
        applications: ({
            campaign: {
                status: import(".prisma/client").$Enums.CampaignStatus;
                title: string;
                category: string;
                platform: string;
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
            campaignId: string;
            creatorId: string;
            coverLetter: string;
            proposedRate: number;
            timeline: string;
            socialHandles: Prisma.JsonValue;
            portfolioUrl: string | null;
        })[];
        total: number;
    }>;
}
//# sourceMappingURL=campaign.repository.d.ts.map