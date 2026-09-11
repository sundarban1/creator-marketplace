import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Megaphone, ArrowUpRight } from 'lucide-react';
import { useT } from '../i18n';
import { Avatar } from '../ui/Avatar';
import { cn } from '../ui/cn';
import type { BusinessCard as BusinessCardData } from '../api/publicMarketplace';
import type { CategoryMeta } from './categoryLookup';
import { CategoryPill } from './CategoryPill';

interface Props {
  business: BusinessCardData;
  categoryMeta: (name: string) => CategoryMeta;
}

export function BusinessCard({ business, categoryMeta }: Props) {
  const t = useT();
  const name = business.businessName ?? 'Business';
  const location = [business.city, business.district].filter(Boolean).join(', ');

  return (
    <Link
      to={`/businesses/${encodeURIComponent(business.id)}`}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5',
        'transition-all duration-300 hover:-translate-y-0.5 hover:border-violet/30',
        'hover:shadow-[0_1px_3px_rgba(20,17,16,0.06),0_18px_34px_-16px_rgba(123,92,245,0.28)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40',
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-violet to-brand-orange transition-transform duration-300 group-hover:scale-x-100"
      />

      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 rounded-full p-0.5 ring-1 ring-violet/15">
          <Avatar name={name} src={business.logoUrl} size="lg" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[15px] font-semibold text-ink">{name}</h3>
            {business.fullyVerified && (
              <BadgeCheck size={15} className="flex-shrink-0 text-brand" aria-label={t('public.verified')} />
            )}
          </div>
          {location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-ink-soft">
              <MapPin size={12} className="flex-shrink-0" />
              {location}
            </p>
          )}
        </div>
        <ArrowUpRight
          size={16}
          className="flex-shrink-0 -translate-x-1 text-violet opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          aria-hidden
        />
      </div>

      {business.description && (
        <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{business.description}</p>
      )}

      {business.categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <CategoryPill
            label={business.categories[0]}
            meta={categoryMeta(business.categories[0])}
            moreCount={business.categories.length - 1}
          />
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 pt-3">
        <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft">
          <Megaphone size={14} className="flex-shrink-0" />
          {t('public.campaignsCount', { count: business._count.campaigns })}
        </span>
      </div>
    </Link>
  );
}
