import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { useLandingLanguage } from '../context/LanguageContext';
import { AppStoreBadges } from '../components/AppStoreBadges';
import { ComingSoonBadge } from '../components/ComingSoonBadge';
import { SectionWave } from '../components/SectionWave';
import { useComingSoon } from '../hooks/useComingSoon';

export function FinalCTA() {
  const { d } = useLandingLanguage();
  const comingSoon = useComingSoon();

  return (
    <section className="relative overflow-hidden bg-ink py-32 text-white">
      <SectionWave fill="#141110" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/4 top-0 h-[380px] w-[380px] rounded-full bg-violet/[0.18] blur-[110px]" />
        <div className="mesh-blob absolute bottom-0 right-1/4 h-[340px] w-[340px] rounded-full bg-brand-orange/[0.15] blur-[110px]" style={{ animationDelay: '2.5s' }} />
      </div>
      <div className="mx-auto max-w-2xl px-6 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.span
            variants={fadeUp}
            className="mx-auto block h-1 w-12 rounded-full bg-gradient-to-r from-violet to-brand-orange"
          />
          <motion.h2
            variants={fadeUp}
            className="text-balance mt-7 bg-gradient-to-br from-white to-white/70 bg-clip-text font-serif text-4xl font-medium text-transparent sm:text-5xl md:text-6xl"
          >
            {d.finalCta.heading}
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-white/70">
            {d.finalCta.sub}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-11">
            {comingSoon ? <ComingSoonBadge variant="light" /> : <AppStoreBadges variant="light" />}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
