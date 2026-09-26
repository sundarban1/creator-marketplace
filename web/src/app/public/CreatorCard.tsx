import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, ArrowUpRight, Users } from 'lucide-react';
import { useT } from '../i18n';
import { compactNumber, totalFollowers } from '../lib/format';
import { Avatar } from '../ui/Avatar';
import { PlatformIcon } from '../ui/PlatformIcon';
import { cn } from '../ui/cn';
import type { CreatorCard as CreatorCardData } from '../api/publicMarketplace';
import type { CategoryMeta } from './categoryLookup';
import { CategoryPill } from './CategoryPill';

const PLATFORM_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook',
};

interface Props {
  creator: CreatorCardData;
  categoryMeta: (name: string) => CategoryMeta;
  /** Base path the card links into — defaults to the public profile. Pass
   *  `/creator/creators` from the signed-in creator dashboard so the link
   *  stays inside the authed shell instead of escaping to the public,
   *  landing-nav-wrapped route. */
  hrefBase?: string;
  /** Show this platform's follower count instead of the all-platform total —
   *  used when a search is about that platform ("TikTok creators with 10k+"). */
  followersPlatform?: string;
}

export function CreatorCard({ creator, categoryMeta, hrefBase = '/creators', followersPlatform }: Props) {
  const t = useT();
  const handle = creator.username ?? creator.id;
  const platformAccount = followersPlatform
    ? creator.socialAccounts.find((a) => a.platform === followersPlatform)
    : undefined;
  const followers = platformAccount ? platformAccount.followers : totalFollowers(creator.socialAccounts);
  const platforms = [...new Set(creator.socialAccounts.map((a) => a.platform))].slice(0, 4);
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

      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <div className="flex items-center gap-2 text-ink-soft">
          {platforms.map((p) => (
            <PlatformIcon key={p} platform={p} size={15} />
          ))}
        </div>
        {followers > 0 && (
          <span className="text-[13px] font-semibold text-ink">
            {compactNumber(followers)}{' '}
            <span className="font-normal text-ink-soft">
              {platformAccount
                ? t('public.platformFollowers', { platform: PLATFORM_NAMES[platformAccount.platform] ?? platformAccount.platform })
                : t('public.followers')}
            </span>
          </span>
        )}
      </div>
    </Link>
  );
}
