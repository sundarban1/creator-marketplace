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

export const editMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(5000, 'Message too long'),
});

export const messagesQuerySchema = z.object({
  page:  z.string().optional().transform((v) => (v ? parseInt(v) : 1)),
  limit: z.string().optional().transform((v) => (v ? parseInt(v) : 30)),
});

export const videoCompleteSchema = z.object({
  publicId: z.string().min(1, 'publicId is required'),
  caption:  z.string().max(500).optional(),
  // Client-measured duration (from the picker, before upload) — used only as
  // a fallback display/validation value for the narrow window where
  // Cloudinary hasn't finished indexing the asset yet and its own
  // resource.duration isn't available. Cloudinary's value wins whenever present.
  clientDurationSec: z.number().min(0).max(7200).optional(),
});

export const voiceCompleteSchema = z.object({
  publicId: z.string().min(1, 'publicId is required'),
  // Recorder-measured duration (see completeVoiceAttachment for why
  // Cloudinary's own value wins when available).
  clientDurationSec: z.number().min(0).max(120).optional(),
  // CSV of normalized (0-1) bar heights captured live during recording.
  waveform: z.string().max(500).optional(),
});

export type StartConversationInput        = z.infer<typeof startConversationSchema>;
export type StartCreatorConversationInput = z.infer<typeof startCreatorConversationSchema>;
export type SendMessageInput              = z.infer<typeof sendMessageSchema>;
export type EditMessageInput              = z.infer<typeof editMessageSchema>;
export type MessagesQuery                 = z.infer<typeof messagesQuerySchema>;
export type VideoCompleteInput            = z.infer<typeof videoCompleteSchema>;
export type VoiceCompleteInput            = z.infer<typeof voiceCompleteSchema>;
