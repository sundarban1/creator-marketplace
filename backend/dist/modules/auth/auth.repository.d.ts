import { Role } from '@prisma/client';
export declare class AuthRepository {
    findUserByEmail(email: string): Promise<({
        creatorProfile: {
            id: string;
            fullName: string | null;
            avatarUrl: string | null;
            username: string | null;
        } | null;
        businessProfile: {
            id: string;
            businessName: string | null;
            logoUrl: string | null;
        } | null;
    } & {
        email: string;
        id: string;
        phone: string | null;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
        isOnboarded: boolean;
        isActive: boolean;
    }) | null>;
    findUserById(id: string): Promise<({
        creatorProfile: {
            id: string;
            fullName: string | null;
            avatarUrl: string | null;
            username: string | null;
        } | null;
        businessProfile: {
            id: string;
            businessName: string | null;
            logoUrl: string | null;
        } | null;
    } & {
        email: string;
        id: string;
        phone: string | null;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
        isOnboarded: boolean;
        isActive: boolean;
    }) | null>;
    findUserByPhone(phone: string): Promise<{
        email: string;
        id: string;
        phone: string | null;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
        isOnboarded: boolean;
        isActive: boolean;
    } | null>;
    createUserWithCreatorProfile(data: {
        email: string;
        phone?: string;
        password: string;
        role: Role;
        fullName?: string;
    }): Promise<{
        creatorProfile: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            categories: string[];
            location: string | null;
            isVerified: boolean;
            fullName: string | null;
            bio: string | null;
            avatarUrl: string | null;
            socialLinks: import("@prisma/client/runtime/library").JsonValue;
            portfolioLinks: import("@prisma/client/runtime/library").JsonValue;
            username: string | null;
            paymentMethods: string[];
            prefPlatforms: string[];
            prefLocations: string[];
            prefBudgetMin: number;
            prefBudgetMax: number;
            locationLat: number | null;
            locationLng: number | null;
        } | null;
    } & {
        email: string;
        id: string;
        phone: string | null;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
        isOnboarded: boolean;
        isActive: boolean;
    }>;
    createUserWithBusinessProfile(data: {
        email: string;
        phone?: string;
        password: string;
        role: Role;
        businessName?: string;
    }): Promise<{
        businessProfile: {
            description: string | null;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            businessName: string | null;
            logoUrl: string | null;
            website: string | null;
            categories: string[];
            panNo: string | null;
            location: string | null;
            isVerified: boolean;
            allowDirectMessages: boolean;
            hideContactDetails: boolean;
            showPublicProfile: boolean;
        } | null;
    } & {
        email: string;
        id: string;
        phone: string | null;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
        isOnboarded: boolean;
        isActive: boolean;
    }>;
    updateRefreshToken(userId: string, refreshToken: string | null): Promise<{
        email: string;
        id: string;
        phone: string | null;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
        isOnboarded: boolean;
        isActive: boolean;
    }>;
    updatePassword(userId: string, hashedPassword: string): Promise<{
        email: string;
        id: string;
        phone: string | null;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
        isOnboarded: boolean;
        isActive: boolean;
    }>;
    verifyEmail(userId: string): Promise<{
        creatorProfile: {
            id: string;
            fullName: string | null;
            avatarUrl: string | null;
            username: string | null;
        } | null;
        businessProfile: {
            id: string;
            businessName: string | null;
            logoUrl: string | null;
        } | null;
    } & {
        email: string;
        id: string;
        phone: string | null;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
        isOnboarded: boolean;
        isActive: boolean;
    }>;
    setOnboarded(userId: string): Promise<{
        email: string;
        id: string;
        phone: string | null;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
        isOnboarded: boolean;
        isActive: boolean;
    }>;
    deactivateAccount(userId: string): Promise<{
        email: string;
        id: string;
        phone: string | null;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
        isOnboarded: boolean;
        isActive: boolean;
    }>;
    reactivateAccount(userId: string): Promise<{
        creatorProfile: {
            id: string;
            fullName: string | null;
            avatarUrl: string | null;
            username: string | null;
        } | null;
        businessProfile: {
            id: string;
            businessName: string | null;
            logoUrl: string | null;
        } | null;
    } & {
        email: string;
        id: string;
        phone: string | null;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
        isOnboarded: boolean;
        isActive: boolean;
    }>;
    deleteAccount(userId: string): Promise<{
        email: string;
        id: string;
        phone: string | null;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
        isOnboarded: boolean;
        isActive: boolean;
    }>;
    saveOtp(userId: string, code: string, expiresAt: Date): Promise<{
        code: string;
        id: string;
        createdAt: Date;
        userId: string;
        expiresAt: Date;
    }>;
    findValidOtp(userId: string, code: string): Promise<{
        code: string;
        id: string;
        createdAt: Date;
        userId: string;
        expiresAt: Date;
    } | null>;
    deleteOtpsByUserId(userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    updateUserPhone(userId: string, phone: string): Promise<{
        email: string;
        id: string;
        phone: string | null;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
        isOnboarded: boolean;
        isActive: boolean;
    }>;
}
//# sourceMappingURL=auth.repository.d.ts.map