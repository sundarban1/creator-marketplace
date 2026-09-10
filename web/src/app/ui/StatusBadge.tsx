import { cn } from './cn';

/**
 * Status pill. Backend enums (PENDING, ACCEPTED, …) stay untranslated in the
 * data (spec §46) — the caller passes an already-localised `label` plus a
 * `tone`. Never color-only: the text label always shows, plus a shape dot
 * (spec §67).
 */
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'progress';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-dim text-ink-soft',
  info: 'bg-brand/10 text-brand',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  progress: 'bg-violet/12 text-violet-dark',
};

export function StatusBadge({
  label,
  tone = 'neutral',
  dot = true,
  className,
}: {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {label}
    </span>
  );
}
