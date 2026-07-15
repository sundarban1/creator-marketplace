import { motion } from 'framer-motion';
import { BadgeCheck, ShieldCheck, Fingerprint, Star } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

const ICONS = [BadgeCheck, ShieldCheck, Fingerprint, Star];

export function Security() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.security} className="relative overflow-hidden bg-ink py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/3 top-0 h-[400px] w-[400px] rounded-full bg-brand-indigo/20 blur-[120px]" />
        <div className="mesh-blob absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-brand-orange/15 blur-[120px]" style={{ animationDelay: '2s' }} />
      </div>
      <div className="mx-auto mb-14 max-w-2xl px-5 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.span variants={fadeUp} className="text-xs font-bold uppercase tracking-widest text-brand-orange">
            {d.security.eyebrow}
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
            {d.security.heading}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-3 text-white/60">
            {d.security.sub}
          </motion.p>
        </motion.div>
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={stagger()}
        className="mx-auto grid max-w-4xl gap-4 px-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {d.security.points.map((point, i) => {
          const Icon = ICONS[i] ?? ShieldCheck;
          return (
            <motion.div
              key={point.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm transition-all duration-300 hover:border-brand-orange/30 hover:bg-white/[0.07]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-brand-orange transition-transform duration-300 group-hover:scale-110">
                <Icon size={17} />
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">{point.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/50">{point.desc}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
