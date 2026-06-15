import { z } from 'zod';
export declare const createCampaignSchema: z.ZodEffects<z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    category: z.ZodString;
    platform: z.ZodString;
    minFollowers: z.ZodDefault<z.ZodNumber>;
    contentType: z.ZodString;
    deliverables: z.ZodString;
    deadline: z.ZodString;
    location: z.ZodOptional<z.ZodString>;
    budgetMin: z.ZodNumber;
    budgetMax: z.ZodNumber;
    paymentType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    description: string;
    title: string;
    category: string;
    platform: string;
    minFollowers: number;
    contentType: string;
    deliverables: string;
    deadline: string;
    budgetMin: number;
    budgetMax: number;
    paymentType: string;
    location?: string | undefined;
}, {
    description: string;
    title: string;
    category: string;
    platform: string;
    contentType: string;
    deliverables: string;
    deadline: string;
    budgetMin: number;
    budgetMax: number;
    paymentType: string;
    location?: string | undefined;
    minFollowers?: number | undefined;
}>, {
    description: string;
    title: string;
    category: string;
    platform: string;
    minFollowers: number;
    contentType: string;
    deliverables: string;
    deadline: string;
    budgetMin: number;
    budgetMax: number;
    paymentType: string;
    location?: string | undefined;
}, {
    description: string;
    title: string;
    category: string;
    platform: string;
    contentType: string;
    deliverables: string;
    deadline: string;
    budgetMin: number;
    budgetMax: number;
    paymentType: string;
    location?: string | undefined;
    minFollowers?: number | undefined;
}>;
export declare const updateCampaignSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    platform: z.ZodOptional<z.ZodString>;
    minFollowers: z.ZodOptional<z.ZodNumber>;
    contentType: z.ZodOptional<z.ZodString>;
    deliverables: z.ZodOptional<z.ZodString>;
    deadline: z.ZodOptional<z.ZodString>;
    location: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    budgetMin: z.ZodOptional<z.ZodNumber>;
    budgetMax: z.ZodOptional<z.ZodNumber>;
    paymentType: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "PAUSED", "CLOSED"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "ACTIVE" | "PAUSED" | "CLOSED" | undefined;
    location?: string | null | undefined;
    description?: string | undefined;
    title?: string | undefined;
    category?: string | undefined;
    platform?: string | undefined;
    minFollowers?: number | undefined;
    contentType?: string | undefined;
    deliverables?: string | undefined;
    deadline?: string | undefined;
    budgetMin?: number | undefined;
    budgetMax?: number | undefined;
    paymentType?: string | undefined;
}, {
    status?: "ACTIVE" | "PAUSED" | "CLOSED" | undefined;
    location?: string | null | undefined;
    description?: string | undefined;
    title?: string | undefined;
    category?: string | undefined;
    platform?: string | undefined;
    minFollowers?: number | undefined;
    contentType?: string | undefined;
    deliverables?: string | undefined;
    deadline?: string | undefined;
    budgetMin?: number | undefined;
    budgetMax?: number | undefined;
    paymentType?: string | undefined;
}>;
export declare const campaignListQuerySchema: z.ZodObject<{
    category: z.ZodOptional<z.ZodString>;
    platform: z.ZodOptional<z.ZodString>;
    minBudget: z.ZodEffects<z.ZodOptional<z.ZodString>, number | undefined, string | undefined>;
    maxBudget: z.ZodEffects<z.ZodOptional<z.ZodString>, number | undefined, string | undefined>;
    status: z.ZodOptional<z.ZodEnum<["ACTIVE", "PAUSED", "CLOSED"]>>;
    page: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
    limit: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    status?: "ACTIVE" | "PAUSED" | "CLOSED" | undefined;
    category?: string | undefined;
    platform?: string | undefined;
    minBudget?: number | undefined;
    maxBudget?: number | undefined;
}, {
    status?: "ACTIVE" | "PAUSED" | "CLOSED" | undefined;
    category?: string | undefined;
    platform?: string | undefined;
    minBudget?: string | undefined;
    maxBudget?: string | undefined;
    page?: string | undefined;
    limit?: string | undefined;
}>;
export declare const applyToCampaignSchema: z.ZodObject<{
    coverLetter: z.ZodString;
    proposedRate: z.ZodNumber;
    timeline: z.ZodString;
    socialHandles: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    portfolioUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    coverLetter: string;
    proposedRate: number;
    timeline: string;
    socialHandles: Record<string, string>;
    portfolioUrl?: string | undefined;
}, {
    coverLetter: string;
    proposedRate: number;
    timeline: string;
    socialHandles?: Record<string, string> | undefined;
    portfolioUrl?: string | undefined;
}>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CampaignListQuery = z.infer<typeof campaignListQuerySchema>;
export type ApplyToCampaignInput = z.infer<typeof applyToCampaignSchema>;
//# sourceMappingURL=campaign.schema.d.ts.map