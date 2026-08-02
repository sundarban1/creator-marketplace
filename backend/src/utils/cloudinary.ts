import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type UploadFolder = 'creators/avatars' | 'creators/covers' | 'businesses/logos' | 'businesses/covers' | 'creators/citizenship' | 'creators/pan' | 'businesses/pan' | 'businesses/company-reg' | 'campaigns/features' | 'messages/attachments' | 'campaigns/deliverables' | 'success-stories/photos' | 'contracts/pdfs';

const DEFAULT_TRANSFORMATION = [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }];

export async function uploadImage(
  buffer: Buffer,
  folder: UploadFolder,
  publicId: string,
  transformation: Record<string, unknown>[] = DEFAULT_TRANSFORMATION,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id:      publicId,
        overwrite:      true,
        resource_type:  'image',
        transformation,
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

// For non-image chat attachments (PDF, docs, zip, etc.) — no image transformation applies.
export async function uploadRawFile(
  buffer: Buffer,
  folder: UploadFolder,
  publicId: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id:     publicId,
        overwrite:     true,
        resource_type: 'raw',
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('Cloudinary upload failed'));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

export async function deleteImage(publicIdWithFolder: string): Promise<void> {
  await cloudinary.uploader.destroy(publicIdWithFolder).catch(() => {});
}

// deleteImage's bare destroy() defaults to resource_type: 'image' and silently
// no-ops on a raw asset (PDF/DOCX) — this is the counterpart for those.
export async function deleteRawFile(publicIdWithFolder: string): Promise<void> {
  await cloudinary.uploader.destroy(publicIdWithFolder, { resource_type: 'raw' }).catch(() => {});
}

// Enforced server-side in completeDeliverableVideo/completeVideoAttachment using
// Cloudinary's own reported `bytes` — the client-side check in chatAttachments.ts
// is the same limit, but that alone is trivially bypassable, so the server is the
// actual source of truth here (same principle as the format/duration re-checks).
export const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;

export type VideoUploadResult = {
  secureUrl:   string;
  durationSec: number;
  width:       number;
  height:      number;
  bytes:       number;
  format:      string;
};

export type VideoUploadSignature = {
  cloudName: string;
  apiKey:    string;
  timestamp: number;
  signature: string;
  folder:    string;
  publicId:  string;
  uploadUrl: string;
};

// Signed direct-to-Cloudinary upload: the mobile client uploads the video
// bytes straight to Cloudinary using these credentials — they never pass
// through this server. The signature cryptographically pins timestamp/folder/
// public_id (Cloudinary recomputes the signature server-side from whatever
// the client actually sends and rejects a mismatch), so the client cannot
// redirect the upload to a different folder/public_id even though those
// values also travel as plain form fields alongside it.
export function generateVideoUploadSignature(folder: UploadFolder, publicId: string): VideoUploadSignature {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { timestamp, folder, public_id: publicId };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET!);
  return {
    cloudName,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    timestamp,
    signature,
    folder,
    publicId,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
  };
}

// Cloudinary derives a jpg poster frame from the video's own public_id — no
// separate upload or transformation job needed. so_0 = frame at 0s,
// c_fill+w/h = fixed thumbnail size, q_auto = automatic quality.
export function videoThumbnailUrl(secureVideoUrl: string): string {
  return secureVideoUrl
    .replace('/upload/', '/upload/so_0,w_480,h_480,c_fill,q_auto/')
    .replace(/\.[a-zA-Z0-9]+$/, '.jpg');
}

// Swapping the delivery extension to .mp4 makes Cloudinary transcode to
// H.264/AAC MP4 on the fly (cached after the first request) regardless of
// the source format — MOV uploads still end up as universally-playable MP4,
// matching what every client platform (iOS/Android/web) can decode natively.
export function videoPlaybackUrl(secureVideoUrl: string): string {
  return secureVideoUrl
    .replace('/upload/', '/upload/q_auto/')
    .replace(/\.[a-zA-Z0-9]+$/, '.mp4');
}

export async function deleteVideo(publicIdWithFolder: string): Promise<void> {
  await cloudinary.uploader.destroy(publicIdWithFolder, { resource_type: 'video' }).catch(() => {});
}
