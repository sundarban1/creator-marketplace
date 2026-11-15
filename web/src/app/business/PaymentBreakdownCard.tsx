import { BadgePercent, CircleCheck, UserCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '../i18n';
import { Avatar } from '../ui/Avatar';
import type { PaymentBreakdown } from '../api/business';

/** "Rs. 3,169.50" / "Rs. 3,000" — paisa only when there are any. */
export function formatNpr(n: number): string {
  const hasPaisa = Math.round(n * 100) % 100 !== 0;
  return `Rs. ${n.toLocaleString('en-IN', { minimumFractionDigits: hasPaisa ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/**
 * Business "Confirm payment" breakdown — one layout whether Kolab charges the
 * platform fee or waives it (mirrors mobile's PaymentBreakdownCard). Every
 * amount comes from the backend breakdown; nothing is computed here.
 */
export function PaymentBreakdownCard({
  breakdown: b,
  creatorName,
  creatorAvatar,
}: {
  breakdown: PaymentBreakdown;
  creatorName: string;
  creatorAvatar?: string | null;
}) {
  const t = useT();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar name={creatorName} src={creatorAvatar} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink">{creatorName}</p>
          <p className="text-[12px] text-ink-soft">{t('payBreakdown.selectedCreator')}</p>
        </div>
        {b.feeWaived && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">
            <BadgePercent size={12} />
            {t('payBreakdown.noPlatformFee')}
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-line px-4 pb-4 pt-3">
        <p className="text-[13px] font-semibold text-ink">{t('payBreakdown.title')}</p>
        <dl>
          <Row label={t('payBreakdown.creatorRate')} sub={t('payBreakdown.creatorRateSub')}>
            <span className="text-ink">{formatNpr(b.creatorRate)}</span>
          </Row>
          <Row
            label={t('payBreakdown.platformFee')}
            sub={t('payBreakdown.platformFeeSub', { pct: b.standardFeePercent })}
            subStruck={b.feeWaived}
          >
            {b.feeWaived ? (
              <span className="flex flex-col items-end leading-tight">
                <s className="text-[12px] font-normal text-ink-soft">{formatNpr(b.standardFee)}</s>
                <span className="text-success">{formatNpr(0)}</span>
              </span>
            ) : (
              <span className="text-ink">{formatNpr(b.platformFee)}</span>
            )}
          </Row>
          <Row
            label={t('payBreakdown.vat')}
            sub={b.taxApplicable ? t('payBreakdown.vatSub', { pct: b.taxPercent }) : t('payBreakdown.notApplicable')}
            last
          >
            <span className={b.taxApplicable ? 'text-ink' : 'text-ink-soft'}>{formatNpr(b.tax)}</span>
          </Row>
        </dl>

        <div className="mt-1 rounded-xl bg-surface-dim p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-semibold text-ink">{t('payBreakdown.total')}</span>
            <span className="text-[22px] font-bold tracking-tight text-ink">{formatNpr(b.total)}</span>
          </div>
          {b.feeWaived && (
            <p className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-success">
              <CircleCheck size={13} />
              {t('payBreakdown.notCharged')}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-success-soft p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
              <UserCheck size={13} />
            </span>
            {t('payBreakdown.creatorReceives')}
          </span>
          <span className="text-[15px] font-semibold text-success">{formatNpr(b.creatorReceives)}</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">{t('payBreakdown.creatorReceivesNote')}</p>
      </div>
    </div>
  );
}

function Row({ label, sub, subStruck, last, children }: { label: string; sub: string; subStruck?: boolean; last?: boolean; children: ReactNode }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-3 ${last ? '' : 'border-b border-line'}`}>
      <div className="min-w-0">
        <dt className="text-[13.5px] font-medium text-ink">{label}</dt>
        <dd className={`text-[12px] text-ink-soft ${subStruck ? 'line-through' : ''}`}>{sub}</dd>
      </div>
      <dd className="shrink-0 text-right text-[14px] font-semibold">{children}</dd>
    </div>
  );
}
