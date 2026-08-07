import { request } from '@/lib/api';

export type VoiceUploadSignature = {
  cloudName: string;
  apiKey:    string;
  timestamp: number;
  signature: string;
  folder:    string;
  publicId:  string;
  uploadUrl: string;
};

export async function requestVoiceUploadSignature(conversationId: string): Promise<VoiceUploadSignature> {
  const res = await request<VoiceUploadSignature>(
    'POST', `/api/messaging/conversations/${conversationId}/attachments/voice/signature`,
  );
  return res.data;
}

// Single-shot direct-to-Cloudinary upload — voice clips are capped at 15MB/2min,
// nowhere near the size that justifies video's chunked/background-survival
// upload manager, so a plain multipart POST straight to Cloudinary is enough.
// XHR (not fetch) is what lets onProgress report real upload percentage —
// same reasoning as campaign.ts's uploadDeliverableFile.
// Cloudinary's own public_id (returned in the upload response) is what must
// be sent to /complete — it's folder-prefixed ("messages/attachments/voice_…"),
// unlike signature.publicId which is the bare id computed before the folder
// was applied. Same distinction backgroundVideoUploadManager's completeUpload
// relies on for video.
export function uploadVoiceToCloudinary(
  fileUri: string,
  signature: VoiceUploadSignature,
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
