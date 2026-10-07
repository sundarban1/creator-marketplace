import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import type { StageInfo } from '../lib/engagementStage';
import { cn } from './cn';

/**
 * The status block inside a work card: an optional "what's happening" line,
 * then the stage countdown ("Time to confirm · 1d 23h left") with its note.
 * Tinted red once the countdown is overdue.
 */
export function StatusStrip({
  text,
  action,
  stage,
  className,
}: {
  text?: ReactNode;
  action?: ReactNode;
  stage?: StageInfo | null;
  className?: string;
}) {
  if (!text && !stage) return null;
  const tone = stage?.overdue ? 'text-danger' : 'text-brand';
  return (
    <div className={cn('rounded-xl px-3.5 py-3', stage?.overdue ? 'bg-danger-soft' : 'bg-surface-dim', className)}>
      {text && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] text-ink">{text}</p>
          {action && <span className="flex-shrink-0">{action}</span>}
        </div>
      )}
      {stage && (
        <div className={cn(text && 'mt-2.5 border-t border-line pt-2.5')}>
          <div className="flex items-center justify-between gap-3">
            <span className={cn('flex items-center gap-1.5 text-[12px] font-semibold', tone)}>
              <Clock size={13} aria-hidden />
              {stage.label}
            </span>
            <span className={cn('text-[14px] font-bold', tone)}>{stage.value}</span>
          </div>
          {stage.note && <p className="mt-1 text-[12px] leading-[18px] text-ink-soft">{stage.note}</p>}
        </div>
      )}
    </div>
  );
}
