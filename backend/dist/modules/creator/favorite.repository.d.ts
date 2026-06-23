export declare class FavoriteRepository {
    toggle(creatorId: string, businessId: string): Promise<{
        isFavorited: boolean;
    }>;
    getFavoriteIds(creatorId: string): Promise<string[]>;
    isFavorited(creatorId: string, businessId: string): Promise<boolean>;
    getCreatorUserIdsForBusiness(businessId: string): Promise<string[]>;
    getFavoriteBusinesses(creatorId: string): Promise<({
        business: {
            description: string | null;
            id: string;
            businessName: string | null;
            logoUrl: string | null;
            website: string | null;
            categories: string[];
            isVerified: boolean;
            _count: {
                campaigns: number;
            };
        };
    } & {
        id: string;
        createdAt: Date;
        creatorId: string;
        businessId: string;
    })[]>;
}
//# sourceMappingURL=favorite.repository.d.ts.map