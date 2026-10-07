import { useState, type ChangeEvent, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, ImagePlus, Loader2, Plus, Trash2, X } from 'lucide-react';
import type { CommunityEventUploadKind } from '../../lib/api';
import { checkImages, uploadImages } from './formUtils';
import { confirmImageUpload } from '../../app/ui/uploadPreview';

/** Shared building blocks for the Community Events admin form. */

/** Card section. Optional sections collapse so the form never feels like one huge wall. */
export function Section({
  id,
  title,
  description,
  optional,
  defaultOpen = true,
  count,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  optional?: boolean;
  defaultOpen?: boolean;
  count?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section id={id} className="bg-white rounded-2xl border border-gray-200 adm-card scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span>
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            {title}
            {optional && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">Optional</span>}
            {!!count && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">{count}</span>}
          </span>
          {description && <span className="mt-0.5 block text-xs text-gray-400">{description}</span>}
        </span>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="space-y-4 border-t border-gray-100 px-5 pb-5 pt-4">{children}</div>}
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-gray-600 mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error ? <p className="text-xs text-red-500 mt-1">{error}</p> : hint ? <p className="text-xs text-gray-400 mt-1">{hint}</p> : null}
    </div>
  );
}

/** Single image: preview + upload / replace / remove. */
export function ImageField({
  value,
  onChange,
  kind,
  aspect = 'aspect-[16/9]',
  shape = 'rounded-xl',
  previewWidth = 'w-full max-w-md',
  label,
  error,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  kind: CommunityEventUploadKind;
  aspect?: string;
  shape?: string;
  previewWidth?: string;
  label?: string;
  error?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handle(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const problem = checkImages([file]);
    if (problem) return setErr(problem);
    if (!(await confirmImageUpload(file))) return;
    setErr(null);
    setBusy(true);
    try {
      const [url] = await uploadImages([file], kind);
      onChange(url);
    } catch (ex) {
      setErr((ex as Error).message || 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className={`relative ${previewWidth} ${aspect} ${shape} overflow-hidden border border-dashed ${error ? 'border-red-300' : 'border-gray-300'} bg-gray-50`}>
        {busy ? (
          <div className="flex h-full items-center justify-center"><Loader2 size={20} className="animate-spin text-gray-400" /></div>
        ) : value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              title="Remove image"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow hover:text-red-600"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-gray-400">
            <ImagePlus size={20} />
            {label && <span className="text-[11px]">{label}</span>}
          </div>
        )}
      </div>
      <label className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors">
        <ImagePlus size={13} />
        {value ? 'Replace' : 'Upload'}
        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handle} disabled={busy} />
      </label>
      {(err || error) && <p className="text-xs text-red-500 mt-1">{err ?? error}</p>}
    </div>
  );
}

/** Up / down / remove controls for a row in a repeatable list. */
export function RowControls({
  index,
  total,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onRemove: () => void;
}) {
  const btn = 'p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent';
  return (
    <div className="flex items-center gap-0.5">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(index, index - 1)} title="Move up">
        <ChevronUp size={15} />
      </button>
      <button type="button" className={btn} disabled={index === total - 1} onClick={() => onMove(index, index + 1)} title="Move down">
        <ChevronDown size={15} />
      </button>
      <button type="button" className="p-1.5 rounded-lg text-red-400 hover:bg-red-50" onClick={onRemove} title="Remove">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

export function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
    >
      <Plus size={15} /> {label}
    </button>
  );
}

