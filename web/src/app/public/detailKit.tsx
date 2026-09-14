import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { fadeUp, stagger } from '../../pages/landing/lib/motion';
import { cn } from '../ui/cn';

/**
 * Shared building blocks for the public detail pages (creator / business /
 * event). They carry the same editorial language as `BrowseHero` and the
 * browse cards — Fraunces serif headings, an ambient violet/orange glow,
 * gradient hairlines and a violet hover accent — so a profile reads as one
 * continuous surface with the rest of the marketplace.
 */

/** Full-bleed hero band with the ambient mesh glow + a back link. */
export function DetailHero({
  backTo,
  backLabel,
  children,
}: {
  backTo: string;
  backLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-paper">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[4%] top-[-40%] h-[360px] w-[360px] rounded-full bg-violet/[0.10] blur-[120px]" />
        <div
          className="mesh-blob absolute right-[-6%] top-[-20%] h-[300px] w-[300px] rounded-full bg-brand-orange/[0.08] blur-[120px]"
          style={{ animationDelay: '3s' }}
        />
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger(0.06)}
        className="mx-auto max-w-4xl px-4 pb-9 pt-10 sm:px-6 lg:pb-11 lg:pt-14"
      >
        <motion.div variants={fadeUp}>
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft size={14} />
            {backLabel}
          </Link>
        </motion.div>
        {children}
      </motion.div>
    </section>
  );
}

/** Animated child slot for the hero (keeps the stagger in `DetailHero`). */
export function HeroReveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

/** Avatar wrapped in the marketplace's violet ring. */
export function RingAvatar({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex flex-shrink-0 rounded-full bg-gradient-to-br from-violet/25 to-brand-orange/20 p-[3px]">
      <span className="rounded-full bg-paper p-0.5">{children}</span>
    </span>
  );
}

/** Serif section heading with a short gradient rule under it. */
export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="font-serif text-[19px] font-medium tracking-tight text-ink">{children}</h2>
      <span className="mt-2 block h-0.5 w-9 rounded-full bg-gradient-to-r from-violet to-brand-orange" />
    </div>
  );
}

export function DetailSection({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('mt-10', className)}>
      <SectionHeading>{title}</SectionHeading>
      {children}
    </section>
  );
}

/** Container for the body content below the hero. */
export function DetailBody({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6 lg:py-11">{children}</div>;
}

/** A single headline metric — serif number, muted label, violet top accent. */
export function StatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-3.5 text-center">
      <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-violet/60 to-brand-orange/50" />
      <p className="font-serif text-[20px] font-medium leading-none text-ink">{value}</p>
      <p className="mt-1.5 text-[12px] text-ink-soft">{label}</p>
    </div>
  );
}

/** External / internal link row with a violet hover treatment + travelling arrow. */
export function LinkRow({
  href,
  to,
  children,
}: {
  href?: string;
  to?: string;
  children: ReactNode;
}) {
  const className = cn(
    'group/row flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3',
    'transition-all duration-200 hover:-translate-y-0.5 hover:border-violet/30',
    'hover:shadow-[0_10px_24px_-16px_rgba(123,92,245,0.4)]',
  );
  const inner = (
    <>
      <span className="min-w-0 flex-1">{children}</span>
      <ArrowUpRight
        size={15}
        className="flex-shrink-0 -translate-x-1 text-violet opacity-0 transition-all duration-200 group-hover/row:translate-x-0 group-hover/row:opacity-100"
        aria-hidden
      />
    </>
  );
  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer nofollow" className={className}>
      {inner}
    </a>
  );
}

/** Tinted pill row (categories, goals, perks…). */
export function TagList({
  items,
  tone = 'neutral',
}: {
  items: string[];
  tone?: 'neutral' | 'violet' | 'success';
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={it}
          className={cn(
            'rounded-full px-2.5 py-1 text-[12px] font-medium',
            tone === 'neutral' && 'border border-line bg-surface-dim text-ink-soft',
            tone === 'violet' && 'border border-violet/20 bg-violet/[0.06] text-violet',
            tone === 'success' && 'bg-success-soft font-semibold text-success',
          )}
        >
          {it}
        </span>
      ))}
    </div>
  );
}

/** Closing call-to-action band, matched to the hero's editorial styling. */
export function BottomCTA({
  title,
  ctaLabel,
  to,
  href,
  onClick,
}: {
  title: string;
  ctaLabel: string;
  to?: string;
  href?: string;
  onClick?: () => void;
}) {
  return (
    <div className="relative mt-14 overflow-hidden rounded-2xl border border-violet/20 bg-gradient-to-br from-violet to-violet-dark p-7 text-center text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-orange/25 blur-3xl"
      />
      <p className="relative font-serif text-[21px] font-medium tracking-tight">{title}</p>
      <div className="relative mt-4">
        {to ? (
          <Link
            to={to}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-violet-dark transition-transform hover:-translate-y-0.5"
          >
            {ctaLabel}
            <ArrowUpRight size={15} />
          </Link>
        ) : href ? (
          <a
            href={href}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-violet-dark transition-transform hover:-translate-y-0.5"
          >
            {ctaLabel}
            <ArrowUpRight size={15} />
          </a>
        ) : (
          <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-violet-dark transition-transform hover:-translate-y-0.5"
          >
            {ctaLabel}
            <ArrowUpRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
