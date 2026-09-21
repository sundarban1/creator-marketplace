import { useEffect } from 'react';
import { X, Download, ExternalLink, FileText } from 'lucide-react';

export type AttachmentPreview =
  | { kind: 'image'; url: string; name?: string | null }
  | { kind: 'video'; url: string; thumbnail?: string | null; name?: string | null }
  | { kind: 'file'; url: string; name?: string | null };

/**
 * Full-screen lightbox for chat attachments — image/video preview inline,
 * file attachments get a card with open/download actions. Mirrors mobile's
 * ImagePreviewModal + video-player full-screen takeover.
 */
export function AttachmentPreviewModal({ preview, onClose }: { preview: AttachmentPreview | null; onClose: () => void }) {
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [preview, onClose]);

  if (!preview) return null;
  const title = preview.name ?? (preview.kind === 'image' ? 'Image' : preview.kind === 'video' ? 'Video' : 'Attachment');

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between gap-3 pb-3">
        <p className="min-w-0 truncate text-[14px] font-medium text-white/90">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {preview.kind === 'image' && (
          <img src={preview.url} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        )}

        {preview.kind === 'video' && (
          <video
            src={preview.url}
            poster={preview.thumbnail ?? undefined}
            controls
            autoPlay
            className="max-h-full max-w-full rounded-lg"
          />
        )}

        {preview.kind === 'file' && (
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-surface p-6 text-center">
            <FileText size={40} className="text-ink-soft" />
            <p className="break-all text-[14px] font-medium text-ink">{title}</p>
            <div className="flex w-full gap-2">
              <a
                href={preview.url}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line-strong text-[13px] font-semibold text-ink hover:bg-surface-dim"
              >
                <ExternalLink size={15} /> Open
              </a>
              <a
                href={preview.url}
                download={preview.name ?? undefined}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand text-[13px] font-semibold text-white hover:opacity-90"
              >
                <Download size={15} /> Download
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
