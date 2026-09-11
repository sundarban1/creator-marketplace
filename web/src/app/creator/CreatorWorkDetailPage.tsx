import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import { useT } from '../i18n';
import { useApplications } from './useApplications';
import { rupees } from '../lib/format';
import { useDeadlineLabel } from '../lib/useDeadlineLabel';
import {
  startWork,
  submitWork,
  uploadDeliverableFile,
  removeDeliverableFile,
  reportIssue,
  type CreatorApplication,
} from '../api/creator';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { FileUpload } from '../ui/FileUpload';
import { DeliverableStrip } from '../ui/DeliverableGallery';
import { EngagementBadge } from './EngagementBadge';

const CAN_UPLOAD = new Set(['IN_PROGRESS', 'REVISION_REQUESTED', 'CONTENT_OVERDUE']);
const CAN_REPORT = new Set([
  'ESCROW_FUNDED',
  'IN_PROGRESS',
  'REVISION_REQUESTED',
  'CONTENT_OVERDUE',
  'BUSINESS_REVIEW',
  'PAYMENT_RELEASE_PENDING',
]);

export function CreatorWorkDetailPage() {
  const t = useT();
  const { id = '' } = useParams();
  const { all, loading, error, reload } = useApplications();
  const fmtDeadline = useDeadlineLabel();
  const app = all.find((a) => a.id === id) ?? null;

  const [flash, setFlash] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [note, setNote] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  if (loading && !app) {
    return (
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-4 h-8 w-2/3" />
        <div className="mt-6 space-y-3">
          <SkeletonText lines={4} />
        </div>
      </div>
    );
  }

  if ((error && !app) || (!loading && !app)) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <EmptyState
          variant="not-found"
          title={t('workDetail.notFoundTitle')}
          description={t('workDetail.notFoundBody')}
          action={{ label: t('work.title'), href: '/creator/work' }}
        />
      </div>
    );
  }

  if (!app) return null;
  const c = app.campaign;
  const state = app.engagementState;
  const files = app.deliverableFiles ?? [];
  const videos = app.deliverableVideos ?? [];
  const deadline = app.contentDeadline ? fmtDeadline(app.contentDeadline) : null;

  const run = async (fn: () => Promise<CreatorApplication | void>, successMsg: string) => {
    setBusy(true);
    setActionError('');
    try {
      await fn();
      setFlash(successMsg);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async (file: File) => {
    setBusy(true);
    setActionError('');
    try {
      await uploadDeliverableFile(app.id, file);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (fileId: string) => {
    if (!window.confirm(t('workDetail.confirmRemoveFile'))) return;
    setActionError('');
    setBusy(true);
    try {
      await removeDeliverableFile(app.id, fileId);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/creator/work"
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft size={14} />
        {t('workDetail.back')}
      </Link>

      <div className="mt-4 flex items-start gap-4">
        {c?.featureImageUrl ? (
          <img
            src={c.featureImageUrl}
            alt=""
            className="h-16 w-16 flex-shrink-0 rounded-xl border border-line object-cover"
          />
        ) : (
          <Avatar name={c?.business?.businessName ?? 'Business'} src={c?.business?.logoUrl} size="lg" />
        )}
        <div className="min-w-0">
          <h1 className="font-serif text-2xl font-medium tracking-tight text-ink">{c?.title ?? 'Campaign'}</h1>
          <p className="mt-0.5 text-[14px] text-ink-soft">{c?.business?.businessName}</p>
          <div className="mt-2">
            <EngagementBadge state={state} />
          </div>
        </div>
      </div>

      {flash && (
        <Alert tone="success" className="mt-5">
          {flash}
        </Alert>
      )}
      {actionError && (
        <Alert tone="error" className="mt-5">
          {actionError}
        </Alert>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr] lg:items-start">
        {/* Main column — deadline + status-driven action */}
        <div className="space-y-6">
          {deadline && (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3">
              <CalendarClock size={16} className={deadline.urgent ? 'text-warning' : 'text-ink-soft'} />
              <span className="text-[13px] text-ink-soft">{t('workDetail.deadlineHeading')}:</span>
              <span className={`text-[13px] font-semibold ${deadline.urgent ? 'text-warning' : 'text-ink'}`}>
                {deadline.label}
              </span>
            </div>
          )}
          {renderPanel()}
        </div>

        {/* Aside — the proposal */}
        <Card>
          <CardHeader title={t('workDetail.proposalHeading')} />
          <dl className="space-y-3 text-[14px]">
            <div>
              <dt className="text-[12px] font-medium text-ink-soft">{t('workDetail.coverLetter')}</dt>
              <dd className="mt-1 whitespace-pre-line leading-relaxed text-ink">{app.coverLetter}</dd>
            </div>
            <div className="flex gap-8 border-t border-line pt-3">
              <div>
                <dt className="text-[12px] font-medium text-ink-soft">{t('workDetail.yourRate')}</dt>
                <dd className="mt-0.5 font-semibold text-ink">{rupees(app.proposedRate)}</dd>
              </div>
              <div>
                <dt className="text-[12px] font-medium text-ink-soft">{t('workDetail.timeline')}</dt>
                <dd className="mt-0.5 text-ink">{app.timeline}</dd>
              </div>
            </div>
          </dl>
        </Card>
      </div>

      {CAN_REPORT.has(state) && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setReportOpen(true)}
            className="text-[13px] font-semibold text-ink-soft underline hover:text-danger"
          >
            {t('workDetail.reportIssue')}
          </button>
        </div>
      )}

      <ReportIssueModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={async (reason) => {
          await reportIssue(app.id, reason);
          setReportOpen(false);
          setFlash(t('workDetail.reportIssueSent'));
          reload();
        }}
      />
    </div>
  );

  function renderPanel() {
    if (state === 'PROPOSAL_PENDING') return <Alert tone="info">{t('workDetail.awaitingDecision')}</Alert>;
    if (state === 'CREATOR_SELECTED') return <Alert tone="info">{t('workDetail.awaitingPayment')}</Alert>;

    if (state === 'ESCROW_FUNDED') {
      return (
        <Card>
          <p className="text-[14px] text-ink-soft">{t('workDetail.startWorkNote')}</p>
          <Button className="mt-4" loading={busy} onClick={() => run(() => startWork(app!.id), t('workDetail.workStarted'))}>
            {t('workDetail.startWork')}
          </Button>
        </Card>
      );
    }

    if (CAN_UPLOAD.has(state)) {
      return (
        <Card>
          {state === 'REVISION_REQUESTED' && app!.revisionNotes && app!.revisionNotes.length > 0 && (
            <Alert tone="warning" className="mb-4">
              <span className="block font-semibold">{t('workDetail.revisionRequested')}</span>
              {app!.revisionNotes[0].note}
            </Alert>
          )}

          <CardHeader title={t('workDetail.deliverablesHeading')} />
          <div className="mb-3">
            <DeliverableStrip
              files={files}
              videos={videos}
              onRemove={handleRemove}
              removeLabel={t('workDetail.remove')}
            />
          </div>

          <div className="mt-3">
            <FileUpload
              onFile={handleUpload}
              busy={busy}
              hint={t('workDetail.uploadHint')}
              cameraLabel={t('workDetail.takePhoto')}
              errorLabel={t('workDetail.fileTypeError')}
              sizeErrorLabel={t('workDetail.fileSizeError')}
            />
          </div>

          <div className="mt-4">
            <Textarea
              label={t('workDetail.submitNote')}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <Button
            className="mt-4"
            loading={busy}
            disabled={files.length === 0}
            onClick={() => run(() => submitWork(app!.id, note.trim() || undefined), t('workDetail.workSubmitted'))}
          >
            {t('workDetail.submitForReview')}
          </Button>
          {files.length === 0 && (
            <p className="mt-2 text-[12px] text-ink-soft">{t('workDetail.submitNeedsFile')}</p>
          )}
        </Card>
      );
    }

    if (state === 'BUSINESS_REVIEW') {
      return (
        <Card>
          <Alert tone="progress" className="mb-4">
            {t('workDetail.submitted')}
            {app!.submittedAt &&
              ` · ${t('workDetail.submittedOn', {
                date: new Date(app!.submittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
              })}`}
          </Alert>
          <CardHeader title={t('workDetail.deliverablesHeading')} />
          <div className="mb-3">
            <DeliverableStrip files={files} videos={videos} />
          </div>
        </Card>
      );
    }

    if (state === 'PAYMENT_RELEASE_PENDING') return <Alert tone="progress">{t('workDetail.paymentOnTheWay')}</Alert>;
    if (state === 'PAYMENT_RELEASED' || state === 'COMPLETED') {
      return (
        <Alert tone="success">
          {t('workDetail.paid', { amount: app!.proposedRate.toLocaleString('en-IN') })}
        </Alert>
      );
    }

    return <Alert tone="neutral">{t('workDetail.closedGeneric')}</Alert>;
  }
}


function ReportIssueModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const t = useT();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('workDetail.reportIssueTitle')}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="danger"
            loading={busy}
            disabled={reason.trim().length < 10}
            onClick={async () => {
              setBusy(true);
              setErr('');
              try {
                await onSubmit(reason.trim());
              } catch (e) {
                setErr(e instanceof Error ? e.message : t('common.somethingWrong'));
              } finally {
                setBusy(false);
              }
            }}
          >
            {t('workDetail.reportIssueSubmit')}
          </Button>
        </div>
      }
    >
      {err && <Alert tone="error" className="mb-3">{err}</Alert>}
      <p className="mb-3 text-[13px] text-ink-soft">{t('workDetail.reportIssueHint')}</p>
      <Textarea
        label={t('workDetail.reportIssueReason')}
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </Modal>
  );
}
