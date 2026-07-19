import { motion } from 'framer-motion';
import { FaComments, FaLocationDot, FaUserGroup } from 'react-icons/fa6';
import { fadeUp, stagger, VP, CARD_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

export function Collaboration() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.collaboration} className="relative overflow-hidden bg-paper-dim py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet/[0.08] blur-[110px]" />
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={stagger()}
        className="mx-auto max-w-3xl px-6 text-center"
      >
        <motion.h2 variants={fadeUp} className="text-balance font-serif text-3xl font-medium text-ink sm:text-4xl">
          {d.collaboration.heading}
        </motion.h2>
        <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-ink-soft">
          {d.collaboration.sub}
        </motion.p>

        {/* Decorative connection row — discover by location, send a message, collaborate */}
        <motion.div variants={fadeUp} className="mt-10 flex items-center justify-center gap-4">
          <motion.span
            whileHover={CARD_HOVER}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink/10 bg-white text-violet shadow-[0_8px_20px_-8px_rgba(20,17,16,0.12)]"
          >
            <FaLocationDot size={20} />
          </motion.span>
          <span aria-hidden className="h-px w-10 bg-gradient-to-r from-violet/40 to-brand-orange/40" />
          <motion.span
            whileHover={CARD_HOVER}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet to-brand-orange text-white shadow-[0_10px_24px_-8px_rgba(124,58,237,0.35)]"
          >
            <FaComments size={22} />
          </motion.span>
          <span aria-hidden className="h-px w-10 bg-gradient-to-r from-brand-orange/40 to-violet/40" />
          <motion.span
            whileHover={CARD_HOVER}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-ink/10 bg-white text-brand-orange shadow-[0_8px_20px_-8px_rgba(20,17,16,0.12)]"
          >
            <FaUserGroup size={20} />
          </motion.span>
        </motion.div>
      </motion.div>
    </section>
  );
}
