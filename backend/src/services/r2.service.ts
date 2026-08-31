import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  ListPartsCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  PutBucketLifecycleConfigurationCommand,
  GetBucketLifecycleConfigurationCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { logger } from '../config/logger';

// Cloudflare R2 is S3-compatible — same SDK, different endpoint/region.
// region 'auto' is R2's documented value (it isn't a real AWS region).
const client = env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    })
  : null;

const PRESIGN_EXPIRY_SEC = Number(env.R2_PRESIGNED_URL_EXPIRY) || 900;

// Callers (r2Media.ts) check this before attempting any R2 operation and fall
// back to Cloudinary when false — R2_BUCKET_NAME is checked separately since
// every call needs a bucket, not just a client.
export function isConfigured(): boolean {
  return client !== null && !!env.R2_BUCKET_NAME;
}

export function presignExpirySeconds(): number {
  return PRESIGN_EXPIRY_SEC;
}

function bucket(): string {
  if (!env.R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME is not configured');
  return env.R2_BUCKET_NAME;
}

function requireClient(): S3Client {
  if (!client) throw new Error('R2 is not configured (missing R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY)');
  return client;
}

export async function presignPutUrl(key: string, contentType: string, expiresIn = PRESIGN_EXPIRY_SEC): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType });
  return getSignedUrl(requireClient(), cmd, { expiresIn });
}

// Server-side upload of a buffer we generated ourselves (not a client
// direct-to-R2 presigned PUT) — used by the open-event invitation renderer,
// which produces the PNG on this server and needs to persist it immediately.
export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await requireClient().send(new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

export async function initiateMultipart(key: string, contentType: string): Promise<string> {
  const res = await requireClient().send(new CreateMultipartUploadCommand({ Bucket: bucket(), Key: key, ContentType: contentType }));
  if (!res.UploadId) throw new Error('R2 did not return an UploadId');
  return res.UploadId;
}

export async function presignUploadPart(key: string, uploadId: string, partNumber: number, expiresIn = PRESIGN_EXPIRY_SEC): Promise<string> {
  const cmd = new UploadPartCommand({ Bucket: bucket(), Key: key, UploadId: uploadId, PartNumber: partNumber });
  return getSignedUrl(requireClient(), cmd, { expiresIn });
}

export type UploadedPart = { partNumber: number; etag: string };

// Authoritative part/ETag list, fetched with our own credentials — lets the
// mobile client finish a multipart upload knowing only { key, uploadId },
// with no need to capture response headers from each part's PUT (see
// r2Media.ts header comment for why that matters).
export async function listParts(key: string, uploadId: string): Promise<UploadedPart[]> {
  const res = await requireClient().send(new ListPartsCommand({ Bucket: bucket(), Key: key, UploadId: uploadId }));
  return (res.Parts ?? [])
    .filter((p) => p.PartNumber != null && p.ETag)
    .map((p) => ({ partNumber: p.PartNumber!, etag: p.ETag! }));
}

export async function completeMultipart(key: string, uploadId: string, parts: UploadedPart[]): Promise<void> {
  await requireClient().send(new CompleteMultipartUploadCommand({
    Bucket: bucket(),
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })) },
  }));
}

export async function abortMultipart(key: string, uploadId: string): Promise<void> {
  await requireClient().send(new AbortMultipartUploadCommand({ Bucket: bucket(), Key: key, UploadId: uploadId }))
    .catch((err) => logger.error({ err, key, uploadId }, 'R2 abortMultipart failed'));
}

export type HeadResult = { sizeBytes: number; contentType?: string } | null;

export async function headObject(key: string): Promise<HeadResult> {
  try {
    const res = await requireClient().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { sizeBytes: res.ContentLength ?? 0, contentType: res.ContentType };
  } catch (err) {
    logger.error({ err, key }, 'R2 headObject failed — object may not exist yet');
    return null;
  }
}

export async function deleteObject(key: string): Promise<void> {
  await requireClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }))
    .catch((err) => logger.error({ err, key }, 'R2 deleteObject failed'));
}

export function publicUrlFor(key: string): string | null {
  if (!env.R2_PUBLIC_URL) return null;
  return `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
}

// Orphan protection for the multipart flow: a client that initiates a
// multipart upload (CreateMultipartUpload) but never finishes — app killed,
// upload abandoned, network gone for good — leaves storage billed to an
// upload that will never complete, with no DB row referencing it. R2, like
// S3, can auto-abort these on its own via a bucket lifecycle rule, so this
// doesn't need an app-side cleanup cron. `AbortIncompleteMultipartUpload`
// only ever touches *incomplete* multipart state — it can't affect any
// finished object — so applying it bucket-wide (no prefix filter) is safe
// regardless of what else this bucket ever stores.
// One-time setup, not called from the request path — see scripts/setupR2Lifecycle.ts.
export async function putAbortIncompleteMultipartLifecycleRule(daysAfterInitiation: number): Promise<void> {
  await requireClient().send(new PutBucketLifecycleConfigurationCommand({
    Bucket: bucket(),
    LifecycleConfiguration: {
      Rules: [{
        ID:     'abort-incomplete-multipart-uploads',
        Status: 'Enabled',
        Filter: { Prefix: '' }, // bucket-wide
        AbortIncompleteMultipartUpload: { DaysAfterInitiation: daysAfterInitiation },
      }],
    },
  }));
}

export async function getLifecycleRules(): Promise<unknown> {
  try {
    const res = await requireClient().send(new GetBucketLifecycleConfigurationCommand({ Bucket: bucket() }));
    return res.Rules ?? [];
  } catch (err) {
    logger.error({ err }, 'R2 getLifecycleRules failed');
    return null;
  }
}
