import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type UploadFolder = 'creators/avatars' | 'businesses/logos' | 'creators/citizenship' | 'creators/pan' | 'businesses/pan' | 'businesses/company-reg' | 'campaigns/features' | 'messages/attachments';

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

export type VideoUploadResult = {
  secureUrl:   string;
  durationSec: number;
  width:       number;
  height:      number;
  bytes:       number;
  format:      string;
};

// Chunked upload from a file path (not a buffer) — pairs with uploadChatVideo's
// disk storage in middleware/upload.ts. Cloudinary probes the actual uploaded
// file itself (duration/width/height/bytes/format) rather than trusting
// whatever the client claimed, since that's the only source the server should
// persist as fact.
export async function uploadVideo(
  filePath: string,
  folder: UploadFolder,
  publicId: string,
): Promise<VideoUploadResult> {
  // upload_large's type signature returns `Promise<UploadApiResponse> | UploadStream`
  // because the same overload also covers the callback-based streaming form — since no
  // callback is passed here, it always resolves to the promise form at runtime.
  const result = await (cloudinary.uploader.upload_large(filePath, {
    folder,
    public_id:     publicId,
    overwrite:     true,
    resource_type: 'video',
    chunk_size:    6 * 1024 * 1024,
  }) as Promise<UploadApiResponse>);
  return {
    secureUrl:   result.secure_url,
    durationSec: Math.round(result.duration ?? 0),
    width:       result.width,
    height:      result.height,
    bytes:       result.bytes,
    format:      result.format,
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

export async function deleteVideo(publicIdWithFolder: string): Promise<void> {
  await cloudinary.uploader.destroy(publicIdWithFolder, { resource_type: 'video' }).catch(() => {});
}
