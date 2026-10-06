import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin } from 'lucide-react';
import { useT, useAppLanguage } from '../i18n';
import { cn } from '../ui/cn';
import type { CommunityEventCard as CardData } from '../../lib/api';
import { cldImage, communityEventPath, formatEventDateRange, placeLine, statusKey } from './format';

/**
 * Listing card for /community/events. The whole card links to the detail
 * page (stretched link); "Register Now" sits above that link as its own
 * external anchor so the two never nest.
 */
export function CommunityEventCard({ event }: { event: CardData }) {
  const t = useT();
  const { language } = useAppLanguage();
  const isPast = event.section === 'past';
  const href = communityEventPath(event.slug);
  const place = placeLine(event.city, event.country) || event.venueName;

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface',
        'transition-all duration-300 hover:-translate-y-0.5 hover:border-violet/30 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        'hover:shadow-[0_1px_3px_rgba(20,17,16,0.06),0_18px_34px_-16px_rgba(123,92,245,0.28)]',
        'focus-within:ring-2 focus-within:ring-violet/40',
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 z-10 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-violet to-brand-orange transition-transform duration-300 group-hover:scale-x-100"
      />

      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-violet/10 via-surface-dim to-brand-orange/10">
        {event.coverImageUrl && (
          <img
            src={cldImage(event.coverImageUrl, 800, 450)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        )}
        <span
          className={cn(
            'absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide shadow-sm backdrop-blur',
            event.status === 'ONGOING' ? 'bg-success text-white' : isPast ? 'bg-ink/75 text-white' : 'bg-white text-violet',
          )}
        >
          {event.status === 'ONGOING' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
          {t(statusKey(event.status))}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-[19px] font-medium leading-snug tracking-tight text-ink">
          <Link to={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {event.title}
          </Link>
        </h3>

        <div className="mt-3 space-y-1.5 text-[13px] text-ink-soft">
          <p className="flex items-center gap-2">
            <CalendarDays size={14} className="shrink-0 text-violet" />
            {formatEventDateRange(event.startDateTime, event.endDateTime, event.timezone, language, 'short')}
          </p>
          {place && (
            <p className="flex items-center gap-2">
              <MapPin size={14} className="shrink-0 text-violet" />
              <span className="truncate">{place}</span>
            </p>
          )}
        </div>

        <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-ink-soft">{event.shortDescription}</p>

        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-violet">
            {isPast ? t('communityEvents.viewRecap') : t('communityEvents.viewEvent')}
            <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
          {event.registrationOpen && event.registrationUrl && (
            <a
              href={event.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 rounded-full bg-gradient-to-r from-violet to-brand-orange px-3.5 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t('communityEvents.registerNow')}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
