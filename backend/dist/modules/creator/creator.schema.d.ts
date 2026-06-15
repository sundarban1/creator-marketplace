import { z } from 'zod';
export declare const updateCreatorProfileSchema: z.ZodObject<{
    fullName: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    avatarUrl: z.ZodOptional<z.ZodString>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    fullName?: string | undefined;
    bio?: string | undefined;
    location?: string | undefined;
    avatarUrl?: string | undefined;
    categories?: string[] | undefined;
}, {
    fullName?: string | undefined;
    bio?: string | undefined;
    location?: string | undefined;
    avatarUrl?: string | undefined;
    categories?: string[] | undefined;
}>;
export declare const addPortfolioLinkSchema: z.ZodObject<{
    label: z.ZodString;
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    url: string;
    label: string;
}, {
    url: string;
    label: string;
}>;
export declare const updateSocialLinksSchema: z.ZodObject<{
    instagram: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    tiktok: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    youtube: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    facebook: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    instagram?: string | null | undefined;
    tiktok?: string | null | undefined;
    youtube?: string | null | undefined;
    facebook?: string | null | undefined;
}, {
    instagram?: string | null | undefined;
    tiktok?: string | null | undefined;
    youtube?: string | null | undefined;
    facebook?: string | null | undefined;
}>;
export type UpdateCreatorProfileInput = z.infer<typeof updateCreatorProfileSchema>;
export type AddPortfolioLinkInput = z.infer<typeof addPortfolioLinkSchema>;
export type UpdateSocialLinksInput = z.infer<typeof updateSocialLinksSchema>;
//# sourceMappingURL=creator.schema.d.ts.map