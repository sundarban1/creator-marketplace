import { z } from 'zod';

export const startConversationSchema = z.object({
  otherUserId:    z.string().min(1, 'Other user ID is required'),
  campaignId:     z.string().optional(),
  requestMessage: z.string().max(500).optional(),
});

export const startCreatorConversationSchema = z.object({
  otherUserId:    z.string().min(1, 'Other user ID is required'),
  requestMessage: z.string().max(500).optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(5000, 'Message too long'),
});

export const messagesQuerySchema = z.object({
  page:  z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v) : 30)),
});

export type StartConversationInput        = z.infer<typeof startConversationSchema>;
export type StartCreatorConversationInput = z.infer<typeof startCreatorConversationSchema>;
export type SendMessageInput              = z.infer<typeof sendMessageSchema>;
export type MessagesQuery                 = z.infer<typeof messagesQuerySchema>;
