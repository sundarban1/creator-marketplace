import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { SectionWave } from '../components/SectionWave';

export function Audience() {
  const { d } = useLandingLanguage();
  const cards = [d.audience.creator, d.audience.business];

  return (
    <section id={SECTION_IDS.audience} className="relative overflow-hidden bg-ink py-28 text-white">
      <SectionWave fill="#141110" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[10%] top-0 h-[340px] w-[340px] rounded-full bg-violet/[0.12] blur-[110px]" />
        <div className="mesh-blob absolute right-[5%] bottom-0 h-[340px] w-[340px] rounded-full bg-brand-orange/[0.1] blur-[110px]" style={{ animationDelay: '2.5s' }} />
      </div>
      <div className="mx-auto max-w-5xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mb-16 max-w-2xl">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-white/50">
            {d.audience.eyebrow}
          </motion.p>
          <motion.h2 variants={fadeUp} className="mt-3 whitespace-nowrap font-serif text-2xl font-medium sm:text-3xl md:text-4xl">
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
              <ul className="mt-6 flex flex-col gap-3.5 border-t border-white/10 pt-6">
                {card.points.map((p, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm leading-relaxed text-white/60">
                    <span
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                        i === 0 ? 'bg-violet' : 'bg-brand-orange'
                      }`}
                    >
                      {j + 1}
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
