import { useState } from 'react';
import { CalendarClock, ExternalLink } from 'lucide-react';
import { useT, type TFn } from '../i18n';
import { rupees } from '../lib/format';
import { requestExtension, type CreatorApplication, type DeliverableExtension } from '../api/creator';
import { approveExtension, rejectExtension, cancelOverdueDeliverable } from '../api/business';
import { Card } from './Card';
import { Alert } from './Alert';
import { Button } from './Button';
import { Modal } from './Modal';
import { Textarea } from './Textarea';
import { TextField } from './TextField';
import { confirmDialog } from './confirmDialog';

// Missed-deadline UI shared by the creator work page and the business
// deliverables page. The deliverable status (overdue / deadline missed) is
// shown separately from the proposal (still "accepted") and from the refund's
// own status — a refund is never described as done until its transfer is.

const MAX_EXTENSION_HOURS = 48;

function when(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function RefundStatusLine({ app, t }: { app: CreatorApplication; t: TFn }) {
  const r = app.refundRequest;
  if (!r) return null;
  const tone = r.status === 'COMPLETED' ? 'success' : r.status === 'FAILED' || r.status === 'REJECTED' ? 'warning' : 'info';
  return (
    <Alert tone={tone} className="mt-3">
      {t(`delivDeadline.refund${r.status}`, { ref: r.referenceCode, amount: rupees(r.amount) })}
    </Alert>
  );
}

function DeadlineHistory({ app, t }: { app: CreatorApplication; t: TFn }) {
  const exts = app.extensions ?? [];
  const original = app.originalContentDeadline ?? app.contentDeadline;
  return (
    <div className="mt-4 rounded-xl border border-line px-4 py-3">
      <p className="mb-2 text-[12px] font-semibold text-ink-soft">{t('delivDeadline.history')}</p>
      <ul className="space-y-1.5 text-[13px] text-ink">
        <li className="flex justify-between gap-3"><span>{t('delivDeadline.histOriginal')}</span><span className="text-ink-soft">{when(original)}</span></li>
        {app.contentOverdueAt && (
          <li className="flex justify-between gap-3"><span>{t('delivDeadline.histOverdue')}</span><span className="text-ink-soft">{when(app.contentOverdueAt)}</span></li>
        )}
        {[...exts].reverse().map((e) => (
          <li key={e.id} className="flex justify-between gap-3">
            <span>{t('delivDeadline.histExtension', { status: t(`delivDeadline.extStatus${e.status}`) })}</span>
            <span className="text-ink-soft">{when(e.approvedDeadline ?? e.proposedDeadline)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DeliverableDeadlinePanel({
  app,
  role,
  counterpartName,
  onChanged,
}: {
  app: CreatorApplication;
  role: 'CREATOR' | 'BUSINESS';
  counterpartName?: string | null;
  onChanged: (message: string) => void;
}) {
  const t = useT();
  const [requestOpen, setRequestOpen] = useState(false);
  const [rejecting, setRejecting] = useState<DeliverableExtension | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const state = app.engagementState;
  const exts = app.extensions ?? [];
  const pending = exts.find((e) => e.status === 'PENDING') ?? null;
  const usedStandard = exts.some((e) => e.kind === 'STANDARD');
  const decisionDue = app.contentGraceDeadline ?? pending?.decisionDueAt ?? null;
  const original = app.originalContentDeadline ?? app.contentDeadline;

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      onChanged(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  // ── Overdue: extension window open ─────────────────────────────────────────
  if (state === 'CONTENT_OVERDUE') {
    return (
      <Card>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger"><CalendarClock size={18} /></span>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-ink">{role === 'CREATOR' ? t('delivDeadline.overdueTitleCreator') : t('delivDeadline.overdueTitleBiz')}</h3>
            <p className="mt-1 text-[13px] text-ink-soft">
              {role === 'CREATOR'
                ? t('delivDeadline.overdueBodyCreator')
                : t('delivDeadline.overdueBodyBiz', { date: when(original), due: when(decisionDue) })}
            </p>
            {role === 'CREATOR' && <p className="mt-1 text-[12px] text-ink-soft">{t('delivDeadline.originalDeadline', { date: when(original) })}</p>}
          </div>
        </div>

        {error && <Alert tone="error" className="mt-3">{error}</Alert>}

        {pending ? (
          <div className="mt-4 rounded-xl bg-surface-dim px-4 py-3">
            <p className="text-[13px] font-semibold text-ink">{t('delivDeadline.extRequestTitle')}</p>
            {role === 'CREATOR' ? (
              <p className="mt-1 text-[13px] text-ink-soft">{t('delivDeadline.extensionPendingCreator', { date: when(pending.proposedDeadline), due: when(pending.decisionDueAt) })}</p>
            ) : (
              <>
                <p className="mt-1 text-[13px] text-ink">{t('delivDeadline.extRequestedUntil', { date: when(pending.proposedDeadline) })}</p>
                <p className="mt-1 text-[13px] text-ink-soft"><span className="font-semibold">{t('delivDeadline.extReason')}:</span> {pending.reason}</p>
                {pending.previewUrl && (
                  <a href={pending.previewUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-violet-dark hover:underline">
                    {t('delivDeadline.extPreview')} <ExternalLink size={12} />
                  </a>
                )}
                <p className="mt-1 text-[12px] font-semibold text-danger">{t('delivDeadline.decideBy', { date: when(pending.decisionDueAt) })}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" loading={busy} onClick={async () => {
                    if (!(await confirmDialog({ title: t('delivDeadline.approveConfirmTitle'), message: t('delivDeadline.approveConfirmBody', { date: when(pending.proposedDeadline) }), confirmLabel: t('delivDeadline.approve') }))) return;
                    run(() => approveExtension(app.id, pending.id), t('delivDeadline.approved'));
                  }}>{t('delivDeadline.approve')}</Button>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => setRejecting(pending)}>{t('delivDeadline.reject')}</Button>
                </div>
              </>
            )}
          </div>
        ) : role === 'CREATOR' ? (
          usedStandard || (app.extensionCount ?? 0) > 0 ? (
            <Alert tone="neutral" className="mt-4">{t('delivDeadline.extensionUsed')}</Alert>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={() => setRequestOpen(true)}>{t('delivDeadline.requestExtension')}</Button>
              {decisionDue && <span className="text-[12px] font-semibold text-danger">{t('delivDeadline.requestBy', { date: when(decisionDue) })}</span>}
            </div>
          )
        ) : null}

        {role === 'BUSINESS' && (
          <div className="mt-4 border-t border-line pt-3">
            <Button size="sm" variant="danger" disabled={busy} onClick={async () => {
              if (!(await confirmDialog({ title: t('delivDeadline.cancelConfirmTitle'), message: t('delivDeadline.cancelConfirmBody'), confirmLabel: t('delivDeadline.cancelRefund'), tone: 'danger' }))) return;
              run(() => cancelOverdueDeliverable(app.id), t('delivDeadline.cancelled'));
            }}>{t('delivDeadline.cancelRefund')}</Button>
          </div>
        )}

        <DeadlineHistory app={app} t={t} />

        {role === 'CREATOR' && (
          <RequestExtensionModal
            open={requestOpen}
            onClose={() => setRequestOpen(false)}
            onSubmit={async (body) => {
              await requestExtension(app.id, body);
              setRequestOpen(false);
              onChanged(t('delivDeadline.requestSent'));
            }}
          />
        )}
        {role === 'BUSINESS' && rejecting && (
          <RejectExtensionModal
            onClose={() => setRejecting(null)}
            onSubmit={async (note) => {
              await rejectExtension(app.id, rejecting.id, note);
              setRejecting(null);
              onChanged(t('delivDeadline.rejected'));
            }}
          />
        )}
      </Card>
    );
  }

  // ── Closed for good (deadline missed / cancelled) ──────────────────────────
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger"><CalendarClock size={18} /></span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">{role === 'CREATOR' ? t('delivDeadline.closedTitleCreator') : t('delivDeadline.closedTitleBiz')}</h3>
          <p className="mt-1 text-[13px] text-ink-soft">
            {role === 'CREATOR' ? t('delivDeadline.closedBodyCreator') : t('delivDeadline.closedBodyBiz', { name: counterpartName ?? '—' })}
          </p>
          {role === 'CREATOR' && <p className="mt-1 text-[12px] text-ink-soft">{t('delivDeadline.newAgreementNote')}</p>}
        </div>
      </div>
      {role === 'BUSINESS' && <RefundStatusLine app={app} t={t} />}
      <DeadlineHistory app={app} t={t} />
    </Card>
  );
}

/** Notice above the upload card once an extension is in force. */
export function ExtendedDeadlineNotice({ app }: { app: CreatorApplication }) {
  const t = useT();
  if (!(app.extensionCount && app.extensionCount > 0) || !app.contentDeadline) return null;
  return <Alert tone="warning" className="mb-4">{t('delivDeadline.extendedFinal', { date: when(app.contentDeadline) })}</Alert>;
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function RequestExtensionModal({ open, onClose, onSubmit }: {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: { reason: string; proposedDeadline: string; previewUrl?: string }) => Promise<void>;
}) {
  const t = useT();
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(() => toLocalInput(new Date(Date.now() + 24 * 3_600_000)));
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  // Bounds fixed when the modal mounts (the backend re-validates on submit).
  const [{ min, max }] = useState(() => ({
    min: toLocalInput(new Date(Date.now() + 60 * 60_000)),
    max: toLocalInput(new Date(Date.now() + MAX_EXTENSION_HOURS * 3_600_000)),
  }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('delivDeadline.modalTitle')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button
            loading={busy}
            disabled={reason.trim().length < 10 || !date}
            onClick={async () => {
              setBusy(true);
              setErr('');
              try {
                await onSubmit({ reason: reason.trim(), proposedDeadline: new Date(date).toISOString(), previewUrl: preview.trim() || undefined });
              } catch (e) {
                setErr(e instanceof Error ? e.message : t('common.somethingWrong'));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('delivDeadline.submitRequest')}
          </Button>
        </div>
      }
    >
      {err && <Alert tone="error" className="mb-3">{err}</Alert>}
      <p className="mb-4 text-[13px] text-ink-soft">{t('delivDeadline.modalHint', { hours: MAX_EXTENSION_HOURS })}</p>
      <div className="space-y-4">
        <Textarea label={t('delivDeadline.fieldReason')} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
        <TextField label={t('delivDeadline.fieldNewDate')} type="datetime-local" min={min} max={max} value={date} onChange={(e) => setDate(e.target.value)} />
        <TextField label={t('delivDeadline.fieldPreview')} type="url" placeholder="https://" value={preview} onChange={(e) => setPreview(e.target.value)} />
      </div>
    </Modal>
  );
}

function RejectExtensionModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (note: string) => Promise<void> }) {
  const t = useT();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <Modal
      open
      onClose={onClose}
      title={t('delivDeadline.rejectTitle')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
          <Button variant="danger" loading={busy} disabled={note.trim().length < 3} onClick={async () => {
            setBusy(true);
            setErr('');
            try {
              await onSubmit(note.trim());
            } catch (e) {
              setErr(e instanceof Error ? e.message : t('common.somethingWrong'));
            } finally {
              setBusy(false);
            }
          }}>{t('delivDeadline.reject')}</Button>
        </div>
      }
    >
      {err && <Alert tone="error" className="mb-3">{err}</Alert>}
      <p className="mb-3 text-[13px] text-ink-soft">{t('delivDeadline.rejectBody')}</p>
      <Textarea label={t('delivDeadline.rejectReason')} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
    </Modal>
  );
}
