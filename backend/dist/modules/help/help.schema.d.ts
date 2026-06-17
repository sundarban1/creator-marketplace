import { z } from 'zod';
export declare const createHelpArticleSchema: z.ZodObject<{
    question: z.ZodString;
    answer: z.ZodString;
    category: z.ZodOptional<z.ZodString>;
    order: z.ZodOptional<z.ZodNumber>;
    published: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    question: string;
    answer: string;
    category?: string | undefined;
    order?: number | undefined;
    published?: boolean | undefined;
}, {
    question: string;
    answer: string;
    category?: string | undefined;
    order?: number | undefined;
    published?: boolean | undefined;
}>;
export declare const updateHelpArticleSchema: z.ZodObject<{
    question: z.ZodOptional<z.ZodString>;
    answer: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    order: z.ZodOptional<z.ZodNumber>;
    published: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    category?: string | undefined;
    question?: string | undefined;
    answer?: string | undefined;
    order?: number | undefined;
    published?: boolean | undefined;
}, {
    category?: string | undefined;
    question?: string | undefined;
    answer?: string | undefined;
    order?: number | undefined;
    published?: boolean | undefined;
}>;
export type CreateHelpArticleInput = z.infer<typeof createHelpArticleSchema>;
export type UpdateHelpArticleInput = z.infer<typeof updateHelpArticleSchema>;
//# sourceMappingURL=help.schema.d.ts.map