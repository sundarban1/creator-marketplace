import type { MessageType } from '@prisma/client';
import { deleteImage, deleteRawFile, deleteVideo } from './cloudinary';
import { deleteR2Object } from './r2Media';
import { logger } from '../config/logger';

// Our own generated public_ids always look like "messages/attachments/{image|file|voice|video}_{...}"
// (see sendAttachment/requestVoiceUploadSignature/requestVideoUploadSignature) —
// matching that substring is more robust than trying to parse Cloudinary's
// delivery URL shape (folder/version/transformation segments all vary).
const CLOUDINARY_PUBLIC_ID_RE = /messages\/attachments\/(?:image|file|voice|video)_[^./]+/;
// Our own R2 keys always look like "users/{ownerId}/{videos|audio|thumbnails}/{uuid}.{ext}"
// (see r2Media.buildKey) — matching this is domain-independent, so it still
// works even if R2_PUBLIC_URL is ever repointed to a different bucket domain.
const R2_KEY_RE = /users\/[^/]+\/(?:videos|audio|thumbnails)\/[^/?]+/;

function deleteFromWhicheverProvider(url: string | null | undefined, cloudinaryResourceType: 'image' | 'raw' | 'video'): void {
  if (!url) return;

  const r2Match = url.match(R2_KEY_RE);
  if (r2Match) {
    void deleteR2Object(r2Match[0]);
    return;
  }

  const cloudinaryMatch = url.match(CLOUDINARY_PUBLIC_ID_RE);
  if (!cloudinaryMatch) {
    logger.warn({ url }, 'Attachment cleanup: could not determine storage provider/key — leaving object in place');
    return;
  }
  const publicId = cloudinaryMatch[0];
  if (cloudinaryResourceType === 'image') void deleteImage(publicId);
  else if (cloudinaryResourceType === 'raw') void deleteRawFile(publicId);
  else void deleteVideo(publicId);
}

// Best-effort, fire-and-forget — called right after a message is tombstoned
// ("delete for everyone") to also purge the underlying media from whichever
// storage provider it actually landed in (R2 or Cloudinary), so deleting a
// message doesn't leave the file (and its storage cost/exposure) behind
// forever. Never throws — a storage cleanup failure must not block the
// delete-for-everyone the user already saw succeed; individual provider
// delete calls already swallow and log their own errors.
export function deleteAttachmentStorage(message: {
  type: MessageType;
  attachmentUrl: string | null;
  attachmentThumbnailUrl: string | null;
}): void {
  switch (message.type) {
    case 'IMAGE':
      deleteFromWhicheverProvider(message.attachmentUrl, 'image');
      break;
    case 'FILE':
      deleteFromWhicheverProvider(message.attachmentUrl, 'raw');
      break;
    case 'VOICE':
      // Cloudinary stores voice clips under resource_type 'video' (no dedicated audio type).
      deleteFromWhicheverProvider(message.attachmentUrl, 'video');
      break;
    case 'VIDEO':
      deleteFromWhicheverProvider(message.attachmentUrl, 'video');
      // R2's poster frame is matched by R2_KEY_RE regardless of the resource
      // type passed here; Cloudinary's is a plain derived image transform.
      deleteFromWhicheverProvider(message.attachmentThumbnailUrl, 'image');
      break;
    default:
      break;
  }
}
