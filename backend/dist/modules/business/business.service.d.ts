import type { UpdateBusinessProfileInput } from './business.schema';
export declare class BusinessService {
    private repo;
    constructor();
    getProfile(userId: string): Promise<{
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
    }>;
    updateProfile(userId: string, input: UpdateBusinessProfileInput): Promise<{
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
//# sourceMappingURL=business.service.d.ts.map