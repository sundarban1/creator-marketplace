import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useCountUp } from '../hooks/useCountUp';
import { useLandingLanguage } from '../context/LanguageContext';

function StatTile({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, display } = useCountUp(value);
  return (
    <motion.div ref={ref} variants={fadeUp} className="text-center">
      <div className="text-3xl font-extrabold text-ink sm:text-4xl">{display}{suffix}</div>
      <div className="mt-1 text-sm text-ink-soft">{label}</div>
    </motion.div>
  );
}

export function TrustStats() {
  const { d } = useLandingLanguage();
  return (
    <section id={SECTION_IDS.trust} className="border-y border-ink/5 bg-gray-50/60 py-14">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={stagger()}
        className="mx-auto grid max-w-4xl grid-cols-2 gap-8 px-5 sm:grid-cols-4"
      >
        {d.trust.stats.map((s) => (
          <StatTile key={s.label} value={s.value} suffix={s.suffix} label={s.label} />
        ))}
      </motion.div>
    </section>
  );
}
