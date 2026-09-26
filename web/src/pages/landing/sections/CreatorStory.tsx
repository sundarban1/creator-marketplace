import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { fadeUp, scaleIn, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { PlatformShowcase } from '../components/app/PlatformShowcase';
import { H2, LEAD, panel } from '../lib/surfaces';
import { PillCta } from '../components/PillCta';
import { AudienceSteps, AudienceTag } from '../components/AudienceCard';

function StatusBadge({ label, live }: { label: string; live: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${
        live ? 'bg-lp-green-tint text-lp-green' : 'bg-lp-black/5 text-lp-black/60 dark:bg-white/10 dark:text-white/70'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-lp-green' : 'bg-lp-black/30 dark:bg-white/40'}`} />
      {label}
    </span>
  );
}

export function CreatorStory() {
  const { d } = useLandingLanguage();
  const c = d.creatorStory;

  return (
    <section id={SECTION_IDS.creatorStory} className={`${panel('white')} overflow-hidden pb-6 pt-24 sm:pt-28`}>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={fadeUp}
          className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-lp-mist via-white to-white p-7 ring-1 ring-lp-black/[0.06] shadow-[0_30px_70px_-45px_rgba(10,16,51,0.45)] sm:p-12 dark:from-white/[0.06] dark:via-white/[0.03] dark:to-transparent dark:ring-white/10"
        >
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 bg-lp-brinjal/15 h-72 w-72 rounded-full blur-[100px]" />
          <div className="relative grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.15)} className="order-2 mx-auto flex w-full min-w-0 flex-col items-center gap-5 lg:order-2">
              <motion.div variants={scaleIn} className="w-full">
                <PlatformShowcase />
              </motion.div>
              <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3">
                <StatusBadge label={c.liveOnWeb} live />
                <StatusBadge label={c.comingSoonBoth} live={false} />
              </motion.div>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="order-1 max-w-xl lg:order-1">
              <AudienceTag label={c.eyebrow} icon={<Sparkles size={14} />} accent="brinjal" />
              <TextReveal as="h2" text={c.heading} delay={0.1} className={`${H2} mt-4`} />
              <motion.p variants={fadeUp} className={`${LEAD} mt-4 text-lp-black/65 dark:text-white/65`}>
                {c.sub}
              </motion.p>
              <AudienceSteps steps={c.steps} accent="brinjal" />
              <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
                <PillCta to="/signup" tone="brinjal" size="lg">
                  {d.hero.ctaCreatorSignup}
                </PillCta>
                <span className="text-xs text-lp-black/55 dark:text-white/55">{c.ctaCaption}</span>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
