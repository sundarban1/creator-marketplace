import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { AppStoreBadges } from '../components/AppStoreBadges';

export function Audience() {
  const { d } = useLandingLanguage();

  const cards = [
    { ...d.audience.creator, accent: 'from-brand-indigo to-brand-indigo-dark' },
    { ...d.audience.business, accent: 'from-brand-orange to-brand-indigo' },
  ];

  return (
    <section id={SECTION_IDS.audience} className="bg-gray-50/60 py-24">
      <div className="mx-auto mb-14 max-w-2xl px-5 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.span variants={fadeUp} className="text-xs font-bold uppercase tracking-widest text-brand-indigo">
            {d.audience.eyebrow}
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-3xl font-extrabold text-ink md:text-4xl">
            {d.audience.heading}
          </motion.h2>
        </motion.div>
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={stagger(0.15)}
        className="mx-auto grid max-w-4xl gap-6 px-5 md:grid-cols-2"
      >
        {cards.map((card) => (
          <motion.div key={card.title} variants={fadeUp} className="rounded-3xl border border-ink/8 bg-white p-8 shadow-sm">
            <div className={`mb-5 inline-flex rounded-full bg-gradient-to-r ${card.accent} px-4 py-1.5 text-xs font-bold text-white`}>
              {card.title}
            </div>
            <p className="text-lg font-semibold text-ink">{card.sub}</p>
            <ul className="mt-5 flex flex-col gap-3">
              {card.points.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-sm text-ink-soft">
                  <Check size={16} className="mt-0.5 flex-shrink-0 text-brand-indigo" />
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <AppStoreBadges />
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
