import { useRef, useState, type DragEvent } from 'react';
import { UploadCloud, Camera } from 'lucide-react';
import { cn } from './cn';

/** Rough "is this a phone/tablet with a camera" check — drives the capture UI. */
const IS_MOBILE =
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) &&
  typeof window !== 'undefined' &&
  'ontouchstart' in window;

export const DELIVERABLE_ACCEPT = '.jpg,.jpeg,.png,.pdf,.docx';
const ACCEPT_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
export const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Single-file picker with drag-and-drop and client-side type + size checks
 * (spec §21, §61 — JPG/PNG/PDF/DOCX, 5 MB). The server re-validates.
 */
export function FileUpload({
  onFile,
  disabled,
  busy,
  hint,
  cameraLabel,
  errorLabel,
  sizeErrorLabel,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
  busy?: boolean;
  hint: string;
  cameraLabel?: string;
  errorLabel: string;
  sizeErrorLabel: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const accept = (file: File | undefined) => {
    if (!file) return;
    setError('');
    const okType = ACCEPT_MIME.has(file.type) || /\.(jpe?g|png|pdf|docx)$/i.test(file.name);
    if (!okType) return setError(errorLabel);
    if (file.size > MAX_BYTES) return setError(sizeErrorLabel);
    onFile(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled && !busy) accept(e.dataTransfer.files[0]);
  };

  return (
    <div>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          'disabled:cursor-not-allowed disabled:opacity-60',
          dragging ? 'border-brand bg-brand/[0.04]' : 'border-line-strong hover:border-brand/60 hover:bg-surface-dim',
        )}
      >
        {busy ? (
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        ) : (
          <UploadCloud size={24} className="text-ink-soft" />
        )}
        <span className="text-[14px] font-semibold text-ink">{hint}</span>
        <span className="text-[12px] text-ink-soft">JPG · PNG · PDF · DOCX — 5 MB</span>
      </button>

      {/* Mobile: offer the camera directly (opens the device camera app). */}
      {IS_MOBILE && (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => cameraRef.current?.click()}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface py-2.5 text-[13px] font-semibold text-ink disabled:opacity-60"
        >
          <Camera size={15} />
          {cameraLabel ?? 'Take a photo'}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={DELIVERABLE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {error && <p className="mt-2 text-[13px] font-medium text-danger">{error}</p>}
    </div>
  );
}
