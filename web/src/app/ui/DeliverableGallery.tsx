import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import { useT } from '../i18n';
import type { DeliverableFile, DeliverableVideo } from '../api/creator';
import { cn } from './cn';

export type DeliverableMediaKind = 'image' | 'video' | 'pdf' | 'file';

export interface DeliverableMedia {
  id: string;
  url: string;
  name: string;
  kind: DeliverableMediaKind;
  sizeBytes?: number;
  posterUrl?: string;
  /** original file id, passed back to onRemove */
  removeId?: string;
}

function kindFromFile(f: DeliverableFile): DeliverableMediaKind {
  if (f.fileType === 'IMAGE') return 'image';
  if (f.mimeType === 'application/pdf' || /\.pdf$/i.test(f.originalFileName)) return 'pdf';
  return 'file';
}

/** Flattens a submission's videos + files into one ordered media list. */
function mediaFromDeliverables(
  files: DeliverableFile[] = [],
  videos: DeliverableVideo[] = [],
): DeliverableMedia[] {
  const vids: DeliverableMedia[] = videos.map((v) => ({
    id: `v-${v.publicId}`,
    url: v.url,
    name: v.label || 'Video',
    kind: 'video',
    sizeBytes: v.sizeBytes,
    posterUrl: v.thumbnailUrl,
  }));
  const docs: DeliverableMedia[] = files.map((f) => ({
    id: `f-${f.id}`,
    url: f.url,
    name: f.originalFileName,
    kind: kindFromFile(f),
    sizeBytes: f.sizeBytes,
    removeId: f.id,
  }));
  // Images first, then videos, then documents — matches how they read on the card.
  return [...docs.filter((d) => d.kind === 'image'), ...vids, ...docs.filter((d) => d.kind !== 'image')];
}

function fmtSize(bytes?: number) {
  if (!bytes) return '';
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Full-screen viewer with prev / next                                        */
/* ────────────────────────────────────────────────────────────────────────── */

export function DeliverableGallery({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: DeliverableMedia[];
  index: number | null;
  onClose: () => void;
  onNavigate: (next: number) => void;
}) {
  const t = useT();
  const open = index !== null && index >= 0 && index < items.length;

  const go = useCallback(
    (delta: number) => {
      if (index === null) return;
      const next = index + delta;
      if (next < 0 || next >= items.length) return;
      onNavigate(next);
    },
    [index, items.length, onNavigate],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, go]);

  if (!open || index === null) return null;
  const item = items[index];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90" role="dialog" aria-modal="true" aria-label={item.name}>
      {/* top bar */}
      <div className="flex items-center gap-3 px-4 py-3 text-white">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">{item.name}</p>
          <p className="text-[12px] text-white/60">
            {index + 1} / {items.length}
            {item.sizeBytes ? ` · ${fmtSize(item.sizeBytes)}` : ''}
          </p>
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          download
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-white/90 hover:bg-white/10"
        >
          <Download size={15} /> {t('deliv.download')}
        </a>
        <button
          onClick={onClose}
          aria-label={t('common.cancel')}
          className="rounded-lg p-2 text-white/90 hover:bg-white/10"
        >
          <X size={20} />
        </button>
      </div>

      {/* stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-4 sm:px-16">
        {items.length > 1 && (
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label={t('deliv.previous')}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 disabled:opacity-30 sm:left-4"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        <MediaStage key={item.id} item={item} downloadLabel={t('deliv.openFile')} noPreviewLabel={t('deliv.noPreview')} />

        {items.length > 1 && (
          <button
            onClick={() => go(1)}
            disabled={index === items.length - 1}
            aria-label={t('deliv.next')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 disabled:opacity-30 sm:right-4"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {/* thumbnail rail */}
      {items.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-4">
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={() => onNavigate(i)}
              className={cn(
                'flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-white/5',
                i === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100',
              )}
            >
              {it.kind === 'image' ? (
                <img src={it.url} alt="" className="h-full w-full object-cover" />
              ) : it.kind === 'video' && it.posterUrl ? (
                <img src={it.posterUrl} alt="" className="h-full w-full object-cover" />
              ) : it.kind === 'video' ? (
                <Play size={16} className="text-white" />
              ) : (
                <FileText size={16} className="text-white" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MediaStage({
  item,
  downloadLabel,
  noPreviewLabel,
}: {
  item: DeliverableMedia;
  downloadLabel: string;
  noPreviewLabel: string;
}) {
  if (item.kind === 'image') {
    return <img src={item.url} alt={item.name} className="max-h-full max-w-full rounded-lg object-contain" />;
  }
  if (item.kind === 'video') {
    return (
      <video
        src={item.url}
        poster={item.posterUrl}
        controls
        autoPlay
        className="max-h-full max-w-full rounded-lg bg-black"
      />
    );
  }
  if (item.kind === 'pdf') {
    return <iframe src={item.url} title={item.name} className="h-[85vh] w-full max-w-4xl rounded-lg bg-white" />;
  }
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/5 px-10 py-12 text-center text-white">
      <FileText size={40} className="text-white/70" />
      <p className="max-w-xs break-words text-[14px] font-medium">{item.name}</p>
      <p className="text-[12px] text-white/50">{noPreviewLabel}</p>
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        download
        className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-black hover:bg-white/90"
      >
        <Download size={15} /> {downloadLabel}
      </a>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Clickable strip of deliverables that opens the gallery                     */
/* ────────────────────────────────────────────────────────────────────────── */

export function DeliverableStrip({
  files = [],
  videos = [],
  onRemove,
  removeLabel,
  emptyLabel,
}: {
  files?: DeliverableFile[];
  videos?: DeliverableVideo[];
  onRemove?: (fileId: string) => void;
  removeLabel?: string;
  emptyLabel?: string;
}) {
  const t = useT();
  const items = mediaFromDeliverables(files, videos);
  const [viewer, setViewer] = useState<number | null>(null);

  if (items.length === 0) {
    return emptyLabel ? <p className="text-[13px] text-ink-soft">{emptyLabel}</p> : null;
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((it, i) => (
          <div key={it.id} className="group relative">
            <button
              onClick={() => setViewer(i)}
              title={it.name}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-line bg-surface text-ink-soft hover:border-brand hover:text-brand"
            >
              {it.kind === 'image' ? (
                <img src={it.url} alt={it.name} className="h-full w-full object-cover" />
              ) : it.kind === 'video' && it.posterUrl ? (
                <>
                  <img src={it.posterUrl} alt={it.name} className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Play size={22} className="text-white drop-shadow" />
                  </span>
                </>
              ) : it.kind === 'video' ? (
                <>
                  <Play size={22} />
                  <span className="max-w-full truncate px-2 text-[11px] font-medium">{it.name}</span>
                </>
              ) : (
                <>
                  <FileText size={22} />
                  <span className="max-w-full truncate px-2 text-[11px] font-medium">{it.name}</span>
                </>
              )}
            </button>
            {onRemove && it.removeId && (
              <button
                onClick={() => onRemove(it.removeId!)}
                aria-label={removeLabel ?? t('deliv.remove')}
                className="absolute right-1 top-1 rounded-lg bg-lp-black/70 p-1 text-white opacity-0 hover:bg-danger group-hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      <DeliverableGallery
        items={items}
        index={viewer}
        onClose={() => setViewer(null)}
        onNavigate={setViewer}
      />
    </>
  );
}
