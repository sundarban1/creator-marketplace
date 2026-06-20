import { z } from 'zod';
export declare const updateBusinessProfileSchema: z.ZodObject<{
    businessName: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    logoUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    website: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    panNo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    showPublicProfile: z.ZodOptional<z.ZodBoolean>;
    hideContactDetails: z.ZodOptional<z.ZodBoolean>;
    allowDirectMessages: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    businessName?: string | undefined;
    logoUrl?: string | null | undefined;
    website?: string | null | undefined;
    categories?: string[] | undefined;
    panNo?: string | null | undefined;
    allowDirectMessages?: boolean | undefined;
    hideContactDetails?: boolean | undefined;
    showPublicProfile?: boolean | undefined;
}, {
    description?: string | undefined;
    businessName?: string | undefined;
    logoUrl?: string | null | undefined;
    website?: string | null | undefined;
    categories?: string[] | undefined;
    panNo?: string | null | undefined;
    allowDirectMessages?: boolean | undefined;
    hideContactDetails?: boolean | undefined;
    showPublicProfile?: boolean | undefined;
}>;
export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;
//# sourceMappingURL=business.schema.d.ts.map