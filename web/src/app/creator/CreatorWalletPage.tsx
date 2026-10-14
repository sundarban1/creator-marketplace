import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownCircle, ArrowDownLeft, ArrowUpRight, Clock, ExternalLink, Info } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useLiveRefresh } from '../lib/liveUpdates';
import { rupees } from '../lib/format';
import {
  fetchWalletSummary,
  fetchWalletTransactions,
  fetchWithdrawals,
  fetchPayoutMethods,
  fetchCreatorFullProfile,
  cancelWithdrawal,
  type WalletTransaction,
  type Withdrawal,
  type WalletSummary,
} from '../api/creator';
import { DashPageHeader } from './dash-ui/DashPageHeader';
import { DashCard, DashCardHeader } from './dash-ui/DashCard';
import { DashStatCard } from './dash-ui/DashStatCard';
import { DashListRow } from './dash-ui/DashListRow';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { StatusBadge, type BadgeTone } from '../ui/StatusBadge';
import { cn } from '../ui/cn';
import { WithdrawModal } from './WithdrawModal';
import { alertDialog, confirmDialog } from '../ui/confirmDialog';
import { PointsActivityCard } from './PointsActivityCard';
import { PayoutMethodsSection } from './PayoutMethodsSection';

/**
 * Kolab Rewards — web twin of mobile's (creator)/wallet.tsx: one balance card
 * (wallet balance shown as Kolab Reward Points, 1 point = Rs. 1), withdraw,
 * payout accounts, statement and points activity. Business deals have their own
 * Discover page (CreatorDealsPage), not a tab here.
 */
export function CreatorWalletPage() {
  const t = useT();
  const summary = useAsync((s) => fetchWalletSummary(s), []);
  const txns = useAsync((s) => fetchWalletTransactions(s), []);
  const withdrawals = useAsync((s) => fetchWithdrawals(s), []);
  const payoutMethods = useAsync((s) => fetchPayoutMethods(s), []);
  useLiveRefresh(['wallet'], () => { summary.refresh(); txns.refresh(); withdrawals.refresh(); });

  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  // One-time KYC: Citizenship + PAN must be uploaded AND approved before a
  // withdrawal (tax records, and to make sure the payout reaches the right
  // person). The server enforces the same rule; this just explains it up front.
  const handleWithdrawClick = async () => {
    let statuses: string[] = ['APPROVED', 'APPROVED'];
    try {
      const p = await fetchCreatorFullProfile();
      statuses = [p.citizenshipStatus, p.panDocStatus];
    } catch {
      // Profile read failed — let the modal open; the server still enforces it.
    }
    if (statuses.every((st) => st === 'APPROVED')) {
      setModalOpen(true);
      return;
    }
    if (statuses.every((st) => st === 'APPROVED' || st === 'PENDING')) {
      await alertDialog({
        title: t('wallet.kycPendingTitle'),
        message: t('wallet.kycPendingBody'),
        confirmLabel: t('wallet.kycPendingOk'),
      });
      return;
    }
    const upload = await confirmDialog({
      title: t('wallet.kycRequiredTitle'),
      message: t('wallet.kycRequiredBody'),
      confirmLabel: t('wallet.kycRequiredAction'),
      cancelLabel: t('wallet.kycRequiredCancel'),
      tone: 'warning',
    });
    if (upload) navigate('/creator/verification');
  };
  const [flash, setFlash] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState('');

  const handleCancelWithdrawal = async (id: string) => {
    if (!(await confirmDialog({ title: t('wallet.cancelWithdrawal'), message: t('wallet.confirmCancelWithdrawal'), confirmLabel: t('wallet.cancelWithdrawal'), tone: 'warning' }))) return;
    setCancelError('');
    setCancellingId(id);
    try {
      await cancelWithdrawal(id);
      setFlash(t('wallet.withdrawalCancelled'));
      summary.reload();
      withdrawals.reload();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setCancellingId(null);
    }
  };

  const w = summary.data;
  const canWithdraw =
    w != null && w.withdrawableBalance >= w.minWithdrawal && !w.hasPendingWithdrawal && !w.dailyLimitReached;

  const disabledReason = !w
    ? ''
    : w.hasPendingWithdrawal
      ? t('wallet.withdrawDisabledPending')
      : w.dailyLimitReached
        ? t('wallet.withdrawDisabledDaily')
        : w.withdrawableBalance < w.minWithdrawal
          ? t('wallet.withdrawDisabledNone')
          : '';

  // Promo redemptions show in the points activity card below — the statement
  // is cash-out activity only (same as mobile).
  const statement = txns.data ? txns.data.filter((tx) => tx.kind !== 'PROMO_REDEMPTION_DEBIT') : null;

  return (
    <>
      <DashPageHeader title={t('rewards.headerTitle')} description={t('wallet.rewardsSubtitle')} />

      {/* Balance hero — wallet balance as Kolab Reward Points. */}
      <div className="rounded-xl bg-brand p-6 text-white sm:p-7">
        <div className="flex items-center justify-between gap-4 sm:justify-start sm:gap-10">
          <div>
            <p className="text-[13px] text-white/70">{t('wallet.pointsBalance')}</p>
            <p className="mt-1 text-[32px] font-bold leading-none tracking-tight">
              {summary.loading ? '—' : (w?.availableBalance ?? 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div className="text-right sm:text-left">
            <p className="text-[12px] text-white/70">{t('wallet.totalEarned')}</p>
            <p className="mt-1 text-[16px] font-semibold">
              {summary.loading ? '—' : rupees(w?.totalEarned ?? 0)}
            </p>
          </div>
        </div>
        <p className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-white/80">
          <Info size={12} />
          {t('wallet.pointsEquivalence')}
        </p>
      </div>

      <div className="mt-5">
        {flash && <Alert tone="success" className="mb-5">{flash}</Alert>}
        {cancelError && <Alert tone="error" className="mb-5">{cancelError}</Alert>}
        {!canWithdraw && disabledReason && <Alert tone="neutral" className="mb-5">{disabledReason}</Alert>}

        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[13px] text-ink-soft">{t('wallet.availableBalance')}</p>
            <p className="mt-1 text-[22px] font-semibold text-ink">
              {summary.loading ? '—' : rupees(w?.withdrawableBalance ?? 0)}
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleWithdrawClick}
            disabled={!canWithdraw || payoutMethods.loading}
            className="self-start sm:self-auto"
          >
            <ArrowDownCircle size={18} />
            {t('wallet.withdraw')}
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <DashStatCard
            label={t('wallet.pendingEarnings')}
            value={summary.loading ? undefined : rupees(w?.pendingEarnings ?? 0)}
            icon={Clock}
            tone="amber"
          />
          <DashStatCard
            label={t('wallet.inWithdrawal')}
            value={summary.loading ? undefined : rupees(w?.pendingWithdrawals ?? 0)}
            icon={ArrowUpRight}
            tone="blue"
          />
        </div>

        <p className="mt-3 text-[12px] text-ink-soft">{t('wallet.processingNote')}</p>

        <div className="mt-6">
          <PayoutMethodsSection
            methods={payoutMethods.data ?? []}
            loading={payoutMethods.loading}
            onChanged={payoutMethods.reload}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
          <DashCard>
            <DashCardHeader title={t('wallet.transactionsHeading')} />
            <TransactionList data={statement} loading={txns.loading} />
          </DashCard>

          <DashCard>
            <DashCardHeader title={t('wallet.withdrawalsHeading')} />
            <WithdrawalList
              data={withdrawals.data}
              loading={withdrawals.loading}
              cancellingId={cancellingId}
              onCancel={handleCancelWithdrawal}
            />
          </DashCard>
        </div>

        <div className="mt-6">
          <PointsActivityCard />
        </div>
      </div>

      {w && !payoutMethods.loading && (
        <WithdrawModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          summary={w}
          payoutMethods={payoutMethods.data ?? []}
          onDone={(updated: WalletSummary) => {
            setModalOpen(false);
            setFlash(t('wallet.withdrawalRequested'));
            summary.reload();
            txns.reload();
            withdrawals.reload();
            payoutMethods.reload();
            void updated;
          }}
        />
      )}
    </>
  );
}

function TransactionList({ data, loading }: { data: WalletTransaction[] | null; loading: boolean }) {
  const t = useT();
  if (loading) return <ListSkeleton />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        size="sm"
        variant="empty"
        title={t('wallet.noTransactions')}
        description={t('wallet.noTransactionsBody')}
      />
    );
  }

  return (
    <ul className="divide-y divide-ink/[0.05]">
      {data.map((tx) => {
        const credit = tx.direction === 'CREDIT';
        return (
          <li key={tx.id}>
            <DashListRow
              icon={credit ? ArrowDownLeft : ArrowUpRight}
              tone={credit ? 'green' : 'neutral'}
              title={
                tx.kind === 'CAMPAIGN_PAYOUT' && tx.campaignTitle
                  ? t('wallet.kindCampaignPayout', { campaign: tx.campaignTitle })
                  : tx.title
              }
              subtitle={
                <>
                  {new Date(tx.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {tx.reference && ` · ${t('wallet.ref', { code: tx.reference })}`}
                </>
              }
              trailing={
                <>
                  <p className={cn('text-[13px] font-semibold', credit ? 'text-success' : 'text-ink')}>
                    {credit ? '+' : '−'} {rupees(tx.amount)}
                  </p>
                  {tx.proofUrl && (
                    <a
                      href={tx.proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-violet-dark hover:underline"
                    >
                      {t('wallet.viewProof')}
                      <ExternalLink size={10} />
                    </a>
                  )}
                </>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}

const W_STATUS: Record<Withdrawal['status'], { key: string; tone: BadgeTone }> = {
  PENDING: { key: 'wStatusPending', tone: 'warning' },
  PROCESSING: { key: 'wStatusProcessing', tone: 'progress' },
  PAID: { key: 'wStatusPaid', tone: 'success' },
  REJECTED: { key: 'wStatusRejected', tone: 'danger' },
  CANCELLED: { key: 'wStatusCancelled', tone: 'neutral' },
};

function WithdrawalList({
  data,
  loading,
  cancellingId,
  onCancel,
}: {
  data: Withdrawal[] | null;
  loading: boolean;
  cancellingId: string | null;
  onCancel: (id: string) => void;
}) {
  const t = useT();
  if (loading) return <ListSkeleton />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        size="sm"
        variant="empty"
        title={t('wallet.noWithdrawals')}
        description={t('wallet.noWithdrawalsBody')}
      />
    );
  }

  return (
    <ul className="divide-y divide-ink/[0.05]">
      {data.map((wd) => {
        const s = W_STATUS[wd.status];
        return (
          <li key={wd.id} className="py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink">
                  {t('wallet.kindWithdrawal', { method: wd.method })}
                </p>
                <p className="text-[12px] text-ink-soft">
                  {new Date(wd.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {wd.referenceCode && ` · ${t('wallet.ref', { code: wd.referenceCode })}`}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="text-[13px] font-semibold text-ink">{rupees(wd.amount)}</span>
                <StatusBadge label={t(`wallet.${s.key}`)} tone={s.tone} />
              </div>
            </div>
            {wd.status === 'REJECTED' && wd.rejectionReason && (
              <p className="mt-1.5 text-[12px] text-danger">{wd.rejectionReason}</p>
            )}
            {wd.status === 'PAID' && wd.screenshotUrl && (
              <a
                href={wd.screenshotUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-0.5 text-[12px] font-semibold text-violet-dark hover:underline"
              >
                {t('wallet.viewProof')}
                <ExternalLink size={11} />
              </a>
            )}
            {wd.status === 'PENDING' && (
              <div className="mt-2">
                <Button
                  variant="danger"
                  size="sm"
                  loading={cancellingId === wd.id}
                  onClick={() => onCancel(wd.id)}
                  className="h-8 px-3 text-[12px]"
                >
                  {t('wallet.cancelWithdrawal')}
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
