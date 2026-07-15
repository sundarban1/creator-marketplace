import { motion } from 'framer-motion';
import { FaUserPlus, FaMagnifyingGlass, FaComments, FaShieldHalved } from 'react-icons/fa6';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

const ICONS = [FaUserPlus, FaMagnifyingGlass, FaComments, FaShieldHalved];

export function HowItWorks() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.how} className="bg-paper py-28">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mb-16 max-w-lg">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft">
            {d.how.eyebrow}
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-balance mt-3 font-serif text-3xl font-medium text-ink md:text-4xl">
            {d.how.heading}
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger()}
          className="grid gap-5 grid-cols-2 sm:grid-cols-4"
        >
          {d.how.steps.map((step, i) => {
            const Icon = ICONS[i] ?? FaUserPlus;
            const accent = i % 2 === 0 ? 'violet' : 'brand-orange';
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ y: -5, scale: 1.03 }}
                className="group rounded-3xl border border-ink/10 bg-white p-6 shadow-[0_2px_10px_rgba(20,17,16,0.04)] transition-shadow duration-300 hover:shadow-[0_20px_40px_-14px_rgba(123,92,245,0.2)]"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white transition-transform duration-300 group-hover:scale-110 ${
                    accent === 'violet' ? 'bg-gradient-to-br from-violet to-violet-dark' : 'bg-gradient-to-br from-brand-orange to-violet'
                  }`}
                >
                  <Icon size={18} />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
