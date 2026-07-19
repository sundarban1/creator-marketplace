import { motion } from 'framer-motion';
import { fadeUp, stagger, VP, PILL_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { getCategoryStyle } from '../lib/categoryIcons';
import type { LandingStats } from '../../../lib/api';

const PER_ROW = 5;

export function Categories({ stats }: { stats: LandingStats | null }) {
  const { d } = useLandingLanguage();
  // Real category names come from the DB (English only, no per-language
  // translation there) — falls back to the static translated list until the
  // live fetch resolves or if it fails.
  const list = stats ? stats.categories.map((c) => c.name) : d.categories.list;
  // Grouped into fixed rows of 5 (4 on the last row if it doesn't divide
  // evenly) instead of one long flowing/scrolling strip.
  const rows: string[][] = [];
  for (let i = 0; i < list.length; i += PER_ROW) rows.push(list.slice(i, i + PER_ROW));

  return (
    <section id={SECTION_IDS.categories} className="bg-paper py-28">
      <div className="mx-auto mb-14 max-w-2xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft">
            {d.categories.eyebrow}
          </motion.p>
          <motion.h2 variants={fadeUp} className="mt-3 whitespace-nowrap font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl">
            {d.categories.heading}
          </motion.h2>
        </motion.div>
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={stagger()}
        className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-6"
      >
        {rows.map((row, ri) => (
          <div key={ri} className="flex flex-wrap justify-center gap-2">
            {row.map((name, i) => {
              const { icon: Icon, color } = getCategoryStyle(name);
              return (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  whileHover={PILL_HOVER}
                  className="group flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-2 shadow-[0_2px_8px_rgba(20,17,16,0.03)] transition-shadow duration-300 hover:shadow-[0_14px_28px_-10px_rgba(20,17,16,0.16)]"
                >
                  <span
                    style={{ backgroundColor: `${color}1A`, color }}
                    className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110"
                  >
                    <Icon size={12} />
                  </span>
                  <span className="whitespace-nowrap text-xs font-semibold text-ink">{name}</span>
                </motion.div>
              );
            })}
          </div>
        ))}
      </motion.div>
    </section>
  );
}
