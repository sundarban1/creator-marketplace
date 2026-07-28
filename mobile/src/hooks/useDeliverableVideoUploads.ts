import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { campaignService, type DeliverableVideo } from '@/services/campaign';
import { compressVideo } from '@/utilities/uploadVideo';
import type { PickedVideo } from '@/utilities/chatAttachments';

export type DeliverableUploadStatus = 'queued' | 'compressing' | 'uploading' | 'done' | 'failed' | 'cancelled';

export interface DeliverableUploadItem {
  localId:        string;
  video:          PickedVideo;
  status:         DeliverableUploadStatus;
  progress:       number; // 0..1
  error?:         string;
  compressedUri?: string;
  result?:        DeliverableVideo;
}

const MAX_CONCURRENT = 2;
const MAX_TOTAL       = 3;

// Limited-concurrency upload queue for the deliverables video section: up to
// MAX_TOTAL videos per application, MAX_CONCURRENT uploading at once, the rest
// visibly waiting. Mirrors chat's compress->sign->upload->complete pipeline
// (mobile/src/services/campaign.ts's createDeliverableVideoUploadTask) but
// with real concurrency instead of chat's one-at-a-time guard, since up to 3
// videos can be picked here at once.
//
// Scoping decision: no cross-restart persistence — an app kill mid-upload
// loses the queue and the creator re-adds videos, same as chat (which has no
// persistence either). A resumable-upload queue isn't needed anywhere else in
// this codebase, so it isn't built here either.
export function useDeliverableVideoUploads(appId: string, existingCount: number) {
  const [items, setItems] = useState<DeliverableUploadItem[]>([]);
  const tasksRef = useRef<Map<string, { cancel: () => void }>>(new Map());

  // Mirrors `items` for reads inside async callbacks (runUpload spans several
  // awaits) — the `items` array captured by a given runUpload() call's closure
  // goes stale the moment cancel()/retry() fires elsewhere, so status checks
  // mid-flight must read this ref, not the closed-over parameter.
  const itemsRef = useRef<DeliverableUploadItem[]>(items);
  useEffect(() => { itemsRef.current = items; }, [items]);

  // A 'failed' item still occupies a slot (it's a real card the creator must
  // retry or explicitly dismiss()) — only 'cancelled' (and dismissal, which
  // removes the item outright) frees one up.
  const occupiedCount = items.filter((i) => i.status !== 'cancelled').length;
  const remainingSlots = Math.max(0, MAX_TOTAL - existingCount - occupiedCount);

  function updateItem(localId: string, patch: Partial<DeliverableUploadItem>) {
    setItems((prev) => prev.map((i) => (i.localId === localId ? { ...i, ...patch } : i)));
  }

  function statusOf(localId: string): DeliverableUploadStatus | undefined {
    return itemsRef.current.find((i) => i.localId === localId)?.status;
  }

  async function runUpload(localId: string) {
    const item = itemsRef.current.find((i) => i.localId === localId);
    if (!item) return;
    updateItem(localId, { status: 'compressing', progress: 0, error: undefined });
    try {
      // Retry reuses the already-compressed file instead of recompressing the
      // original (potentially 200MB) source on every attempt.
      let compressedUri = item.compressedUri;
      if (!compressedUri) {
        compressedUri = await compressVideo(item.video.uri, (fraction) => updateItem(localId, { progress: fraction }));
        if (statusOf(localId) === 'cancelled') return;
        updateItem(localId, { compressedUri });
      }

      const task = campaignService.createDeliverableVideoUploadTask(
        appId,
        compressedUri,
        item.video.mimeType,
        (fraction) => updateItem(localId, { status: 'uploading', progress: fraction }),
      );
      tasksRef.current.set(localId, task);
      const result = await task.start();
      tasksRef.current.delete(localId);
      updateItem(localId, { status: 'done', progress: 1, result });
    } catch (e: any) {
      tasksRef.current.delete(localId);
      // cancel() already set 'cancelled' — don't overwrite it with 'failed'.
      if (statusOf(localId) !== 'cancelled') {
        updateItem(localId, { status: 'failed', error: e?.message ?? 'Upload failed' });
      }
    }
  }

  // Scheduler: whenever the queue changes, promote queued items (FIFO) into
  // active slots until MAX_CONCURRENT are compressing/uploading. Re-runs on
  // every progress tick too (cheap — just a couple of array scans over at
  // most 3 items), not just on status transitions.
  useEffect(() => {
    const activeCount = items.filter((i) => i.status === 'compressing' || i.status === 'uploading').length;
    if (activeCount >= MAX_CONCURRENT) return;
    const next = items.find((i) => i.status === 'queued');
    if (!next) return;
    void runUpload(next.localId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function addVideos(videos: PickedVideo[]) {
    if (videos.length === 0) return;
    const toAdd = videos.slice(0, remainingSlots);
    if (toAdd.length < videos.length) {
      Alert.alert('Limit reached', 'You can upload up to 3 videos per submission.');
    }
    setItems((prev) => [
      ...prev,
      ...toAdd.map((video) => ({
        localId:  `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        video,
        status:   'queued' as const,
        progress: 0,
      })),
    ]);
  }

  // Cancelling frees the slot immediately (status flips synchronously) rather
  // than waiting for the task's promise to reject in the background — the
  // scheduler effect picks the next queued item up on this same render.
  function cancel(localId: string) {
    tasksRef.current.get(localId)?.cancel();
    updateItem(localId, { status: 'cancelled' });
  }

  function retry(localId: string) {
    updateItem(localId, { status: 'queued', error: undefined });
  }

  function dismiss(localId: string) {
    setItems((prev) => prev.filter((i) => i.localId !== localId));
  }

  return { items, remainingSlots, addVideos, cancel, retry, dismiss };
}
