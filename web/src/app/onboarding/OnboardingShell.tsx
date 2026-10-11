import type { ReactNode } from 'react';
import { ArrowLeft, Check, Info } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { cn } from '../ui/cn';
import { ThemeToggle } from '../../pages/landing/components/ThemeToggle';

export interface OnboardingPanelPoint {
  icon: ReactNode;
  title: string;
  desc: string;
}

/**
 * Chrome shared by the creator and business onboarding flows — no `AppShell`
 * sidebar here (onboarding runs before there's a profile worth navigating
 * around). Form centred, with the brand headline + info cards in one row along
 * the bottom on desktop (hidden on mobile). Landing design
 * language: theme-aware lavender/navy base with brand glows (+ starfield in
 * dark), thin display headlines with a gradient closing word, the form in a
 * glass card and the gradient pill for progress. `.app-scope` + the role
 * accent are applied by `OnboardingScreen`.
 */
export function OnboardingShell({
  step,
  total,
  stepLabel,
  backLabel,
  title,
  subtitle,
  onBack,
  wide = false,
  panelHeadline,
  panelPoints,
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
  /** Wider form card — for steps with a long pill list (CategoryPicker). */
  wide?: boolean;
  /** Desktop-only brand panel — a few pre-translated info rows. */
  panelHeadline: string;
  panelPoints: OnboardingPanelPoint[];
  children: ReactNode;
}) {
  return (
    <div className="lp-stars relative isolate flex min-h-screen overflow-hidden bg-paper text-ink">
      <Glows />

      <div className="relative flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <Logo className="h-7" />
          <div className="flex items-center gap-3">
            <StepDots step={step} total={total} />
            <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:bg-surface-dim hover:text-ink" />
          </div>
        </header>

        <main className={cn('mx-auto flex w-full flex-1 flex-col justify-center px-5 pb-16 pt-2 sm:px-6', wide ? 'max-w-[1000px]' : 'max-w-[520px]')}>
          <div className="lp-glass rounded-[28px] p-6 shadow-[0_0_60px_-24px_var(--app-glow)] sm:p-8">
            {onBack && step > 1 ? (
              <button
                type="button"
                onClick={onBack}
                className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink"
              >
                <ArrowLeft size={14} />
                {backLabel}
              </button>
            ) : null}

            <p className="text-xs font-medium uppercase tracking-[0.14em] text-violet-dark">{stepLabel}</p>
            <h1 className="lp-display mt-2 text-[1.9rem] leading-tight text-ink sm:text-[2.1rem]">
              <GradientTail text={title} />
            </h1>
            <p className="mt-2.5 text-[15px] font-light leading-relaxed text-ink-soft">{subtitle}</p>

            <div className="mt-7">{children}</div>
          </div>
        </main>

        <section className="mx-auto hidden w-full max-w-6xl px-8 pb-12 lg:block">
          <h2 className="lp-display text-balance text-center text-[1.6rem] leading-[1.15] text-ink">
            <GradientTail text={panelHeadline} />
          </h2>
          <ul className="mt-6 grid grid-cols-3 gap-4">
            {panelPoints.map((point, i) => (
              <li key={i} className="lp-glass flex items-center gap-3.5 rounded-2xl p-4">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  {point.icon}
                </span>
                <span className="text-[14.5px] font-medium text-ink">{point.title}</span>
                {/* Description lives in a hover/focus tooltip on the info icon. */}
                <span className="group relative flex">
                  <button
                    type="button"
                    aria-label={point.desc}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    <Info size={15} />
                  </button>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[13px] font-light leading-relaxed text-ink-soft opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    {point.desc}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/** Thin headline with its last word in the role's brand gradient. */
function GradientTail({ text }: { text: string }) {
  const words = text.split(' ');
  const lead = words.slice(0, -1).join(' ');
  return (
    <>
      {lead && <>{lead} </>}
      <span className="app-gradient-text">{words[words.length - 1]}</span>
    </>
  );
}

/** Brand glows — accent wash top-left, saffron ember bottom-right. */
function Glows() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="mesh-blob absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full bg-brand/25 blur-[140px]" />
      <div className="absolute -bottom-40 -right-32 h-[460px] w-[460px] rounded-full bg-lp-orange/15 blur-[130px]" />
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
            i < step ? 'app-active-pill w-7' : 'w-1.5 bg-line-strong',
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
    <div className="lp-stars relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-paper px-5">
      <Glows />
      <div className="lp-glass flex w-full max-w-md flex-col items-center rounded-[28px] p-8 text-center shadow-[0_0_60px_-24px_var(--app-glow)] sm:p-10">
        <span className="app-active-pill flex h-20 w-20 items-center justify-center rounded-full">
          <Check size={36} strokeWidth={2.5} />
        </span>
        <h1 className="lp-display mt-6 text-[2rem] leading-tight text-ink">
          <GradientTail text={title} />
        </h1>
        <p className="mt-2.5 text-[15px] font-light leading-relaxed text-ink-soft">{body}</p>
        <button
          type="button"
          onClick={onContinue}
          className="app-active-pill mt-8 inline-flex items-center justify-center rounded-full px-7 py-3 text-[15px] font-semibold transition hover:brightness-110"
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
