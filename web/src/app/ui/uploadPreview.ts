/**
 * Confirm-before-upload preview, shared by every image upload on web (app +
 * admin). Call sites stay one line:
 *
 *   if (!(await confirmImageUpload(file))) return;
 *
 * Resolves true on confirm, false on cancel. Non-image files (PDF/DOCX) are
 * listed by name next to the images; a pick with no images at all resolves
 * true straight away, so it's safe to gate mixed pickers (chat, deliverables).
 *
 * Driven imperatively via a single <UploadPreviewHost /> (UploadPreviewDialog.tsx) mounted in App.tsx —
 * the mobile counterpart is mobile/src/components/UploadPreviewModal.tsx.
 */

export type PreviewRequest = {
  files: Blob[];
  confirmLabel?: string;
  resolve: (ok: boolean) => void;
};

let present: ((req: PreviewRequest) => void) | null = null;

/** Called by <UploadPreviewHost /> on mount/unmount. */
export function registerUploadPreview(fn: ((req: PreviewRequest) => void) | null) {
  present = fn;
}

export const isImage = (f: Blob) => f.type.startsWith('image/');

export function confirmImageUpload(
  files: Blob | Blob[] | FileList,
  opts: { confirmLabel?: string } = {},
): Promise<boolean> {
  const list = files instanceof Blob ? [files] : Array.from(files);
  if (!list.some(isImage) || !present) return Promise.resolve(true);
  return new Promise((resolve) => present?.({ files: list, confirmLabel: opts.confirmLabel, resolve }));
}
