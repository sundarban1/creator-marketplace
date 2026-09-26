import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { fadeUp, stagger, VP, PILL_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { getCategoryStyle } from '../lib/categoryIcons';
import { getIconOption } from '../../../lib/iconOptions';
import { TextReveal } from '../components/TextReveal';
import { H2, KICKER, band } from '../lib/surfaces';
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
    <section
      id={SECTION_IDS.categories}
      className={`${band('white')} overflow-hidden py-24 sm:py-28`}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className={`${KICKER} text-lp-brinjal dark:text-[#A5B4FC]`}>
            {d.categories.eyebrow}
          </motion.p>
          <TextReveal as="h2" text={d.categories.heading} delay={0.1} className={`${H2} mt-4`} />
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger(0.06)}
          className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
        >
          {visible.map(({ name, icon: Icon, color }, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              whileHover={PILL_HOVER}
              className="flex flex-col items-center rounded-2xl bg-white px-4 py-7 text-center shadow-[0_14px_40px_-26px_rgba(10,16,51,0.45)] ring-1 ring-lp-black/[0.06] dark:bg-white/[0.05] dark:ring-white/10"
            >
              <span
                style={{ background: `linear-gradient(135deg, ${color}33, ${color}14)`, color }}
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
              >
                <Icon size={22} />
              </span>
              <span className="lp-heading mt-4 text-sm leading-snug">{name}</span>
            </motion.div>
          ))}
          <motion.button
            type="button"
            variants={fadeUp}
            whileHover={PILL_HOVER}
            className="flex flex-col items-center justify-center rounded-2xl bg-lp-brinjal px-4 py-7 text-center text-white shadow-[0_14px_40px_-20px_rgba(79,70,229,0.8)]"
          >
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
              <ChevronRight size={22} />
            </span>
            <span className="lp-heading mt-4 text-sm">{d.categories.more}</span>
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
