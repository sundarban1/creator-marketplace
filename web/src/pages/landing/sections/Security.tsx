import { motion } from 'framer-motion';
import { FaFingerprint, FaLock, FaIdBadge, FaStar } from 'react-icons/fa6';
import { fadeUp, stagger, VP, CARD_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { SectionWave } from '../components/SectionWave';

const ICONS = [FaFingerprint, FaLock, FaIdBadge, FaStar];

export function Security() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.security} className="relative overflow-hidden bg-ink py-28 text-white">
      <SectionWave fill="#141110" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[-10%] top-1/4 h-[380px] w-[380px] rounded-full bg-violet/[0.12] blur-[110px]" />
        <div className="mesh-blob absolute right-[-8%] bottom-0 h-[300px] w-[300px] rounded-full bg-brand-orange/[0.1] blur-[110px]" style={{ animationDelay: '2s' }} />
      </div>

      <div className="mx-auto max-w-5xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mb-14 max-w-lg">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-white/50">
            {d.security.eyebrow}
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-balance mt-3 font-serif text-3xl font-medium md:text-4xl">
            {d.security.heading}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-white/60">
            {d.security.sub}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger()}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {d.security.points.map((point, i) => {
            const Icon = ICONS[i] ?? FaFingerprint;
            const accent = i % 2 === 0 ? 'text-violet' : 'text-brand-orange';
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={CARD_HOVER}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/25 hover:bg-white/[0.07]"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ${accent} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon size={16} />
                </span>
                <h3 className="mt-4 text-sm font-bold text-white">{point.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-white/50">{point.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
