export declare class FavoriteRepository {
    toggle(creatorId: string, businessId: string): Promise<{
        isFavorited: boolean;
    }>;
    getFavoriteIds(creatorId: string): Promise<string[]>;
    isFavorited(creatorId: string, businessId: string): Promise<boolean>;
    getCreatorUserIdsForBusiness(businessId: string): Promise<string[]>;
}
//# sourceMappingURL=favorite.repository.d.ts.map