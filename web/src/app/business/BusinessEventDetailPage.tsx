import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil, MessageCircle } from 'lucide-react';
import { useT, type TFn } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { rupees, perCreatorBudget } from '../lib/format';
import {
  fetchCampaign,
  fetchBusinessApplications,
  acceptApplication,
  rejectApplication,
  initiateEsewaPayment,
  reportIssue,
  type BusinessApplication,
} from '../api/business';
import { ApiError } from '../lib/apiClient';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton, SkeletonText } from '../ui/Skeleton';
import { Modal } from '../ui/Modal';
import { Textarea } from '../ui/Textarea';
import { EngagementBadge } from '../creator/EngagementBadge';
import { DisputeStatusCard } from '../creator/DisputeStatus';
import { ReviewSection } from '../creator/ReviewSection';

// Mirrors CreatorWorkDetailPage.tsx's CAN_REPORT — same shared engagement
// states, just viewed from the business side.
const CAN_REPORT = new Set(['ESCROW_FUNDED', 'IN_PROGRESS', 'REVISION_REQUESTED', 'CONTENT_OVERDUE', 'BUSINESS_REVIEW', 'PAYMENT_RELEASE_PENDING']);

/** A plain-language status line for the "Working on this" row — the badge
 * already names the raw state, this explains what it means and, where
 * there's something to do, links straight to it. */
function statusLine(state: string, campaignId: string, t: TFn): { text: string; link?: { to: string; label: string } } | null {
  switch (state) {
    case 'CREATOR_SELECTED':
      return { text: t('biz.statusAwaitingPayment') };
    case 'ESCROW_FUNDED':
      return { text: t('biz.statusAwaitingStart') };
    case 'IN_PROGRESS':
      return { text: t('biz.statusCreatorWorking') };
    case 'REVISION_REQUESTED':
      return { text: t('biz.statusRevisionRequested') };
    case 'CONTENT_OVERDUE':
      return { text: t('biz.statusContentOverdue') };
    case 'BUSINESS_REVIEW':
      return {
        text: t('biz.statusReadyForReview'),
        link: { to: `/business/deliverables?tab=review&campaign=${campaignId}`, label: t('biz.viewContent') },
      };
    case 'PAYMENT_RELEASE_PENDING':
      return { text: t('biz.statusPaymentReleasing') };
    case 'PAYMENT_RELEASED':
    case 'COMPLETED':
      return { text: t('biz.statusCompleted') };
    default:
      return null;
  }
}

export function BusinessEventDetailPage() {
  const t = useT();
  const { id = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const campaign = useAsync((s) => fetchCampaign(id, s), [id]);
  const apps = useAsync((s) => fetchBusinessApplications({ limit: 100 }, s), []);

  // Landing back here after an eSewa redirect (see backend's
  // esewaSuccessCallbackWeb / esewaFailureCallbackWeb) — the query string
  // carries the result. Read once via a lazy initializer (plain render-time
  // logic, not a setState-in-effect) so the flash survives the effect below
  // scrubbing the query string a moment later.
  const [flash, setFlash] = useState(() => (searchParams.get('payment') === 'success' ? t('biz.paymentSuccessFlash') : ''));
  const [error, setError] = useState(() =>
    searchParams.get('payment') === 'failed' ? searchParams.get('paymentError') || t('biz.paymentFailedFlash') : '',
  );
  const [busyId, setBusyId] = useState('');
  const [payTarget, setPayTarget] = useState<BusinessApplication | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState('');
  const [reportTarget, setReportTarget] = useState<BusinessApplication | null>(null);

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (!payment) return;
    if (payment === 'success') apps.reload();
    const next = new URLSearchParams(searchParams);
    next.delete('payment');
    next.delete('paymentError');
    setSearchParams(next, { replace: true });
    // Intentionally run once on mount — this only reacts to the query string
    // eSewa's redirect landed with, not to later navigation within the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { applicants, accepted } = useMemo(() => {
    const mine = (apps.data?.items ?? []).filter((a) => a.campaignId === id);
    return {
      applicants: mine.filter((a) => a.engagementState === 'PROPOSAL_PENDING'),
      accepted: mine.filter((a) => a.engagementState !== 'PROPOSAL_PENDING' && a.status !== 'REJECTED'),
    };
  }, [apps.data, id]);

  const act = async (fn: () => Promise<unknown>, appId: string, msg: string) => {
    setBusyId(appId);
    setError('');
    try {
      await fn();
      setFlash(msg);
      apps.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusyId('');
    }
  };

  async function confirmPay() {
    if (!payTarget) return;
    setPayBusy(true);
    setPayError('');
    try {
      const { paymentUrl } = await initiateEsewaPayment(payTarget.id);
      window.location.href = paymentUrl;
    } catch (err) {
      setPayError(err instanceof Error ? err.message : t('common.somethingWrong'));
      setPayBusy(false);
    }
  }

  if (campaign.loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <Skeleton className="h-8 w-2/3" />
        <SkeletonText lines={3} className="mt-4" />
      </div>
    );
  }
  if (campaign.error || !campaign.data) {
    const nf = campaign.error instanceof ApiError && campaign.error.status === 404;
    return (
      <div className="mx-auto max-w-2xl py-10">
        <EmptyState
          variant={nf ? 'not-found' : 'error'}
          title={t('public.eventNotFoundTitle')}
          action={{ label: t('biz.eventsTitle'), href: '/business/events' }}
        />
      </div>
    );
  }

  const c = campaign.data;
  const budget = perCreatorBudget(c);
  const isPaid = c.campaignType !== 'OPEN_EVENT';
  const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/business/events" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft size={14} />
        {t('biz.eventsTitle')}
      </Link>

      <PageHeader
        title={c.title}
        description={isPaid ? `${c.category} · ${t('public.budgetPerCreator', { amount: budget.amount })}` : c.category}
        actions={
          <Link
            to={`/business/events/${id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-line-strong px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-surface-dim"
          >
            <Pencil size={14} />
            {t('common.edit')}
          </Link>
        }
      />

      {flash && <Alert tone="success" className="mb-5">{flash}</Alert>}
      {error && <Alert tone="error" className="mb-5">{error}</Alert>}

      {/* Applicants */}
      <Card>
        <CardHeader title={`${t('biz.applicantsHeading')} (${applicants.length})`} />
        {apps.loading ? (
          <Skeleton className="h-24 w-full" />
        ) : applicants.length === 0 ? (
          <p className="text-[13px] text-ink-soft">{t('biz.noApplicants')}</p>
        ) : (
          <ul className="space-y-3">
            {applicants.map((a) => (
              <ApplicantRow
                key={a.id}
                a={a}
                busy={busyId === a.id}
                onAccept={() => act(() => acceptApplication(id, a.id), a.id, t('biz.proposalAccepted'))}
                onReject={() => {
                  if (!window.confirm(t('biz.confirmReject'))) return;
                  act(() => rejectApplication(id, a.id), a.id, t('biz.rejected'));
                }}
              />
            ))}
          </ul>
        )}
      </Card>

      {/* Working on this */}
      <Card className="mt-6">
        <CardHeader title={`${t('biz.acceptedHeading')} (${accepted.length})`} />
        {accepted.length === 0 ? (
          <p className="text-[13px] text-ink-soft">—</p>
        ) : (
          <ul className="space-y-3">
            {accepted.map((a) => {
              const needsPay = isPaid && a.engagementState === 'CREATOR_SELECTED';
              // Chat unlocks once escrow is funded (or immediately for a free
              // event, which never sits in CREATOR_SELECTED at all) — mirrors
              // mobile's activity-timeline.tsx chatLocked condition.
              const chatUnlocked = a.engagementState !== 'PROPOSAL_PENDING' && a.engagementState !== 'CREATOR_SELECTED';
              return (
                <li key={a.id} className="rounded-xl border border-line bg-surface p-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={a.creator?.fullName ?? 'Creator'} src={a.creator?.avatarUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink">{a.creator?.fullName}</p>
                      <p className="text-[12px] text-ink-soft">{rupees(a.proposedRate)}</p>
                      <div className="mt-1.5">
                        <EngagementBadge state={a.engagementState} />
                      </div>
                    </div>
                    {chatUnlocked && (
                      <Link
                        to={`/business/messages?campaign=${id}`}
                        aria-label={t('chat.title')}
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-line-strong text-ink-soft hover:text-ink"
                      >
                        <MessageCircle size={16} />
                      </Link>
                    )}
                    {needsPay && (
                      <Button size="sm" onClick={() => { setPayError(''); setPayTarget(a); }}>
                        {t('biz.payNow')}
                      </Button>
                    )}
                  </div>

                  {!a.dispute && (() => {
                    const info = statusLine(a.engagementState, id, t);
                    if (!info) return null;
                    return (
                      <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-surface-dim px-3 py-2">
                        <p className="text-[12px] text-ink-soft">{info.text}</p>
                        {info.link && (
                          <Link to={info.link.to} className="flex-shrink-0 text-[12px] font-semibold text-violet-dark hover:underline">
                            {info.link.label}
                          </Link>
                        )}
                      </div>
                    );
                  })()}

                  {a.dispute ? (
                    <div className="mt-3">
                      <DisputeStatusCard dispute={a.dispute} viewerRole="BUSINESS" />
                    </div>
                  ) : (
                    CAN_REPORT.has(a.engagementState) && (
                      <div className="mt-2 text-right">
                        <button
                          onClick={() => setReportTarget(a)}
                          className="text-[12px] font-semibold text-ink-soft underline hover:text-danger"
                        >
                          {t('workDetail.reportIssue')}
                        </button>
                      </div>
                    )
                  )}

                  {(a.engagementState === 'COMPLETED' || a.engagementState === 'PAYMENT_RELEASED') && (
                    <ReviewSection appId={a.id} revieweeName={a.creator?.fullName ?? 'the creator'} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="mt-6">
        <CardHeader
          title={t('public.eventAboutHeading')}
          action={
            <Link to={`/business/events/${id}/edit`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-violet-dark hover:underline">
              <Pencil size={12} />
              {t('common.edit')}
            </Link>
          }
        />

        {c.featureImageUrl && (
          <img src={c.featureImageUrl} alt="" className="mb-4 h-48 w-full rounded-xl object-cover" />
        )}

        <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{c.description}</p>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 sm:grid-cols-3">
          <DetailField label={t('public.category')} value={c.category} />
          <DetailField label={t('biz.statusLabel')} value={c.status} />
          {isPaid ? (
            <>
              <DetailField label={t('biz.budgetMinField')} value={rupees(c.budgetMin)} />
              <DetailField label={t('biz.budgetMaxField')} value={rupees(c.budgetMax)} />
              <DetailField label={t('public.navCreators')} value={String(c.creatorsNeeded ?? 1)} />
              <DetailField label={t('public.deadlineLabel')} value={fmtDate(c.deadline)} />
              <DetailField label={t('biz.minFollowersField')} value={c.minFollowers ? String(c.minFollowers) : '—'} />
            </>
          ) : (
            <>
              <DetailField label={t('biz.eventDateLabel')} value={fmtDate(c.eventDate)} />
              <DetailField label={t('biz.eventTimeLabel')} value={c.eventTime ?? '—'} />
              <DetailField label={t('biz.capacityLabel')} value={String(c.capacity ?? c.creatorsNeeded ?? 1)} />
              <DetailField label={t('biz.rsvpDeadlineLabel')} value={fmtDate(c.deadline)} />
            </>
          )}
          <DetailField
            label={t('public.location')}
            value={c.locationType === 'REMOTE' ? t('public.remote') : (isPaid ? c.location : c.venue) || '—'}
          />
          {isFeatured(c) && <DetailField label={t('biz.featureThisEvent')} value="✓" />}
        </dl>

        {isPaid && c.deliverables && (
          <>
            <p className="mt-4 text-[13px] font-semibold text-ink">{t('public.deliverablesHeading')}</p>
            <p className="mt-1 text-[14px] text-ink-soft">{c.deliverables}</p>
          </>
        )}

        {!isPaid && c.benefits && c.benefits.length > 0 && (
          <>
            <p className="mt-4 text-[13px] font-semibold text-ink">{t('biz.offeringHeading')}</p>
            <p className="mt-1 text-[14px] text-ink-soft">{c.benefits.join(', ')}</p>
          </>
        )}

        {!isPaid && c.deliverables && (
          <>
            <p className="mt-4 text-[13px] font-semibold text-ink">{t('biz.expectedContentLabel')}</p>
            <p className="mt-1 text-[14px] text-ink-soft">{c.deliverables}</p>
          </>
        )}

        {!isPaid && c.targetAudience && c.targetAudience.length > 0 && (
          <>
            <p className="mt-4 text-[13px] font-semibold text-ink">{t('biz.invitingHeading')}</p>
            <p className="mt-1 text-[14px] text-ink-soft">{c.targetAudience.join(', ')}</p>
          </>
        )}

        {isPaid && c.hashtags && c.hashtags.length > 0 && (
          <>
            <p className="mt-4 text-[13px] font-semibold text-ink">{t('biz.hashtagsLabel')}</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {c.hashtags.map((h) => (
                <span key={h} className="rounded-full bg-violet/[0.06] px-2.5 py-1 text-[12px] font-medium text-violet-dark">
                  #{h}
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      <Modal open={!!payTarget} onClose={() => (payBusy ? null : setPayTarget(null))} title={t('biz.payModalTitle')}>
        {payTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={payTarget.creator?.fullName ?? 'Creator'} src={payTarget.creator?.avatarUrl} size="md" />
              <p className="text-[14px] font-semibold text-ink">{payTarget.creator?.fullName ?? 'Creator'}</p>
            </div>

            <dl className="space-y-2 rounded-xl border border-line bg-surface-dim p-4">
              <div className="flex items-center justify-between text-[14px]">
                <dt className="text-ink-soft">{t('biz.payModalCreatorRate')}</dt>
                <dd className="text-ink">{rupees(payTarget.proposedRate)}</dd>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <dt className="text-ink-soft">{t('biz.payModalPlatformFee')}</dt>
                <dd className="text-ink">{rupees(payTarget.platformFee ?? 0)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2 text-[15px] font-semibold">
                <dt className="text-ink">{t('biz.payModalTotal')}</dt>
                <dd className="text-ink">{rupees(payTarget.businessTotal ?? payTarget.proposedRate)}</dd>
              </div>
            </dl>

            <p className="text-[12px] text-ink-soft">{t('biz.payModalEsewaNote')}</p>

            {payError && <Alert tone="error">{payError}</Alert>}

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" loading={payBusy} onClick={confirmPay}>
                {t('biz.confirmPayment')}
              </Button>
              <Button variant="secondary" disabled={payBusy} onClick={() => setPayTarget(null)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ReportIssueModal
        open={!!reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmit={async (reason) => {
          await reportIssue(reportTarget!.id, reason);
          setReportTarget(null);
          setFlash(t('workDetail.reportIssueSent'));
          apps.reload();
        }}
      />
    </div>
  );
}

function isFeatured(c: { isFeatured?: boolean }): boolean {
  return !!c.isFeatured;
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
      <Textarea label={t('workDetail.reportIssueReason')} rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-0.5 text-[14px] text-ink">{value}</dd>
    </div>
  );
}

function ApplicantRow({
  a,
  busy,
  onAccept,
  onReject,
}: {
  a: BusinessApplication;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <Avatar name={a.creator?.fullName ?? 'Creator'} src={a.creator?.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[14px] font-semibold text-ink">{a.creator?.fullName ?? 'Creator'}</p>
            <span className="flex-shrink-0 text-[13px] font-semibold text-ink">{rupees(a.proposedRate)}</span>
          </div>
          {a.creator?.location && <p className="text-[12px] text-ink-soft">{a.creator.location}</p>}
          <p className={expanded ? 'mt-2 text-[13px] leading-relaxed text-ink-soft' : 'mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-soft'}>
            {a.coverLetter}
          </p>
          {a.coverLetter.length > 140 && (
            <button onClick={() => setExpanded((v) => !v)} className="mt-1 text-[12px] font-semibold text-violet-dark hover:underline">
              {expanded ? '−' : '+'} {t('biz.coverLetter')}
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" loading={busy} onClick={onAccept}>
          {t('biz.accept')}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onReject}>
          {t('biz.reject')}
        </Button>
        {a.creator?.id && (
          <Link to={`/business/creators/${a.creator.id}`} className="ml-auto self-center text-[12px] font-semibold text-violet-dark hover:underline">
            {t('biz.reviewProfile')}
          </Link>
        )}
      </div>
    </li>
  );
}
