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

// A voice clip is capped at 15MB/2min, so even on a poor connection the upload
// should make *some* forward progress within this window. If it doesn't — no
// progress, no completion, no error for this long — the upload is wedged (e.g.
// a release build where R8 stripped react-native-background-upload's service
// classes, so the native layer never emits any event) and would otherwise hang
// forever, leaving the chat message spinning at 0% with no way to retry.
// Tripping the watchdog cancels the native upload and rejects, so the message
// falls through to the normal "failed / tap to retry" path.
const VOICE_UPLOAD_STALL_TIMEOUT_MS = 45_000;

// Fires `onStall` only if `bump()` goes quiet for VOICE_UPLOAD_STALL_TIMEOUT_MS.
// A genuinely slow-but-alive upload keeps calling bump() on every progress tick
// and is never cut off; a dead one (no events at all) trips it once.
function makeStallWatchdog(onStall: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const bump = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onStall, VOICE_UPLOAD_STALL_TIMEOUT_MS);
  };
  const clear = () => { if (timer) clearTimeout(timer); timer = undefined; };
  return { bump, clear };
}

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
    const watchdog = makeStallWatchdog(() => {
      cleanup();
      Upload.cancelUpload(nativeUploadId).catch(() => {});
      reject(new Error('Voice upload stalled — no response from the upload service'));
    });
    const subs = [
      Upload.addListener('progress', nativeUploadId, (data) => { watchdog.bump(); onProgress?.(data.progress / 100); }),
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
    function cleanup() { watchdog.clear(); subs.forEach((s) => s.remove()); }

    watchdog.bump();
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
    const watchdog = makeStallWatchdog(() => {
      try { xhr.abort(); } catch { /* already done */ }
      reject(new Error('Voice upload stalled — no response from the upload service'));
    });
    xhr.open('POST', signature.uploadUrl);
    xhr.upload.onprogress = (e) => {
      watchdog.bump();
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      watchdog.clear();
      if (xhr.status >= 200 && xhr.status < 300) {
        let parsed: { public_id?: string } = {};
        try { parsed = JSON.parse(xhr.responseText); } catch { /* fall through to error below */ }
        if (parsed.public_id) resolve({ publicId: parsed.public_id });
        else reject(new Error('Voice upload failed: no public_id in Cloudinary response'));
      } else {
        reject(new Error(`Voice upload failed (HTTP ${xhr.status}): ${xhr.responseText.slice(0, 300)}`));
      }
    };
    xhr.onerror = () => { watchdog.clear(); reject(new Error('Voice upload failed: network error')); };
    watchdog.bump();
    xhr.send(form);
  });
}
