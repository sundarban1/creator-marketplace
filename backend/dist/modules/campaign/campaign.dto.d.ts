import { Prisma } from '@prisma/client';
export interface CampaignDto {
    id: string;
    title: string;
    description: string;
    template: string | null;
    category: string;
    goals: string[];
    platform: string;
    minFollowers: number;
    contentType: string;
    deliverables: string;
    paymentType: string;
    deadline: string;
    eventDate: string | null;
    location: string | null;
    budgetMin: number;
    budgetMax: number;
    status: string;
    isFeatured: boolean;
    creatorsNeeded: number;
    campaignType: string;
    capacity: number | null;
    venue: string | null;
    benefits: string[];
    eventStatus: string;
    paymentStatus: string;
    paidAt: string | null;
    paymentMethod: string | null;
    createdAt: string;
    business?: {
        businessName: string | null;
        logoUrl: string | null;
        website?: string | null;
        description?: string | null;
    };
    _count?: {
        applications: number;
    };
}
export interface ApplicationDto {
    id: string;
    campaignId: string;
    coverLetter: string;
    proposedRate: number;
    timeline: string;
    socialHandles: Record<string, string>;
    portfolioUrl: string | null;
    status: string;
    workStatus: string;
    workNote: string | null;
    submittedAt: string | null;
    deliverableUrls: string | null;
    paymentStatus: string;
    paidAt: string | null;
    createdAt: string;
    campaign?: {
        id?: string;
        title: string;
        category?: string;
        platform?: string;
        budgetMin?: number;
        budgetMax?: number;
        deadline?: string;
        status?: string;
        campaignType?: string;
        paymentStatus?: string;
        paidAt?: string | null;
        business?: {
            id?: string;
            businessName: string | null;
            logoUrl: string | null;
        };
    } | null;
    creator?: {
        id?: string;
        userId?: string;
        fullName: string | null;
        avatarUrl?: string | null;
        location?: string | null;
        categories?: string[];
        socialLinks?: unknown;
    } | null;
}
type RawCampaign = {
    id: string;
    businessId: string;
    title: string;
    description: string;
    template: string | null;
    category: string;
    goals: Prisma.JsonValue;
    platform: string;
    minFollowers: number;
    contentType: string;
    deliverables: string;
    paymentType: string;
    deadline: Date;
    eventDate: Date | null;
    location: string | null;
    budgetMin: number;
    budgetMax: number;
    status: string;
    isFeatured: boolean;
    creatorsNeeded: number;
    campaignType: string;
    capacity: number | null;
    venue: string | null;
    benefits: Prisma.JsonValue;
    eventStatus: string;
    paymentStatus: string;
    paidAt: Date | null;
    paymentMethod: string | null;
    createdAt: Date;
    business?: {
        businessName: string | null;
        logoUrl: string | null;
        website?: string | null;
        description?: string | null;
    } | null;
    _count?: {
        applications: number;
    };
};
export declare function toCampaignDto(c: RawCampaign): CampaignDto;
type RawApplication = {
    id: string;
    campaignId: string;
    coverLetter: string;
    proposedRate: number;
    timeline: string;
    socialHandles: Prisma.JsonValue;
    portfolioUrl: string | null;
    status: string;
    workStatus: string;
    workNote: string | null;
    submittedAt: Date | null;
    deliverableUrls: string | null;
    paymentStatus: string;
    paidAt: Date | null;
    createdAt: Date;
    campaign?: {
        id?: string;
        title: string;
        category?: string;
        platform?: string;
        budgetMin?: number;
        budgetMax?: number;
        deadline?: Date;
        status?: string;
        campaignType?: string;
        paymentStatus?: string;
        paidAt?: Date | null;
        business?: {
            id?: string;
            businessName: string | null;
            logoUrl: string | null;
        };
    } | null;
    creator?: {
        id?: string;
        userId?: string;
        fullName: string | null;
        avatarUrl?: string | null;
        location?: string | null;
        categories?: string[];
        socialLinks?: Prisma.JsonValue;
    } | null;
};
export declare function toApplicationDto(a: RawApplication): ApplicationDto;
export {};
//# sourceMappingURL=campaign.dto.d.ts.map