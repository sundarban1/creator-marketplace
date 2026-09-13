import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { useT } from '../i18n';
import { cn } from '../ui/cn';
import type { EngagementState } from '../lib/engagement';

/**
 * Ordered happy-path steps for an accepted engagement. Each entry lists every
 * `EngagementState` that belongs to that step (e.g. both `IN_PROGRESS` and
 * `REVISION_REQUESTED` are still "in progress" from the creator's point of
 * view). States outside this path (pending proposal, disputed, cancelled,
 * refunded…) render `null` — the existing status alert / dispute card
 * already covers those, and a 5-step tracker would misrepresent them.
 */
const STEPS: { labelKey: string; states: EngagementState[] }[] = [
  { labelKey: 'stepAccepted', states: ['CREATOR_SELECTED', 'ESCROW_FUNDED'] },
  { labelKey: 'stepInProgress', states: ['IN_PROGRESS', 'REVISION_REQUESTED', 'CONTENT_OVERDUE'] },
  { labelKey: 'stepSubmitted', states: ['BUSINESS_REVIEW'] },
  { labelKey: 'stepPaymentReleasing', states: ['PAYMENT_RELEASE_PENDING'] },
  { labelKey: 'stepPaid', states: ['PAYMENT_RELEASED', 'COMPLETED'] },
];

function workStepIndex(state: string): number {
  return STEPS.findIndex((step) => (step.states as string[]).includes(state));
}

export function WorkStepper({ state }: { state: string }) {
  const t = useT();
  const currentIndex = workStepIndex(state);
  if (currentIndex < 0) return null;

  return (
    <div className="flex items-start rounded-2xl border border-line bg-surface p-5">
      {STEPS.map((step, i) => {
        const done = i < currentIndex || (i === currentIndex && i === STEPS.length - 1);
        const current = i === currentIndex && !done;
        return (
          <Fragment key={step.labelKey}>
            <div className="flex w-16 flex-shrink-0 flex-col items-center text-center sm:w-24">
              <span
                className={cn(
                  'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
                  done
                    ? 'bg-gradient-to-br from-violet to-brand-orange text-white'
                    : current
                      ? 'border-2 border-violet bg-surface text-violet-dark'
                      : 'bg-surface-dim text-ink-soft',
                )}
              >
                {done ? <Check size={15} strokeWidth={2.5} /> : i + 1}
              </span>
              <span
                className={cn(
                  'mt-2 text-[11px] font-medium leading-tight',
                  done || current ? 'text-ink' : 'text-ink-soft',
                )}
              >
                {t(`workDetail.${step.labelKey}`)}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  'mt-4 h-0.5 flex-1 rounded-full',
                  i < currentIndex ? 'bg-gradient-to-r from-violet to-brand-orange' : 'bg-line',
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
