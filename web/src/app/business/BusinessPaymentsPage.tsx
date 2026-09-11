import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { rupees } from '../lib/format';
import { fetchPaymentHistory } from '../api/business';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
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

  const total = (payments.data ?? []).reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <PageHeader eyebrow={t('biz.eyebrowPay')} title={t('biz.payTitle')} description={t('biz.paySubtitle')} />

      <Card>
        {payments.loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : payments.error ? (
          <EmptyState variant="error" title={t('common.somethingWrong')} action={{ label: t('common.retry'), onClick: payments.reload }} />
        ) : !payments.data || payments.data.length === 0 ? (
          <EmptyState variant="empty" title={t('biz.noPayments')} />
        ) : (
          <>
            <p className="mb-3 text-[13px] text-ink-soft">
              {t('biz.totalPaid')}: <span className="font-semibold text-ink">{rupees(total)}</span>
            </p>
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
          </>
        )}
      </Card>
    </>
  );
}
