import type { CreateCampaignInput, UpdateCampaignInput, CampaignListQuery, ApplyToCampaignInput } from './campaign.schema';
export declare class CampaignService {
    private repo;
    private businessRepo;
    private creatorRepo;
    private favoriteRepo;
    constructor();
    create(userId: string, input: CreateCampaignInput): Promise<import("./campaign.dto").CampaignDto>;
    list(query: CampaignListQuery, lang?: string): Promise<{
        campaigns: import("./campaign.dto").CampaignDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    getCategories(): Promise<string[]>;
    getPlatforms(): Promise<string[]>;
    getById(id: string, lang?: string): Promise<import("./campaign.dto").CampaignDto>;
    update(id: string, userId: string, input: UpdateCampaignInput): Promise<import("./campaign.dto").CampaignDto>;
    delete(id: string, userId: string): Promise<{
        message: string;
    }>;
    getMyCampaigns(userId: string, page: number, limit: number, lang?: string): Promise<{
        campaigns: import("./campaign.dto").CampaignDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    apply(campaignId: string, userId: string, input: ApplyToCampaignInput): Promise<import("./campaign.dto").ApplicationDto>;
    getCampaignApplications(campaignId: string, userId: string, page: number, limit: number): Promise<{
        applications: import("./campaign.dto").ApplicationDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    getBusinessApplications(userId: string, page: number, limit: number): Promise<{
        applications: import("./campaign.dto").ApplicationDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    acceptApplication(campaignId: string, appId: string, userId: string): Promise<import("./campaign.dto").ApplicationDto>;
    rejectApplication(campaignId: string, appId: string, userId: string): Promise<import("./campaign.dto").ApplicationDto>;
    private updateApplicationStatus;
    getMyApplications(userId: string, page: number, limit: number): Promise<{
        applications: import("./campaign.dto").ApplicationDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    payForCampaign(campaignId: string, userId: string, method: string): Promise<import("./campaign.dto").CampaignDto>;
    payForApplication(appId: string, userId: string): Promise<{
        success: boolean;
    }>;
    startWork(appId: string, userId: string): Promise<import("./campaign.dto").ApplicationDto>;
    submitWork(appId: string, userId: string, data: {
        note?: string;
        urls?: string;
    }): Promise<import("./campaign.dto").ApplicationDto>;
    approveWork(appId: string, userId: string): Promise<import("./campaign.dto").ApplicationDto>;
    requestRevision(appId: string, userId: string, note: string): Promise<import("./campaign.dto").ApplicationDto>;
    cancelCampaign(campaignId: string, userId: string): Promise<import("./campaign.dto").CampaignDto>;
}
//# sourceMappingURL=campaign.service.d.ts.map