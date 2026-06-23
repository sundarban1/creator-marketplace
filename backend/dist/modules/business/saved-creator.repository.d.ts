export declare class SavedCreatorRepository {
    toggle(businessId: string, creatorId: string): Promise<{
        isSaved: boolean;
    }>;
    listSaved(businessId: string): Promise<({
        creator: {
            id: string;
            categories: string[];
            location: string | null;
            isVerified: boolean;
            fullName: string | null;
            avatarUrl: string | null;
            socialAccounts: {
                platform: string;
                followers: number;
            }[];
        };
    } & {
        id: string;
        createdAt: Date;
        creatorId: string;
        businessId: string;
    })[]>;
    getSavedIds(businessId: string): Promise<string[]>;
}
//# sourceMappingURL=saved-creator.repository.d.ts.map