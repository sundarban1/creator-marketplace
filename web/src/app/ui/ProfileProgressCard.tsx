import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, X } from 'lucide-react';
import { useT } from '../i18n';
import { Avatar } from './Avatar';
import { cn } from './cn';

export type ProfileStep = {
  key: string;
  done: boolean;
  /** What to do and why, e.g. "Add a social link to get discovered". */
  label: string;
  /** Optional second line under the label. */
  hint?: string;
  /** Inline link that takes the user straight to where the step is done. */
  actionLabel: string;
  to: string;
};

/**
 * "Finish setting up your profile" nudge with a friendly progress bar —
 * replaces the plain AttentionBanner for the profile case on both dashboards.
 * Leads with the user's own avatar (initials until one is uploaded); the
 * encouragement line steps up as the profile fills in, and each step still to
 * do is shown one at a time, with its own deep link. Mirrors mobile's ProfileProgressCard.
 */
export function ProfileProgressCard({
  title,
  name,
  avatarUrl,
  steps,
  to,
  onDismiss,
  className,
}: {
  title: string;
  name: string;
  avatarUrl: string | null | undefined;
  steps: ProfileStep[];
  to: string;
  onDismiss?: () => void;
  className?: string;
}) {
  const t = useT();
  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  const remaining = steps.filter((s) => !s.done);
  // Only the next step is shown — one ask at a time instead of a checklist.
  const next = remaining[0];
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const message =
    remaining.length === 1
      ? t('profileProgress.msgLast')
      : done === 0
        ? t('profileProgress.msgStart')
        : pct > 50
          ? t('profileProgress.msgMost')
          : t('profileProgress.msgEarly');

  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong',
        className,
      )}
    >
      <Link to={to} className="flex items-start gap-3 pr-6">
        <Avatar src={avatarUrl} name={name} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold text-ink">{title}</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">{message}</span>
        </span>
      </Link>

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
      <span className="mt-1.5 text-[12px] font-medium text-ink-soft">{t('profileProgress.stepsDone', { done, total })}</span>

      {next && (
        <ul className="mt-3 flex flex-col gap-2.5 border-t border-line pt-3">
          {[next].map((step) => (
            <li key={step.key} className="flex items-center gap-2.5">
              <span className="h-2 w-2 flex-shrink-0 rounded-full border-[1.5px] border-brand" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-medium leading-snug text-ink">{step.label}</span>
                {step.hint && <span className="mt-0.5 block text-[12px] leading-snug text-ink-soft">{step.hint}</span>}
              </span>
              <Link
                to={step.to}
                className="inline-flex flex-shrink-0 items-center gap-0.5 text-[12.5px] font-semibold text-brand hover:underline"
              >
                {step.actionLabel}
                <ChevronRight size={13} strokeWidth={2.5} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {onDismiss && (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="absolute right-2.5 top-2.5 rounded-full p-1 text-ink-soft/50 hover:bg-ink/[0.05] hover:text-ink-soft"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
