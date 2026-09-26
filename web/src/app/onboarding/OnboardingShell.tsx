import type { ReactNode } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
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
 * around). Two-pane on desktop (photo + brand copy on the left, mirroring
 * `AuthShell`'s split), single centred column on mobile. Landing design
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
  panelImage,
  panelImageAlt,
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
  /** Desktop-only brand panel — photo + a few pre-translated info rows. */
  panelImage: string;
  panelImageAlt: string;
  panelHeadline: string;
  panelPoints: OnboardingPanelPoint[];
  children: ReactNode;
}) {
  return (
    <div className="lp-stars relative isolate flex min-h-screen overflow-hidden bg-paper text-ink">
      <Glows />

      <aside className="relative m-3 hidden w-[42%] max-w-[560px] flex-col justify-between overflow-hidden rounded-[28px] lg:flex">
        <img src={panelImage} alt={panelImageAlt} className="absolute inset-0 h-full w-full object-cover" />
        {/* Fixed navy scrims (not `ink`, which flips to white in dark). */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-lp-black/80 via-lp-black/45 to-lp-black/90" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-tr from-brand/35 via-transparent to-lp-orange/20 mix-blend-multiply" />

        <div className="relative flex h-full flex-col justify-between p-10 text-white">
          <Logo className="h-8" />

          <div>
            <h2 className="lp-display text-balance text-[2.2rem] leading-[1.12]">
              <GradientTail text={panelHeadline} />
            </h2>
            <ul className="mt-8 space-y-4">
              {panelPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 backdrop-blur-md">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/15">
                    {point.icon}
                  </span>
                  <span>
                    <span className="block text-[14.5px] font-medium">{point.title}</span>
                    <span className="mt-0.5 block text-[13px] font-light leading-relaxed text-white/75">{point.desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      <div className="relative flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <Logo className="h-7 lg:invisible" />
          <div className="flex items-center gap-3">
            <StepDots step={step} total={total} />
            <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:bg-surface-dim hover:text-ink" />
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-5 pb-16 pt-2 sm:px-6">
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
