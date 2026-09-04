import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { fadeUp, stagger, VP, PILL_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { getCategoryStyle } from '../lib/categoryIcons';
import { getIconOption } from '../../../lib/iconOptions';
import { TextReveal } from '../components/TextReveal';
import type { LandingStats } from '../../../lib/api';

// Reads as a single row at desktop widths (the reference layout), so the
// list is capped rather than left to wrap into a multi-row grid — a trailing
// "More" pill covers whatever's cut off.
const MAX_VISIBLE = 9;

interface Pill {
  name: string;
  icon: ReturnType<typeof getCategoryStyle>['icon'];
  color: string;
}

export function Categories({ stats }: { stats: LandingStats | null }) {
  const { d } = useLandingLanguage();
  // Real categories come from the DB (English only, no per-language
  // translation there), including the admin-picked `icon`/`color` — falls
  // back to the static translated list + name-matched styling until the
  // live fetch resolves or if it fails.
  const list: Pill[] = stats
    ? stats.categories.map((c) => ({ name: c.name, icon: getIconOption(c.icon)?.Icon ?? getCategoryStyle(c.name).icon, color: c.color }))
    : d.categories.list.map((name) => ({ name, ...getCategoryStyle(name) }));
  const visible = list.slice(0, MAX_VISIBLE);

  return (
    <section id={SECTION_IDS.categories} className="bg-white py-24 dark:bg-ink">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white">
            {d.categories.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={d.categories.heading}
            delay={0.1}
            className="mt-3 text-balance font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white"
          />
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger(0.06)}
          className="mt-12 flex flex-wrap items-start justify-center gap-x-7 gap-y-7 sm:gap-x-10"
        >
          {visible.map(({ name, icon: Icon, color }, i) => (
            <motion.div key={i} variants={fadeUp} whileHover={PILL_HOVER} className="flex w-16 flex-col items-center gap-2.5 text-center">
              <span
                style={{ backgroundColor: `${color}1A`, color, boxShadow: `0 4px 12px -4px ${color}66` }}
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
              >
                <Icon size={18} />
              </span>
              <span className="text-xs font-semibold leading-tight text-ink dark:text-white">{name}</span>
            </motion.div>
          ))}
          <motion.button
            type="button"
            variants={fadeUp}
            whileHover={PILL_HOVER}
            className="flex w-16 flex-col items-center gap-2.5 text-center"
          >
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-ink/5 text-ink-soft dark:bg-white/10 dark:text-white">
              <ChevronRight size={18} />
            </span>
            <span className="text-xs font-semibold leading-tight text-ink-soft dark:text-white">{d.categories.more}</span>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
