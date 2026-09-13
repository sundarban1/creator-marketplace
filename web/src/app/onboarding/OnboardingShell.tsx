import type { ReactNode } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { cn } from '../ui/cn';

/**
 * Chrome shared by the creator and business onboarding flows — no `AppShell`
 * sidebar here (onboarding runs before there's a profile worth navigating
 * around), just a centred column with the same editorial language as the rest
 * of the redesigned app (serif titles, violet→orange gradient accents, ambient
 * mesh glow) instead of the older `AuthShell` gradient-panel look.
 */
export function OnboardingShell({
  step,
  total,
  stepLabel,
  backLabel,
  title,
  subtitle,
  onBack,
  children,
}: {
  step: number;
  total: number;
  /** Pre-translated "Step {n} of {total}" — namespace differs per flow. */
  stepLabel: string;
  backLabel: string;
  title: string;
  subtitle: string;
  onBack?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-paper">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[6%] top-[-30%] h-[380px] w-[380px] rounded-full bg-violet/[0.10] blur-[120px]" />
        <div
          className="mesh-blob absolute right-[-8%] top-[-10%] h-[320px] w-[320px] rounded-full bg-brand-orange/[0.08] blur-[120px]"
          style={{ animationDelay: '3s' }}
        />
      </div>

      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <Logo className="h-7" />
        <StepDots step={step} total={total} />
      </header>

      <main className="mx-auto w-full max-w-[480px] px-5 pb-16 pt-4 sm:px-6">
        {onBack && step > 1 ? (
          <button
            type="button"
            onClick={onBack}
            className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} />
            {backLabel}
          </button>
        ) : null}

        <p className="font-serif text-[13px] italic text-violet">{stepLabel}</p>
        <h1 className="mt-1.5 font-serif text-[26px] font-medium leading-tight tracking-tight text-ink sm:text-[28px]">
          {title}
        </h1>
        <span className="mt-2.5 block h-0.5 w-9 rounded-full bg-gradient-to-r from-violet to-brand-orange" />
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">{subtitle}</p>

        <div className="mt-7">{children}</div>
      </main>
    </div>
  );
}

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 rounded-full transition-all duration-300',
            i < step ? 'w-6 bg-gradient-to-r from-violet to-brand-orange' : 'w-1.5 bg-line-strong',
          )}
        />
      ))}
    </div>
  );
}

/** Terminal screen for both flows — same checkmark/CTA shape, different copy. */
export function OnboardingSuccess({
  title,
  body,
  cta,
  onContinue,
}: {
  title: string;
  body: string;
  cta: string;
  onContinue: () => void;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-5">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet/[0.10] blur-[130px]" />
      </div>
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet to-violet-dark text-white shadow-[0_20px_50px_-20px_rgba(91,46,214,0.55)]">
          <Check size={36} strokeWidth={2.5} />
        </span>
        <h1 className="mt-6 font-serif text-[28px] font-medium tracking-tight text-ink">{title}</h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{body}</p>
        <button
          type="button"
          onClick={onContinue}
          className="mt-8 inline-flex items-center justify-center rounded-xl bg-brand px-6 py-3 text-[15px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
