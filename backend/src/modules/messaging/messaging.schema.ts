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

// Requesting an upload plan needs to know the file's size up front — below
// the multipart threshold a single presigned PUT is issued, at/above it an R2
// multipart upload is initiated with one presigned part URL per part in the
// same response (see r2Media.createVideoUploadPlan).
export const videoSignatureRequestSchema = z.object({
  sizeBytes: z.number().min(1).max(500 * 1024 * 1024),
  mimeType:  z.enum(['video/mp4', 'video/quicktime']).default('video/mp4'),
});

export const videoCompleteSchema = z.object({
  // Exactly one of these — publicId for the Cloudinary fallback path, key
  // (+ uploadId for a multipart upload) for R2 (see r2Media.ts /
  // completeVideoAttachment).
  publicId: z.string().min(1).optional(),
  key:      z.string().min(1).optional(),
  uploadId: z.string().min(1).optional(),
  // R2 only — key of the jpeg poster frame the client extracted locally and
  // uploaded alongside the video (see r2Media.createVideoUploadPlan's
  // thumbnailKey/thumbnailUploadUrl). Best-effort: omitted or unverifiable
  // means the message is simply sent without a thumbnail.
  thumbnailKey: z.string().min(1).optional(),
  caption:  z.string().max(500).optional(),
  // Client-measured duration (from the picker, before upload) — used only as
  // a fallback display/validation value for the narrow window where
  // Cloudinary hasn't finished indexing the asset yet and its own
  // resource.duration isn't available. Cloudinary's value wins whenever present.
  // For R2, there is no independent source at all — this is trusted directly.
  clientDurationSec: z.number().min(0).max(7200).optional(),
}).refine((d) => !!d.publicId || !!d.key, { message: 'publicId or key is required' });

export const voiceCompleteSchema = z.object({
  // Exactly one of these — publicId for the Cloudinary fallback path, key
  // for R2 (see r2Media.ts / completeVoiceAttachment).
  publicId: z.string().min(1).optional(),
  key:      z.string().min(1).optional(),
  // Recorder-measured duration (see completeVoiceAttachment for why
  // Cloudinary's own value wins when available).
  clientDurationSec: z.number().min(0).max(120).optional(),
  // CSV of normalized (0-1) bar heights captured live during recording.
  waveform: z.string().max(500).optional(),
}).refine((d) => !!d.publicId || !!d.key, { message: 'publicId or key is required' });

export type StartConversationInput        = z.infer<typeof startConversationSchema>;
export type StartCreatorConversationInput = z.infer<typeof startCreatorConversationSchema>;
export type SendMessageInput              = z.infer<typeof sendMessageSchema>;
export type EditMessageInput              = z.infer<typeof editMessageSchema>;
export type MessagesQuery                 = z.infer<typeof messagesQuerySchema>;
export type VideoSignatureRequestInput    = z.infer<typeof videoSignatureRequestSchema>;
export type VideoCompleteInput            = z.infer<typeof videoCompleteSchema>;
export type VoiceCompleteInput            = z.infer<typeof voiceCompleteSchema>;
