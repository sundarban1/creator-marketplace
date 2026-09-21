/**
 * Client-side allowlist/size cap for chat attachments — mirrors mobile's
 * pickDocumentAttachment() (mobile/src/utilities/chatAttachments.ts) and the
 * backend's uploadChatFile multer config (backend/src/middleware/upload.ts).
 * Kept in sync by hand across all three; the backend re-validates regardless.
 */
export const CHAT_FILE_ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
];

export const CHAT_FILE_ACCEPT = CHAT_FILE_ALLOWED_TYPES.join(',');

export const CHAT_FILE_MAX_BYTES = 20 * 1024 * 1024; // matches backend's uploadChatFile limit

export type ChatFileValidation = { ok: true } | { ok: false; reason: 'type' | 'size' };

export function validateChatFile(file: File): ChatFileValidation {
  if (!CHAT_FILE_ALLOWED_TYPES.includes(file.type)) return { ok: false, reason: 'type' };
  if (file.size > CHAT_FILE_MAX_BYTES) return { ok: false, reason: 'size' };
  return { ok: true };
}
