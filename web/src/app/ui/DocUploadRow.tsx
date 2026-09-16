import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, FileText, Upload, X } from 'lucide-react';
import { Button } from './Button';

export type DocStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

/**
 * One uploadable-document row — shared by CreatorVerificationPage and
 * BusinessVerificationPage (identical shape, different doc types per role).
 * Picking a file shows a preview with Confirm/Cancel instead of uploading
 * straight away, so a wrong pick doesn't burn a review cycle.
 */
export function DocUploadRow({
  icon,
  label,
  hint,
  status,
  uploading,
  onUpload,
  tapToUploadLabel,
  statusLabel,
  uploadButtonLabel,
  cancelLabel,
  doneLabel,
}: {
  icon: ReactNode;
  label: string;
  hint?: string;
  status: DocStatus;
  uploading: boolean;
  onUpload: (file: File) => void;
  tapToUploadLabel: string;
  statusLabel: (status: DocStatus) => string;
  uploadButtonLabel: string;
  cancelLabel: string;
  doneLabel: string;
}) {
  const locked = uploading || status === 'PENDING' || status === 'APPROVED';
  const [pending, setPending] = useState<File | null>(null);
  const previewUrl = useMemo(
    () => (pending && pending.type.startsWith('image/') ? URL.createObjectURL(pending) : null),
    [pending],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function reset() {
    setPending(null);
  }

  function confirm() {
    if (!pending) return;
    onUpload(pending);
    reset();
  }

  return (
    <div className="py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-violet/10 text-violet">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-ink">{label}</p>
          <p className="mt-0.5 text-[12px] text-ink-soft">{status === 'NONE' ? (hint ?? tapToUploadLabel) : statusLabel(status)}</p>
        </div>
        {status === 'APPROVED' ? (
          <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[12px] font-semibold text-success">
            <CheckCircle2 size={13} />
            {doneLabel}
          </span>
        ) : (
          <label
            className={`flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold ${
              locked || pending
                ? 'cursor-not-allowed border-line-strong text-ink-soft opacity-60'
                : 'border-violet/30 text-violet-dark hover:bg-violet/[0.06]'
            }`}
          >
            {uploading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-dark border-t-transparent" aria-hidden />
            ) : (
              <Upload size={13} />
            )}
            {uploadButtonLabel}
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              disabled={locked || Boolean(pending)}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPending(f);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>

      {pending && (
        <div className="mt-3 rounded-xl bg-surface-dim p-3.5">
          {previewUrl ? (
            <img src={previewUrl} alt={pending.name} className="h-40 w-full rounded-lg object-contain bg-surface" />
          ) : (
            <div className="flex items-center gap-2.5 rounded-lg bg-surface px-3 py-2.5">
              <FileText size={18} className="flex-shrink-0 text-ink-soft" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{pending.name}</span>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={confirm} loading={uploading}>
              <Upload size={13} />
              {uploadButtonLabel}
            </Button>
            <Button size="sm" variant="secondary" onClick={reset} disabled={uploading}>
              <X size={13} />
              {cancelLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
