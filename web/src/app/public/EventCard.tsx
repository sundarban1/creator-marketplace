import { Link } from 'react-router-dom';
import { MapPin, Users, Clock, ArrowUpRight, Sparkles, Gift } from 'lucide-react';
import { useT } from '../i18n';
import { perCreatorBudget } from '../lib/format';
import { useDeadlineLabel } from '../lib/useDeadlineLabel';
import { Avatar } from '../ui/Avatar';
import { cn } from '../ui/cn';
import type { EventCard as EventCardData } from '../api/publicMarketplace';

export function EventCard({
  event,
  hrefBase = '/events',
}: {
  event: EventCardData;
  /** Route prefix for the detail link — `/events` (public) or `/creator/events`. */
  hrefBase?: string;
}) {
  const t = useT();
  const fmtDeadline = useDeadlineLabel();
  const budget = perCreatorBudget(event);
  const deadline = fmtDeadline(event.deadline);
  const count = event.creatorsNeeded ?? 1;
  const isOpenEvent = event.campaignType === 'OPEN_EVENT';
  const perks = (event.benefits ?? []).filter(Boolean);

  return (
    <Link
      to={`${hrefBase}/${event.id}`}
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
        <span
          className={cn(
            'absolute right-3 top-3 inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold shadow-sm',
            isOpenEvent ? 'text-success' : 'text-violet',
          )}
        >
          {isOpenEvent ? t('public.badgeFree') : t('public.badgePaid')}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-violet/20 bg-violet/[0.06] px-2.5 py-0.5 text-[11px] font-semibold text-violet">
            {event.category}
          </span>
        </div>

        <h3 className="mt-2.5 line-clamp-2 text-[16px] font-semibold leading-snug text-ink">
          {event.title}
        </h3>

        <div className="mt-2 flex items-center gap-2">
          <Avatar name={event.business.businessName} src={event.business.logoUrl} size="xs" />
          <span className="truncate text-[13px] text-ink-soft">{event.business.businessName}</span>
        </div>

        {/* Paid events show the per-creator budget (spec §13); free events show
            what the business offers in kind instead of "Rs. 0". */}
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

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <Users size={13} />
            {count === 1 ? t('public.creatorNeeded') : t('public.creatorsNeeded', { count })}
          </span>
          <span className="inline-flex min-w-0 items-center gap-4">
            {(event.locationType === 'REMOTE' || event.location) && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin size={13} className="shrink-0" />
                <span className="truncate">
                  {event.locationType === 'REMOTE' ? t('public.remote') : event.location}
                </span>
              </span>
            )}
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1',
                deadline.urgent && 'font-semibold text-warning',
              )}
            >
              <Clock size={13} />
              {deadline.label}
            </span>
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
          <span className="text-[12px] text-ink-soft">
            {t('public.applicationsCount', { count: event._count.applications })}
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-violet opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {t('public.viewEvent')}
            <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}
