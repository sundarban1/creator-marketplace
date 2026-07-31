import { request } from '@/lib/api';

// ── Signature ────────────────────────────────────────────────────────────────

export type VideoUploadSignature = {
  cloudName: string;
  apiKey:    string;
  timestamp: number;
  signature: string;
  folder:    string;
  publicId:  string;
  uploadUrl: string;
};

export async function requestVideoUploadSignature(conversationId: string): Promise<VideoUploadSignature> {
  const res = await request<VideoUploadSignature>(
    'POST', `/api/messaging/conversations/${conversationId}/attachments/video/signature`,
  );
  return res.data;
}

// The actual upload transport (chunked, via react-native-background-upload)
// AND the "complete" call both live in backgroundVideoUploadManager.ts, not
// here — see that file's header comment for why chunking is mandatory above
// ~100MB regardless of transport, and why the upload's full lifecycle (chunk
// sequencing + calling this same complete endpoint) has to live in one place
// that can finish an upload on its own even if the screen that started it is
// gone (background/killed-app survival) — this file only issues the signature.
