import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fadeUp, stagger, VP } from '../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   Web replicas of the pieces the mobile creator home is built from
   (mobile/src/app/(creator)/(tabs)/index.tsx and the components it pulls in:
   SearchInput, AttentionBanner, PromoBanner, CampaignCard, the quick-action
   row and the gradient CTA card).

   Every measurement here is the app's own — 48px search row, 52px quick-action
   icon square, 264px campaign card, 112px card image, RADIUS.sm/md/lg/xl,
   SHADOW.card/raised/floating — so the landing page shows a visitor the
   interface they are about to download rather than a marketing site that
   happens to share a logo with it. Where the web needs something the phone
   doesn't (hover states, a two-column grid, dark mode) that is added on top
   of the app's values, never in place of them.
   ───────────────────────────────────────────────────────────────────────── */

// ── Section shell ──────────────────────────────────────────────────────────
// `canvas` is the tinted step, `surface` the plain white one. Alternating
// them is what gives a 1400px page the same "one screen at a time" reading
// rhythm the app gets for free from having one section per screen.
export function AppSection({
  id,
  tone = 'surface',
  className = '',
  children,
}: {
  id?: string;
  tone?: 'surface' | 'canvas';
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`relative py-20 sm:py-24 ${
        tone === 'canvas' ? 'bg-app-canvas dark:bg-app-night' : 'bg-white dark:bg-app-night-surface'
      } ${className}`}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">{children}</div>
    </section>
  );
}

// ── Section heading ────────────────────────────────────────────────────────
// The app's section header is a bold title on the left and a "See all" in the
// primary color on the right (styles.sectionHeader / styles.seeAll). At page
// scale that pattern needs a supporting line, so `eyebrow`/`sub` are added —
// the eyebrow reuses the app's tinted-chip treatment rather than the
// editorial page's italic serif line.
export function SectionHeading({
  eyebrow,
  title,
  sub,
  align = 'left',
  action,
  icon: Icon,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  align?: 'left' | 'center';
  action?: { label: string; onClick: () => void };
  icon?: LucideIcon;
}) {
  const centered = align === 'center';
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={VP}
      variants={stagger()}
      className={`flex flex-col gap-3 ${
        centered ? 'mx-auto max-w-2xl items-center text-center' : 'items-start'
      } ${action ? 'sm:flex-row sm:items-end sm:justify-between sm:gap-6' : ''}`}
    >
      <div className={centered ? 'flex flex-col items-center' : ''}>
        {eyebrow && (
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-1.5 rounded-app-sm bg-app-primary-tint px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-app-primary dark:bg-app-primary/15 dark:text-indigo-300"
          >
            {Icon && <Icon size={12} strokeWidth={2.5} />}
            {eyebrow}
          </motion.span>
        )}
        <motion.h2
          variants={fadeUp}
          className="mt-3 text-balance text-2xl font-bold leading-[1.35] tracking-tight text-app-text sm:text-[32px] dark:text-white"
        >
          {title}
        </motion.h2>
        {sub && (
          <motion.p
            variants={fadeUp}
            className={`mt-3 text-[15px] leading-[1.65] text-app-muted dark:text-white/60 ${centered ? 'max-w-xl' : 'max-w-lg'}`}
          >
            {sub}
          </motion.p>
        )}
      </div>

      {action && (
        <motion.div variants={fadeUp} className="flex-shrink-0">
          <SeeAll label={action.label} onClick={action.onClick} />
        </motion.div>
      )}
    </motion.div>
  );
}

/** The app's `seeAll` link — semibold, primary-colored, no underline. */
export function SeeAll({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1 rounded-app-sm text-sm font-semibold text-app-primary transition-opacity hover:opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-app-primary dark:text-indigo-300"
    >
      {label}
      <ChevronRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
    </button>
  );
}

// ── Surfaces ───────────────────────────────────────────────────────────────
export function AppCard({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={`rounded-app-lg border border-app-border bg-white shadow-app-card dark:border-app-night-border dark:bg-app-night-raised ${className}`}
    >
      {children}
    </div>
  );
}

/** Dashed empty-state card — the app's `cardEmpty`. */
export function AppEmptyCard({
  icon: Icon,
  title,
  sub,
  action,
}: {
  icon: LucideIcon;
  title: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-app-md border-[1.5px] border-dashed border-app-border bg-white p-6 text-center dark:border-app-night-border dark:bg-app-night-raised">
      <Icon size={28} className="text-app-muted dark:text-white/40" />
      <p className="text-[15px] font-bold leading-[1.5] text-app-text dark:text-white">{title}</p>
      {sub && <p className="text-sm leading-[1.6] text-app-muted dark:text-white/50">{sub}</p>}
      {action && <AppButton onClick={action.onClick}>{action.label}</AppButton>}
    </div>
  );
}

// ── Buttons ────────────────────────────────────────────────────────────────
// Primary = the app's filled pill with its own colored shadow (the
// `expandRadiusBtn` / `ctaBtn` treatment). Ghost = the bordered variant.
export function AppButton({
  onClick,
  variant = 'primary',
  size = 'md',
  icon = true,
  className = '',
  children,
}: {
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'onDark';
  size?: 'sm' | 'md';
  icon?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const sizes = size === 'sm' ? 'px-4 py-2.5 text-[13px]' : 'px-6 py-3.5 text-sm';
  const variants = {
    primary:
      'bg-app-primary text-white shadow-[0_6px_18px_-6px_rgba(79,70,229,0.6)] hover:bg-app-primary-dark',
    ghost:
      'border border-app-border bg-white text-app-text hover:border-app-primary/50 hover:text-app-primary dark:border-app-night-border dark:bg-app-night-raised dark:text-white dark:hover:text-white',
    onDark: 'bg-white text-app-primary hover:bg-white/90',
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary ${sizes} ${variants[variant]} ${className}`}
    >
      {children}
      {icon && <ArrowRight size={14} strokeWidth={2.5} />}
    </button>
  );
}

// ── Search row ─────────────────────────────────────────────────────────────
// The app's SearchInput: primaryLight fill, 1.5px border, RADIUS.lg, 48 tall.
export function AppSearchBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  ariaLabel,
  submitLabel,
  trailing,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  ariaLabel: string;
  submitLabel: string;
  trailing?: ReactNode;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-2.5 sm:flex-row sm:items-center"
    >
      <div className="relative flex h-12 flex-1 items-center gap-2.5 rounded-app-lg border-[1.5px] border-app-border bg-app-primary-tint px-3.5 focus-within:border-app-primary/60 dark:border-app-night-border dark:bg-app-night-raised">
        <Search size={16} strokeWidth={2.5} className="flex-shrink-0 text-app-muted dark:text-white/45" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={ariaLabel}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-app-text outline-none placeholder:text-app-muted dark:text-white dark:placeholder:text-white/45"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear"
            className="flex-shrink-0 rounded-full p-1 text-app-muted transition-colors hover:text-app-text dark:hover:text-white"
          >
            <X size={14} />
          </button>
        )}
        {trailing}
      </div>
      <AppButton className="flex-shrink-0 justify-center sm:w-auto">{submitLabel}</AppButton>
    </form>
  );
}

/** Filter/suggestion pill — the app's `nearbyChip`. */
export function AppChip({
  label,
  icon: Icon,
  onClick,
  tone = 'primary',
}: {
  label: string;
  icon?: LucideIcon;
  onClick?: () => void;
  tone?: 'primary' | 'plain';
}) {
  const tones = {
    primary:
      'border-app-border bg-app-primary-tint text-app-primary dark:border-app-night-border dark:bg-app-primary/15 dark:text-indigo-300',
    plain:
      'border-app-border bg-white text-app-muted hover:border-app-primary/40 hover:text-app-primary dark:border-app-night-border dark:bg-app-night-raised dark:text-white/60 dark:hover:text-white',
  } as const;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${tones[tone]}`}
    >
      {Icon && <Icon size={11} strokeWidth={2.5} />}
      {label}
    </button>
  );
}

// ── Quick actions ──────────────────────────────────────────────────────────
// One color per tile, straight from the app's QUICK_ACTION_COLORS map — the
// point of that palette (five icon shapes that also read as five colors
// instead of one repeated brand tint) survives the port.
export const QUICK_ACTION_COLORS = {
  purple: { icon: '#7C3AED', bg: '#F3E8FF' },
  amber: { icon: '#D97706', bg: '#FEF3C7' },
  blue: { icon: '#0369A1', bg: '#E0F2FE' },
  teal: { icon: '#0D9488', bg: '#CCFBF1' },
  pink: { icon: '#DB2777', bg: '#FCE7F3' },
} as const;

export type QuickActionColor = keyof typeof QUICK_ACTION_COLORS;

export function QuickActionTile({
  icon: Icon,
  label,
  color,
  onClick,
  size = 'md',
}: {
  icon: LucideIcon;
  label: string;
  color: QuickActionColor;
  onClick?: () => void;
  size?: 'sm' | 'md';
}) {
  const { icon, bg } = QUICK_ACTION_COLORS[color];
  const box = size === 'sm' ? 'h-11 w-11' : 'h-[52px] w-[52px]';
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-1 flex-col items-center gap-2 rounded-app-md p-1 text-center transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary"
    >
      <span
        style={{ backgroundColor: bg, color: icon }}
        className={`flex flex-shrink-0 items-center justify-center rounded-app-lg shadow-app-card transition-transform duration-300 group-hover:-translate-y-1 ${box}`}
      >
        <Icon size={size === 'sm' ? 16 : 18} strokeWidth={2.4} />
      </span>
      <span className="text-[11px] font-medium leading-[1.5] text-app-text sm:text-xs dark:text-white/80">{label}</span>
    </button>
  );
}

// ── Gradient CTA card ──────────────────────────────────────────────────────
// The app's hero CTA: brinjal1 -> #7C3AED diagonal gradient, RADIUS.xl, a
// translucent icon circle on the right and a white pill button below.
export function GradientCTACard({
  title,
  sub,
  cta,
  icon: Icon,
  onClick,
  className = '',
}: {
  title: string;
  sub: string;
  cta: string;
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div
      className={`rounded-app-xl bg-[linear-gradient(135deg,#4F46E5_0%,#7C3AED_100%)] p-6 shadow-app-floating sm:p-7 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-[1.45] text-white">{title}</p>
          <p className="mt-1 text-sm leading-[1.6] text-white/85">{sub}</p>
        </div>
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
          <Icon size={22} strokeWidth={2.2} />
        </span>
      </div>
      <AppButton variant="onDark" onClick={onClick} className="mt-5">
        {cta}
      </AppButton>
    </div>
  );
}

// ── Banners ────────────────────────────────────────────────────────────────
/** The app's amber AttentionBanner. */
export function AttentionBanner({
  icon: Icon,
  title,
  sub,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-app-md border border-[#FDE68A] bg-[#FFFBEB] p-3 text-left transition-colors hover:bg-[#FEF6DE] dark:border-amber-500/25 dark:bg-amber-500/10"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-app-md bg-[#FEF3C7] text-[#D97706] dark:bg-amber-500/20">
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-[1.5] text-[#92400E] dark:text-amber-200">{title}</span>
        <span className="block truncate text-xs leading-[1.6] text-[#B45309] dark:text-amber-200/70">{sub}</span>
      </span>
      <ChevronRight size={16} className="flex-shrink-0 text-[#D97706]" />
    </button>
  );
}

/** The app's pink left-accented PromoBanner. */
export function PromoBanner({
  icon: Icon,
  title,
  sub,
  highlight,
  subSuffix,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  highlight?: string;
  subSuffix?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-app-lg border-l-4 border-[#EC4899] bg-white p-3.5 text-left shadow-app-card transition-transform duration-200 hover:-translate-y-0.5 dark:bg-app-night-raised"
    >
      <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-app-md bg-[#FCE7F3] text-[#EC4899] dark:bg-pink-500/15">
        <Icon size={20} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-[1.5] text-app-text dark:text-white">{title}</span>
        <span className="block text-sm leading-[1.6] text-app-muted dark:text-white/60">
          {sub}
          {highlight && <span className="text-[15px] font-extrabold text-emerald-600">{highlight}</span>}
          {subSuffix}
        </span>
      </span>
    </button>
  );
}

// ── Rail ───────────────────────────────────────────────────────────────────
/** Horizontal card rail — the app's `railScroll` ScrollView. */
export function AppRail({ children }: { children: ReactNode }) {
  return (
    <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.08)} className="app-rail -mx-5 px-5 sm:-mx-6 sm:px-6">
      {children}
    </motion.div>
  );
}
