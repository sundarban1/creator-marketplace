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
export function uploadVoiceToCloudinary(
  fileUri: string,
  signature: VoiceUploadSignature,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const form = new FormData();
  form.append('file', { uri: fileUri, name: 'voice.m4a', type: 'audio/m4a' } as unknown as Blob);
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('signature', signature.signature);
  form.append('folder', signature.folder);
  form.append('public_id', signature.publicId);

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', signature.uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error('Voice upload failed'));
    };
    xhr.onerror = () => reject(new Error('Voice upload failed'));
    xhr.send(form);
  });
}
