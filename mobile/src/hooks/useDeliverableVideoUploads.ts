import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { campaignService, type DeliverableVideo } from '@/services/campaign';
import { compressVideo } from '@/utilities/uploadVideo';
import type { PickedVideo } from '@/utilities/chatAttachments';
import {
  getActiveUploadsFor, subscribeToUploadProgress, subscribeToUploadFinalizing,
  getActiveUploadResult, cancelActiveUpload, setFocusedUploadTarget,
} from '@/services/backgroundVideoUploadManager';

// 'finalizing' sits between 'uploading' (chunk transport) and 'done': all
// chunks landed at Cloudinary, but the backend's complete-call (which
// verifies + persists the deliverable entry) is still in flight.
export type DeliverableUploadStatus = 'queued' | 'compressing' | 'uploading' | 'finalizing' | 'done' | 'failed' | 'cancelled';

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
// Navigating away mid-upload and back reconstructs `items` from
// backgroundVideoUploadManager's active-uploads registry (the actual chunk
// transport keeps running independently of this hook's lifetime) — see the
// mount effect below. A full app-kill still loses the *queue UI* (the
// creator would see it as if the video needs re-adding, though the transport
// itself may still complete via boot-time reconciliation) — reconstructing
// across a kill would additionally need the picked video's metadata
// persisted to disk, which isn't done here.
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

  // Reconstructs a card for an upload that's still running in the background
  // (started before this screen mounted, or before the creator navigated
  // away and back) — mirrors chat's identical reconstruction, see
  // mobile/src/app/(creator)/(tabs)/messages/[id].tsx's attachToActiveUpload.
  function attachToActiveUpload(active: ReturnType<typeof getActiveUploadsFor>[number]) {
    const localId = `upload-${active.localUploadId}`;
    const placeholderVideo: PickedVideo = {
      uri: active.sourceFileUri, name: 'Video', mimeType: 'video/mp4',
      durationSec: 0, width: 0, height: 0, sizeBytes: 0,
    };
    setItems((prev) => (prev.some((i) => i.localId === localId) ? prev : [
      ...prev,
      { localId, video: placeholderVideo, status: active.status, progress: active.progress, compressedUri: active.sourceFileUri },
    ]));

    const unsubProgress = subscribeToUploadProgress(active.localUploadId, (p) => updateItem(localId, { status: 'uploading', progress: p }));
    const unsubFinalizing = subscribeToUploadFinalizing(active.localUploadId, () => updateItem(localId, { status: 'finalizing' }));
    tasksRef.current.set(localId, { cancel: () => cancelActiveUpload(active.localUploadId) });

    (getActiveUploadResult(active.localUploadId) as Promise<DeliverableVideo> | undefined)?.then((result) => {
      tasksRef.current.delete(localId);
      updateItem(localId, { status: 'done', progress: 1, result });
    }).catch((e: any) => {
      tasksRef.current.delete(localId);
      if (statusOf(localId) !== 'cancelled') {
        updateItem(localId, { status: 'failed', error: e?.message ?? 'Upload failed' });
      }
    }).finally(() => {
      unsubProgress();
      unsubFinalizing();
    });
  }

  useEffect(() => {
    getActiveUploadsFor({ targetType: 'deliverable', appId }).forEach(attachToActiveUpload);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  // Report focus so GlobalUploadBanner knows not to duplicate this
  // application's own inline upload progress while it's on screen.
  useFocusEffect(
    useCallback(() => {
      setFocusedUploadTarget({ targetType: 'deliverable', appId });
      return () => setFocusedUploadTarget(null);
    }, [appId])
  );

  async function runUpload(localId: string) {
    const item = itemsRef.current.find((i) => i.localId === localId);
    if (!item) return;
    updateItem(localId, { status: 'compressing', progress: 0, error: undefined });
    try {
      // Retry reuses the already-compressed file instead of recompressing the
      // original (potentially 500MB) source on every attempt.
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
        () => updateItem(localId, { status: 'finalizing' }),
        item.video.durationSec,
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
  // active slots until MAX_CONCURRENT are compressing/uploading/finalizing.
  // Re-runs on every progress tick too (cheap — just a couple of array scans
  // over at most 3 items), not just on status transitions.
  useEffect(() => {
    const activeCount = items.filter((i) => i.status === 'compressing' || i.status === 'uploading' || i.status === 'finalizing').length;
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

  // Optimistic local update after a successful renameDeliverableVideo call —
  // the server call itself is the source of truth, this just keeps the
  // just-uploaded item's card in sync without waiting on a full refetch.
  function relabel(localId: string, label: string) {
    setItems((prev) => prev.map((i) => (i.localId === localId && i.result ? { ...i, result: { ...i.result, label } } : i)));
  }

  return { items, remainingSlots, addVideos, cancel, retry, dismiss, relabel };
}
