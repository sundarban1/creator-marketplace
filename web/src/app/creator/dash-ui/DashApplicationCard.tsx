import { Link } from 'react-router-dom';
import { CalendarClock, Briefcase } from 'lucide-react';
import { useT } from '../../i18n';
import { rupees } from '../../lib/format';
import { useDeadlineLabel } from '../../lib/useDeadlineLabel';
import { cn } from '../../ui/cn';
import { EngagementBadge } from '../EngagementBadge';
import type { CreatorApplication } from '../../api/creator';

/**
 * `ApplicationCard` for the dashboard/applications/work screens — matches the
 * site's editorial `ui/Card` (bordered surface, violet hover-lift).
 */
export function DashApplicationCard({ application: a }: { application: CreatorApplication }) {
  const t = useT();
  const fmtDeadline = useDeadlineLabel();
  const c = a.campaign;
  const deadline = a.contentDeadline ? fmtDeadline(a.contentDeadline) : null;

  return (
    <Link
      to={`/creator/work/${a.id}`}
      className={cn(
        'flex items-center gap-4 rounded-2xl border border-line bg-surface p-4',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-violet/30 hover:shadow-[0_10px_24px_-14px_rgba(123,92,245,0.35)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
      )}
    >
      <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-surface-dim">
        {c?.featureImageUrl ? (
          <img src={c.featureImageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-soft">
            <Briefcase size={20} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">{c?.title ?? 'Campaign'}</p>
        <p className="mt-0.5 truncate text-[13px] text-ink-soft">
          {c?.business?.businessName}
          {' · '}
          {rupees(a.proposedRate)}
        </p>
        {deadline && (
          <span
            className={cn(
              'mt-2 inline-flex items-center gap-1 text-[12px]',
              deadline.urgent ? 'font-semibold text-warning' : 'text-ink-soft',
            )}
          >
            <CalendarClock size={12} />
            {t('dashboard.deadlineIn', { label: deadline.label })}
          </span>
        )}
      </div>

      <div className="flex-shrink-0 self-center">
        <EngagementBadge state={a.engagementState} />
      </div>
    </Link>
  );
}
