import { motion } from 'framer-motion';
import { ArrowRight, Rocket, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { fadeUp, stagger, VP, CARD_HOVER, iconPop } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { useLenisScroll } from '../hooks/useLenis';

// Positionally mapped to `creatorStages.stages` (Just Starting, Growing,
// Experienced, Established).
const ICONS = [Sparkles, TrendingUp, Rocket, Trophy];

export function CreatorStages() {
  const { d } = useLandingLanguage();
  const { scrollTo } = useLenisScroll();
  const stages = d.creatorStages.stages;

  return (
    <section id={SECTION_IDS.creatorStages} className="relative overflow-hidden bg-paper py-28 dark:bg-ink">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[6%] bottom-[-10%] h-[320px] w-[320px] rounded-full bg-brand-orange/[0.06] blur-[110px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white">
            {d.creatorStages.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={d.creatorStages.heading}
            delay={0.1}
            className="mt-3 text-balance font-serif text-3xl font-medium text-ink sm:text-4xl md:text-5xl dark:text-white"
          />
          <motion.p variants={fadeUp} className="mt-4 text-ink-soft dark:text-white">
            {d.creatorStages.sub}
          </motion.p>
        </motion.div>

        {/* Desktop: a connected left-to-right progression with a hairline
            through the stage numerals, echoing the connector-line idiom used
            in the Creator + Business Experience section below. Mobile: the
            hairline collapses (no `sm:` prefix needed on its own absence),
            leaving a plain stacked column. */}
        <div className="relative mt-14">
          <div aria-hidden className="absolute left-0 right-0 top-[22px] hidden h-px bg-gradient-to-r from-transparent via-ink/10 to-transparent sm:block dark:via-white/10" />
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={VP}
            variants={stagger(0.1)}
            className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
          >
            {stages.map((stage, i) => {
              const Icon = ICONS[i] ?? Sparkles;
              return (
                <motion.div key={stage.title} variants={fadeUp} whileHover={CARD_HOVER} className="relative">
                  <motion.span
                    variants={iconPop(0.1 + i * 0.08)}
                    className="relative z-10 flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-white bg-gradient-to-br from-violet to-brand-orange text-white shadow-[0_6px_16px_-6px_rgba(123,92,245,0.5)] dark:border-ink"
                  >
                    <Icon size={17} />
                  </motion.span>
                  <div className="mt-4 rounded-3xl border border-ink/10 bg-paper-dim/60 p-5 dark:border-white/10 dark:bg-ink-elevated">
                    <span className="font-mono text-xs tracking-[0.3em] text-ink/30 dark:text-white/30">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="mt-2 text-base font-bold leading-snug text-ink dark:text-white">{stage.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft dark:text-white">{stage.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp} className="mt-10 text-center">
          <button
            type="button"
            onClick={() => scrollTo(`#${SECTION_IDS.finalCta}`)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet transition-colors hover:text-violet-dark"
          >
            {d.hero.ctaCreator}
            <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
