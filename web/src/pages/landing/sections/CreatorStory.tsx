import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fadeUp, scaleIn, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { PlatformShowcase } from '../components/app/PlatformShowcase';
import { SectionCutAccent, sectionCutStyle } from '../components/SectionWave';

function StatusBadge({ label, live }: { label: string; live: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
        live ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-ink/5 text-ink-soft dark:bg-white/10 dark:text-white'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-500' : 'bg-ink-soft/50 dark:bg-white/40'}`} />
      {label}
    </span>
  );
}

export function CreatorStory() {
  const { d } = useLandingLanguage();
  const c = d.creatorStory;

  return (
    <section
      id={SECTION_IDS.creatorStory}
      style={sectionCutStyle(true)}
      className="relative overflow-hidden bg-paper py-28 dark:bg-ink"
    >
      <SectionCutAccent flip />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[8%] top-[-6%] h-[340px] w-[340px] rounded-full bg-brand-orange/[0.08] blur-[110px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-14 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/20 bg-brand-orange/[0.06] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-orange"
            >
              <Sparkles size={12} />
              {c.eyebrow}
            </motion.span>
            <TextReveal
              as="h2"
              text={c.heading}
              delay={0.1}
              className="mt-4 text-balance font-serif text-3xl font-medium text-ink sm:text-4xl md:text-5xl dark:text-white"
            />
            <motion.p variants={fadeUp} className="mt-4 text-ink-soft dark:text-white">
              {c.sub}
            </motion.p>

            <motion.ol
              variants={fadeUp}
              className="relative mx-auto mt-8 w-full max-w-sm overflow-hidden rounded-2xl border border-ink/10 bg-white p-5 text-left shadow-[0_8px_30px_-14px_rgba(20,17,16,0.18)] lg:mx-0 dark:border-white/10 dark:bg-ink-elevated-2"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-orange to-brand-orange/30" />
              {c.steps.map((step, i) => (
                <motion.li key={step.title} variants={fadeUp} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-xs font-bold text-brand-orange">
                    {i + 1}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-ink dark:text-white">{step.title}</span>
                    <span className="text-xs text-ink-soft dark:text-white/70">{step.desc}</span>
                  </span>
                </motion.li>
              ))}
            </motion.ol>

            <motion.div variants={fadeUp} className="mt-7 flex flex-col items-center lg:items-start">
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(249,115,22,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
              >
                {d.hero.ctaCreatorSignup}
                <ArrowRight size={14} />
              </Link>
              <span className="mt-2 text-xs text-ink-soft dark:text-white">{c.ctaCaption}</span>
            </motion.div>
          </motion.div>

          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.15)} className="mx-auto flex w-full min-w-0 flex-col items-center gap-5">
            <motion.div variants={scaleIn} className="w-full">
              <PlatformShowcase />
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3">
              <StatusBadge label={c.liveOnWeb} live />
              <StatusBadge label={c.comingSoonBoth} live={false} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
