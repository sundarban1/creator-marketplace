import { requestVideoUpload, completeVideoUpload, type MySubmission, type VideoUploadPlan } from '../api/competitions';

/*
 * Browser-side direct video upload for competition entries, using the same
 * server-issued plans as mobile's deliverable/chat video uploads
 * (backend utils/r2Media.ts): R2 presigned PUT (single or multipart) when R2
 * is configured, otherwise a signed Cloudinary upload. The bytes never pass
 * through the Kolab API — it only issues the plan and verifies the result.
 *
 * Infra note: a browser PUT to R2 requires the bucket's CORS policy to allow
 * the web origin (PUT, Content-Type). See docs/COMPETITIONS.md.
 */

export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime'] as const;
const CLOUDINARY_CHUNK = 20 * 1024 * 1024;

export type UploadProgress = (fraction: number) => void;

export class UploadAbortedError extends Error {
  constructor() { super('Upload cancelled'); }
}

/** Reads duration + a poster frame from a local file. Both best-effort. */
export async function probeVideo(file: File): Promise<{ durationSec: number | null; poster: Blob | null }> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('metadata'));
      setTimeout(() => reject(new Error('timeout')), 8000);
    });
    const durationSec = Number.isFinite(video.duration) ? video.duration : null;
    let poster: Blob | null = null;
    try {
      video.currentTime = Math.min(1, (durationSec ?? 1) / 2);
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        setTimeout(() => reject(new Error('seek')), 5000);
      });
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 640 / (video.videoWidth || 640));
      canvas.width = Math.round((video.videoWidth || 640) * scale);
      canvas.height = Math.round((video.videoHeight || 360) * scale);
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
      poster = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8));
    } catch {
      poster = null;
    }
    return { durationSec, poster };
  } catch {
    return { durationSec: null, poster: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function xhr(method: string, url: string, body: Blob | FormData, opts: {
  headers?: Record<string, string>; onProgress?: (loaded: number) => void; signal?: AbortSignal;
}): Promise<{ status: number; text: string; etag: string | null }> {
  return new Promise((resolve, reject) => {
    const req = new XMLHttpRequest();
    req.open(method, url);
    for (const [k, v] of Object.entries(opts.headers ?? {})) req.setRequestHeader(k, v);
    req.upload.onprogress = (e) => opts.onProgress?.(e.loaded);
    req.onload = () => {
      if (req.status >= 200 && req.status < 300) resolve({ status: req.status, text: req.responseText, etag: req.getResponseHeader('ETag') });
      else reject(new Error(`Upload failed (${req.status})`));
    };
    req.onerror = () => reject(new Error('Network error during upload'));
    req.onabort = () => reject(new UploadAbortedError());
    opts.signal?.addEventListener('abort', () => req.abort(), { once: true });
    req.send(body);
  });
}

async function uploadR2(plan: Extract<VideoUploadPlan, { provider: 'r2' }>, file: File, onProgress: UploadProgress, signal?: AbortSignal) {
  if (plan.mode === 'single') {
    await xhr('PUT', plan.uploadUrl, file, { headers: { 'Content-Type': file.type }, onProgress: (l) => onProgress(l / file.size), signal });
    return;
  }
  let done = 0;
  for (const part of plan.parts) {
    const start = (part.partNumber - 1) * plan.partSize;
    const chunk = file.slice(start, Math.min(file.size, start + plan.partSize));
    await xhr('PUT', part.url, chunk, { onProgress: (l) => onProgress((done + l) / file.size), signal });
    done += chunk.size;
  }
}

async function uploadCloudinary(plan: Extract<VideoUploadPlan, { provider: 'cloudinary' }>, file: File, onProgress: UploadProgress, signal?: AbortSignal): Promise<string> {
  // Chunked upload (Cloudinary rejects single requests above ~100 MB).
  const uploadId = `${plan.publicId}-${Date.now()}`;
  let last: { public_id?: string } = {};
  for (let start = 0; start < file.size; start += CLOUDINARY_CHUNK) {
    const end = Math.min(file.size, start + CLOUDINARY_CHUNK);
    const form = new FormData();
    form.append('file', file.slice(start, end), file.name);
    form.append('api_key', plan.apiKey);
    form.append('timestamp', String(plan.timestamp));
    form.append('signature', plan.signature);
    form.append('folder', plan.folder);
    form.append('public_id', plan.publicId);
    const res = await xhr('POST', plan.uploadUrl, form, {
      headers: { 'X-Unique-Upload-Id': uploadId, 'Content-Range': `bytes ${start}-${end - 1}/${file.size}` },
      onProgress: (l) => onProgress(Math.min(1, (start + l) / file.size)),
      signal,
    });
    try { last = JSON.parse(res.text); } catch { /* intermediate chunk responses may be empty */ }
  }
  if (!last.public_id) throw new Error('Upload did not complete');
  return last.public_id;
}

/** Full flow: plan → direct upload → server verification → saved entry. */
export async function uploadCompetitionVideo(
  competitionId: string,
  stageId: string,
  file: File,
  opts: { caption?: string; onProgress: UploadProgress; signal?: AbortSignal },
): Promise<MySubmission> {
  const mimeType = file.type === 'video/quicktime' ? 'video/quicktime' : 'video/mp4';
  const probe = await probeVideo(file);
  const { plan } = await requestVideoUpload(competitionId, stageId, { sizeBytes: file.size, mimeType });

  if (plan.provider === 'r2') {
    await uploadR2(plan, file, opts.onProgress, opts.signal);
    let thumbnailKey: string | undefined;
    if (probe.poster && plan.thumbnailUploadUrl && plan.thumbnailKey) {
      thumbnailKey = await xhr('PUT', plan.thumbnailUploadUrl, probe.poster, { headers: { 'Content-Type': 'image/jpeg' } })
        .then(() => plan.thumbnailKey)
        .catch(() => undefined);
    }
    return completeVideoUpload(competitionId, stageId, {
      key: plan.key,
      uploadId: plan.mode === 'multipart' ? plan.uploadId : undefined,
      thumbnailKey,
      clientDurationSec: probe.durationSec ?? undefined,
      caption: opts.caption || undefined,
    });
  }

  const publicId = await uploadCloudinary(plan, file, opts.onProgress, opts.signal);
  return completeVideoUpload(competitionId, stageId, {
    publicId,
    clientDurationSec: probe.durationSec ?? undefined,
    caption: opts.caption || undefined,
  });
}
