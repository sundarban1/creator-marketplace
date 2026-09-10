import { Link } from 'react-router-dom';
import { MapPin, Users, Clock } from 'lucide-react';
import { useT } from '../i18n';
import { perCreatorBudget } from '../lib/format';
import { useDeadlineLabel } from '../lib/useDeadlineLabel';
import { Avatar } from '../ui/Avatar';
import { PlatformIcon } from '../ui/PlatformIcon';
import { StatusBadge } from '../ui/StatusBadge';
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
  const platforms = [...new Set(event.platforms)].slice(0, 4);

  return (
    <Link
      to={`${hrefBase}/${event.id}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface',
        'transition-[border-color,box-shadow] hover:border-line-strong',
        'hover:shadow-[0_1px_3px_rgba(20,17,16,0.06),0_12px_28px_-14px_rgba(20,17,16,0.15)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
      )}
    >
      {event.featureImageUrl && (
        <div className="aspect-[16/9] w-full overflow-hidden bg-surface-dim">
          <img
            src={event.featureImageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-surface-dim px-2 py-0.5 text-[11px] font-medium text-ink-soft">
            {event.category}
          </span>
          {event.isFeatured && <StatusBadge label={t('public.featured')} tone="info" dot={false} />}
        </div>

        <h3 className="mt-2.5 line-clamp-2 text-[16px] font-semibold leading-snug text-ink">
          {event.title}
        </h3>

        <div className="mt-2 flex items-center gap-2">
          <Avatar name={event.business.businessName} src={event.business.logoUrl} size="xs" />
          <span className="truncate text-[13px] text-ink-soft">{event.business.businessName}</span>
        </div>

        {/* Budget — always per creator (spec §13) */}
        <p className="mt-3 text-[15px] font-bold text-ink">
          {t('public.budgetPerCreator', { amount: budget.amount })}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-soft">
          <span className="inline-flex items-center gap-1">
            <Users size={13} />
            {count === 1 ? t('public.creatorNeeded') : t('public.creatorsNeeded', { count })}
          </span>
          {(event.locationType === 'REMOTE' || event.location) && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} />
              {event.locationType === 'REMOTE' ? t('public.remote') : event.location}
            </span>
          )}
          <span className={cn('inline-flex items-center gap-1', deadline.urgent && 'font-semibold text-warning')}>
            <Clock size={13} />
            {deadline.label}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
          <div className="flex items-center gap-2 text-ink-soft">
            {platforms.map((p) => (
              <PlatformIcon key={p} platform={p} size={14} />
            ))}
          </div>
          <span className="text-[12px] text-ink-soft">
            {t('public.applicationsCount', { count: event._count.applications })}
          </span>
        </div>
      </div>
    </Link>
  );
}
