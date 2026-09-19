import { Link } from 'react-router-dom';
import { CalendarClock } from 'lucide-react';
import { useT } from '../i18n';
import { rupees } from '../lib/format';
import { useDeadlineLabel } from '../lib/useDeadlineLabel';
import { Avatar } from '../ui/Avatar';
import { cn } from '../ui/cn';
import { EngagementBadge } from './EngagementBadge';
import type { CreatorApplication } from '../api/creator';

/**
 * One application / engagement row. Links to its detail page; shared by the
 * dashboard's "active work" list and the Applications + My Work screens.
 */
export function ApplicationCard({ application: a }: { application: CreatorApplication }) {
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
      <Avatar name={c?.business?.businessName ?? 'Business'} src={c?.business?.logoUrl} size="md" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-ink">{c?.title ?? 'Campaign'}</p>
        <p className="mt-0.5 truncate text-[13px] text-ink-soft">
          {c?.business?.businessName}
          {' · '}
          {rupees(a.proposedRate)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <EngagementBadge state={a.engagementState} />
          {deadline && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[12px]',
                deadline.urgent ? 'font-semibold text-warning' : 'text-ink-soft',
              )}
            >
              <CalendarClock size={12} />
              {t('dashboard.deadlineIn', { label: deadline.label })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
