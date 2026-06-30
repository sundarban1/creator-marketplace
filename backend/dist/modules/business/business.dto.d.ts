import { Prisma } from '@prisma/client';
export interface BusinessProfileDto {
    id: string;
    userId: string;
    businessName: string | null;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    categories: string[];
    panNo: string | null;
    location: string | null;
    isVerified: boolean;
    showPublicProfile: boolean;
    hideContactDetails: boolean;
    allowDirectMessages: boolean;
    socialLinks: Record<string, string>;
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        email: string;
        role: string;
        isEmailVerified: boolean;
    } | null;
}
export interface PublicBusinessDto {
    id: string;
    userId: string;
    businessName: string | null;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    categories: string[];
    isVerified: boolean;
    showPublicProfile: boolean;
    hideContactDetails: boolean;
    allowDirectMessages: boolean;
    createdAt: string;
    campaigns: Array<{
        id: string;
        title: string;
        platform: string;
        category: string;
        budgetMin: number;
        budgetMax: number;
        deadline: string;
        contentType: string;
        isFeatured: boolean;
        location: string | null;
        _count: {
            applications: number;
        };
    }>;
    _count: {
        campaigns: number;
    };
}
export interface BusinessListItemDto {
    id: string;
    businessName: string | null;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    categories: string[];
    isVerified: boolean;
    _count: {
        campaigns: number;
    };
}
type RawBusinessProfile = {
    id: string;
    userId: string;
    businessName: string | null;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    categories: string[];
    panNo: string | null;
    location: string | null;
    isVerified: boolean;
    showPublicProfile: boolean;
    hideContactDetails: boolean;
    allowDirectMessages: boolean;
    socialLinks?: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
    user?: {
        id: string;
        email: string;
        role: string;
        isEmailVerified: boolean;
    } | null;
};
export declare function toBusinessProfileDto(b: RawBusinessProfile): BusinessProfileDto;
type RawPublicBusiness = {
    id: string;
    userId: string;
    businessName: string | null;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    categories: string[];
    isVerified: boolean;
    showPublicProfile: boolean;
    hideContactDetails: boolean;
    allowDirectMessages: boolean;
    createdAt: Date;
    campaigns: Array<{
        id: string;
        title: string;
        platform: string;
        category: string;
        budgetMin: number;
        budgetMax: number;
        deadline: Date;
        contentType: string;
        isFeatured: boolean;
        location: string | null;
        _count: {
            applications: number;
        };
    }>;
    _count: {
        campaigns: number;
    };
};
export declare function toPublicBusinessDto(b: RawPublicBusiness): PublicBusinessDto;
type RawBusinessListItem = {
    id: string;
    businessName: string | null;
    description: string | null;
    logoUrl: string | null;
    website: string | null;
    categories: string[];
    isVerified: boolean;
    _count: {
        campaigns: number;
    };
};
export declare function toBusinessListItemDto(b: RawBusinessListItem): BusinessListItemDto;
export {};
//# sourceMappingURL=business.dto.d.ts.map