import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Download, FileText, Paperclip, RotateCw, UploadCloud, X } from 'lucide-react';
import { downloadFile } from '../lib/downloadFile';
import { useT } from '../i18n';
import { uploadCampaignAttachment, type CampaignAttachment } from '../api/business';
import { DeliverableGallery, type DeliverableMedia } from '../ui/DeliverableGallery';
import { cn } from '../ui/cn';
import { confirmImageUpload } from '../ui/uploadPreview';

/**
 * Reference images (PNG/JPG/WebP) and PDFs a business attaches to an event
 * (stored in brief.attachments). `EventAttachmentsEditor` uploads each file as
 * soon as it's picked — with a per-file progress bar — and only hands finished
 * uploads to `onChange`. Every tile (uploading or done) opens the full-screen
 * image/PDF preview. `EventAttachmentsView` is the read-only list for detail
 * pages.
 */

// Mirrors backend campaign.brief.ts / middleware/upload.ts.
const MAX_IMAGES = 3;
const MAX_PDFS = 2;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,image/webp,application/pdf';
const ACCEPT_MIME = new Set(ACCEPT.split(','));

function isPdfAttachment(a: Pick<CampaignAttachment, 'kind' | 'mimeType' | 'url' | 'name'>): boolean {
  return a.kind === 'PDF' || a.mimeType === 'application/pdf' || /\.pdf($|\?)/i.test(a.url) || /\.pdf$/i.test(a.name);
}

function fmtSize(bytes?: number) {
  if (!bytes) return '';
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

type Pending = {
  id: string;
  file: File;
  previewUrl: string;
  isPdf: boolean;
  progress: number;
  error?: string;
};

function toMedia(a: CampaignAttachment, i: number): DeliverableMedia {
  return { id: `a-${i}-${a.url}`, url: a.url, name: a.name, kind: isPdfAttachment(a) ? 'pdf' : 'image', sizeBytes: a.sizeBytes };
}

function Tile({
  name,
  url,
  isPdf,
  sizeBytes,
  progress,
  error,
  onOpen,
  onRemove,
  onRetry,
  onDownload,
  removeLabel,
}: {
  name: string;
  url: string;
  isPdf: boolean;
  sizeBytes?: number;
  progress?: number;
  error?: string;
  onOpen: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
  onDownload?: () => void;
  removeLabel: string;
}) {
  const t = useT();
  const uploading = progress !== undefined && !error;
  return (
    <div className="min-w-0">
      <div className="group relative">
        <button
          type="button"
          onClick={onOpen}
          title={name}
          aria-label={t('biz.attachmentsPreview', { name })}
          className={cn(
            'relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-xl border bg-surface transition-colors',
            error ? 'border-error/50' : 'border-line hover:border-violet/50',
          )}
        >
          {isPdf ? (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-violet/[0.05] text-violet-dark">
              <FileText size={28} strokeWidth={1.6} />
              <span className="rounded-md bg-violet/[0.12] px-1.5 py-0.5 text-[10px] font-bold tracking-wide">PDF</span>
            </span>
          ) : (
            <img src={url} alt="" className={cn('h-full w-full object-cover', uploading && 'opacity-60')} />
          )}

          {uploading && (
            <span className="absolute inset-x-2 bottom-2 rounded-full bg-black/45 p-[3px] backdrop-blur" aria-hidden>
              <span className="block h-1.5 rounded-full bg-white transition-[width] duration-150" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
            </span>
          )}
          {error && (
            <span className="absolute inset-0 flex items-center justify-center bg-error/10 px-2 text-center text-[11px] font-semibold text-error">
              {t('biz.attachmentsFailed')}
            </span>
          )}
        </button>

        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={removeLabel}
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/75"
          >
            <X size={14} />
          </button>
        )}
        {onDownload && (
          <button
            type="button"
            onClick={onDownload}
            aria-label={t('biz.attachmentsDownload', { name })}
            title={t('deliv.download')}
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/75"
          >
            <Download size={14} />
          </button>
        )}
        {error && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            aria-label={t('biz.attachmentsRetry')}
            className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink shadow"
          >
            <RotateCw size={11} /> {t('biz.attachmentsRetry')}
          </button>
        )}
      </div>
      <p className="mt-1 truncate text-[12px] font-medium text-ink" title={name}>{name}</p>
      <p className="text-[11px] text-ink-soft">
        {uploading ? t('biz.attachmentsUploadingPct', { pct: Math.round((progress ?? 0) * 100) }) : fmtSize(sizeBytes)}
      </p>
    </div>
  );
}

export function EventAttachmentsEditor({
  value,
  onChange,
  onBusyChange,
  disabled,
}: {
  value: CampaignAttachment[];
  onChange: (next: CampaignAttachment[]) => void;
  /** true while any file is still uploading — lets the form hold publish. */
  onBusyChange?: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);

  // Several uploads can finish in the same tick — always append to the latest
  // list, not the one captured when the upload started.
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);
  const removedRef = useRef(new Set<string>());
  const seqRef = useRef(0);

  const busy = pending.some((p) => !p.error);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => () => { pending.forEach((p) => URL.revokeObjectURL(p.previewUrl)); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (id: string, p: Partial<Pending>) => setPending((prev) => prev.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const drop = (id: string) => setPending((prev) => {
    const hit = prev.find((x) => x.id === id);
    if (hit) URL.revokeObjectURL(hit.previewUrl);
    return prev.filter((x) => x.id !== id);
  });

  async function upload(item: Pending) {
    patch(item.id, { progress: 0, error: undefined });
    try {
      const att = await uploadCampaignAttachment(item.file, (f) => patch(item.id, { progress: Math.min(f, 0.98) }));
      if (removedRef.current.has(item.id)) return;
      const next = [...valueRef.current, att];
      valueRef.current = next;
      onChange(next);
      drop(item.id);
    } catch (err) {
      if (removedRef.current.has(item.id)) return;
      patch(item.id, { error: err instanceof Error ? err.message : t('common.somethingWrong') });
    }
  }

  async function addFiles(files: FileList | File[]) {
    setError('');
    const list = Array.from(files);
    const pdfsNow = valueRef.current.filter(isPdfAttachment).length + pending.filter((p) => p.isPdf).length;
    let imageRoom = MAX_IMAGES - (valueRef.current.length + pending.length - pdfsNow);
    let pdfRoom = MAX_PDFS - pdfsNow;
    const accepted: Pending[] = [];
    for (const file of list) {
      if (!ACCEPT_MIME.has(file.type)) { setError(t('biz.attachmentsTypeError')); continue; }
      const isPdf = file.type === 'application/pdf';
      if (isPdf ? pdfRoom <= 0 : imageRoom <= 0) {
        setError(isPdf ? t('biz.attachmentsMaxPdfs', { max: MAX_PDFS }) : t('biz.attachmentsMaxImages', { max: MAX_IMAGES }));
        continue;
      }
      if (file.size > (isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES)) {
        setError(isPdf ? t('biz.attachmentsPdfSizeError') : t('biz.attachmentsImageSizeError'));
        continue;
      }
      if (isPdf) pdfRoom -= 1; else imageRoom -= 1;
      accepted.push({
        id: `pending-${++seqRef.current}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isPdf: file.type === 'application/pdf',
        progress: 0,
      });
    }
    if (!accepted.length) return;
    if (!(await confirmImageUpload(accepted.map((p) => p.file)))) {
      accepted.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return;
    }
    setPending((prev) => [...prev, ...accepted]);
    accepted.forEach((p) => void upload(p));
  }

  function removeUploaded(index: number) {
    onChange(valueRef.current.filter((_, i) => i !== index));
  }
  function removePending(id: string) {
    removedRef.current.add(id);
    drop(id);
  }

  const media: DeliverableMedia[] = [
    ...value.map(toMedia),
    ...pending.map((p) => ({ id: p.id, url: p.previewUrl, name: p.file.name, kind: p.isPdf ? 'pdf' as const : 'image' as const, sizeBytes: p.file.size })),
  ];
  const pdfCount = value.filter(isPdfAttachment).length + pending.filter((p) => p.isPdf).length;
  const imageCount = value.length + pending.length - pdfCount;
  const full = imageCount >= MAX_IMAGES && pdfCount >= MAX_PDFS;

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    if (!disabled && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
          <Paperclip size={14} className="text-violet" />
          {t('biz.attachmentsHeading')}
          <span className="font-normal text-ink-soft">({t('common.optional')})</span>
        </p>
        {value.length + pending.length > 0 && (
          <span className="text-[12px] text-ink-soft">
            {t('biz.attachmentsCount', { images: imageCount, maxImages: MAX_IMAGES, pdfs: pdfCount, maxPdfs: MAX_PDFS })}
          </span>
        )}
      </div>

      {!full && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors',
            drag ? 'border-violet bg-violet/[0.06]' : 'border-line-strong bg-surface hover:border-violet/50 hover:bg-violet/[0.03]',
            disabled && 'pointer-events-none opacity-60',
          )}
        >
          <UploadCloud size={22} className="text-violet" />
          <span className="text-[14px] font-semibold text-ink">{t('biz.attachmentsAdd')}</span>
          <span className="text-[12px] text-ink-soft">{t('biz.attachmentsHint', { maxImages: MAX_IMAGES, maxPdfs: MAX_PDFS })}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {error && <p className="mt-2 text-[12px] font-medium text-error">{error}</p>}

      {media.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((a, i) => (
            <Tile
              key={`${a.url}-${i}`}
              name={a.name}
              url={a.url}
              isPdf={isPdfAttachment(a)}
              sizeBytes={a.sizeBytes}
              onOpen={() => setViewer(i)}
              onRemove={disabled ? undefined : () => { if (window.confirm(t('biz.attachmentsRemoveConfirm', { name: a.name }))) removeUploaded(i); }}
              removeLabel={t('biz.attachmentsRemove', { name: a.name })}
            />
          ))}
          {pending.map((p, i) => (
            <Tile
              key={p.id}
              name={p.file.name}
              url={p.previewUrl}
              isPdf={p.isPdf}
              sizeBytes={p.file.size}
              progress={p.progress}
              error={p.error}
              onOpen={() => setViewer(value.length + i)}
              onRemove={() => { if (window.confirm(t('biz.attachmentsRemoveConfirm', { name: p.file.name }))) removePending(p.id); }}
              onRetry={() => void upload(p)}
              removeLabel={t('biz.attachmentsRemove', { name: p.file.name })}
            />
          ))}
        </div>
      )}

      <DeliverableGallery items={media} index={viewer} onClose={() => setViewer(null)} onNavigate={setViewer} />
    </div>
  );
}

/** Read-only attachment grid for event detail pages; tiles open the preview. */
export function EventAttachmentsView({ attachments }: { attachments?: CampaignAttachment[] | null }) {
  const t = useT();
  const [viewer, setViewer] = useState<number | null>(null);
  const list = attachments ?? [];
  if (!list.length) return null;
  const media = list.map(toMedia);
  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {list.map((a, i) => (
          <Tile
            key={`${a.url}-${i}`}
            name={a.name}
            url={a.url}
            isPdf={isPdfAttachment(a)}
            sizeBytes={a.sizeBytes}
            onOpen={() => setViewer(i)}
            onDownload={() => void downloadFile(a.url, a.name)}
            removeLabel={t('biz.attachmentsRemove', { name: a.name })}
          />
        ))}
      </div>
      <DeliverableGallery items={media} index={viewer} onClose={() => setViewer(null)} onNavigate={setViewer} />
    </>
  );
}
