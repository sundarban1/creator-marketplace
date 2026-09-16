import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

// Follows the page's light/dark theme toggle like every other section —
// still reads as a spotlight pause thanks to the full-bleed ink/paper swap
// and the gradient payoff line, just no longer locked to dark regardless of
// what the visitor picked.
export function KeyMessageTransition() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.keyMessage} className="relative overflow-hidden bg-white py-28 text-center dark:bg-ink">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet/[0.16] to-brand-orange/[0.1] blur-[130px]" />
      </div>
      <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.15)} className="relative mx-auto max-w-3xl px-6">
        <motion.p variants={fadeUp} className="text-xs font-bold uppercase tracking-[0.25em] text-violet">
          {d.keyMessage.label}
        </motion.p>
        <motion.p variants={fadeUp} className="mt-9 font-serif text-2xl italic text-ink-soft/70 sm:text-3xl dark:text-white/45">
          “{d.keyMessage.from}”
        </motion.p>
        <motion.div variants={fadeUp} className="my-6 flex justify-center text-ink/20 dark:text-white/25">
          <ArrowDown size={20} />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={VP}
          transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-balance bg-gradient-to-br from-violet to-brand-orange bg-clip-text pb-2 font-serif text-4xl font-medium leading-[1.15] text-transparent sm:text-6xl md:text-7xl"
        >
          “{d.keyMessage.to}”
        </motion.p>
      </motion.div>
    </section>
  );
}
