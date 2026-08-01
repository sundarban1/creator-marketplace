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
  | { targetType: 'chat'; conversationId: string; caption?: string; durationSec?: number }
  | { targetType: 'deliverable'; appId: string; durationSec?: number };

type PendingVideoUpload = {
  localUploadId:  string;
  target:         BackgroundUploadTarget;
  mimeType:       string;
  totalBytes:     number;
  chunkSizeBytes: number;
  totalChunks:    number;
  // Indices already accepted by Cloudinary — not a single "next" cursor,
  // since chunks upload concurrently (see driveChunkSequence) and can land
  // out of order. Live-verified against the real Cloudinary API that chunks
  // for one X-Unique-Upload-Id reassemble correctly by their declared
  // Content-Range regardless of arrival order (a reversed-order 2-chunk
  // upload came back byte-for-byte identical, sha256-verified, to the
  // original file) — safe to parallelize on that basis.
  completedChunks: number[];
  signature:      VideoUploadSignature;
  sourceFileUri:  string;
  createdAt:      string; // ISO — used to cap how long a resume is attempted
};

const STORAGE_KEY = 'pendingVideoUploads';
const CHUNK_SIZE_BYTES = 20 * 1024 * 1024; // Cloudinary's documented default chunk size
// Concurrent chunks per upload — bounded so one video doesn't hog every
// native upload slot/socket, while still meaningfully overlapping the
// network-latency cost that used to be paid serially per chunk.
const CHUNK_CONCURRENCY = 3;

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

// ── Active-uploads registry ──────────────────────────────────────────────────
// Unlike progressSubscribers/finalizingSubscribers above (screen-lifetime,
// keyed to whichever screen started the upload), this is a process-lifetime
// registry of every upload currently in flight, regardless of which screen (if
// any) is looking at it. Lets (a) a global "Uploading video… 42%" banner show
// on any screen while the owning conversation/application isn't focused, and
// (b) a remounted chat/deliverables screen reconstruct its pending bubble/card
// instead of losing track of an upload that's still actually running.
export type ActiveUpload = {
  localUploadId: string;
  target:        BackgroundUploadTarget;
  progress:      number; // 0..1
  status:        'uploading' | 'finalizing';
  // The (already-compressed) local file being uploaded — lets a remounted
  // screen render a real local video preview for a reconstructed item instead
  // of a blank placeholder.
  sourceFileUri: string;
};

const activeUploads = new Map<string, ActiveUpload>();
const activeUploadsSubscribers = new Set<(uploads: ActiveUpload[]) => void>();

function notifyActiveUploadsSubscribers(): void {
  const list = Array.from(activeUploads.values());
  activeUploadsSubscribers.forEach((cb) => cb(list));
}

function sameTarget(a: BackgroundUploadTarget, b: BackgroundUploadTarget): boolean {
  if (a.targetType !== b.targetType) return false;
  if (a.targetType === 'chat' && b.targetType === 'chat') return a.conversationId === b.conversationId;
  if (a.targetType === 'deliverable' && b.targetType === 'deliverable') return a.appId === b.appId;
  return false;
}

function registerActiveUpload(localUploadId: string, target: BackgroundUploadTarget, initialProgress: number, sourceFileUri: string): void {
  if (activeUploads.has(localUploadId)) return;
  activeUploads.set(localUploadId, { localUploadId, target, progress: initialProgress, status: 'uploading', sourceFileUri });
  notifyActiveUploadsSubscribers();
}

function reportProgress(localUploadId: string, fraction: number): void {
  progressSubscribers.get(localUploadId)?.(fraction);
  const active = activeUploads.get(localUploadId);
  if (active) { active.progress = fraction; notifyActiveUploadsSubscribers(); }
}

function reportFinalizing(localUploadId: string): void {
  finalizingSubscribers.get(localUploadId)?.();
  const active = activeUploads.get(localUploadId);
  if (active) { active.status = 'finalizing'; notifyActiveUploadsSubscribers(); }
}

function unregisterActiveUpload(localUploadId: string): void {
  if (activeUploads.delete(localUploadId)) notifyActiveUploadsSubscribers();
}

/** Subscribe to the full list of currently in-flight uploads (any target) — for a global "Uploading…" indicator. */
export function subscribeToActiveUploads(cb: (uploads: ActiveUpload[]) => void): () => void {
  activeUploadsSubscribers.add(cb);
  cb(Array.from(activeUploads.values()));
  return () => { activeUploadsSubscribers.delete(cb); };
}

/** Uploads currently in flight for a specific conversation/application — for a remounted screen to reconstruct its pending item(s). */
export function getActiveUploadsFor(target: BackgroundUploadTarget): ActiveUpload[] {
  return Array.from(activeUploads.values()).filter((u) => sameTarget(u.target, target));
}

// ── Currently-focused upload target ─────────────────────────────────────────
// The chat/deliverables screens report themselves focused/blurred (via
// useFocusEffect) so GlobalUploadBanner knows to stay out of the way of an
// upload whose owning screen is already showing its own inline progress —
// the banner is only for uploads the user has navigated away from.
let focusedTarget: BackgroundUploadTarget | null = null;
const focusedTargetSubscribers = new Set<() => void>();

export function setFocusedUploadTarget(target: BackgroundUploadTarget | null): void {
  focusedTarget = target;
  focusedTargetSubscribers.forEach((cb) => cb());
}

export function subscribeToFocusedUploadTarget(cb: () => void): () => void {
  focusedTargetSubscribers.add(cb);
  return () => { focusedTargetSubscribers.delete(cb); };
}

export function isFocusedUploadTarget(target: BackgroundUploadTarget): boolean {
  return focusedTarget != null && sameTarget(focusedTarget, target);
}

// Tracks which native chunk-upload id(s) are currently in flight for a given
// localUploadId — up to CHUNK_CONCURRENCY at once — so cancel() can abort
// every actual native transfer instead of just racing the chunk pool by
// deleting the persisted record out from under it.
const activeNativeUploadIds = new Map<string, Set<string>>();

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
// `index` is explicit (not implied by a shared cursor) since multiple chunks
// of the same upload run concurrently. Completion is detected from the
// response body itself (Cloudinary returns the finished asset — public_id +
// secure_url — on whichever request happens to deliver the last outstanding
// byte range, not necessarily the highest-indexed chunk), not by assuming
// "the highest index is always last to finish".
async function uploadOneChunk(
  pending: PendingVideoUpload,
  index: number,
  onChunkProgress: (bytesForThisChunk: number) => void,
): Promise<{ isAssetComplete: boolean; publicId?: string; secureUrl?: string }> {
  const { start, end, length } = chunkRange(index, pending.chunkSizeBytes, pending.totalBytes);
  const chunkName = `chunk_${pending.localUploadId}_${index}`;
  const chunkUri = await sliceChunkToTempFile(pending.sourceFileUri, start, length, chunkName);
  // Known ahead of time (rather than reading back startUpload's resolved id) so
  // the completion/error/progress listeners can be attached before the native
  // upload actually starts — no window where an instant failure/completion
  // could fire before anything is listening.
  const nativeUploadId = `${pending.localUploadId}__chunk${index}`;
  if (!activeNativeUploadIds.has(pending.localUploadId)) activeNativeUploadIds.set(pending.localUploadId, new Set());
  activeNativeUploadIds.get(pending.localUploadId)!.add(nativeUploadId);

  try {
    const responseBody = await new Promise<string>((resolve, reject) => {
      const subs = [
        Upload.addListener('progress', nativeUploadId, (data) => {
          onChunkProgress((data.progress / 100) * length);
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

    onChunkProgress(length);

    let parsed: { public_id?: string; secure_url?: string } = {};
    try { parsed = JSON.parse(responseBody); } catch { /* not every chunk's ack has a body */ }
    if (parsed.public_id && parsed.secure_url) {
      return { isAssetComplete: true, publicId: parsed.public_id, secureUrl: parsed.secure_url };
    }
    return { isAssetComplete: false };
  } finally {
    activeNativeUploadIds.get(pending.localUploadId)?.delete(nativeUploadId);
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
      { publicId, caption: target.caption?.trim() || undefined, clientDurationSec: target.durationSec },
    );
    return res.data;
  }
  const res = await request(
    'POST', `/api/campaigns/applications/${target.appId}/deliverables/video/complete`,
    { publicId, clientDurationSec: target.durationSec },
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
    const pending = (await readPending()).find((p) => p.localUploadId === localUploadId);
    if (!pending) throw new Error('Upload record no longer exists');

    // Registered here (not only in startBackgroundChunkedUpload) so a
    // boot-time-reconciled upload — which calls this function directly,
    // skipping startBackgroundChunkedUpload — still shows up for a global
    // indicator/remounted screen. Initial progress reflects any chunks
    // already landed before this process started (a resumed upload).
    registerActiveUpload(localUploadId, pending.target, (pending.completedChunks.length * pending.chunkSizeBytes) / pending.totalBytes, pending.sourceFileUri);

    // Authoritative in-memory record of which indices are done — only this
    // closure ever mutates it, so concurrent workers below can't race each
    // other's writes the way two independent readPending()+writePending()
    // round-trips could.
    const completedSet = new Set(pending.completedChunks);
    const remaining: number[] = [];
    for (let i = 0; i < pending.totalChunks; i++) if (!completedSet.has(i)) remaining.push(i);

    // Per-chunk bytes uploaded so far (completed chunks count in full) —
    // summed for a smooth overall fraction regardless of how many chunks are
    // concurrently in flight or in what order they finish.
    const chunkBytesDone = new Map<number, number>();
    for (const i of completedSet) chunkBytesDone.set(i, chunkRange(i, pending.chunkSizeBytes, pending.totalBytes).length);
    const reportOverallProgress = () => {
      let sum = 0;
      for (const v of chunkBytesDone.values()) sum += v;
      reportProgress(localUploadId, Math.min(1, sum / pending.totalBytes));
    };
    reportOverallProgress();

    // Accumulated rather than a single reassigned `let` — whichever worker's
    // chunk happens to complete the total gets pushed here (normally exactly
    // one, but the array sidesteps needing to reassign a captured outer
    // variable from inside a closure).
    const completions: { publicId: string; secureUrl: string }[] = [];
    let cursor = 0;
    const worker = async (): Promise<void> => {
      for (;;) {
        const index = remaining[cursor++];
        if (index === undefined) return;
        const result = await uploadOneChunk(pending, index, (bytes) => {
          chunkBytesDone.set(index, bytes);
          reportOverallProgress();
        });
        chunkBytesDone.set(index, chunkRange(index, pending.chunkSizeBytes, pending.totalBytes).length);
        completedSet.add(index);
        reportOverallProgress();
        await upsertPending({ ...pending, completedChunks: [...completedSet] });
        if (result.isAssetComplete) completions.push({ publicId: result.publicId!, secureUrl: result.secureUrl! });
      }
    };

    const workerCount = Math.min(CHUNK_CONCURRENCY, remaining.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    const finalResult = completions[0];
    if (!finalResult) throw new Error('Video upload did not complete — missing asset reference from Cloudinary');
    reportFinalizing(localUploadId);
    const completed = await completeUpload(pending.target, finalResult.publicId);
    await removePending(localUploadId);
    return completed;
  })();

  promise.finally(() => unregisterActiveUpload(localUploadId)).catch(() => {});
  inFlightDrives.set(localUploadId, promise);
  promise.finally(() => inFlightDrives.delete(localUploadId)).catch(() => {});
  return promise;
}

// A remounted screen that reconstructed a pending bubble/card from
// getActiveUploadsFor() needs to know when that upload finishes or fails —
// this hands back the *same* in-flight promise the original screen was
// awaiting (a promise can have any number of independent awaiters), so both
// see the same outcome without racing each other.
export function getActiveUploadResult(localUploadId: string): Promise<unknown> | undefined {
  return inFlightDrives.get(localUploadId);
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
      completedChunks: [],
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
    cancel: () => { cancelled = true; cancelActiveUpload(localUploadId); },
  };
}

// Cancel by id alone — lets a remounted screen that reconstructed a pending
// bubble/card (via getActiveUploadsFor, with no local closure over the
// original startBackgroundChunkedUpload call) still offer a working cancel
// button, not just a read-only progress view.
export function cancelActiveUpload(localUploadId: string): void {
  // Abort every in-flight native chunk first (there can be up to
  // CHUNK_CONCURRENCY of them) — this rejects each uploadOneChunk promise,
  // which stops every worker before it can persist another completed index,
  // avoiding a race against the removePending() below (otherwise a worker
  // could resurrect the record right after it's deleted).
  const nativeIds = activeNativeUploadIds.get(localUploadId);
  if (nativeIds) for (const id of nativeIds) Upload.cancelUpload(id).catch(() => {});
  removePending(localUploadId).catch(() => {});
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
