import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { AppStoreBadges } from '../components/AppStoreBadges';

export function Audience() {
  const { d } = useLandingLanguage();
  const cards = [d.audience.creator, d.audience.business];

  return (
    <section id={SECTION_IDS.audience} className="relative overflow-hidden bg-ink py-28 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[10%] top-0 h-[340px] w-[340px] rounded-full bg-violet/[0.12] blur-[110px]" />
        <div className="mesh-blob absolute right-[5%] bottom-0 h-[340px] w-[340px] rounded-full bg-brand-orange/[0.1] blur-[110px]" style={{ animationDelay: '2.5s' }} />
      </div>
      <div className="mx-auto max-w-5xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mb-16 max-w-lg">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-white/50">
            {d.audience.eyebrow}
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-balance mt-3 font-serif text-3xl font-medium md:text-4xl">
            {d.audience.heading}
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger(0.15)}
          className="grid gap-12 md:grid-cols-2 md:divide-x md:divide-white/15"
        >
          {cards.map((card, i) => (
            <motion.div key={i} variants={fadeUp} className={i === 1 ? 'md:pl-12' : ''}>
              <span className={`font-serif text-sm italic ${i === 0 ? 'text-violet' : 'text-brand-orange'}`}>{card.title}</span>
              <p className="mt-3 text-xl font-medium leading-snug text-white">{card.sub}</p>
              <ul className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6">
                {card.points.map((p, j) => (
                  <li key={j} className="text-sm leading-relaxed text-white/60">{p}</li>
                ))}
              </ul>
              <div className="mt-8">
                <AppStoreBadges variant="light" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
