import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useCountUp } from '../hooks/useCountUp';
import { useLandingLanguage } from '../context/LanguageContext';
import type { LandingStats } from '../../../lib/api';

function StatTile({ value, label, isLast }: { value: number; label: string; isLast: boolean }) {
  const { ref, display } = useCountUp(value);
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      whileHover={{ y: -3 }}
      className={`cursor-default px-6 py-8 text-center transition-colors duration-300 hover:bg-white sm:text-left ${!isLast ? 'sm:border-r sm:border-ink/10' : ''}`}
    >
      <div className="bg-gradient-to-br from-ink to-violet-dark bg-clip-text font-serif text-4xl font-medium text-transparent sm:text-5xl">
        {display}
      </div>
      <div className="mt-2 text-sm text-ink-soft">{label}</div>
    </motion.div>
  );
}

export function TrustStats({ stats }: { stats: LandingStats | null }) {
  const { d } = useLandingLanguage();

  const values = [
    stats?.totalCreators ?? d.trust.stats[0]!.fallback,
    stats?.totalBusinesses ?? d.trust.stats[1]!.fallback,
    stats?.categories.length ?? d.trust.stats[2]!.fallback,
  ];

  return (
    <section id={SECTION_IDS.trust} className="border-y border-ink/10 bg-paper">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={stagger()}
        className="mx-auto grid max-w-3xl grid-cols-1 sm:grid-cols-3"
      >
        {d.trust.stats.map((s, i) => (
          <StatTile key={i} value={values[i]!} label={s.label} isLast={i === d.trust.stats.length - 1} />
        ))}
      </motion.div>
    </section>
  );
}
