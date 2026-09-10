import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin } from 'lucide-react';
import { useT } from '../i18n';
import { compactNumber, totalFollowers } from '../lib/format';
import { Avatar } from '../ui/Avatar';
import { PlatformIcon } from '../ui/PlatformIcon';
import { cn } from '../ui/cn';
import type { CreatorCard as CreatorCardData } from '../api/publicMarketplace';

export function CreatorCard({ creator }: { creator: CreatorCardData }) {
  const t = useT();
  const handle = creator.username ?? creator.id;
  const followers = totalFollowers(creator.socialAccounts);
  const platforms = [...new Set(creator.socialAccounts.map((a) => a.platform))].slice(0, 4);

  return (
    <Link
      to={`/creators/${encodeURIComponent(handle)}`}
      className={cn(
        'group flex flex-col rounded-2xl border border-line bg-surface p-5',
        'transition-[border-color,box-shadow] hover:border-line-strong',
        'hover:shadow-[0_1px_3px_rgba(20,17,16,0.06),0_12px_28px_-14px_rgba(20,17,16,0.15)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={creator.fullName ?? 'Creator'} src={creator.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[15px] font-semibold text-ink">
              {creator.fullName ?? 'Creator'}
            </h3>
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
      </div>

      {creator.bio && (
        <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{creator.bio}</p>
      )}

      {creator.categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {creator.categories.slice(0, 3).map((c) => (
            <span
              key={c}
              className="rounded-full bg-surface-dim px-2 py-0.5 text-[11px] font-medium text-ink-soft"
            >
              {c}
            </span>
          ))}
          {creator.categories.length > 3 && (
            <span className="px-1 text-[11px] text-ink-soft">+{creator.categories.length - 3}</span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3">
        <div className="flex items-center gap-2 text-ink-soft">
          {platforms.map((p) => (
            <PlatformIcon key={p} platform={p} size={15} />
          ))}
        </div>
        {followers > 0 && (
          <span className="text-[13px] font-semibold text-ink">
            {compactNumber(followers)}{' '}
            <span className="font-normal text-ink-soft">{t('public.followers')}</span>
          </span>
        )}
      </div>
    </Link>
  );
}
