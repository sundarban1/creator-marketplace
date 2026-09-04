import { motion } from 'framer-motion';
import { BadgeCheck, ClipboardList, Lock, ShieldAlert, Star } from 'lucide-react';
import { fadeUp, stagger, VP, iconPop } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';

// Positionally mapped to `security.points` in en.ts/ne.ts (Verified Profiles,
// Reviews & Ratings, Clear Requirements, Secure Communication, Report & Safety).
const ICONS = [BadgeCheck, Star, ClipboardList, Lock, ShieldAlert];

export function Security() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.security} className="relative bg-white py-24 dark:bg-ink">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white">
            {d.security.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={d.security.heading}
            delay={0.1}
            className="mt-3 text-balance font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white"
          />
          <motion.p variants={fadeUp} className="mt-4 text-ink-soft dark:text-white">
            {d.security.sub}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger(0.08)}
          className="mt-14 grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-5"
        >
          {d.security.points.map((point, i) => {
            const Icon = ICONS[i] ?? BadgeCheck;
            return (
              <motion.div key={point.title} variants={fadeUp} className="flex flex-col items-center gap-3 text-center">
                <motion.span
                  variants={iconPop(0.1 + i * 0.05)}
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-violet/10 text-violet dark:bg-violet/15"
                >
                  <Icon size={18} />
                </motion.span>
                <span>
                  <span className="block text-sm font-bold text-ink dark:text-white">{point.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink-soft dark:text-white">{point.desc}</span>
                </span>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
