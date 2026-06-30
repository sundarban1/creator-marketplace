import { Role } from '@prisma/client';
export interface UserDto {
    id: string;
    email: string;
    phone: string | null;
    role: Role;
    name: string;
    avatar: string | null;
    isEmailVerified: boolean;
    isOnboarded: boolean;
    createdAt: string;
    updatedAt: string;
    creatorProfile: {
        id: string;
        username: string | null;
        fullName: string | null;
        avatarUrl: string | null;
    } | null;
    businessProfile: {
        id: string;
        businessName: string | null;
        logoUrl: string | null;
    } | null;
}
type UserInput = {
    id: string;
    email: string;
    phone: string | null;
    role: Role;
    isEmailVerified: boolean;
    isOnboarded: boolean;
    createdAt: Date;
    updatedAt: Date;
    creatorProfile?: {
        id: string;
        username?: string | null;
        fullName: string | null;
        avatarUrl: string | null;
    } | null;
    businessProfile?: {
        id: string;
        businessName: string | null;
        logoUrl: string | null;
    } | null;
};
export declare function toUserDto(user: UserInput): UserDto;
export {};
//# sourceMappingURL=auth.dto.d.ts.map