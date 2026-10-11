import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useT } from '../i18n';
import { cn } from './cn';

/**
 * "Finish setting up your profile" nudge with a friendly progress bar —
 * replaces the plain AttentionBanner for the profile case on both dashboards.
 * The encouragement line steps up as the profile fills in. Mirrors mobile's
 * ProfileProgressCard.
 */
export function ProfileProgressCard({
  icon: Icon,
  title,
  subtitle,
  done,
  total,
  to,
  onDismiss,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  done: number;
  total: number;
  to: string;
  onDismiss?: () => void;
  className?: string;
}) {
  const t = useT();
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const remaining = total - done;
  const message =
    remaining === 1
      ? t('profileProgress.msgLast')
      : done === 0
        ? t('profileProgress.msgStart')
        : pct > 50
          ? t('profileProgress.msgMost')
          : t('profileProgress.msgEarly');

  return (
    <div className={cn('relative h-full', className)}>
      <Link
        to={to}
        className="flex h-full flex-col justify-between rounded-2xl border border-line bg-surface p-4 pr-9 transition-colors hover:border-line-strong"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Icon size={17} strokeWidth={2.25} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold text-ink">{title}</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">{message}</span>
          </span>
        </div>

        <div className="mt-3.5 flex items-center gap-3">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={t('profileProgress.progressLabel', { pct })}
            className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink/[0.07]"
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand to-success"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(pct, 6)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <span className="flex-shrink-0 text-[12.5px] font-semibold tabular-nums text-ink">{pct}%</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[12px] text-ink-soft">
          <span>{subtitle}</span>
          <span className="font-medium">{t('profileProgress.stepsDone', { done, total })}</span>
        </div>
      </Link>
      {onDismiss && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          aria-label="Dismiss"
          className="absolute right-2.5 top-2.5 rounded-full p-1 text-ink-soft/50 hover:bg-ink/[0.05] hover:text-ink-soft"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
