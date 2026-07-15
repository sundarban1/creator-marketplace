import { motion } from 'framer-motion';
import {
  Shirt, Plane, UtensilsCrossed, Cpu, Gamepad2, Dumbbell,
  Sparkles, Home, Music, Camera, GraduationCap, Clapperboard,
} from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

const ICONS = [Shirt, Plane, UtensilsCrossed, Cpu, Gamepad2, Dumbbell, Sparkles, Home, Music, Camera, GraduationCap, Clapperboard];

export function Categories() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.categories} className="bg-white py-24">
      <div className="mx-auto mb-14 max-w-2xl px-5 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.span variants={fadeUp} className="text-xs font-bold uppercase tracking-widest text-brand-indigo">
            {d.categories.eyebrow}
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-3 text-3xl font-extrabold text-ink md:text-4xl">
            {d.categories.heading}
          </motion.h2>
        </motion.div>
      </div>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={stagger()}
        className="mx-auto grid max-w-4xl grid-cols-2 gap-3 px-5 sm:grid-cols-3 lg:grid-cols-4"
      >
        {d.categories.list.map((name, i) => {
          const Icon = ICONS[i] ?? Sparkles;
          return (
            <motion.div
              key={name}
              variants={fadeUp}
              whileHover={{ y: -3 }}
              className="flex items-center gap-3 rounded-2xl border border-ink/8 bg-white px-4 py-3.5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-brand-indigo/8 text-brand-indigo">
                <Icon size={16} />
              </div>
              <span className="text-sm font-semibold text-ink">{name}</span>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
