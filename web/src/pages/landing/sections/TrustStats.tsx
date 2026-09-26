import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { useCountUp } from '../hooks/useCountUp';
import { useLandingLanguage } from '../context/LanguageContext';
import { BadgeCheck, Building2, LayoutGrid } from 'lucide-react';
import { H2, KICKER, panel } from '../lib/surfaces';

// One icon per stat cell, positionally matched to `trust.stats` (creators,
// businesses, categories) — the data-grid treatment similarweb uses.
const STAT_ICONS = [BadgeCheck, Building2, LayoutGrid];
import type { LandingStats } from '../../../lib/api';

function StatIcon({ index }: { index: number }) {
  const Icon = STAT_ICONS[index] ?? BadgeCheck;
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.08] text-[#A5B4FC] ring-1 ring-white/10">
      <Icon size={20} />
    </span>
  );
}

function StatTile({ value, label, index }: { value: number; label: string; index: number }) {
  const { ref, display } = useCountUp(value);
  return (
    <motion.div ref={ref} variants={fadeUp} className="p-8 text-left">
      <StatIcon index={index} />
      <div className="mt-8 text-5xl font-bold tracking-tight text-white sm:text-6xl">
        {display}
        <span className="text-[#A5B4FC]">+</span>
      </div>
      <div className="mt-2 text-[15px] font-light text-white/65">{label}</div>
    </motion.div>
  );
}

function QualitativeTile({ statement, index }: { statement: string; index: number }) {
  return (
    <motion.div variants={fadeUp} className="p-8 text-left">
      <StatIcon index={index} />
      <div className="lp-display mt-8 text-2xl text-white sm:text-[1.7rem]">
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
      className={`${panel('navy')} lp-stars overflow-hidden py-28`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-[-30%] left-1/2 h-[520px] w-[1100px] -translate-x-1/2 rounded-full bg-lp-brinjal/35 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 sm:px-8">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto mb-14 max-w-2xl text-center">
          <motion.p variants={fadeUp} className={`${KICKER} text-[#A5B4FC]`}>
            {d.trust.eyebrow}
          </motion.p>
          <h2 className={`${H2} mt-4 text-white`}>
            <span className="lp-gradient-text">{d.trust.heading}</span>
          </h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger()}
          className="grid grid-cols-1 divide-y divide-white/10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] backdrop-blur sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          {hasMeaningfulStats
            ? d.trust.stats.map((s, i) => <StatTile key={i} value={values[i]!} label={s.label} index={i} />)
            : d.trust.qualitative.map((statement, i) => <QualitativeTile key={i} statement={statement} index={i} />)}
        </motion.div>
      </div>
    </section>
  );
}
