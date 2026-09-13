import { Link } from 'react-router-dom';
import { Users, CalendarClock, Gift } from 'lucide-react';
import { useT } from '../i18n';
import { perCreatorBudget } from '../lib/format';
import { useDeadlineLabel } from '../lib/useDeadlineLabel';
import { StatusBadge, type BadgeTone } from '../ui/StatusBadge';
import { cn } from '../ui/cn';
import type { MyCampaign } from '../api/business';

const STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: 'success',
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  PAUSED: 'warning',
  CLOSED: 'neutral',
  CANCELLED: 'danger',
  EXPIRED: 'neutral',
};

export function BizEventCard({ event }: { event: MyCampaign }) {
  const t = useT();
  const fmtDeadline = useDeadlineLabel();
  const budget = perCreatorBudget(event);
  const deadline = fmtDeadline(event.deadline);
  const isOpenEvent = event.campaignType === 'OPEN_EVENT';
  const perks = (event.benefits ?? []).filter(Boolean);

  return (
    <Link
      to={`/business/events/${event.id}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-300 hover:-translate-y-0.5 hover:border-violet/30',
        'hover:shadow-[0_1px_3px_rgba(20,17,16,0.06),0_18px_34px_-16px_rgba(123,92,245,0.28)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40',
      )}
    >
      {event.featureImageUrl && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-surface-dim">
          <img src={event.featureImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-surface-dim px-2 py-0.5 text-[11px] font-medium text-ink-soft">
            {event.category}
          </span>
          <StatusBadge label={event.status} tone={STATUS_TONE[event.status] ?? 'neutral'} dot={false} />
        </div>
        <h3 className="mt-2.5 line-clamp-2 text-[16px] font-semibold leading-snug text-ink">{event.title}</h3>
        {/* Paid events show the per-creator budget; free events show what the
            business offers in kind instead of "Rs. 0". */}
        {isOpenEvent ? (
          <p className="mt-2 flex items-start gap-1.5 text-[14px] font-semibold text-ink">
            <Gift size={14} className="mt-0.5 shrink-0 text-success" />
            <span className="line-clamp-2">
              {perks.length > 0 ? perks.join(' · ') : t('public.freeEventPerks')}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-[14px] font-bold text-ink">
            {t('public.budgetPerCreator', { amount: budget.amount })}
          </p>
        )}
        <div className="mt-auto flex items-center gap-4 border-t border-line pt-3 text-[12px] text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <Users size={13} />
            {t('biz.applicantsCount', { count: event._count.applications })}
          </span>
          <span className={cn('inline-flex items-center gap-1', deadline.urgent && 'font-semibold text-warning')}>
            <CalendarClock size={13} />
            {deadline.label}
          </span>
        </div>
      </div>
    </Link>
  );
}
