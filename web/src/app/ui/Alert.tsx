import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Info } from 'lucide-react';
import { cn } from './cn';

type Tone = 'error' | 'success' | 'info' | 'warning' | 'progress' | 'neutral';

const TONES: Record<Tone, { wrap: string; icon: ReactNode }> = {
  error: { wrap: 'bg-danger-soft text-danger', icon: <AlertCircle size={16} /> },
  success: { wrap: 'bg-success-soft text-success', icon: <CheckCircle2 size={16} /> },
  info: { wrap: 'bg-brand/10 text-brand', icon: <Info size={16} /> },
  warning: { wrap: 'bg-warning-soft text-warning', icon: <AlertTriangle size={16} /> },
  progress: { wrap: 'bg-violet/12 text-violet-dark', icon: <Clock size={16} /> },
  neutral: { wrap: 'bg-surface-dim text-ink', icon: <Info size={16} /> },
};

export function Alert({
  tone = 'error',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] font-medium',
        t.wrap,
        className,
      )}
    >
      <span className="mt-px flex-shrink-0" aria-hidden>
        {t.icon}
      </span>
      <span>{children}</span>
    </div>
  );
}
