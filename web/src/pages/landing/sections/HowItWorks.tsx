import { motion } from 'framer-motion';
import { UserPlus, Search, MessagesSquare, Wallet } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

const ICONS = [UserPlus, Search, MessagesSquare, Wallet];

export function HowItWorks() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.how} className="bg-white py-24">
      <div className="mx-auto mb-14 max-w-2xl px-5 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.span variants={fadeUp} className="text-xs font-bold uppercase tracking-widest text-brand-indigo">
            {d.how.eyebrow}
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-3xl font-extrabold text-ink md:text-4xl">
            {d.how.heading}
          </motion.h2>
        </motion.div>
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={stagger()}
        className="mx-auto grid max-w-5xl gap-5 px-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {d.how.steps.map((step, i) => {
          const Icon = ICONS[i] ?? UserPlus;
          return (
            <motion.div
              key={step.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="rounded-3xl border border-ink/8 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-indigo to-brand-orange text-white">
                <Icon size={19} />
              </div>
              <div className="mt-4 text-xs font-bold text-brand-indigo">Step {i + 1}</div>
              <h3 className="mt-1 text-lg font-bold text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.desc}</p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
