import { motion } from 'framer-motion';
import { Banknote, CalendarClock, ClipboardX, MessagesSquare, RefreshCw, UserSearch } from 'lucide-react';
import { fadeUp, stagger, VP, CARD_HOVER, iconPop } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';

// Positionally mapped to `problems.items` in en.ts/ne.ts (Finding the right
// creator, Scattered communication, Unclear expectations, Payment
// uncertainty, Manual coordination, Starting over every time).
const ICONS = [UserSearch, MessagesSquare, ClipboardX, Banknote, CalendarClock, RefreshCw];

export function Problems() {
  const { d } = useLandingLanguage();

  return (
    <section
      id={SECTION_IDS.problems}
      className="relative overflow-hidden border-t border-ink/[0.06] bg-paper-dim py-24 dark:border-white/[0.06] dark:bg-ink-elevated"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute right-[12%] top-[-6%] h-[300px] w-[300px] rounded-full bg-violet/[0.05] blur-[110px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white">
            {d.problems.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={d.problems.heading}
            delay={0.1}
            className="mt-3 text-balance font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white"
          />
          <TextReveal
            as="p"
            text={d.problems.headingAccent}
            delay={0.25}
            className="mt-2 text-balance font-serif text-xl italic text-ink-soft sm:text-2xl dark:text-white/70"
          />
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger(0.08)}
          className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {d.problems.items.map((item, i) => {
            const Icon = ICONS[i] ?? UserSearch;
            return (
              <motion.div
                key={item.title}
                variants={fadeUp}
                whileHover={CARD_HOVER}
                className="rounded-3xl border border-ink/10 bg-white p-6 shadow-[0_8px_30px_-14px_rgba(20,17,16,0.12)] dark:border-white/10 dark:bg-ink-elevated-2"
              >
                <div className="flex items-center justify-between">
                  <motion.span
                    variants={iconPop(0.1 + i * 0.05)}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-violet/10 text-violet dark:bg-violet/15"
                  >
                    <Icon size={18} />
                  </motion.span>
                  <span className="font-mono text-xs tracking-[0.3em] text-ink/25 dark:text-white/25">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-bold leading-snug text-ink dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft dark:text-white">{item.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
