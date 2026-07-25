import { request } from '@/lib/api';
import type { ApiMessage } from '@/lib/api';

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

// ── Direct-to-Cloudinary upload ─────────────────────────────────────────────

export type CloudinaryVideoResult = { publicId: string; secureUrl: string };

// Same XHR-with-progress pattern the old backend-proxied upload used
// (xhr.upload.onprogress for real progress reporting), just pointed straight
// at Cloudinary's own signed upload endpoint instead of our server — the
// video bytes never touch our backend.
export function uploadVideoToCloudinary(
  fileUri: string,
  mimeType: string,
  signature: VideoUploadSignature,
  onProgress: (fraction: number) => void,
): { start: () => Promise<CloudinaryVideoResult>; cancel: () => void } {
  let xhr: XMLHttpRequest | null = null;

  return {
    start: () => new Promise<CloudinaryVideoResult>((resolve, reject) => {
      xhr = new XMLHttpRequest();
      xhr.open('POST', signature.uploadUrl);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
      };

      xhr.onload = () => {
        let parsed: { public_id?: string; secure_url?: string; error?: { message?: string } } = {};
        try { parsed = JSON.parse(xhr!.responseText); } catch { /* falls through to generic error below */ }
        if (xhr!.status >= 200 && xhr!.status < 300 && parsed.public_id && parsed.secure_url) {
          resolve({ publicId: parsed.public_id, secureUrl: parsed.secure_url });
        } else {
          const reason = parsed.error?.message ?? xhr!.statusText ?? 'Video upload failed';
          reject(new Error(`${reason} (HTTP ${xhr!.status})`));
        }
      };
      xhr.onerror   = () => reject(new Error('Video upload failed — network request failed'));
      xhr.onabort   = () => reject(new Error('Video upload cancelled'));
      xhr.ontimeout = () => reject(new Error('Video upload timed out'));

      const form = new FormData();
      form.append('file', { uri: fileUri, name: `video_${Date.now()}.mp4`, type: mimeType } as unknown as Blob);
      form.append('api_key',    signature.apiKey);
      form.append('timestamp',  String(signature.timestamp));
      form.append('signature',  signature.signature);
      form.append('folder',     signature.folder);
      form.append('public_id',  signature.publicId);
      xhr.send(form);
    }),
    cancel: () => { xhr?.abort(); },
  };
}

// ── Metadata save ────────────────────────────────────────────────────────────
// Returns the raw ApiMessage — chat.ts owns the toMessage() transform, so it
// calls this and converts the result itself rather than this file depending
// on chat.ts's transformer (which would create an import cycle).
export async function completeVideoUpload(conversationId: string, publicId: string, caption?: string): Promise<ApiMessage> {
  const res = await request<ApiMessage>(
    'POST', `/api/messaging/conversations/${conversationId}/attachments/video/complete`,
    { publicId, caption: caption?.trim() || undefined },
  );
  return res.data;
}
