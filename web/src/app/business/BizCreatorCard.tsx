import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Bookmark } from 'lucide-react';
import { useT } from '../i18n';
import { compactNumber, totalFollowers } from '../lib/format';
import { Avatar } from '../ui/Avatar';
import { PlatformIcon } from '../ui/PlatformIcon';
import { cn } from '../ui/cn';
import type { BusinessCreatorCard } from '../api/business';

export function BizCreatorCard({
  creator,
  saved,
  onToggleSave,
}: {
  creator: BusinessCreatorCard;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const t = useT();
  const followers = totalFollowers(creator.socialAccounts);
  const platforms = [...new Set(creator.socialAccounts.map((a) => a.platform))].slice(0, 4);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-violet/30 hover:shadow-[0_1px_3px_rgba(20,17,16,0.06),0_18px_34px_-16px_rgba(123,92,245,0.28)]">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-violet to-brand-orange transition-transform duration-300 group-hover:scale-x-100"
      />
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

      <Link to={`/business/creators/${creator.id}`} className="flex items-start gap-3 pr-8">
        <span className="flex-shrink-0 rounded-full p-0.5 ring-1 ring-violet/15">
          <Avatar name={creator.fullName ?? 'Creator'} src={creator.avatarUrl} size="lg" />
        </span>
        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-[15px] font-semibold text-ink">{creator.fullName ?? 'Creator'}</h3>
            {creator.fullyVerified && <BadgeCheck size={15} className="flex-shrink-0 text-brand" />}
          </div>
          {creator.location && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-ink-soft">
              <MapPin size={12} />
              {creator.location}
            </p>
          )}
        </div>
      </Link>

      {creator.bio && <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{creator.bio}</p>}

      {creator.categories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {creator.categories.slice(0, 3).map((c) => (
            <span key={c} className="rounded-full bg-surface-dim px-2 py-0.5 text-[11px] font-medium text-ink-soft">
              {c}
            </span>
          ))}
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
            {compactNumber(followers)} <span className="font-normal text-ink-soft">{t('public.followers')}</span>
          </span>
        )}
      </div>
    </div>
  );
}
