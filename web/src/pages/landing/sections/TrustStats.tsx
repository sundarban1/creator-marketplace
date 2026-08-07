import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useCountUp } from '../hooks/useCountUp';
import { useLandingLanguage } from '../context/LanguageContext';
import { SectionWave } from '../components/SectionWave';
import { TextReveal } from '../components/TextReveal';
import type { LandingStats } from '../../../lib/api';

function StatTile({ value, label, index }: { value: number; label: string; index: number }) {
  const { ref, display } = useCountUp(value);
  return (
    <motion.div ref={ref} variants={fadeUp} className="px-6 text-center sm:text-left">
      {/* Zero-padded index numeral above each stat — the same editorial "001/002"
          treatment used in HowItWorks, so the two full-bleed dark moments on the
          page read as one family. */}
      <span className="font-mono text-xs tracking-[0.3em] text-white/35">{String(index + 1).padStart(2, '0')}</span>
      <div className="mt-3 font-serif text-7xl font-medium leading-none tracking-tight text-white sm:text-8xl lg:text-9xl">
        {display}
        <span className="text-white/40">+</span>
      </div>
      <div className="mt-4 text-sm uppercase tracking-[0.2em] text-white/50">{label}</div>
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
    <section id={SECTION_IDS.trust} className="relative overflow-hidden bg-ink py-28 text-white sm:py-36">
      <SectionWave fill="#141110" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[8%] top-0 h-[360px] w-[360px] rounded-full bg-violet/[0.12] blur-[110px]" />
        <div className="mesh-blob absolute right-[6%] bottom-0 h-[320px] w-[320px] rounded-full bg-brand-orange/[0.1] blur-[110px]" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative mx-auto max-w-5xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mb-16 max-w-2xl">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-white/50">
            {d.trust.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={d.trust.heading}
            delay={0.1}
            className="mt-3 font-serif text-2xl font-medium sm:text-3xl md:text-4xl"
          />
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger()}
          className="grid grid-cols-1 gap-14 sm:grid-cols-3 sm:gap-8"
        >
          {d.trust.stats.map((s, i) => (
            <StatTile key={i} value={values[i]!} label={s.label} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
