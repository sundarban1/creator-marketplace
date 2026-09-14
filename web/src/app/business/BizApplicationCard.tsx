import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import { rupees } from '../lib/format';
import { Avatar } from '../ui/Avatar';
import { cn } from '../ui/cn';
import { EngagementBadge } from '../creator/EngagementBadge';
import type { BusinessApplication } from '../api/business';

/** One received proposal / engagement — links to the event's manage page. */
export function BizApplicationCard({
  application: a,
  to,
}: {
  application: BusinessApplication;
  to?: string;
}) {
  const t = useT();
  const href = to ?? (a.campaignId ? `/business/events/${a.campaignId}` : '/business/applications');

  return (
    <Link
      to={href}
      className={cn(
        'flex items-center gap-4 rounded-xl border border-line bg-surface p-4',
        'transition-shadow duration-200 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
      )}
    >
      <Avatar name={a.creator?.fullName ?? 'Creator'} src={a.creator?.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">{a.creator?.fullName ?? 'Creator'}</p>
        <p className="mt-0.5 truncate text-[13px] text-ink-soft">
          {a.campaign?.title}
          {' · '}
          {t('biz.proposedRate')}: {rupees(a.proposedRate)}
        </p>
        <div className="mt-2">
          <EngagementBadge state={a.engagementState} />
        </div>
      </div>
    </Link>
  );
}
