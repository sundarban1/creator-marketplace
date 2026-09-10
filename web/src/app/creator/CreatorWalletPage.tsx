import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Wallet, Clock, ExternalLink } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { rupees } from '../lib/format';
import {
  fetchWalletSummary,
  fetchWalletTransactions,
  fetchWithdrawals,
  fetchPayoutMethods,
  type WalletTransaction,
  type Withdrawal,
  type WalletSummary,
} from '../api/creator';
import { PageHeader } from '../ui/PageHeader';
import { StatCard } from '../ui/StatCard';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { StatusBadge, type BadgeTone } from '../ui/StatusBadge';
import { cn } from '../ui/cn';
import { WithdrawModal } from './WithdrawModal';

export function CreatorWalletPage() {
  const t = useT();
  const summary = useAsync((s) => fetchWalletSummary(s), []);
  const txns = useAsync((s) => fetchWalletTransactions(s), []);
  const withdrawals = useAsync((s) => fetchWithdrawals(s), []);
  const payoutMethods = useAsync((s) => fetchPayoutMethods(s), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [flash, setFlash] = useState('');

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

  return (
    <>
      <PageHeader
        title={t('wallet.title')}
        description={t('wallet.subtitle')}
        actions={
          <Button onClick={() => setModalOpen(true)} disabled={!canWithdraw}>
            {t('wallet.withdraw')}
          </Button>
        }
      />

      {flash && <Alert tone="success" className="mb-5">{flash}</Alert>}
      {!canWithdraw && disabledReason && <Alert tone="neutral" className="mb-5">{disabledReason}</Alert>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('wallet.availableBalance')}
          value={summary.loading ? undefined : rupees(w?.withdrawableBalance ?? 0)}
          icon={Wallet}
        />
        <StatCard
          label={t('wallet.pendingEarnings')}
          value={summary.loading ? undefined : rupees(w?.pendingEarnings ?? 0)}
          icon={Clock}
        />
        <StatCard
          label={t('wallet.inWithdrawal')}
          value={summary.loading ? undefined : rupees(w?.pendingWithdrawals ?? 0)}
          icon={ArrowUpRight}
        />
        <StatCard
          label={t('wallet.totalEarned')}
          value={summary.loading ? undefined : rupees(w?.totalEarned ?? 0)}
          icon={ArrowDownLeft}
        />
      </div>

      <p className="mt-3 text-[12px] text-ink-soft">{t('wallet.processingNote')}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader title={t('wallet.transactionsHeading')} />
          <TransactionList data={txns.data} loading={txns.loading} />
        </Card>

        <Card>
          <CardHeader title={t('wallet.withdrawalsHeading')} />
          <WithdrawalList data={withdrawals.data} loading={withdrawals.loading} />
        </Card>
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
    <ul className="divide-y divide-line">
      {data.map((tx) => {
        const credit = tx.direction === 'CREDIT';
        return (
          <li key={tx.id} className="flex items-center gap-3 py-3">
            <span
              className={cn(
                'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
                credit ? 'bg-success-soft text-success' : 'bg-surface-dim text-ink-soft',
              )}
            >
              {credit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-ink">
                {tx.kind === 'CAMPAIGN_PAYOUT' && tx.campaignTitle
                  ? t('wallet.kindCampaignPayout', { campaign: tx.campaignTitle })
                  : tx.title}
              </p>
              <p className="text-[12px] text-ink-soft">
                {new Date(tx.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                {tx.reference && ` · ${t('wallet.ref', { code: tx.reference })}`}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className={cn('text-[13px] font-semibold', credit ? 'text-success' : 'text-ink')}>
                {credit ? '+' : '−'} {rupees(tx.amount)}
              </p>
              {tx.proofUrl && (
                <a
                  href={tx.proofUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand hover:underline"
                >
                  {t('wallet.viewProof')}
                  <ExternalLink size={10} />
                </a>
              )}
            </div>
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

function WithdrawalList({ data, loading }: { data: Withdrawal[] | null; loading: boolean }) {
  const t = useT();
  if (loading) return <ListSkeleton />;
  if (!data || data.length === 0) {
    return <EmptyState size="sm" variant="empty" title={t('wallet.noWithdrawals')} />;
  }

  return (
    <ul className="divide-y divide-line">
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
                className="mt-1 inline-flex items-center gap-0.5 text-[12px] font-semibold text-brand hover:underline"
              >
                {t('wallet.viewProof')}
                <ExternalLink size={11} />
              </a>
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
