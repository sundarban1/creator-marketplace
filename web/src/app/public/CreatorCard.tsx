import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, ArrowUpRight, Users } from 'lucide-react';
import { useT } from '../i18n';
import { compactNumber } from '../lib/format';
import { Avatar } from '../ui/Avatar';
import { PlatformIcon } from '../ui/PlatformIcon';
import { cn } from '../ui/cn';
import type { CreatorCard as CreatorCardData } from '../api/publicMarketplace';
import type { CategoryMeta } from './categoryLookup';
import { CategoryPill } from './CategoryPill';

// Display order for the per-platform follower grid; anything else trails.
const PLATFORM_ORDER = ['instagram', 'tiktok', 'facebook', 'youtube'];
const orderOf = (p: string) => {
  const i = PLATFORM_ORDER.indexOf(p);
  return i === -1 ? PLATFORM_ORDER.length : i;
};

interface Props {
  creator: CreatorCardData;
  categoryMeta: (name: string) => CategoryMeta;
  /** Base path the card links into — defaults to the public profile. Pass
   *  `/creator/creators` from the signed-in creator dashboard so the link
   *  stays inside the authed shell instead of escaping to the public,
   *  landing-nav-wrapped route. */
  hrefBase?: string;
  /** Lead the follower grid with this platform — used when a search is about
   *  that platform ("TikTok creators with 10k+"). */
  followersPlatform?: string;
}

export function CreatorCard({ creator, categoryMeta, hrefBase = '/creators', followersPlatform }: Props) {
  const t = useT();
  const handle = creator.username ?? creator.id;
  // One entry per platform (highest count if a creator linked two of the same).
  const byPlatform = new Map<string, number>();
  for (const a of creator.socialAccounts) {
    const p = a.platform.toLowerCase();
    byPlatform.set(p, Math.max(byPlatform.get(p) ?? 0, a.followers));
  }
  const lead = followersPlatform?.toLowerCase();
  const platformStats = [...byPlatform]
    .map(([platform, followers]) => ({ platform, followers }))
    .sort((a, b) => Number(b.platform === lead) - Number(a.platform === lead) || orderOf(a.platform) - orderOf(b.platform))
    .slice(0, 4);
  const name = creator.fullName ?? 'Creator';
  const isTeam = creator.providerType === 'TEAM' || creator.providerType === 'AGENCY';

  return (
    <Link
      to={`${hrefBase}/${encodeURIComponent(handle)}`}
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5',
        'transition-all duration-300 hover:-translate-y-0.5 hover:border-violet/30',
        'hover:shadow-[0_1px_3px_rgba(20,17,16,0.06),0_18px_34px_-16px_rgba(123,92,245,0.28)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40',
      )}
    >
      {/* gradient hairline that lights up on hover */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-violet to-brand-orange transition-transform duration-300 group-hover:scale-x-100"
      />

      <div className="flex items-start gap-3">
        <Avatar name={name} src={creator.avatarUrl} size="lg" className="flex-shrink-0" />
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[15px] font-semibold text-ink">{name}</h3>
            {creator.fullyVerified && (
              <BadgeCheck size={15} className="flex-shrink-0 text-brand" aria-label={t('public.verified')} />
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-ink-soft">
            {creator.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin size={12} className="flex-shrink-0" />
                {creator.location}
              </span>
            )}
            {isTeam && (
              <span className="inline-flex items-center gap-1 font-medium text-ink-soft">
                <Users size={12} />
                {creator.providerType === 'AGENCY'
                  ? 'Agency'
                  : creator.teamSize
                    ? `Team · ${creator.teamSize}`
                    : 'Team'}
              </span>
            )}
          </div>
        </div>
        <ArrowUpRight
          size={16}
          className="flex-shrink-0 -translate-x-1 text-violet opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          aria-hidden
        />
      </div>

      {creator.bio && (
        <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{creator.bio}</p>
      )}

      {creator.categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <CategoryPill
            label={creator.categories[0]}
            meta={categoryMeta(creator.categories[0])}
            moreCount={creator.categories.length - 1}
          />
        </div>
      )}

      {platformStats.length > 0 && (
        // Two per row: "[ig] 56 followers | [tt] 56 followers"
        <div className="mt-auto grid grid-cols-2 gap-y-2 border-t border-line pt-3">
          {platformStats.map(({ platform, followers }, i) => (
            <span
              key={platform}
              className={cn(
                'flex min-w-0 items-center gap-1.5 text-[12.5px]',
                i % 2 === 1 && 'border-l border-line pl-3',
              )}
            >
              <span className="flex-shrink-0">
                <PlatformIcon platform={platform} size={14} />
              </span>
              <span className="font-semibold text-ink">{compactNumber(followers)}</span>
              <span className="truncate text-ink-soft">
                {platform === 'youtube' ? t('public.subscribers') : t('public.followers')}
              </span>
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
