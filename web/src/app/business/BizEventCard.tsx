import { Link } from 'react-router-dom';
import { Users, CalendarClock, Gift, ArrowUpRight, Sparkles } from 'lucide-react';
import { useT } from '../i18n';
import { perCreatorBudget } from '../lib/format';
import { useDeadlineLabel } from '../lib/useDeadlineLabel';
import { Avatar } from '../ui/Avatar';
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

/**
 * Same rounded-2xl / gradient-hairline / lift-on-hover card language as the
 * public marketplace's `EventCard`, so "my events" reads as one polished
 * card system instead of a flatter admin-style list.
 */
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
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface',
        'transition-all duration-300 hover:-translate-y-0.5 hover:border-violet/30',
        'hover:shadow-[0_1px_3px_rgba(20,17,16,0.06),0_18px_34px_-16px_rgba(123,92,245,0.28)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40',
      )}
    >
      {/* gradient hairline that lights up on hover */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-violet to-brand-orange transition-transform duration-300 group-hover:scale-x-100"
      />

      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-violet/10 via-surface-dim to-brand-orange/10">
        {event.featureImageUrl ? (
          <img
            src={event.featureImageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Avatar name={event.business.businessName} src={event.business.logoUrl} size="lg" />
          </div>
        )}
        {event.isFeatured && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink/75 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
            <Sparkles size={11} />
            {t('public.featured')}
          </span>
        )}
        <StatusBadge
          label={event.status}
          tone={STATUS_TONE[event.status] ?? 'neutral'}
          dot={false}
          className="absolute right-3 top-3 bg-white shadow-sm"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-violet/20 bg-violet/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-violet">
            {event.category}
          </span>
        </div>

        <h3 className="mt-2.5 line-clamp-2 text-[16px] font-semibold leading-snug text-ink">{event.title}</h3>

        {/* Paid events show the per-creator budget; free events show what the
            business offers in kind instead of "Rs. 0". */}
        {isOpenEvent ? (
          <p className="mt-3 flex items-start gap-1.5 text-[14px] font-semibold text-ink">
            <Gift size={14} className="mt-0.5 shrink-0 text-success" />
            <span className="line-clamp-2">
              {perks.length > 0 ? perks.join(' · ') : t('public.freeEventPerks')}
            </span>
          </p>
        ) : (
          <p className="mt-3 text-[15px] font-bold text-ink">
            {t('public.budgetPerCreator', { amount: budget.amount })}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
          <div className="flex items-center gap-4 text-[12px] text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <Users size={13} />
              {t('biz.applicantsCount', { count: event._count.applications })}
            </span>
            <span className={cn('inline-flex items-center gap-1', deadline.urgent && 'font-semibold text-warning')}>
              <CalendarClock size={13} />
              {deadline.label}
            </span>
          </div>
          <ArrowUpRight
            size={14}
            className="flex-shrink-0 -translate-x-1 text-violet opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden
          />
        </div>
      </div>
    </Link>
  );
}
