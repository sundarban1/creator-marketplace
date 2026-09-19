import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { useCountUp } from '../hooks/useCountUp';
import { useLandingLanguage } from '../context/LanguageContext';
import { SectionCutAccent, sectionCutStyle } from '../components/SectionWave';
import { TextReveal } from '../components/TextReveal';
import type { LandingStats } from '../../../lib/api';

function StatTile({ value, label, index }: { value: number; label: string; index: number }) {
  const { ref, display } = useCountUp(value);
  return (
    <motion.div ref={ref} variants={fadeUp} className="px-6 text-center sm:text-left">
      {/* Zero-padded index numeral above each stat — the same editorial "001/002"
          treatment used elsewhere on the page (Security), so the full-bleed dark
          moments read as one family. */}
      <span className="font-mono text-xs tracking-[0.3em] text-ink/35 dark:text-white/35">{String(index + 1).padStart(2, '0')}</span>
      <div className="mt-3 font-serif text-7xl font-medium leading-none tracking-tight text-ink sm:text-8xl lg:text-9xl dark:text-white">
        {display}
        <span className="text-ink/40 dark:text-white">+</span>
      </div>
      <div className="mt-4 text-sm uppercase tracking-[0.2em] text-ink-soft dark:text-white">{label}</div>
    </motion.div>
  );
}

function QualitativeTile({ statement, index }: { statement: string; index: number }) {
  return (
    <motion.div variants={fadeUp} className="px-6 text-center sm:text-left">
      <span className="font-mono text-xs tracking-[0.3em] text-ink/35 dark:text-white/35">{String(index + 1).padStart(2, '0')}</span>
      <div className="mt-3 font-serif text-2xl font-medium leading-snug tracking-tight text-ink sm:text-3xl dark:text-white">
        {statement}
      </div>
    </motion.div>
  );
}

export function TrustStats({ stats }: { stats: LandingStats | null }) {
  const { d } = useLandingLanguage();

  // Only render live numeric counts once both core totals are genuinely
  // positive. `stats` can resolve to real zeros pre-launch — showing "0+" is
  // worse than a qualitative statement, and we never invent a placeholder
  // number to paper over it.
  const hasMeaningfulStats = Boolean(stats && stats.totalCreators > 0 && stats.totalBusinesses > 0);
  const values = hasMeaningfulStats
    ? [stats!.totalCreators, stats!.totalBusinesses, stats!.categories.length]
    : [];

  return (
    <section
      id="trust"
      style={sectionCutStyle(true)}
      className="relative overflow-hidden bg-paper py-24 text-ink dark:bg-ink dark:text-white"
    >
      <SectionCutAccent flip />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[8%] top-0 h-[360px] w-[360px] rounded-full bg-violet/[0.12] blur-[110px]" />
        <div className="mesh-blob absolute right-[6%] bottom-0 h-[320px] w-[320px] rounded-full bg-brand-orange/[0.1] blur-[110px]" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mb-14 max-w-2xl">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white">
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
          {hasMeaningfulStats
            ? d.trust.stats.map((s, i) => <StatTile key={i} value={values[i]!} label={s.label} index={i} />)
            : d.trust.qualitative.map((statement, i) => <QualitativeTile key={i} statement={statement} index={i} />)}
        </motion.div>
      </div>
    </section>
  );
}
