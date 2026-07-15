import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useCountUp } from '../hooks/useCountUp';
import { useLandingLanguage } from '../context/LanguageContext';

function StatTile({ value, suffix, label, isLast }: { value: number; suffix: string; label: string; isLast: boolean }) {
  const { ref, display } = useCountUp(value);
  return (
    <motion.div ref={ref} variants={fadeUp} className={`relative text-center ${!isLast ? 'sm:after:absolute sm:after:right-[-1rem] sm:after:top-1/2 sm:after:h-10 sm:after:w-px sm:after:-translate-y-1/2 sm:after:bg-ink/10 sm:after:content-[""]' : ''}`}>
      <div className="bg-gradient-to-br from-ink to-ink/70 bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
        {display}{suffix}
      </div>
      <div className="mt-1.5 text-sm font-medium text-ink-soft">{label}</div>
    </motion.div>
  );
}

export function TrustStats() {
  const { d } = useLandingLanguage();
  return (
    <section id={SECTION_IDS.trust} className="border-y border-ink/5 bg-gradient-to-b from-gray-50/80 to-gray-50/40 py-16">
      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={stagger()}
        className="mx-auto grid max-w-4xl grid-cols-2 gap-y-8 px-5 sm:grid-cols-4 sm:gap-x-8"
      >
        {d.trust.stats.map((s, i) => (
          <StatTile key={s.label} value={s.value} suffix={s.suffix} label={s.label} isLast={i === d.trust.stats.length - 1} />
        ))}
      </motion.div>
    </section>
  );
}
