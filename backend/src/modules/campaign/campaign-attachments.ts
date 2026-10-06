import { randomUUID } from 'crypto';
import { uploadImage, uploadRawFile } from '../../utils/cloudinary';
import * as r2 from '../../services/r2.service';
import { logger } from '../../config/logger';

// Reference images / PDF briefs a business attaches while creating an event
// (stored on Campaign.brief.attachments). Uploaded before the campaign exists,
// so the result is just a URL the client keeps in its form until publish.
//
// Storage: Cloudinary first; if Cloudinary fails and R2 is configured (with a
// public URL), the same bytes go to R2 instead. Removing an attachment in the
// form only drops it from the list — the stored object is left in place, since
// an already-published campaign may still reference it.

export type CampaignAttachment = {
  url: string;
  name: string;
  kind: 'IMAGE' | 'PDF';
  mimeType: string;
  sizeBytes: number;
};

// Non-destructive size cap — these are reference photos, not crops.
const ATTACHMENT_IMAGE_TRANSFORMATION = [{ width: 2000, crop: 'limit' }];

function extFor(mimeType: string): string {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

async function toCloudinary(file: Express.Multer.File, isPdf: boolean, baseId: string): Promise<string> {
  // Raw resources keep the extension in their public_id — without ".pdf"
  // Cloudinary serves the file as octet-stream and browsers download it
  // instead of rendering it in the preview modal.
  return isPdf
    ? uploadRawFile(file.buffer, 'campaigns/attachments', `${baseId}.pdf`)
    : uploadImage(file.buffer, 'campaigns/attachments', baseId, ATTACHMENT_IMAGE_TRANSFORMATION);
}

async function toR2(file: Express.Multer.File, userId: string): Promise<string | null> {
  if (!r2.isConfigured()) return null;
  const key = `campaign-attachments/${userId}/${randomUUID()}.${extFor(file.mimetype)}`;
  await r2.putObject(key, file.buffer, file.mimetype);
  return r2.publicUrlFor(key);
}

export async function storeCampaignAttachment(userId: string, file: Express.Multer.File): Promise<CampaignAttachment> {
  const isPdf = file.mimetype === 'application/pdf';
  const baseId = `attachment_${userId}_${Date.now()}_${randomUUID()}`;

  let url: string | null = null;
  try {
    url = await toCloudinary(file, isPdf, baseId);
  } catch (err) {
    logger.warn({ err, userId }, 'Campaign attachment: Cloudinary upload failed, trying R2');
    url = await toR2(file, userId).catch((r2Err) => {
      logger.error({ err: r2Err, userId }, 'Campaign attachment: R2 fallback upload failed');
      return null;
    });
    if (!url) throw err;
  }

  return {
    url,
    name: (file.originalname || (isPdf ? 'document.pdf' : 'image')).slice(0, 120),
    kind: isPdf ? 'PDF' : 'IMAGE',
    mimeType: file.mimetype,
    sizeBytes: file.size,
  };
}
