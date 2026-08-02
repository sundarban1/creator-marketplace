import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { campaignService, type DeliverableFile } from '@/services/campaign';
import type { PickedFile } from '@/utilities/chatAttachments';

export type DeliverableFileUploadStatus = 'uploading' | 'done' | 'failed' | 'cancelled';

export interface DeliverableFileUploadItem {
  localId: string;
  file:    PickedFile;
  status:  DeliverableFileUploadStatus;
  error?:  string;
  result?: DeliverableFile;
}

const MAX_TOTAL = 10;

// Deliberately simpler than useDeliverableVideoUploads: files are <=5MB and go
// through one plain multipart fetch (mobile/src/services/campaign.ts's
// uploadDeliverableFile), so there's no compress/finalize staging and no
// background-upload-manager reconstruction — each added file starts
// uploading immediately via its own AbortController, which is also what
// gives cancel() something to abort mid-upload.
export function useDeliverableFileUploads(appId: string, existingCount: number) {
  const [items, setItems] = useState<DeliverableFileUploadItem[]>([]);
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  const occupiedCount = items.filter((i) => i.status !== 'cancelled').length;
  const remainingSlots = Math.max(0, MAX_TOTAL - existingCount - occupiedCount);

  function updateItem(localId: string, patch: Partial<DeliverableFileUploadItem>) {
    setItems((prev) => prev.map((i) => (i.localId === localId ? { ...i, ...patch } : i)));
  }

  async function runUpload(localId: string, file: PickedFile) {
    const controller = new AbortController();
    controllersRef.current.set(localId, controller);
    try {
      const result = await campaignService.uploadDeliverableFile(appId, file, controller.signal);
      controllersRef.current.delete(localId);
      updateItem(localId, { status: 'done', result });
    } catch (e: any) {
      controllersRef.current.delete(localId);
      // cancel() already set 'cancelled' (and aborting the fetch also rejects
      // it as an AbortError) — don't overwrite that with 'failed'.
      if (e?.name !== 'AbortError') {
        updateItem(localId, { status: 'failed', error: e?.message ?? 'Upload failed' });
      }
    }
  }

  function addFiles(files: PickedFile[]) {
    if (files.length === 0) return;
    const toAdd = files.slice(0, remainingSlots);
    if (toAdd.length < files.length) {
      Alert.alert('Limit reached', 'You can upload up to 10 images/files per submission.');
    }
    const newItems: DeliverableFileUploadItem[] = toAdd.map((file) => ({
      localId: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      file,
      status:  'uploading',
    }));
    setItems((prev) => [...prev, ...newItems]);
    newItems.forEach((item) => void runUpload(item.localId, item.file));
  }

  function cancel(localId: string) {
    controllersRef.current.get(localId)?.abort();
    controllersRef.current.delete(localId);
    updateItem(localId, { status: 'cancelled' });
  }

  function retry(localId: string) {
    const item = items.find((i) => i.localId === localId);
    if (!item) return;
    updateItem(localId, { status: 'uploading', error: undefined });
    void runUpload(localId, item.file);
  }

  function dismiss(localId: string) {
    setItems((prev) => prev.filter((i) => i.localId !== localId));
  }

  return { items, remainingSlots, addFiles, cancel, retry, dismiss };
}
