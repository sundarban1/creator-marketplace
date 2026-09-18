import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Pencil, MessageCircle, Check, Gift } from 'lucide-react';
import { useT, type TFn } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { rupees, perCreatorBudget } from '../lib/format';
import {
  fetchCampaign,
  fetchBusinessApplications,
  acceptApplication,
  rejectApplication,
  initiateEsewaPayment,
  payForApplication,
  getBusinessCredits,
  reportIssue,
  type BusinessApplication,
} from '../api/business';
import { fetchPaymentMethods, type PublicPaymentMethod } from '../api/paymentMethods';
import { getPlatformFlags } from '../api/platformFlags';
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
import { cn } from '../ui/cn';

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
  const [payMethodChoice, setPayMethodChoice] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState('');
  const [reportTarget, setReportTarget] = useState<BusinessApplication | null>(null);
  const esewaPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (esewaPollRef.current) clearInterval(esewaPollRef.current);
  }, []);

  // Admin-enabled payment methods + Kolab Rewards credits balance — mirrors
  // mobile's activity-timeline.tsx pay modal (methodCatalog + creditsAvailable).
  const [methodCatalog, setMethodCatalog] = useState<PublicPaymentMethod[]>([]);
  const [creditsBalance, setCreditsBalance] = useState(0);
  const [feePercents, setFeePercents] = useState({ paymentFeePercent: 5, paymentTaxPercent: 13 });

  useEffect(() => {
    fetchPaymentMethods().then(setMethodCatalog).catch(() => {});
    getBusinessCredits().then((b) => setCreditsBalance(b.balance)).catch(() => {});
    getPlatformFlags().then((f) => setFeePercents({ paymentFeePercent: f.paymentFeePercent, paymentTaxPercent: f.paymentTaxPercent })).catch(() => {});
  }, []);

  // Defaults to the first admin-enabled method until the business picks one
  // explicitly — derived at render time rather than synced via an effect,
  // since the catalog can load after the picker is already showing.
  const payMethod = payMethodChoice || methodCatalog[0]?.key || 'esewa';

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

  // Polls the applications list until this one shows as paid. eSewa's own
  // success/failure callback redirects the popup tab straight to a Kolab
  // page — there's no message it can post back to this tab — so this tab
  // instead watches for the application to flip to PAID, then closes the
  // popup and brings this tab's modal/flash up to date, mirroring mobile's
  // in-app browser session closing itself once payment completes.
  function watchEsewaPopup(appId: string, popup: Window) {
    const poll = setInterval(async () => {
      try {
        const { items } = await fetchBusinessApplications({ limit: 100 });
        const updated = items.find((a) => a.id === appId);
        if (updated && (updated.paymentStatus === 'PAID' || updated.paymentStatus === 'RELEASED')) {
          clearInterval(poll);
          esewaPollRef.current = null;
          popup.close();
          setPayTarget(null);
          setPayBusy(false);
          setFlash(t('biz.paymentSuccessFlash'));
          apps.reload();
          return;
        }
      } catch {
        // Transient network hiccup — retry on the next tick.
      }
      if (popup.closed) {
        // The business closed the eSewa tab without finishing (or without
        // us having seen it finish yet) — stop polling and let them retry.
        clearInterval(poll);
        esewaPollRef.current = null;
        setPayBusy(false);
      }
    }, 2500);
    esewaPollRef.current = poll;
  }

  async function confirmPay() {
    if (!payTarget) return;
    setPayError('');

    if (payMethod === 'esewa') {
      // Opened synchronously, in the same tick as the click, so the browser
      // doesn't treat it as a blocked popup once the async initiate call
      // below resolves — it starts on a blank tab and gets pointed at
      // eSewa's checkout page as soon as we have the URL.
      const popup = window.open('', '_blank');
      setPayBusy(true);
      try {
        const { paymentUrl } = await initiateEsewaPayment(payTarget.id);
        if (!popup || popup.closed) {
          // Popup blocked — fall back to redirecting this tab, as before.
          window.location.href = paymentUrl;
          return;
        }
        popup.location.href = paymentUrl;
        watchEsewaPopup(payTarget.id, popup);
      } catch (err) {
        popup?.close();
        setPayError(err instanceof Error ? err.message : t('common.somethingWrong'));
        setPayBusy(false);
      }
      return;
    }

    // Credits (and any other admin-enabled method with no dedicated gateway
    // flow) settle immediately through the generic pay endpoint — mirrors
    // mobile's handlePay fallthrough for every method besides esewa/khalti.
    setPayBusy(true);
    try {
      await payForApplication(payTarget.id, payMethod);
      setPayTarget(null);
      setFlash(t('biz.paymentSuccessFlash'));
      apps.reload();
      setPayBusy(false);
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

  // Fee breakdown for the pay modal — same formula as the backend's
  // applicationTotalNpr (the amount actually charged through eSewa) and
  // mobile's activity-timeline.tsx crFee/pfFee/tax/total, rather than the
  // application's own platformFee/businessTotal fields (a different,
  // campaign-commissionRate-based figure used elsewhere, not for escrow funding).
  const crFee = payTarget?.proposedRate ?? 0;
  const pfFee = Math.round(crFee * (feePercents.paymentFeePercent / 100));
  const tax = Math.round(pfFee * (feePercents.paymentTaxPercent / 100));
  const payTotal = crFee + pfFee + tax;
  const creditsAffordable = creditsBalance >= crFee;
  const payAmountDue = payMethod === 'credits' ? crFee : payTotal;

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
                      <Button size="sm" onClick={() => { setPayError(''); setPayMethodChoice(''); setPayTarget(a); }}>
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

      <Card accent className="mt-6">
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
          <img
            src={c.featureImageUrl}
            alt=""
            className="mb-5 h-56 w-full rounded-xl object-cover shadow-[0_16px_32px_-20px_rgba(23,20,33,0.35)]"
          />
        )}

        <p className="whitespace-pre-line font-serif text-[15px] leading-[1.75] text-ink-soft first-letter:mr-0.5 first-letter:font-serif first-letter:text-[28px] first-letter:font-medium first-letter:text-ink">
          {c.description}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line/70 pt-5 sm:grid-cols-3">
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
            <div className="w-full space-y-1 border border-[#4A235A]/20 bg-white px-3.5 py-2.5 text-left text-[11.5px] font-bold leading-snug text-[#4A235A]">
              <p className="text-[14px]">{t('biz.payModalTestCredsLabel')}</p>
              <p>{t('biz.payModalTestCredsId', { value: '9711111111' })}</p>
              <p>{t('biz.payModalTestCredsPassword', { value: 'Test@123' })}</p>
              <p>{t('biz.payModalTestCredsOtp', { value: '123456' })}</p>
            </div>

            <div className="flex items-center gap-3">
              <Avatar name={payTarget.creator?.fullName ?? 'Creator'} src={payTarget.creator?.avatarUrl} size="md" />
              <p className="text-[14px] font-semibold text-ink">{payTarget.creator?.fullName ?? 'Creator'}</p>
            </div>

            <dl className="space-y-2 rounded-xl border border-line bg-surface-dim p-4">
              <div className="flex items-center justify-between text-[14px]">
                <dt className="text-ink-soft">{t('biz.payModalCreatorRate')}</dt>
                <dd className="text-ink">{rupees(crFee)}</dd>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <dt className="text-ink-soft">{t('biz.payModalPlatformFee', { pct: feePercents.paymentFeePercent })}</dt>
                <dd className="text-ink">{rupees(pfFee)}</dd>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <dt className="text-ink-soft">{t('biz.payModalTax', { pct: feePercents.paymentTaxPercent })}</dt>
                <dd className="text-ink">{rupees(tax)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-2 text-[15px] font-semibold">
                <dt className="text-ink">{t('biz.payModalTotal')}</dt>
                <dd className="text-ink">{rupees(payTotal)}</dd>
              </div>
            </dl>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink">{t('biz.payModalPayWith')}</p>
              <div className="space-y-2">
                {methodCatalog.map((m) => (
                  <PayMethodRow
                    key={m.key}
                    active={payMethod === m.key}
                    onSelect={() => setPayMethodChoice(m.key)}
                    icon={
                      m.iconUrl ? (
                        <img src={m.iconUrl} alt="" className="h-8 w-8 rounded-lg object-contain" />
                      ) : (
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[13px] font-semibold text-white"
                          style={{ backgroundColor: m.color }}
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </span>
                      )
                    }
                    label={m.name}
                  />
                ))}
                <PayMethodRow
                  active={payMethod === 'credits'}
                  disabled={!creditsAffordable}
                  onSelect={() => setPayMethodChoice('credits')}
                  icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EC4899]/10 text-[#EC4899]">
                      <Gift size={15} />
                    </span>
                  }
                  label={t('biz.payWithCredits')}
                  sublabel={creditsAffordable ? t('biz.creditsAvailable', { amount: rupees(creditsBalance) }) : t('biz.creditsInsufficientForFee')}
                />
              </div>
            </div>

            {payMethod === 'esewa' && <p className="text-[12px] text-ink-soft">{t('biz.payModalEsewaNote')}</p>}

            {payError && <Alert tone="error">{payError}</Alert>}

            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1"
                loading={payBusy}
                disabled={payMethod === 'credits' && !creditsAffordable}
                onClick={confirmPay}
              >
                {t('biz.payModalConfirmBtn', { amount: rupees(payAmountDue) })}
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

/** A selectable row in the pay modal's method picker — one gateway from the
 * admin catalog, or the exclusive "pay with Kolab Credits" option. */
function PayMethodRow({
  active,
  disabled,
  onSelect,
  icon,
  label,
  sublabel,
}: {
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: ReactNode;
  label: string;
  sublabel?: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors',
        disabled && 'cursor-not-allowed opacity-50',
        active ? 'border-violet/40 bg-violet/[0.06]' : 'border-line hover:bg-surface-dim',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-ink">{label}</span>
        {sublabel && <span className="block text-[11.5px] text-ink-soft">{sublabel}</span>}
      </span>
      {active && <Check size={16} className="flex-shrink-0 text-violet-dark" />}
    </button>
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
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-soft/80">{label}</dt>
      <dd className="mt-1 text-[14px] font-medium text-ink">{value}</dd>
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
