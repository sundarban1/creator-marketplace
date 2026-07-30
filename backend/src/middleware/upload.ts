import multer from 'multer';
import { AppError } from './error';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: MAX_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only JPEG, PNG, and WebP images are allowed', 400) as unknown as null, false);
    }
  },
});

const CHAT_IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const uploadChatImage = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: CHAT_IMAGE_MAX_BYTES },
  fileFilter(_req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only JPEG, PNG, and WebP images are allowed', 400) as unknown as null, false);
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
  fileFilter(_req, file, cb) {
    if (CHAT_FILE_ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('This file type is not supported', 400) as unknown as null, false);
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
  fileFilter(_req, file, cb) {
    if (AUDIO_ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Unsupported audio format', 400) as unknown as null, false);
    }
  },
});

// Video attachments are no longer proxied through this server — the mobile
// client uploads directly to Cloudinary using a signed URL (see
// messaging.service.ts requestVideoUploadSignature/completeVideoAttachment),
// so there's no multer config for video here anymore.
