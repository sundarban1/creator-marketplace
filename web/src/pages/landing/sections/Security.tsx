import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

export function Security() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.security} className="relative overflow-hidden bg-ink py-28 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[-10%] top-1/4 h-[380px] w-[380px] rounded-full bg-violet/[0.12] blur-[110px]" />
      </div>
      <div className="mx-auto grid max-w-4xl gap-10 px-6 md:grid-cols-[1fr_1.2fr] md:gap-16">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
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

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="flex flex-col">
          {d.security.points.map((point, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-white/15 py-5 last:border-b"
            >
              <span className={`font-serif text-lg italic ${i % 2 === 0 ? 'text-violet' : 'text-brand-orange'}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">{point.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/50">{point.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
