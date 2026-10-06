import multer from 'multer';
import { AppError } from './error';

import { HttpStatus } from '../constants/httpStatus';

// Static (not Google-Translate-API) messages for these fileFilter rejections —
// they're a small fixed set of UI strings, not user-generated content, so they
// don't belong in utils/translation.ts's live-translate pipeline. Keyed by
// req.language (set by middleware/language.ts from the X-Language header).
const UPLOAD_ERROR_MESSAGES = {
  imageType: {
    en: 'Only JPEG, PNG, and WebP images are allowed',
    ne: 'JPEG, PNG, र WebP फोटोहरू मात्र स्वीकृत छन्',
  },
  deliverableFileType: {
    en: 'Only JPG, PNG, PDF, and DOCX files are allowed',
    ne: 'JPG, PNG, PDF, र DOCX फाइलहरू मात्र स्वीकृत छन्',
  },
  campaignAttachmentType: {
    en: 'Only PNG, JPG, WebP images and PDF files are allowed',
    ne: 'PNG, JPG, WebP फोटो र PDF फाइलहरू मात्र स्वीकृत छन्',
  },
  campaignAttachmentImageSize: {
    en: 'Images must be 5 MB or smaller',
    ne: 'फोटो ५ MB वा सोभन्दा सानो हुनुपर्छ',
  },
  campaignAttachmentPdfSize: {
    en: 'PDF files must be 10 MB or smaller',
    ne: 'PDF फाइल १० MB वा सोभन्दा सानो हुनुपर्छ',
  },
  chatFileType: {
    en: 'This file type is not supported',
    ne: 'यो फाइल प्रकार समर्थित छैन',
  },
  audioFormat: {
    en: 'Unsupported audio format',
    ne: 'असमर्थित अडियो ढाँचा',
  },
} as const satisfies Record<string, { en: string; ne: string }>;

function uploadErrorMessage(key: keyof typeof UPLOAD_ERROR_MESSAGES, lang: string): string {
  return lang === 'ne' ? UPLOAD_ERROR_MESSAGES[key].ne : UPLOAD_ERROR_MESSAGES[key].en;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_SIZE_BYTES },
  fileFilter(req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(uploadErrorMessage('imageType', req.language), HttpStatus.BAD_REQUEST) as unknown as null, false);
    }
  },
});

const CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const uploadChatImage = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: CHAT_IMAGE_MAX_BYTES },
  fileFilter(req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(uploadErrorMessage('imageType', req.language), HttpStatus.BAD_REQUEST) as unknown as null, false);
    }
  },
});

// Community event photos (admin → Community Events): cover, gallery, speaker
// headshots, partner logos. Event photos straight off a phone routinely exceed
// the 5 MB general cap, so this allows 10 MB per file; Cloudinary downsizes on
// upload (see community-event.controller.ts).
export const uploadEventImages = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: CHAT_IMAGE_MAX_BYTES, files: 20 },
  fileFilter(req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(uploadErrorMessage('imageType', req.language), HttpStatus.BAD_REQUEST) as unknown as null, false);
    }
  },
});

// Campaign deliverables (images + PDF/DOCX only — narrower than uploadChatFile's
// allowlist above, and a much smaller cap since these are proxied through this
// server rather than uploaded direct-to-Cloudinary like deliverable videos).
const DELIVERABLE_FILE_ALLOWED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const DELIVERABLE_FILE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export const uploadDeliverableFile = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: DELIVERABLE_FILE_MAX_BYTES },
  fileFilter(req, file, cb) {
    if (DELIVERABLE_FILE_ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(uploadErrorMessage('deliverableFileType', req.language), HttpStatus.BAD_REQUEST) as unknown as null, false);
    }
  },
});

// Reference images + PDF briefs a business attaches while creating an event
// (Campaign.brief.attachments). Stored via campaign-attachments.ts. multer's
// cap is the larger (PDF) limit; the tighter image limit is checked after.
export const CAMPAIGN_ATTACHMENT_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
export const CAMPAIGN_ATTACHMENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;  // 5 MB
export const CAMPAIGN_ATTACHMENT_PDF_MAX_BYTES   = 10 * 1024 * 1024; // 10 MB
const CAMPAIGN_ATTACHMENT_MAX_BYTES = CAMPAIGN_ATTACHMENT_PDF_MAX_BYTES;

export function assertCampaignAttachmentSize(file: Express.Multer.File, lang: string): void {
  const isPdf = file.mimetype === 'application/pdf';
  const max = isPdf ? CAMPAIGN_ATTACHMENT_PDF_MAX_BYTES : CAMPAIGN_ATTACHMENT_IMAGE_MAX_BYTES;
  if (file.size > max) {
    throw new AppError(uploadErrorMessage(isPdf ? 'campaignAttachmentPdfSize' : 'campaignAttachmentImageSize', lang), HttpStatus.BAD_REQUEST);
  }
}

export const uploadCampaignAttachment = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: CAMPAIGN_ATTACHMENT_MAX_BYTES },
  fileFilter(req, file, cb) {
    if (CAMPAIGN_ATTACHMENT_ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(uploadErrorMessage('campaignAttachmentType', req.language), HttpStatus.BAD_REQUEST) as unknown as null, false);
    }
  },
});

const CHAT_FILE_ALLOWED_TYPES = [
  ...ALLOWED_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
];
const CHAT_FILE_MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export const uploadChatFile = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: CHAT_FILE_MAX_BYTES },
  fileFilter(req, file, cb) {
    if (CHAT_FILE_ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(uploadErrorMessage('chatFileType', req.language), HttpStatus.BAD_REQUEST) as unknown as null, false);
    }
  },
});

// Voice input for the AI assistant — recorded via expo-audio's HIGH_QUALITY
// preset, which outputs .m4a on both iOS and Android.
const AUDIO_ALLOWED_TYPES = ['audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/3gpp'];
const AUDIO_MAX_BYTES = 10 * 1024 * 1024; // 10 MB — comfortably more than a few minutes of speech

export const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: AUDIO_MAX_BYTES },
  fileFilter(req, file, cb) {
    if (AUDIO_ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(uploadErrorMessage('audioFormat', req.language), HttpStatus.BAD_REQUEST) as unknown as null, false);
    }
  },
});

// Video attachments are no longer proxied through this server — the mobile
// client uploads directly to Cloudinary using a signed URL (see
// messaging.service.ts requestVideoUploadSignature/completeVideoAttachment),
// so there's no multer config for video here anymore.
