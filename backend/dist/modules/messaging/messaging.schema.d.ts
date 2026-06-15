import { z } from 'zod';
export declare const startConversationSchema: z.ZodObject<{
    otherUserId: z.ZodString;
    campaignId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    otherUserId: string;
    campaignId?: string | undefined;
}, {
    otherUserId: string;
    campaignId?: string | undefined;
}>;
export declare const sendMessageSchema: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
export declare const messagesQuerySchema: z.ZodObject<{
    page: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
    limit: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: string | undefined;
    limit?: string | undefined;
}>;
export type StartConversationInput = z.infer<typeof startConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MessagesQuery = z.infer<typeof messagesQuerySchema>;
//# sourceMappingURL=messaging.schema.d.ts.map