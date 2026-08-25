import { randomUUID } from 'crypto';
import * as r2 from '../services/r2.service';
import { generateVideoUploadSignature, type VideoUploadSignature, type UploadFolder } from './cloudinary';
import { logger } from '../config/logger';

export { deleteObject as deleteR2Object, abortMultipart as abortR2Multipart } from '../services/r2.service';

// Below this, a single presigned PUT is issued (mirrors the existing
// single-shot voice flow). At/above it, an R2 multipart upload is initiated
// with one presigned part URL per part, pre-generated in the same response —
// the client already knows the file's total size before starting, so no
// separate "next part" round trip is needed.
export const MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024;
const MULTIPART_PART_SIZE_BYTES = 20 * 1024 * 1024; // matches the chunk size the mobile client already uses for Cloudinary

export type R2Category = 'videos' | 'audio' | 'thumbnails';

export function buildKey(category: R2Category, ownerId: string, ext: string): string {
  return `users/${ownerId}/${category}/${randomUUID()}.${ext}`;
}

export type CloudinaryPlan = { provider: 'cloudinary' } & VideoUploadSignature;
// thumbnailKey/thumbnailUploadUrl are only present on the video plan (a
// single small presigned PUT for a jpeg poster frame the client extracts
// locally) — R2 has no server-side transcode/thumbnail API the way
// Cloudinary does, so this is the only way a chat video bubble gets a
// thumbnail when R2 is the active provider.
export type R2SinglePlan = {
  provider: 'r2'; mode: 'single'; key: string; uploadUrl: string; expiresIn: number;
  thumbnailKey?: string; thumbnailUploadUrl?: string;
};
export type R2MultipartPlan = {
  provider: 'r2';
  mode: 'multipart';
  key: string;
  uploadId: string;
  partSize: number;
  parts: { partNumber: number; url: string }[];
  expiresIn: number;
  thumbnailKey?: string; thumbnailUploadUrl?: string;
};
export type VideoUploadPlan = CloudinaryPlan | R2SinglePlan | R2MultipartPlan;
export type VoiceUploadPlan = CloudinaryPlan | R2SinglePlan;

// What the Cloudinary path needs if R2 is unconfigured or errors — same two
// args generateVideoUploadSignature already takes today.
export type CloudinaryFallbackParams = { folder: UploadFolder; publicId: string };

async function cloudinaryFallback(fallback: CloudinaryFallbackParams): Promise<CloudinaryPlan> {
  return { provider: 'cloudinary', ...generateVideoUploadSignature(fallback.folder, fallback.publicId) };
}

async function r2VideoPlan(ownerId: string, ext: string, contentType: string, sizeBytes: number): Promise<R2SinglePlan | R2MultipartPlan> {
  const key = buildKey('videos', ownerId, ext);
  const expiresIn = r2.presignExpirySeconds();
  const thumbnailKey = buildKey('thumbnails', ownerId, 'jpg');
  const thumbnailUploadUrl = await r2.presignPutUrl(thumbnailKey, 'image/jpeg');

  if (sizeBytes < MULTIPART_THRESHOLD_BYTES) {
    const uploadUrl = await r2.presignPutUrl(key, contentType);
    return { provider: 'r2', mode: 'single', key, uploadUrl, expiresIn, thumbnailKey, thumbnailUploadUrl };
  }

  const uploadId = await r2.initiateMultipart(key, contentType);
  const partCount = Math.ceil(sizeBytes / MULTIPART_PART_SIZE_BYTES);
  const parts = await Promise.all(
    Array.from({ length: partCount }, (_, i) => i + 1).map(async (partNumber) => ({
      partNumber,
      url: await r2.presignUploadPart(key, uploadId, partNumber),
    })),
  );
  return { provider: 'r2', mode: 'multipart', key, uploadId, partSize: MULTIPART_PART_SIZE_BYTES, parts, expiresIn, thumbnailKey, thumbnailUploadUrl };
}

// R2-primary, Cloudinary-fallback plan for a video upload. `ownerId` scopes
// the object key (users/{ownerId}/videos/{uuid}.{ext}); `fallback` carries
// what's needed to fall back to today's Cloudinary signed-upload path if R2
// is unconfigured or a call to it throws.
export async function createVideoUploadPlan(
  ownerId: string,
  ext: string,
  contentType: string,
  sizeBytes: number,
  fallback: CloudinaryFallbackParams,
): Promise<VideoUploadPlan> {
  if (r2.isConfigured()) {
    try {
      return await r2VideoPlan(ownerId, ext, contentType, sizeBytes);
    } catch (err) {
      logger.error({ err, ownerId }, 'R2 video upload-plan failed — falling back to Cloudinary');
    }
  }
  return cloudinaryFallback(fallback);
}

// Voice clips are always small (capped well under the multipart threshold),
// so this is always a single presigned PUT — no multipart branch needed.
export async function createVoiceUploadPlan(
  ownerId: string,
  ext: string,
  contentType: string,
  fallback: CloudinaryFallbackParams,
): Promise<VoiceUploadPlan> {
  if (r2.isConfigured()) {
    try {
      const key = buildKey('audio', ownerId, ext);
      const uploadUrl = await r2.presignPutUrl(key, contentType);
      return { provider: 'r2', mode: 'single', key, uploadUrl, expiresIn: r2.presignExpirySeconds() };
    } catch (err) {
      logger.error({ err, ownerId }, 'R2 voice upload-plan failed — falling back to Cloudinary');
    }
  }
  return cloudinaryFallback(fallback);
}

export type R2FinalizeResult = { sizeBytes: number; contentType?: string; url: string | null };

// Called after the client's direct PUT to R2 succeeds — HeadObject is the
// only thing R2 can independently confirm (object exists, real byte size,
// content-type); unlike Cloudinary there's no Admin API to re-derive
// duration/format, so callers must treat those as client-reported. `url` is
// null when R2_PUBLIC_URL isn't set yet — callers should surface that clearly
// rather than silently store an unusable value.
export async function finalizeR2Object(key: string): Promise<R2FinalizeResult> {
  const head = await r2.headObject(key);
  if (!head) throw new Error('R2 object not found — upload may not have completed');
  const url = r2.publicUrlFor(key);
  if (!url) logger.warn({ key }, 'R2_PUBLIC_URL is not set — this object has no resolvable URL yet');
  return { sizeBytes: head.sizeBytes, contentType: head.contentType, url };
}

// Finishes a multipart upload: fetches the authoritative part/ETag list with
// our own credentials (the mobile client never reports ETags — see
// r2.service.ts's listParts comment for why), completes the upload, then
// finalizes exactly like the single-PUT path.
export async function completeR2Multipart(key: string, uploadId: string): Promise<R2FinalizeResult> {
  const parts = await r2.listParts(key, uploadId);
  if (parts.length === 0) throw new Error('No parts found for this multipart upload — nothing was uploaded');
  await r2.completeMultipart(key, uploadId, parts);
  return finalizeR2Object(key);
}
