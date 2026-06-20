import { z } from 'zod';
export declare const updateCreatorProfileSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    fullName: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    locationLat: z.ZodOptional<z.ZodNumber>;
    locationLng: z.ZodOptional<z.ZodNumber>;
    avatarUrl: z.ZodOptional<z.ZodString>;
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    categories?: string[] | undefined;
    fullName?: string | undefined;
    bio?: string | undefined;
    location?: string | undefined;
    avatarUrl?: string | undefined;
    username?: string | undefined;
    locationLat?: number | undefined;
    locationLng?: number | undefined;
}, {
    categories?: string[] | undefined;
    fullName?: string | undefined;
    bio?: string | undefined;
    location?: string | undefined;
    avatarUrl?: string | undefined;
    username?: string | undefined;
    locationLat?: number | undefined;
    locationLng?: number | undefined;
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
export declare const addSocialAccountSchema: z.ZodObject<{
    platform: z.ZodEnum<["instagram", "tiktok", "youtube", "facebook", "twitter", "linkedin", "pinterest", "snapchat", "twitch"]>;
    profileUrl: z.ZodString;
    followers: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    platform: "instagram" | "tiktok" | "youtube" | "facebook" | "twitter" | "linkedin" | "pinterest" | "snapchat" | "twitch";
    profileUrl: string;
    followers: number;
}, {
    platform: "instagram" | "tiktok" | "youtube" | "facebook" | "twitter" | "linkedin" | "pinterest" | "snapchat" | "twitch";
    profileUrl: string;
    followers: number;
}>;
export declare const updateSocialAccountSchema: z.ZodObject<{
    profileUrl: z.ZodOptional<z.ZodString>;
    followers: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    profileUrl?: string | undefined;
    followers?: number | undefined;
}, {
    profileUrl?: string | undefined;
    followers?: number | undefined;
}>;
export declare const updatePaymentMethodsSchema: z.ZodObject<{
    methods: z.ZodArray<z.ZodEnum<["esewa", "khalti", "fonepay"]>, "many">;
}, "strip", z.ZodTypeAny, {
    methods: ("esewa" | "khalti" | "fonepay")[];
}, {
    methods: ("esewa" | "khalti" | "fonepay")[];
}>;
export declare const updateCampaignPrefsSchema: z.ZodObject<{
    categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    prefPlatforms: z.ZodOptional<z.ZodArray<z.ZodEnum<["Instagram", "TikTok", "YouTube", "Facebook"]>, "many">>;
    prefLocations: z.ZodOptional<z.ZodArray<z.ZodEnum<["Kathmandu", "Pokhara", "Lalitpur", "Bhaktapur", "Butwal", "Biratnagar", "Remote"]>, "many">>;
    prefBudgetMin: z.ZodOptional<z.ZodNumber>;
    prefBudgetMax: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    categories?: string[] | undefined;
    prefPlatforms?: ("Instagram" | "TikTok" | "YouTube" | "Facebook")[] | undefined;
    prefLocations?: ("Kathmandu" | "Pokhara" | "Lalitpur" | "Bhaktapur" | "Butwal" | "Biratnagar" | "Remote")[] | undefined;
    prefBudgetMin?: number | undefined;
    prefBudgetMax?: number | undefined;
}, {
    categories?: string[] | undefined;
    prefPlatforms?: ("Instagram" | "TikTok" | "YouTube" | "Facebook")[] | undefined;
    prefLocations?: ("Kathmandu" | "Pokhara" | "Lalitpur" | "Bhaktapur" | "Butwal" | "Biratnagar" | "Remote")[] | undefined;
    prefBudgetMin?: number | undefined;
    prefBudgetMax?: number | undefined;
}>;
export type UpdateCreatorProfileInput = z.infer<typeof updateCreatorProfileSchema>;
export type AddPortfolioLinkInput = z.infer<typeof addPortfolioLinkSchema>;
export type UpdateSocialLinksInput = z.infer<typeof updateSocialLinksSchema>;
export type AddSocialAccountInput = z.infer<typeof addSocialAccountSchema>;
export type UpdateSocialAccountInput = z.infer<typeof updateSocialAccountSchema>;
export type UpdatePaymentMethodsInput = z.infer<typeof updatePaymentMethodsSchema>;
export type UpdateCampaignPrefsInput = z.infer<typeof updateCampaignPrefsSchema>;
//# sourceMappingURL=creator.schema.d.ts.map