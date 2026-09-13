import { useMemo } from 'react';
import { Wallet2, Clock, CheckCircle2 } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { rupees } from '../lib/format';
import { fetchPaymentHistory } from '../api/business';
import { PageHeader } from '../ui/PageHeader';
import { StatCard } from '../ui/StatCard';
import { Card, CardHeader } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { StatusBadge, type BadgeTone } from '../ui/StatusBadge';

const TONE: Record<string, { key: string; tone: BadgeTone }> = {
  HELD: { key: 'payStatusHeld', tone: 'progress' },
  PAID: { key: 'payStatusHeld', tone: 'progress' },
  RELEASED: { key: 'payStatusReleased', tone: 'success' },
  PENDING: { key: 'payStatusPending', tone: 'warning' },
  UNPAID: { key: 'payStatusPending', tone: 'warning' },
};

export function BusinessPaymentsPage() {
  const t = useT();
  const payments = useAsync((s) => fetchPaymentHistory(s), []);

  const { total, completed, pending, byCampaign } = useMemo(() => {
    const items = payments.data ?? [];
    let total = 0;
    let completed = 0;
    const campaigns = new Map<string, { title: string; amount: number; count: number }>();

    for (const p of items) {
      total += p.amount;
      if (p.status === 'RELEASED') completed += p.amount;
      const key = p.campaign?.id ?? 'unknown';
      const existing = campaigns.get(key);
      if (existing) {
        existing.amount += p.amount;
        existing.count += 1;
      } else {
        campaigns.set(key, { title: p.campaign?.title ?? '—', amount: p.amount, count: 1 });
      }
    }

    return {
      total,
      completed,
      pending: total - completed,
      byCampaign: [...campaigns.values()].sort((a, b) => b.amount - a.amount),
    };
  }, [payments.data]);

  return (
    <>
      <PageHeader title={t('biz.payTitle')} description={t('biz.paySubtitle')} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label={t('biz.totalPaid')} value={payments.loading ? undefined : rupees(total)} icon={Wallet2} />
        <StatCard label={t('biz.pendingPayments')} value={payments.loading ? undefined : rupees(pending)} icon={Clock} />
        <StatCard label={t('biz.completedPayments')} value={payments.loading ? undefined : rupees(completed)} icon={CheckCircle2} />
      </div>

      {payments.loading ? (
        <Card className="mt-6">
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      ) : payments.error ? (
        <Card className="mt-6">
          <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: payments.reload }} />
        </Card>
      ) : !payments.data || payments.data.length === 0 ? (
        <Card className="mt-6">
          <EmptyState variant="empty" title={t('biz.noPayments')} />
        </Card>
      ) : (
        <>
          <Card className="mt-6">
            <CardHeader title={t('biz.byCampaignHeading')} />
            <ul className="divide-y divide-line">
              {byCampaign.map((c) => (
                <li key={c.title} className="flex items-center justify-between gap-3 py-3">
                  <p className="min-w-0 truncate text-[13.5px] font-medium text-ink">{c.title}</p>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className="text-[12px] text-ink-soft">{c.count}</span>
                    <span className="text-[13.5px] font-semibold text-ink">{rupees(c.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="mt-6">
            <CardHeader title={t('biz.paymentHistoryHeading')} />
            <ul className="divide-y divide-line">
              {payments.data.map((p) => {
                const s = TONE[p.status] ?? { key: 'payStatusHeld', tone: 'neutral' as BadgeTone };
                return (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <Avatar name={p.creator?.fullName ?? 'Creator'} src={p.creator?.avatarUrl ?? null} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">{p.creator?.fullName ?? '—'}</p>
                      <p className="truncate text-[12px] text-ink-soft">
                        {p.campaign?.title}
                        {' · '}
                        {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-[13px] font-semibold text-ink">{rupees(p.amount)}</span>
                    <StatusBadge label={t(`biz.${s.key}`)} tone={s.tone} />
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </>
  );
}
