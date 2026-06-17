import { Role } from '@prisma/client';
export declare class AuthRepository {
    findUserByEmail(email: string): Promise<({
        creatorProfile: {
            id: string;
            username: string | null;
            fullName: string;
            avatarUrl: string | null;
        } | null;
        businessProfile: {
            id: string;
            businessName: string;
            logoUrl: string | null;
        } | null;
    } & {
        email: string;
        id: string;
        phone: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        isOnboarded: boolean;
        isActive: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    findUserById(id: string): Promise<({
        creatorProfile: {
            id: string;
            username: string | null;
            fullName: string;
            avatarUrl: string | null;
        } | null;
        businessProfile: {
            id: string;
            businessName: string;
            logoUrl: string | null;
        } | null;
    } & {
        email: string;
        id: string;
        phone: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        isOnboarded: boolean;
        isActive: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
    }) | null>;
    findUserByPhone(phone: string): Promise<{
        email: string;
        id: string;
        phone: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        isOnboarded: boolean;
        isActive: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    createUserWithCreatorProfile(data: {
        email: string;
        phone: string;
        password: string;
        role: Role;
        fullName: string;
    }): Promise<{
        creatorProfile: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            username: string | null;
            fullName: string;
            bio: string | null;
            location: string | null;
            locationLat: number | null;
            locationLng: number | null;
            avatarUrl: string | null;
            categories: string[];
            socialLinks: import("@prisma/client/runtime/library").JsonValue;
            portfolioLinks: import("@prisma/client/runtime/library").JsonValue;
            isVerified: boolean;
            paymentMethods: string[];
            prefPlatforms: string[];
            prefLocations: string[];
            prefBudgetMin: number;
            prefBudgetMax: number;
        } | null;
    } & {
        email: string;
        id: string;
        phone: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        isOnboarded: boolean;
        isActive: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createUserWithBusinessProfile(data: {
        email: string;
        phone: string;
        password: string;
        role: Role;
        businessName: string;
    }): Promise<{
        businessProfile: {
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
            showPublicProfile: boolean;
            hideContactDetails: boolean;
            allowDirectMessages: boolean;
        } | null;
    } & {
        email: string;
        id: string;
        phone: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        isOnboarded: boolean;
        isActive: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateRefreshToken(userId: string, refreshToken: string | null): Promise<{
        email: string;
        id: string;
        phone: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        isOnboarded: boolean;
        isActive: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updatePassword(userId: string, hashedPassword: string): Promise<{
        email: string;
        id: string;
        phone: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        isOnboarded: boolean;
        isActive: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    verifyEmail(userId: string): Promise<{
        creatorProfile: {
            id: string;
            username: string | null;
            fullName: string;
            avatarUrl: string | null;
        } | null;
        businessProfile: {
            id: string;
            businessName: string;
            logoUrl: string | null;
        } | null;
    } & {
        email: string;
        id: string;
        phone: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        isOnboarded: boolean;
        isActive: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    setOnboarded(userId: string): Promise<{
        email: string;
        id: string;
        phone: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        isOnboarded: boolean;
        isActive: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deactivateAccount(userId: string): Promise<{
        email: string;
        id: string;
        phone: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        isOnboarded: boolean;
        isActive: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    reactivateAccount(userId: string): Promise<{
        creatorProfile: {
            id: string;
            username: string | null;
            fullName: string;
            avatarUrl: string | null;
        } | null;
        businessProfile: {
            id: string;
            businessName: string;
            logoUrl: string | null;
        } | null;
    } & {
        email: string;
        id: string;
        phone: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        isOnboarded: boolean;
        isActive: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteAccount(userId: string): Promise<{
        email: string;
        id: string;
        phone: string;
        password: string;
        role: import(".prisma/client").$Enums.Role;
        isEmailVerified: boolean;
        isOnboarded: boolean;
        isActive: boolean;
        refreshToken: string | null;
        createdAt: Date;
        updatedAt: Date;
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
}
//# sourceMappingURL=auth.repository.d.ts.map