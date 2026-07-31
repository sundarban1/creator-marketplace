import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import Upload from 'react-native-background-upload';
import { request } from '@/lib/api';
import type { VideoUploadSignature } from '@/services/cloudinaryVideoUpload';

// ── Persisted pending-upload bookkeeping ────────────────────────────────────
// A video upload here is a sequence of Cloudinary "chunked upload" requests
// (see cloudinaryVideoUpload.ts's header comment for why chunking is
// mandatory above ~100MB) sent via react-native-background-upload's native
// NSURLSession/WorkManager transport instead of a JS-thread XHR, so the OS
// keeps moving bytes even if the app backgrounds or is killed mid-transfer.
//
// The catch: surviving an app kill means the JS callback that was awaiting
// each chunk is gone too. So before the first chunk starts, the whole upload's
// identity + progress is written to AsyncStorage; `initBackgroundVideoUploadManager`
// (called once at app boot from _layout.tsx) replays any record left over from
// a killed session and drives it to completion on its own — independent of
// whichever screen originally started it.
export type BackgroundUploadTarget =
  | { targetType: 'chat'; conversationId: string; caption?: string }
  | { targetType: 'deliverable'; appId: string };

type PendingVideoUpload = {
  localUploadId:  string;
  target:         BackgroundUploadTarget;
  mimeType:       string;
  totalBytes:     number;
  chunkSizeBytes: number;
  totalChunks:    number;
  nextChunkIndex: number;
  signature:      VideoUploadSignature;
  sourceFileUri:  string;
  createdAt:      string; // ISO — used to cap how long a resume is attempted
};

const STORAGE_KEY = 'pendingVideoUploads';
const CHUNK_SIZE_BYTES = 20 * 1024 * 1024; // Cloudinary's documented default chunk size

// A record older than this is not resumed — the source file may be gone, and
// Cloudinary's signed timestamp may no longer be accepted. Better to fail
// clearly and let the creator retry than to chase an indefinite resume.
const RESUME_WINDOW_MS = 6 * 60 * 60 * 1000;

async function readPending(): Promise<PendingVideoUpload[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as PendingVideoUpload[]; } catch { return []; }
}

async function writePending(list: PendingVideoUpload[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

async function upsertPending(entry: PendingVideoUpload): Promise<void> {
  const list = await readPending();
  const idx = list.findIndex((p) => p.localUploadId === entry.localUploadId);
  if (idx >= 0) list[idx] = entry; else list.push(entry);
  await writePending(list);
}

async function removePending(localUploadId: string): Promise<void> {
  const list = await readPending();
  await writePending(list.filter((p) => p.localUploadId !== localUploadId));
}

function makeLocalUploadId(): string {
  // Only needs to be unique per logical file (used as Cloudinary's
  // X-Unique-Upload-Id too) — reuses the same lightweight idiom already used
  // elsewhere in this codebase (see useDeliverableVideoUploads.ts) rather than
  // pulling in a `uuid` dependency.
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// ── In-memory (not persisted) progress fan-out ──────────────────────────────
// Screen-lifetime only — if the screen that started an upload is gone (app
// backgrounded/killed), there's simply no live progress bar to update; the
// upload itself keeps going regardless, tracked via the persisted record above.
const progressSubscribers = new Map<string, (fraction: number) => void>();

export function subscribeToUploadProgress(localUploadId: string, cb: (fraction: number) => void): () => void {
  progressSubscribers.set(localUploadId, cb);
  return () => { if (progressSubscribers.get(localUploadId) === cb) progressSubscribers.delete(localUploadId); };
}

// Tracks which native chunk-upload id is currently in flight for a given
// localUploadId, so cancel() can abort the actual native transfer instead of
// just racing the chunk loop by deleting the persisted record out from under it.
const activeNativeUploadId = new Map<string, string>();

// Fired once, right after the last chunk lands and before the backend
// "complete" call starts — lets callers show a distinct "Processing…" state
// instead of leaving the progress bar frozen at 100% with no feedback while
// the complete-call (which can take a moment — it re-verifies the asset via
// Cloudinary's Admin API) is in flight. Screen-lifetime only, same caveat as
// progressSubscribers above.
const finalizingSubscribers = new Map<string, () => void>();

export function subscribeToUploadFinalizing(localUploadId: string, cb: () => void): () => void {
  finalizingSubscribers.set(localUploadId, cb);
  return () => { if (finalizingSubscribers.get(localUploadId) === cb) finalizingSubscribers.delete(localUploadId); };
}

// ── Chunk slicing ────────────────────────────────────────────────────────────
// expo-file-system has no binary slice-to-Blob primitive — range-read the
// chunk as base64 and write it back out as its own small file.
// writeAsStringAsync decodes the base64 back to raw bytes on disk, so the temp
// file's size on disk (what react-native-background-upload actually reads and
// sends) matches `length`, not the inflated base64 string length.
async function sliceChunkToTempFile(fileUri: string, position: number, length: number, chunkName: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64', position, length });
  const chunkUri = `${FileSystem.cacheDirectory}${chunkName}`;
  await FileSystem.writeAsStringAsync(chunkUri, base64, { encoding: 'base64' });
  return chunkUri;
}

function chunkRange(index: number, chunkSizeBytes: number, totalBytes: number) {
  const start = index * chunkSizeBytes;
  const end = Math.min(start + chunkSizeBytes, totalBytes) - 1;
  return { start, end, length: end - start + 1 };
}

// ── One chunk, via react-native-background-upload ──────────────────────────
async function uploadOneChunk(pending: PendingVideoUpload): Promise<{ done: boolean; publicId?: string; secureUrl?: string }> {
  const { start, end, length } = chunkRange(pending.nextChunkIndex, pending.chunkSizeBytes, pending.totalBytes);
  const chunkName = `chunk_${pending.localUploadId}_${pending.nextChunkIndex}`;
  const chunkUri = await sliceChunkToTempFile(pending.sourceFileUri, start, length, chunkName);
  // Known ahead of time (rather than reading back startUpload's resolved id) so
  // the completion/error/progress listeners can be attached before the native
  // upload actually starts — no window where an instant failure/completion
  // could fire before anything is listening.
  const nativeUploadId = `${pending.localUploadId}__chunk${pending.nextChunkIndex}`;
  activeNativeUploadId.set(pending.localUploadId, nativeUploadId);

  try {
    const responseBody = await new Promise<string>((resolve, reject) => {
      const subs = [
        Upload.addListener('progress', nativeUploadId, (data) => {
          const bytesBefore = pending.nextChunkIndex * pending.chunkSizeBytes;
          const fraction = Math.min(1, (bytesBefore + (data.progress / 100) * length) / pending.totalBytes);
          progressSubscribers.get(pending.localUploadId)?.(fraction);
        }),
        Upload.addListener('error', nativeUploadId, (data) => {
          cleanup();
          reject(new Error(data.error || 'Video upload failed'));
        }),
        Upload.addListener('cancelled', nativeUploadId, () => {
          cleanup();
          reject(new Error('Video upload cancelled'));
        }),
        Upload.addListener('completed', nativeUploadId, (data) => {
          cleanup();
          if (data.responseCode >= 200 && data.responseCode < 300) {
            resolve(data.responseBody);
          } else {
            reject(new Error(`Video upload failed (HTTP ${data.responseCode})`));
          }
        }),
      ];
      function cleanup() { subs.forEach((s) => s.remove()); }

      Upload.startUpload({
        url:            pending.signature.uploadUrl,
        path:           chunkUri,
        method:         'POST',
        type:           'multipart',
        field:          'file',
        customUploadId: nativeUploadId,
        headers: {
          'X-Unique-Upload-Id': pending.localUploadId,
          'Content-Range':      `bytes ${start}-${end}/${pending.totalBytes}`,
        },
        parameters: {
          api_key:   pending.signature.apiKey,
          timestamp: String(pending.signature.timestamp),
          signature: pending.signature.signature,
          folder:    pending.signature.folder,
          public_id: pending.signature.publicId,
        },
      }).catch((err) => { cleanup(); reject(err); });
    });

    const bytesDone = Math.min(pending.totalBytes, (pending.nextChunkIndex + 1) * pending.chunkSizeBytes);
    progressSubscribers.get(pending.localUploadId)?.(bytesDone / pending.totalBytes);

    const isFinal = pending.nextChunkIndex === pending.totalChunks - 1;
    if (!isFinal) return { done: false };

    // Only the final chunk's response carries the finished asset — earlier
    // chunks just ack with 2xx and a minimal/empty body.
    let parsed: { public_id?: string; secure_url?: string } = {};
    try { parsed = JSON.parse(responseBody); } catch { /* handled by the check below */ }
    if (!parsed.public_id || !parsed.secure_url) {
      throw new Error('Video upload did not complete — missing asset reference from Cloudinary');
    }
    return { done: true, publicId: parsed.public_id, secureUrl: parsed.secure_url };
  } finally {
    activeNativeUploadId.delete(pending.localUploadId);
    await FileSystem.deleteAsync(chunkUri, { idempotent: true });
  }
}

// ── Backend "complete" call, target-agnostic ────────────────────────────────
// Deliberately calls the REST endpoints directly (not campaignService/chatService)
// to avoid a circular import — this module must be import-safe from both
// campaign.ts and chat.ts, and must also be able to finish an upload entirely
// on its own during boot-time reconciliation, long after the screen that
// started it is gone.
async function completeUpload(target: BackgroundUploadTarget, publicId: string): Promise<unknown> {
  if (target.targetType === 'chat') {
    const res = await request(
      'POST', `/api/messaging/conversations/${target.conversationId}/attachments/video/complete`,
      { publicId, caption: target.caption?.trim() || undefined },
    );
    return res.data;
  }
  const res = await request(
    'POST', `/api/campaigns/applications/${target.appId}/deliverables/video/complete`,
    { publicId },
  );
  return res.data;
}

// ── Drive one upload's chunk sequence to completion ─────────────────────────
// De-duped by localUploadId: the live screen's awaited call and a boot-time
// reconciliation pass can never race for the same record in practice (a
// record only survives to boot-reconciliation if the process that created it
// is gone), but this guard keeps a stray double-invocation (e.g. React
// StrictMode) from starting the same chunk twice.
const inFlightDrives = new Map<string, Promise<unknown>>();

function driveChunkSequence(localUploadId: string): Promise<unknown> {
  const existing = inFlightDrives.get(localUploadId);
  if (existing) return existing;

  const promise = (async () => {
    for (;;) {
      const pending = (await readPending()).find((p) => p.localUploadId === localUploadId);
      if (!pending) throw new Error('Upload record no longer exists');

      const result = await uploadOneChunk(pending);
      if (result.done) {
        finalizingSubscribers.get(localUploadId)?.();
        const completed = await completeUpload(pending.target, result.publicId!);
        await removePending(localUploadId);
        return completed;
      }

      await upsertPending({ ...pending, nextChunkIndex: pending.nextChunkIndex + 1 });
    }
  })();

  inFlightDrives.set(localUploadId, promise);
  promise.finally(() => inFlightDrives.delete(localUploadId)).catch(() => {});
  return promise;
}

// ── Public entry point ───────────────────────────────────────────────────────
export function startBackgroundChunkedUpload(
  target: BackgroundUploadTarget,
  fileUri: string,
  mimeType: string,
  signature: VideoUploadSignature,
  onProgress: (fraction: number) => void,
  onFinalizing?: () => void,
): { localUploadId: string; result: Promise<unknown>; cancel: () => void } {
  const localUploadId = makeLocalUploadId();
  let cancelled = false;

  const result = (async () => {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists || info.isDirectory) throw new Error('Video file could not be read for upload');
    if (cancelled) throw new Error('Video upload cancelled');

    const totalBytes = info.size;
    const pending: PendingVideoUpload = {
      localUploadId,
      target,
      mimeType,
      totalBytes,
      chunkSizeBytes: CHUNK_SIZE_BYTES,
      totalChunks:    Math.max(1, Math.ceil(totalBytes / CHUNK_SIZE_BYTES)),
      nextChunkIndex: 0,
      signature,
      sourceFileUri:  fileUri,
      createdAt:      new Date().toISOString(),
    };
    // Persisted before the first chunk starts, so even a kill during chunk 0
    // leaves a record boot-time reconciliation can pick up.
    await upsertPending(pending);

    const unsubscribeProgress   = subscribeToUploadProgress(localUploadId, onProgress);
    const unsubscribeFinalizing = onFinalizing ? subscribeToUploadFinalizing(localUploadId, onFinalizing) : () => {};
    try {
      return await driveChunkSequence(localUploadId);
    } finally {
      unsubscribeProgress();
      unsubscribeFinalizing();
    }
  })();

  return {
    localUploadId,
    result,
    cancel: () => {
      cancelled = true;
      // Abort the actual in-flight native chunk (if any) first — this rejects
      // uploadOneChunk's promise, which stops driveChunkSequence's loop before
      // it can persist the next chunk index, avoiding a race against the
      // removePending() below (otherwise the loop could resurrect the record
      // right after it's deleted).
      const nativeId = activeNativeUploadId.get(localUploadId);
      if (nativeId) Upload.cancelUpload(nativeId).catch(() => {});
      removePending(localUploadId).catch(() => {});
    },
  };
}

// ── Boot-time reconciliation ─────────────────────────────────────────────────
let managerInitialized = false;

export function initBackgroundVideoUploadManager(): void {
  if (managerInitialized) return;
  managerInitialized = true;

  readPending().then((list) => {
    const now = Date.now();
    for (const pending of list) {
      const age = now - new Date(pending.createdAt).getTime();
      if (age > RESUME_WINDOW_MS) {
        // Stale — the source file may be gone and Cloudinary's signed
        // timestamp may no longer be accepted. Fail clearly instead of
        // chasing an indefinite resume; the creator retries from the screen.
        removePending(pending.localUploadId).catch(() => {});
        continue;
      }
      FileSystem.getInfoAsync(pending.sourceFileUri).then((info) => {
        if (!info.exists) {
          removePending(pending.localUploadId).catch(() => {});
          return;
        }
        driveChunkSequence(pending.localUploadId).catch(() => {
          // No live screen to report this failure to — the record is left
          // removed by driveChunkSequence's own cleanup only on success, so a
          // genuine failure here just leaves nothing further to retry
          // automatically; the creator will see the video missing and can
          // re-add it from the deliverables/chat screen.
        });
      }).catch(() => {});
    }
  }).catch(() => {});
}
