import MarqueeImport from 'react-fast-marquee';
import { BadgeCheck } from 'lucide-react';
import { useReducedMotion } from '../hooks/useReducedMotion';

// react-fast-marquee ships CJS only (`exports.default` behind a "use client"
// prologue), and Vite's interop hands the default import over still wrapped
// as `{ default: Marquee }` — unwrap it so both shapes work.
const Marquee = ((MarqueeImport as unknown as { default?: typeof MarqueeImport }).default ?? MarqueeImport);

export type LogoMarqueeItem = {
  /** Stable key — an entity id, never an array index. */
  id: string;
  label: string;
  /** Secondary line under the label (e.g. a category). */
  caption?: string;
  /** Avatar / logo. Without one the item shows the label's initial. */
  imageUrl?: string | null;
  verified?: boolean;
};

/** `avatar`: round photo + name chip (people). `logo`: the logo alone, no
 *  tile — upload transparent PNGs that read on the navy band. */
export type LogoMarqueeVariant = 'avatar' | 'logo';

const MARQUEE_SPEED = 28;

// Soft fade at both edges, done with a mask rather than the library's
// `gradient` prop so it blends into whatever surface (navy, light theme)
// sits behind it without hard-coding a colour.
const EDGE_FADE = {
  maskImage: 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)',
  WebkitMaskImage: 'linear-gradient(to right, transparent, #000 8%, #000 92%, transparent)',
} as const;

/**
 * A slow, continuous row of people / partners (avatar or logo + name).
 * Content is purely data-driven — pass verified creators today, swap in
 * business partners later. The scrolling track is `aria-hidden` (the library
 * clones items to fill the loop), so screen readers get one plain list
 * instead. With reduced motion it renders a static, wrapped row.
 */
export function LogoMarquee({
  heading,
  items,
  variant = 'avatar',
  ariaLabel,
  className = '',
}: {
  heading: string;
  items: LogoMarqueeItem[];
  variant?: LogoMarqueeVariant;
  /** Accessible name for the list; defaults to the heading. */
  ariaLabel?: string;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  if (!items.length) return null;

  return (
    <section aria-label={ariaLabel ?? heading} className={className}>
      <h2 className="px-6 text-center text-sm font-medium uppercase tracking-[0.14em] text-lp-fg/60 sm:text-base">{heading}</h2>

      {reducedMotion ? (
        // Phones: one swipeable row (keeps the band short); wider: wrapped + centred.
        <ul className="mx-auto mt-6 flex max-w-5xl gap-3 overflow-x-auto px-6 pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible">

          {items.map((item) => (
            <li key={item.id} className="flex-shrink-0">
              <MarqueeChip item={item} variant={variant} />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="sr-only">
            {items.map((item) => (
              <li key={item.id}>{item.caption ? `${item.label}, ${item.caption}` : item.label}</li>
            ))}
          </ul>
          <div aria-hidden className="mt-4 overflow-hidden py-2" style={EDGE_FADE}>
            <Marquee speed={MARQUEE_SPEED} pauseOnHover autoFill>
              {items.map((item) => (
                <div key={item.id} className="mx-2 sm:mx-3">
                  <MarqueeChip item={item} variant={variant} />
                </div>
              ))}
            </Marquee>
          </div>
        </>
      )}
    </section>
  );
}

function MarqueeChip({ item, variant }: { item: LogoMarqueeItem; variant: LogoMarqueeVariant }) {
  if (variant === 'logo' && item.imageUrl) {
    return (
      <div className="group flex h-16 w-44 items-center justify-center px-2 sm:h-20 sm:w-56">
        <img
          src={item.imageUrl}
          alt={item.label}
          width={208}
          height={80}
          loading="eager"
          decoding="async"
          className="max-h-full max-w-full object-contain transition duration-300 ease-out group-hover:scale-110 group-hover:drop-shadow-[0_6px_18px_rgba(255,255,255,0.18)] motion-reduce:transition-none"
        />
      </div>
    );
  }
  return (
    <div className="flex h-12 items-center gap-2.5 rounded-full border border-lp-fg/10 bg-lp-fg/[0.03] py-1.5 pl-1.5 pr-4 sm:h-14 sm:gap-3 sm:pr-5">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          width={44}
          height={44}
          // Eager: the row sits right under the hero, and a lazily-loaded
          // clone would show as a blank circle mid-scroll.
          loading="eager"
          decoding="async"
          className="h-9 w-9 flex-shrink-0 rounded-full object-cover object-[50%_20%] sm:h-11 sm:w-11"
        />
      ) : (
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-lp-orange/15 text-sm font-medium text-lp-orange sm:h-11 sm:w-11">
          {item.label.charAt(0)}
        </span>
      )}
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-lp-fg">
          {item.label}
          {item.verified && <BadgeCheck size={14} className="flex-shrink-0 text-lp-orange" />}
        </span>
        {item.caption && <span className="whitespace-nowrap text-xs text-lp-fg/55">{item.caption}</span>}
      </span>
    </div>
  );
}
