import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';
import { useOptionalT } from '../i18n';
import { Button } from './Button';
import { cn } from './cn';
import { registerConfirmDialog, type DialogRequest, type DialogTone } from './confirmDialog';

/** Root-mounted host for `confirmDialog()` / `alertDialog()` (see ./confirmDialog.ts). */
export function ConfirmDialogHost() {
  const [req, setReq] = useState<DialogRequest | null>(null);

  useEffect(() => {
    registerConfirmDialog(setReq);
    return () => registerConfirmDialog(null);
  }, []);

  const finish = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
  };

  // Keyed so a dialog opened right after another starts with fresh state.
  return req ? <Dialog key={req.id} req={req} onDone={finish} /> : null;
}

const TONE: Record<DialogTone, { icon: typeof Trash2; tile: string; button: 'danger' | 'primary' }> = {
  danger: { icon: Trash2, tile: 'bg-danger/10 text-danger', button: 'danger' },
  warning: { icon: AlertTriangle, tile: 'bg-warning/15 text-warning', button: 'primary' },
  default: { icon: Info, tile: 'bg-brand/10 text-brand', button: 'primary' },
};

function Dialog({ req, onDone }: { req: DialogRequest; onDone: (ok: boolean) => void }) {
  const t = useOptionalT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const isAlert = req.kind === 'alert';
  const tone = TONE[req.tone ?? (isAlert ? 'default' : 'danger')];
  const Icon = tone.icon;

  const cancel = () => {
    if (!busy) onDone(false);
  };

  const confirm = async () => {
    if (!req.action) return onDone(true);
    setBusy(true);
    setError(null);
    try {
      await req.action();
      onDone(true);
    } catch (e) {
      setError((e as Error)?.message || t('common.somethingWrong'));
      setBusy(false);
    }
  };

  const cancelRef = useRef(cancel);
  useEffect(() => {
    cancelRef.current = cancel;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && cancelRef.current();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    confirmRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-lp-black/45 backdrop-blur-[2px]" onClick={cancel} aria-hidden />
      <div
        role={isAlert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={req.message ? 'confirm-dialog-message' : undefined}
        className="relative w-full rounded-t-2xl bg-surface p-6 shadow-xl sm:max-w-[420px] sm:rounded-2xl"
      >
        <button
          onClick={cancel}
          disabled={busy}
          aria-label={t('common.close')}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-ink-soft hover:bg-surface-dim disabled:opacity-50"
        >
          <X size={18} />
        </button>

        <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl', tone.tile)}>
          <Icon size={20} />
        </span>

        <h2 id="confirm-dialog-title" className="mt-4 pr-6 text-[17px] font-semibold text-ink">
          {req.title}
        </h2>
        {req.message && (
          <p id="confirm-dialog-message" className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
            {req.message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-[13px] font-medium text-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          {!isAlert && (
            <Button variant="secondary" onClick={cancel} disabled={busy}>
              {req.cancelLabel ?? t('common.cancel')}
            </Button>
          )}
          <Button ref={confirmRef} variant={isAlert ? 'primary' : tone.button} onClick={confirm} loading={busy}>
            {req.confirmLabel ?? (isAlert ? t('common.ok') : t('common.confirm'))}
          </Button>
        </div>
      </div>
    </div>
  );
}
