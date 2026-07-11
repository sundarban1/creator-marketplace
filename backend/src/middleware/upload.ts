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
