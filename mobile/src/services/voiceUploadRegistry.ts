// Lightweight in-memory registry so an in-flight voice-message upload
// survives navigating away from and back to a chat screen within the same
// app session (mirrors the "active uploads registry" section of
// backgroundVideoUploadManager.ts, at a fraction of the scope). A voice clip
// is a single-shot upload capped at 15MB/2min (see createVoiceUploadTask in
// chat.ts) that finishes in seconds and already keeps running when its
// screen unmounts (a plain JS promise chain, unlike video's native
// background transport) — the only thing actually lost today is this
// screen-local UI state, so no AsyncStorage persistence or app-kill/resume
// handling is needed here, just a process-lifetime map a remounted screen
// can read back from.

export type ActiveVoiceUpload = {
  localUploadId:  string;
  conversationId: string;
  progress:       number; // 0..1
  sourceFileUri:  string;
  durationSec:    number;
  waveform:       number[];
};

const activeUploads = new Map<string, ActiveVoiceUpload>();
const progressSubscribers = new Map<string, (fraction: number) => void>();
const results = new Map<string, Promise<unknown>>();
const cancelHandlers = new Map<string, () => void>();

function makeLocalUploadId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function registerActiveVoiceUpload(
  conversationId: string,
  sourceFileUri: string,
  durationSec: number,
  waveform: number[],
  cancel: () => void,
): string {
  const localUploadId = makeLocalUploadId();
  activeUploads.set(localUploadId, { localUploadId, conversationId, progress: 0, sourceFileUri, durationSec, waveform });
  cancelHandlers.set(localUploadId, cancel);
  return localUploadId;
}

export function reportVoiceUploadProgress(localUploadId: string, fraction: number): void {
  const active = activeUploads.get(localUploadId);
  if (active) active.progress = fraction;
  progressSubscribers.get(localUploadId)?.(fraction);
}

export function unregisterActiveVoiceUpload(localUploadId: string): void {
  activeUploads.delete(localUploadId);
  cancelHandlers.delete(localUploadId);
}

export function subscribeToVoiceUploadProgress(localUploadId: string, cb: (fraction: number) => void): () => void {
  progressSubscribers.set(localUploadId, cb);
  return () => { if (progressSubscribers.get(localUploadId) === cb) progressSubscribers.delete(localUploadId); };
}

/** Uploads currently in flight for a specific conversation — for a remounted screen to reconstruct its pending bubble. */
export function getActiveVoiceUploadsFor(conversationId: string): ActiveVoiceUpload[] {
  return Array.from(activeUploads.values()).filter((u) => u.conversationId === conversationId);
}

export function setActiveVoiceUploadResult(localUploadId: string, result: Promise<unknown>): void {
  results.set(localUploadId, result);
}

/** Hands back the same in-flight promise the original screen was awaiting, so a remounted screen sees the same outcome without racing it. */
export function getActiveVoiceUploadResult(localUploadId: string): Promise<unknown> | undefined {
  return results.get(localUploadId);
}

/** Cross-instance cancel for a reconstructed bubble, which has no closure over the original task's `cancel()`. */
export function cancelActiveVoiceUpload(localUploadId: string): void {
  cancelHandlers.get(localUploadId)?.();
}
