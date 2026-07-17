import multer from 'multer';
import { randomUUID } from 'crypto';
import os from 'os';
import path from 'path';
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

const CHAT_VIDEO_ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-m4v'];
const CHAT_VIDEO_MAX_BYTES = 200 * 1024 * 1024; // 200 MB — server-side hard ceiling (spec)

// Disk-backed, unlike every other upload above — buffering up to 200MB per
// request in memory the way images/files do is a real OOM risk under concurrent
// uploads. Cloudinary's upload_large() chunks directly from a file path, so
// writing to tmpdir here pairs naturally with it and keeps RAM flat regardless
// of file size. The controller is responsible for deleting the temp file
// (success or failure) once the upload attempt is done.
export const uploadChatVideo = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (req, file, cb) =>
      cb(null, `video_${req.params.id}_${Date.now()}_${randomUUID()}${path.extname(file.originalname) || '.mp4'}`),
  }),
  limits: { fileSize: CHAT_VIDEO_MAX_BYTES },
  fileFilter(_req, file, cb) {
    if (CHAT_VIDEO_ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only MP4, MOV, and M4V videos are allowed', 400) as unknown as null, false);
    }
  },
});
