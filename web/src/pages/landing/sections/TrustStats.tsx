import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { TRUST_STATS } from '../data/trustStats';
import { useCountUp } from '../hooks/useCountUp';
import { useLandingLanguage } from '../context/LanguageContext';

function StatTile({ stat, label }: { stat: (typeof TRUST_STATS)[number]; label: string }) {
  const { ref, display } = useCountUp(stat.value, { decimals: stat.decimals });
  return (
    <motion.div ref={ref} variants={fadeUp} className="text-center">
      <div className="text-4xl md:text-5xl font-extrabold text-white mb-2">{display}{stat.suffix}</div>
      <div className="text-white/50 text-sm">{label}</div>
    </motion.div>
  );
}

export function TrustStats() {
  const { d } = useLandingLanguage();
  return (
    <section id={SECTION_IDS.trust} className="py-24" style={{ background: 'linear-gradient(135deg, #3730A3 0%, #4F46E5 100%)' }}>
      <div className="max-w-5xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-14">
          <motion.span variants={fadeUp} className="text-orange-300 font-bold text-xs uppercase tracking-widest">{d.trust.eyebrow}</motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-white mt-3">{d.trust.heading}</motion.h2>
        </motion.div>
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {TRUST_STATS.map((s, i) => <StatTile key={s.label} stat={s} label={d.trust.stats[i]!.label} />)}
        </motion.div>
      </div>
    </section>
  );
}
