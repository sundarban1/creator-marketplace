import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { fadeUp, stagger } from '../../pages/landing/lib/motion';

interface Props {
  eyebrow: string;
  title: string;
  subtitle: string;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  /** Rendered under the search — e.g. a result count or quick chips. */
  meta?: React.ReactNode;
}

/**
 * Top band for the public browse pages (/creators, /businesses). Mirrors the
 * landing hero's editorial treatment — serif headline, italic eyebrow pill,
 * ambient violet/orange glow, pill search — so the marketplace reads as one
 * continuous site with the marketing pages.
 */
export function BrowseHero({ eyebrow, title, subtitle, search, onSearch, searchPlaceholder, meta }: Props) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-paper">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[6%] top-[-30%] h-[380px] w-[380px] rounded-full bg-violet/[0.10] blur-[110px]" />
        <div
          className="mesh-blob absolute right-[-4%] top-[-10%] h-[320px] w-[320px] rounded-full bg-brand-orange/[0.09] blur-[110px]"
          style={{ animationDelay: '3s' }}
        />
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger()}
        className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6 lg:pb-12 lg:pt-20"
      >
        <motion.span
          variants={fadeUp}
          className="inline-flex items-center gap-2 rounded-full border border-violet/20 bg-violet/[0.06] px-3.5 py-1.5 font-serif text-[13px] italic text-violet"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet to-brand-orange" />
          {eyebrow}
        </motion.span>

        <motion.h1
          variants={fadeUp}
          className="text-balance mt-5 max-w-3xl font-serif text-4xl font-medium leading-[1.1] tracking-tight text-ink sm:text-5xl"
        >
          {title}
        </motion.h1>

        <motion.p variants={fadeUp} className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
          {subtitle}
        </motion.p>

        <motion.div variants={fadeUp} className="mt-8 max-w-xl">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-[52px] w-full rounded-full border border-line-strong bg-surface py-3.5 pl-12 pr-4 text-[15px] text-ink shadow-[0_12px_34px_-16px_rgba(20,17,16,0.3)] outline-none transition-colors placeholder:text-ink-soft/55 focus:border-violet/60"
            />
          </div>
          {meta && <div className="mt-3 text-[13px] text-ink-soft">{meta}</div>}
        </motion.div>
      </motion.div>
    </section>
  );
}
