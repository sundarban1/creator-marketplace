import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { useLandingLanguage } from '../context/LanguageContext';
import { AppStoreBadges } from '../components/AppStoreBadges';

export function FinalCTA() {
  const { d } = useLandingLanguage();

  return (
    <section className="relative overflow-hidden bg-ink py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/4 top-0 h-[380px] w-[380px] rounded-full bg-brand-indigo/25 blur-[110px]" />
        <div className="mesh-blob absolute bottom-0 right-1/4 h-[340px] w-[340px] rounded-full bg-brand-orange/20 blur-[110px]" />
      </div>

      <div className="mx-auto max-w-2xl px-5 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.h2 variants={fadeUp} className="text-3xl font-extrabold text-white sm:text-4xl md:text-5xl">
            {d.finalCta.heading}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-white/60">
            {d.finalCta.sub}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-9">
            <AppStoreBadges variant="light" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
