import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

export function Stories() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.stories} className="bg-paper py-28">
      <div className="mx-auto max-w-4xl px-6">
        <motion.p
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={fadeUp}
          className="mb-14 font-serif text-base italic text-ink-soft"
        >
          {d.stories.eyebrow}
        </motion.p>

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.12)} className="grid gap-x-12 gap-y-12 sm:grid-cols-2">
          {d.stories.items.map(({ quote, name, role }, i) => (
            <motion.figure key={i} variants={fadeUp} className="pt-6">
              <div className={`mb-6 h-0.5 w-10 rounded-full bg-gradient-to-r ${i % 2 === 0 ? 'from-violet to-violet-dark' : 'from-brand-orange to-violet'}`} />
              <blockquote className="font-serif text-xl italic leading-snug text-ink sm:text-2xl">
                &ldquo;{quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 text-sm text-ink-soft">
                <span className="font-semibold text-ink">{name}</span> — {role}
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
