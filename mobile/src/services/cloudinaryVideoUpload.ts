import { request } from '@/lib/api';

// ── Upload plan ──────────────────────────────────────────────────────────────
// Discriminated union matching the backend's VideoUploadPlan
// (backend/src/utils/r2Media.ts) — 'r2' when Cloudflare R2 is configured
// server-side, transparently falling back to 'cloudinary' otherwise. R2 is
// 'single' (one whole-file presigned PUT) below the multipart threshold, or
// 'multipart' (one presigned URL per part, pre-generated up front since the
// backend already knows the file's total size) at/above it.
export type VideoUploadPlan =
  | {
      provider:  'cloudinary';
      cloudName: string;
      apiKey:    string;
      timestamp: number;
      signature: string;
      folder:    string;
      publicId:  string;
      uploadUrl: string;
    }
  | {
      provider:  'r2';
      mode:      'single';
      key:       string;
      uploadUrl: string;
      expiresIn: number;
      thumbnailKey?:       string;
      thumbnailUploadUrl?: string;
    }
  | {
      provider:  'r2';
      mode:      'multipart';
      key:       string;
      uploadId:  string;
      partSize:  number;
      parts:     { partNumber: number; url: string }[];
      expiresIn: number;
      thumbnailKey?:       string;
      thumbnailUploadUrl?: string;
    };

export async function requestVideoUploadSignature(conversationId: string, sizeBytes: number, mimeType: string): Promise<VideoUploadPlan> {
  const res = await request<VideoUploadPlan>(
    'POST', `/api/messaging/conversations/${conversationId}/attachments/video/signature`,
    { sizeBytes, mimeType },
  );
  return res.data;
}

// The actual upload transport (chunked/multipart, via react-native-background-upload)
// AND the "complete" call both live in backgroundVideoUploadManager.ts, not
// here — see that file's header comment for why chunking is mandatory above
// ~100MB regardless of transport, and why the upload's full lifecycle (chunk
// sequencing + calling this same complete endpoint) has to live in one place
// that can finish an upload on its own even if the screen that started it is
// gone (background/killed-app survival) — this file only issues the signature.
