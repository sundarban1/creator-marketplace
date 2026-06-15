export declare class BusinessRepository {
    findByUserId(userId: string): Promise<({
        user: {
            email: string;
            id: string;
            role: import(".prisma/client").$Enums.Role;
            isEmailVerified: boolean;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        categories: string[];
        isVerified: boolean;
        businessName: string;
        description: string | null;
        logoUrl: string | null;
        website: string | null;
        panNo: string | null;
    }) | null>;
    findById(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        categories: string[];
        isVerified: boolean;
        businessName: string;
        description: string | null;
        logoUrl: string | null;
        website: string | null;
        panNo: string | null;
    } | null>;
    update(userId: string, data: Partial<{
        businessName: string;
        description: string | null;
        logoUrl: string | null;
        website: string | null;
        categories: string[];
        panNo: string | null;
    }>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        categories: string[];
        isVerified: boolean;
        businessName: string;
        description: string | null;
        logoUrl: string | null;
        website: string | null;
        panNo: string | null;
    }>;
}
//# sourceMappingURL=business.repository.d.ts.map