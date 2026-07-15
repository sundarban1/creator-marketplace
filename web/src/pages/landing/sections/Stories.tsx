import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

// Avatar gradients only — quote/name/role come from the translation
// dictionary (stories.items), matched by array index.
const GRADIENTS = [
  ['#4F46E5', '#3730A3'],
  ['#F97316', '#4F46E5'],
  ['#3730A3', '#F97316'],
  ['#4F46E5', '#F97316'],
];

export function Stories() {
  const { d } = useLandingLanguage();
  const items = d.stories.items.map((item, i) => ({ ...item, grad: GRADIENTS[i] ?? GRADIENTS[0]! }));

  return (
    <section id={SECTION_IDS.stories} className="bg-gray-50/60 py-24">
      <div className="mx-auto mb-14 max-w-2xl px-5 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.span variants={fadeUp} className="text-xs font-bold uppercase tracking-widest text-brand-indigo">
            {d.stories.eyebrow}
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-3xl font-extrabold text-ink md:text-4xl">
            {d.stories.heading}
          </motion.h2>
        </motion.div>
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={stagger()}
        className="mx-auto grid max-w-5xl gap-5 px-5 sm:grid-cols-2"
      >
        {items.map(({ quote, name, role, grad }) => (
          <motion.div key={name} variants={fadeUp} className="flex flex-col rounded-3xl border border-ink/8 bg-white p-6 shadow-sm">
            <div className="mb-4 flex gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} size={13} className="fill-current text-brand-orange" />)}
            </div>
            <p className="flex-1 text-sm leading-relaxed text-ink">&ldquo;{quote}&rdquo;</p>
            <div className="mt-5 flex items-center gap-3">
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
              >
                {name.slice(0, 1)}
              </div>
              <div>
                <div className="text-sm font-semibold text-ink">{name}</div>
                <div className="text-xs text-ink-soft">{role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
