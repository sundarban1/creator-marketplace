import { motion } from 'framer-motion';
import { ChevronRight, Compass, MessageCircle, TrendingUp, Users } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';

// Positionally mapped to `howItWorks.steps` (Discover, Connect, Collaborate, Grow).
const ICONS = [Compass, MessageCircle, Users, TrendingUp];

export function CampaignJourney() {
  const { d } = useLandingLanguage();
  const steps = d.howItWorks.steps;

  return (
    <section id={SECTION_IDS.howItWorks} className="bg-paper py-16 dark:bg-ink">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger()}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-dark via-violet-dark to-ink p-10 text-white shadow-2xl shadow-violet/20 ring-1 ring-white/10 sm:p-14"
        >
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <div className="mesh-blob absolute -right-10 -top-10 h-72 w-72 rounded-full bg-brand-orange/20 blur-[100px]" />
            <div className="mesh-blob absolute -bottom-10 -left-10 h-72 w-72 rounded-full bg-violet/30 blur-[100px]" style={{ animationDelay: '2s' }} />
          </div>

          <div className="max-w-lg">
            <motion.p variants={fadeUp} className="font-serif text-base italic text-white/60">
              {d.howItWorks.eyebrow}
            </motion.p>
            <TextReveal
              as="h2"
              text={d.howItWorks.heading}
              delay={0.1}
              className="mt-3 text-balance font-serif text-2xl font-medium sm:text-3xl md:text-4xl"
            />
          </div>

          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {steps.map((step, i) => {
              const Icon = ICONS[i] ?? Compass;
              return (
                <motion.div key={step.title} variants={fadeUp} className="relative flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs tracking-[0.3em] text-white/40">{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                      <Icon size={16} />
                    </span>
                  </div>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-white/60">{step.desc}</p>
                  {i < steps.length - 1 && (
                    <ChevronRight aria-hidden size={16} className="absolute -right-5 top-3 hidden text-white/20 lg:block" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
