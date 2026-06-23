import { z } from 'zod';
export declare const updateBusinessProfileSchema: z.ZodObject<{
    businessName: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    logoUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    website: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    panNo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    location: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    showPublicProfile: z.ZodOptional<z.ZodBoolean>;
    hideContactDetails: z.ZodOptional<z.ZodBoolean>;
    allowDirectMessages: z.ZodOptional<z.ZodBoolean>;
    socialLinks: z.ZodOptional<z.ZodObject<{
        facebook: z.ZodOptional<z.ZodString>;
        instagram: z.ZodOptional<z.ZodString>;
        tiktok: z.ZodOptional<z.ZodString>;
        linkedin: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        instagram?: string | undefined;
        tiktok?: string | undefined;
        facebook?: string | undefined;
        linkedin?: string | undefined;
    }, {
        instagram?: string | undefined;
        tiktok?: string | undefined;
        facebook?: string | undefined;
        linkedin?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    businessName?: string | undefined;
    logoUrl?: string | null | undefined;
    website?: string | null | undefined;
    categories?: string[] | undefined;
    panNo?: string | null | undefined;
    location?: string | null | undefined;
    allowDirectMessages?: boolean | undefined;
    hideContactDetails?: boolean | undefined;
    showPublicProfile?: boolean | undefined;
    socialLinks?: {
        instagram?: string | undefined;
        tiktok?: string | undefined;
        facebook?: string | undefined;
        linkedin?: string | undefined;
    } | undefined;
}, {
    description?: string | undefined;
    businessName?: string | undefined;
    logoUrl?: string | null | undefined;
    website?: string | null | undefined;
    categories?: string[] | undefined;
    panNo?: string | null | undefined;
    location?: string | null | undefined;
    allowDirectMessages?: boolean | undefined;
    hideContactDetails?: boolean | undefined;
    showPublicProfile?: boolean | undefined;
    socialLinks?: {
        instagram?: string | undefined;
        tiktok?: string | undefined;
        facebook?: string | undefined;
        linkedin?: string | undefined;
    } | undefined;
}>;
export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;
//# sourceMappingURL=business.schema.d.ts.map