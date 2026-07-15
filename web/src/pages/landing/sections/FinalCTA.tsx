import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { useLandingLanguage } from '../context/LanguageContext';
import { AppStoreBadges } from '../components/AppStoreBadges';
import { SectionWave } from '../components/SectionWave';

export function FinalCTA() {
  const { d } = useLandingLanguage();

  return (
    <section className="relative overflow-hidden bg-ink py-32 text-white">
      <SectionWave fill="#141110" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/4 top-0 h-[380px] w-[380px] rounded-full bg-violet/[0.18] blur-[110px]" />
        <div className="mesh-blob absolute bottom-0 right-1/4 h-[340px] w-[340px] rounded-full bg-brand-orange/[0.15] blur-[110px]" style={{ animationDelay: '2.5s' }} />
      </div>
      <div className="mx-auto max-w-2xl px-6 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.h2 variants={fadeUp} className="text-balance font-serif text-4xl font-medium sm:text-5xl md:text-6xl">
            {d.finalCta.heading}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5 font-serif text-lg italic text-white/50">
            {d.finalCta.sub}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-11">
            <AppStoreBadges variant="light" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
