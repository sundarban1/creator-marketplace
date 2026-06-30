import type { UpdateBusinessProfileInput } from './business.schema';
export declare class BusinessService {
    private repo;
    constructor();
    getProfile(userId: string): Promise<import("./business.dto").BusinessProfileDto>;
    updateProfile(userId: string, input: UpdateBusinessProfileInput): Promise<import("./business.dto").BusinessProfileDto>;
    listBusinesses(params: {
        search?: string;
        category?: string;
        platform?: string;
        locations?: string[];
        page: number;
        limit: number;
        lang?: string;
    }): Promise<{
        businesses: import("./business.dto").BusinessListItemDto[];
        total: number;
    }>;
    getBusinessPublic(id: string, lang?: string): Promise<import("./business.dto").PublicBusinessDto>;
}
//# sourceMappingURL=business.service.d.ts.map