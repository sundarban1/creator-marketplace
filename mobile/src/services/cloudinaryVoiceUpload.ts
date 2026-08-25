import { request } from '@/lib/api';
import Upload from 'react-native-background-upload';

// ── Signature / upload plan ─────────────────────────────────────────────────
// Discriminated union matching the backend's VoiceUploadPlan
// (backend/src/utils/r2Media.ts) — 'r2' when Cloudflare R2 is configured
// server-side, transparently falling back to 'cloudinary' otherwise. Voice
// clips are always small (capped at 15MB/2min) so the R2 branch is always a
// single presigned PUT, never multipart.
export type VoiceUploadPlan =
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
    };

export async function requestVoiceUploadSignature(conversationId: string): Promise<VoiceUploadPlan> {
  const res = await request<VoiceUploadPlan>(
    'POST', `/api/messaging/conversations/${conversationId}/attachments/voice/signature`,
  );
  return res.data;
}

export type VoiceUploadResult = { publicId: string } | { key: string };

// Single-shot direct upload — voice clips are capped at 15MB/2min, nowhere
// near the size that justifies video's chunked/background-survival upload
// manager, so a single request straight to the storage provider is enough.
export function uploadVoice(
  fileUri: string,
  plan: VoiceUploadPlan,
  onProgress?: (fraction: number) => void,
): Promise<VoiceUploadResult> {
  return plan.provider === 'r2' ? uploadVoiceToR2(fileUri, plan) : uploadVoiceToCloudinary(fileUri, plan, onProgress);
}

// Raw (non-multipart-form) PUT straight to the R2 presigned URL, via
// react-native-background-upload's 'raw' mode — same upload primitive the
// R2 video path uses (backgroundVideoUploadManager.ts), so progress/error/
// completion all follow the one proven pattern already in this codebase
// rather than gambling on React Native's XHR raw-body-from-file-uri support.
function uploadVoiceToR2(
  fileUri: string,
  plan: Extract<VoiceUploadPlan, { provider: 'r2' }>,
  onProgress?: (fraction: number) => void,
): Promise<{ key: string }> {
  const nativeUploadId = `voice_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  return new Promise<{ key: string }>((resolve, reject) => {
    const subs = [
      Upload.addListener('progress', nativeUploadId, (data) => onProgress?.(data.progress / 100)),
      Upload.addListener('error', nativeUploadId, (data) => {
        cleanup();
        reject(new Error(data.error || 'Voice upload failed'));
      }),
      Upload.addListener('cancelled', nativeUploadId, () => {
        cleanup();
        reject(new Error('Voice upload cancelled'));
      }),
      Upload.addListener('completed', nativeUploadId, (data) => {
        cleanup();
        if (data.responseCode >= 200 && data.responseCode < 300) resolve({ key: plan.key });
        else reject(new Error(`Voice upload failed (HTTP ${data.responseCode})`));
      }),
    ];
    function cleanup() { subs.forEach((s) => s.remove()); }

    Upload.startUpload({
      url:            plan.uploadUrl,
      path:           fileUri,
      method:         'PUT',
      type:           'raw',
      customUploadId: nativeUploadId,
      headers:        { 'Content-Type': 'audio/m4a' },
    }).catch((err) => { cleanup(); reject(err); });
  });
}

// Cloudinary's own public_id (returned in the upload response) is what must
// be sent to /complete — it's folder-prefixed ("messages/attachments/voice_…"),
// unlike signature.publicId which is the bare id computed before the folder
// was applied. Same distinction backgroundVideoUploadManager's completeUpload
// relies on for video. XHR (not fetch) is what lets onProgress report real
// upload percentage.
function uploadVoiceToCloudinary(
  fileUri: string,
  signature: Extract<VoiceUploadPlan, { provider: 'cloudinary' }>,
  onProgress?: (fraction: number) => void,
): Promise<{ publicId: string }> {
  const form = new FormData();
  form.append('file', { uri: fileUri, name: 'voice.m4a', type: 'audio/m4a' } as unknown as Blob);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('signature', signature.signature);
  form.append('folder', signature.folder);
  form.append('public_id', signature.publicId);

  return new Promise<{ publicId: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', signature.uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let parsed: { public_id?: string } = {};
        try { parsed = JSON.parse(xhr.responseText); } catch { /* fall through to error below */ }
        if (parsed.public_id) resolve({ publicId: parsed.public_id });
        else reject(new Error('Voice upload failed: no public_id in Cloudinary response'));
      } else {
        reject(new Error(`Voice upload failed (HTTP ${xhr.status}): ${xhr.responseText.slice(0, 300)}`));
      }
    };
    xhr.onerror = () => reject(new Error('Voice upload failed: network error'));
    xhr.send(form);
  });
}
