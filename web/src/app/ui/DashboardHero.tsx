import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from './cn';

/**
 * Primary CTA surface for the Creator/Business dashboard home — a soft
 * brand-tinted gradient card with blurred decorative blobs (reuses the
 * landing page's `mesh-blob`/`float-slow` keyframes from index.css) instead
 * of the site's plain flat-white card. Picks up `--color-brand`/`--color-violet`
 * from whichever of `.creator-scope`/`.business-scope` wraps it, so it reads
 * indigo on the creator app and green on the business app automatically.
 */
export function DashboardHero({
  title,
  subtitle,
  ctaLabel,
  to,
  className,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
  to: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'app-card group relative flex flex-col gap-4 overflow-hidden rounded-[24px] border border-line bg-gradient-to-br from-brand/[0.12] via-surface to-surface p-6 transition-shadow duration-200 hover:shadow-[0_24px_60px_-28px_var(--app-glow)] sm:flex-row sm:items-center sm:justify-between sm:p-8',
        className,
      )}
    >
      <div
        className="mesh-blob float-slow pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-brand/20 blur-3xl"
        aria-hidden
      />
      <div
        className="mesh-blob pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-lp-orange/15 blur-3xl"
        aria-hidden
      />
      <div className="relative min-w-0">
        <p className="lp-display text-[1.5rem] leading-snug text-ink">{title}</p>
        <p className="mt-1.5 max-w-md text-[14px] font-light leading-relaxed text-ink-soft">{subtitle}</p>
      </div>
      <span className="app-active-pill relative inline-flex flex-shrink-0 items-center gap-2 self-start rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition-[transform,filter] duration-200 group-hover:translate-x-0.5 group-hover:brightness-110 sm:self-center">
        {ctaLabel}
        <ArrowRight size={15} />
      </span>
    </Link>
  );
}
