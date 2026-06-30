import type { UpdateCreatorProfileInput, AddPortfolioLinkInput, UpdateSocialLinksInput, AddSocialAccountInput, UpdateSocialAccountInput, UpdatePaymentMethodsInput, UpdateCampaignPrefsInput } from './creator.schema';
export declare class CreatorService {
    private repo;
    constructor();
    listCreators(params: {
        page: number;
        limit: number;
        search?: string;
        categories?: string[];
        location?: string;
        platforms?: string[];
        priceMin?: number;
        priceMax?: number;
        lang?: string;
    }): Promise<{
        creators: import("./creator.dto").CreatorListItemDto[];
        total: number;
        page: number;
        limit: number;
    }>;
    getCreatorPublicProfile(creatorId: string, lang?: string): Promise<import("./creator.dto").PublicCreatorDto>;
    getFilterOptions(): Promise<{
        categories: string[];
        platforms: string[];
    }>;
    getProfile(userId: string): Promise<import("./creator.dto").CreatorProfileDto>;
    updateProfile(userId: string, input: UpdateCreatorProfileInput): Promise<import("./creator.dto").CreatorProfileDto>;
    addPortfolioLink(userId: string, input: AddPortfolioLinkInput): Promise<import("./creator.dto").CreatorProfileDto>;
    removePortfolioLink(userId: string, linkId: string): Promise<import("./creator.dto").CreatorProfileDto>;
    updateSocialLinks(userId: string, input: UpdateSocialLinksInput): Promise<import("./creator.dto").CreatorProfileDto>;
    getSocialAccounts(userId: string): Promise<import("./creator.dto").SocialAccountDto[]>;
    addSocialAccount(userId: string, input: AddSocialAccountInput): Promise<import("./creator.dto").SocialAccountDto>;
    updateSocialAccount(userId: string, accountId: string, input: UpdateSocialAccountInput): Promise<import("./creator.dto").SocialAccountDto>;
    deleteSocialAccount(userId: string, accountId: string): Promise<void>;
    updatePaymentMethods(userId: string, input: UpdatePaymentMethodsInput): Promise<import("./creator.dto").CreatorProfileDto>;
    updateCampaignPrefs(userId: string, input: UpdateCampaignPrefsInput): Promise<import("./creator.dto").CreatorProfileDto>;
    getEarningsSummary(userId: string): Promise<{
        totalEarned: number;
        pendingEarnings: number;
        totalApplications: number;
    }>;
}
//# sourceMappingURL=creator.service.d.ts.map