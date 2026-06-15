import type { CreateCampaignInput, UpdateCampaignInput, CampaignListQuery, ApplyToCampaignInput } from './campaign.schema';
export declare class CampaignService {
    private repo;
    private businessRepo;
    private creatorRepo;
    constructor();
    create(userId: string, input: CreateCampaignInput): Promise<{
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
        page: number;
        limit: number;
    }>;
    getById(id: string): Promise<{
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
    }>;
    update(id: string, userId: string, input: UpdateCampaignInput): Promise<{
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
        campaignId: string;
        creatorId: string;
        coverLetter: string;
        proposedRate: number;
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
            campaignId: string;
            creatorId: string;
            coverLetter: string;
            proposedRate: number;
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
        campaignId: string;
        creatorId: string;
        coverLetter: string;
        proposedRate: number;
        timeline: string;
        socialHandles: import("@prisma/client/runtime/library").JsonValue;
        portfolioUrl: string | null;
    }>;
    rejectApplication(campaignId: string, appId: string, userId: string): Promise<{
        status: import(".prisma/client").$Enums.ApplicationStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        campaignId: string;
        creatorId: string;
        coverLetter: string;
        proposedRate: number;
        timeline: string;
        socialHandles: import("@prisma/client/runtime/library").JsonValue;
        portfolioUrl: string | null;
    }>;
    private updateApplicationStatus;
    getMyApplications(userId: string, page: number, limit: number): Promise<{
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
            socialHandles: import("@prisma/client/runtime/library").JsonValue;
            portfolioUrl: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
    }>;
}
//# sourceMappingURL=campaign.service.d.ts.map