import type { CreateCampaignInput, UpdateCampaignInput, CampaignListQuery, ApplyToCampaignInput } from './campaign.schema';
export declare class CampaignService {
    private repo;
    private businessRepo;
    private creatorRepo;
    private favoriteRepo;
    constructor();
    create(userId: string, input: CreateCampaignInput): Promise<{
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
    }>;
    list(query: CampaignListQuery): Promise<{
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
        page: number;
        limit: number;
    }>;
    getCategories(): Promise<string[]>;
    getById(id: string): Promise<{
        _count: {
            applications: number;
        };
        business: {
            description: string | null;
            businessName: string;
            logoUrl: string | null;
            website: string | null;
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
    }>;
    update(id: string, userId: string, input: UpdateCampaignInput): Promise<{
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
    }>;
    delete(id: string, userId: string): Promise<{
        message: string;
    }>;
    getMyCampaigns(userId: string, page: number, limit: number): Promise<{
        campaigns: ({
            _count: {
                applications: number;
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
        page: number;
        limit: number;
    }>;
    apply(campaignId: string, userId: string, input: ApplyToCampaignInput): Promise<{
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
        socialHandles: import("@prisma/client/runtime/library").JsonValue;
        portfolioUrl: string | null;
    }>;
    getCampaignApplications(campaignId: string, userId: string, page: number, limit: number): Promise<{
        applications: ({
            creator: {
                fullName: string;
                location: string | null;
                avatarUrl: string | null;
                categories: string[];
                socialLinks: import("@prisma/client/runtime/library").JsonValue;
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
            socialHandles: import("@prisma/client/runtime/library").JsonValue;
            portfolioUrl: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    getBusinessApplications(userId: string, page: number, limit: number): Promise<{
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
            socialHandles: import("@prisma/client/runtime/library").JsonValue;
            portfolioUrl: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
    acceptApplication(campaignId: string, appId: string, userId: string): Promise<{
        status: import(".prisma/client").$Enums.ApplicationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        creatorId: string;
        proposedRate: number;
        campaignId: string;
        coverLetter: string;
        timeline: string;
        socialHandles: import("@prisma/client/runtime/library").JsonValue;
        portfolioUrl: string | null;
    }>;
    rejectApplication(campaignId: string, appId: string, userId: string): Promise<{
        status: import(".prisma/client").$Enums.ApplicationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        creatorId: string;
        proposedRate: number;
        campaignId: string;
        coverLetter: string;
        timeline: string;
        socialHandles: import("@prisma/client/runtime/library").JsonValue;
        portfolioUrl: string | null;
    }>;
    private updateApplicationStatus;
    getMyApplications(userId: string, page: number, limit: number): Promise<{
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
            socialHandles: import("@prisma/client/runtime/library").JsonValue;
            portfolioUrl: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
}
//# sourceMappingURL=campaign.service.d.ts.map