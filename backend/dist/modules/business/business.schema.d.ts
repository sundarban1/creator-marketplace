import { z } from 'zod';
export declare const updateBusinessProfileSchema: z.ZodObject<{
    businessName: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    logoUrl: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    website: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    panNo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    categories?: string[] | undefined;
    businessName?: string | undefined;
    description?: string | undefined;
    logoUrl?: string | null | undefined;
    website?: string | null | undefined;
    panNo?: string | null | undefined;
}, {
    categories?: string[] | undefined;
    businessName?: string | undefined;
    description?: string | undefined;
    logoUrl?: string | null | undefined;
    website?: string | null | undefined;
    panNo?: string | null | undefined;
}>;
export type UpdateBusinessProfileInput = z.infer<typeof updateBusinessProfileSchema>;
//# sourceMappingURL=business.schema.d.ts.map