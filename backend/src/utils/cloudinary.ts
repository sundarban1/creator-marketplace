import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type UploadFolder = 'creators/avatars' | 'businesses/logos' | 'creators/citizenship' | 'businesses/pan' | 'businesses/company-reg' | 'campaigns/features' | 'messages/attachments';

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
