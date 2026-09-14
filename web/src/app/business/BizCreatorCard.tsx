import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, ArrowUpRight, Bookmark } from 'lucide-react';
import { useT } from '../i18n';
import { compactNumber, totalFollowers } from '../lib/format';
import { Avatar } from '../ui/Avatar';
import { PlatformIcon } from '../ui/PlatformIcon';
import { cn } from '../ui/cn';
import type { BusinessCreatorCard } from '../api/business';
import type { CategoryMeta } from '../public/categoryLookup';
import { CategoryPill } from '../public/CategoryPill';

/**
 * Same card as the public marketplace's CreatorCard (identical layout, hover
 * treatment and footer) plus one business-only affordance: a save/bookmark
 * toggle. The toggle sits as an absolutely-positioned sibling of the card's
 * Link — not nested inside it — since a <button> can't legally nest inside
 * an <a>; the whole card is still one click target, matching every other
 * creator/business card on the site.
 */
export function BizCreatorCard({
  creator,
  categoryMeta,
  saved,
  onToggleSave,
}: {
  creator: BusinessCreatorCard;
  categoryMeta: (name: string) => CategoryMeta;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const t = useT();
  const name = creator.fullName ?? 'Creator';
  const followers = totalFollowers(creator.socialAccounts);
  const platforms = [...new Set(creator.socialAccounts.map((a) => a.platform))].slice(0, 4);

  return (
    <div className="relative h-full">
      <Link
        to={`/business/creators/${creator.id}`}
        className={cn(
          'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5',
          'transition-all duration-300 hover:-translate-y-0.5 hover:border-violet/30',
          'hover:shadow-[0_1px_3px_rgba(20,17,16,0.06),0_18px_34px_-16px_rgba(123,92,245,0.28)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40',
        )}
      >
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-violet to-brand-orange transition-transform duration-300 group-hover:scale-x-100"
        />

        <div className="flex items-start gap-3 pr-8">
          <Avatar name={name} src={creator.avatarUrl} size="lg" className="flex-shrink-0" />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-[15px] font-semibold text-ink">{name}</h3>
              {creator.fullyVerified && (
                <BadgeCheck size={15} className="flex-shrink-0 text-brand" aria-label={t('public.verified')} />
              )}
            </div>
            {creator.location && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-ink-soft">
                <MapPin size={12} className="flex-shrink-0" />
                {creator.location}
              </p>
            )}
          </div>
          <ArrowUpRight
            size={16}
            className="flex-shrink-0 -translate-x-1 text-violet opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden
          />
        </div>

        {creator.bio && <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{creator.bio}</p>}

        {creator.categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <CategoryPill
              label={creator.categories[0]}
              meta={categoryMeta(creator.categories[0])}
              moreCount={creator.categories.length - 1}
            />
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <div className="flex items-center gap-2 text-ink-soft">
            {platforms.map((p) => (
              <PlatformIcon key={p} platform={p} size={15} />
            ))}
          </div>
          {followers > 0 && (
            <span className="text-[13px] font-semibold text-ink">
              {compactNumber(followers)} <span className="font-normal text-ink-soft">{t('public.followers')}</span>
            </span>
          )}
        </div>
      </Link>

      <button
        onClick={onToggleSave}
        aria-pressed={saved}
        aria-label={saved ? t('biz.saved') : t('biz.save')}
        className={cn(
          'absolute right-4 top-4 z-10 rounded-lg p-1.5 transition-colors',
          saved ? 'text-violet' : 'text-ink-soft hover:text-ink',
        )}
      >
        <Bookmark size={16} className={saved ? 'fill-current' : ''} />
      </button>
    </div>
  );
}
