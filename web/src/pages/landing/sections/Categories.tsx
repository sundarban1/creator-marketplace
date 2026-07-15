import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { getCategoryIcon } from '../lib/categoryIcons';
import type { LandingStats } from '../../../lib/api';

export function Categories({ stats }: { stats: LandingStats | null }) {
  const { d } = useLandingLanguage();
  // Real category names come from the DB (English only, no per-language
  // translation there) — falls back to the static translated list until the
  // live fetch resolves or if it fails.
  const list = stats ? stats.categories.map((c) => c.name) : d.categories.list;

  return (
    <section id={SECTION_IDS.categories} className="bg-paper py-28">
      <div className="mx-auto max-w-4xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mb-14 max-w-lg">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft">
            {d.categories.eyebrow}
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-balance mt-3 font-serif text-3xl font-medium text-ink md:text-4xl">
            {d.categories.heading}
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger(0.04)}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {list.map((name, i) => {
            const Icon = getCategoryIcon(name);
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ y: -3 }}
                className="group flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3.5 shadow-[0_2px_8px_rgba(20,17,16,0.03)] transition-shadow duration-300 hover:shadow-[0_14px_28px_-10px_rgba(123,92,245,0.2)]"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet/10 to-brand-orange/10 text-violet transition-transform duration-300 group-hover:scale-110">
                  <Icon size={16} />
                </span>
                <span className="text-sm font-semibold text-ink">{name}</span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
