import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FaUserPlus, FaMagnifyingGlass, FaComments, FaShieldHalved } from 'react-icons/fa6';
import { fadeUp, stagger, VP, CARD_HOVER, iconPop } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';

const ICONS = [FaUserPlus, FaMagnifyingGlass, FaComments, FaShieldHalved];

function StepCard({ step, index, Icon }: { step: { title: string; desc: string }; index: number; Icon: (typeof ICONS)[number] }) {
  const ref = useRef<HTMLDivElement>(null);
  // Tracks this card's own progress through the viewport — the large index
  // numeral dims in from the edges and snaps fully opaque as the card
  // crosses center, echoing the scroll-linked line-reveal from the reference.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.9', 'start 0.4'] });
  const numeralOpacity = useTransform(scrollYProgress, [0, 1], [0.15, 1]);
  const accent = index % 2 === 0 ? 'violet' : 'brand-orange';

  return (
    <div ref={ref} className="relative flex flex-col border-t border-ink/10 pt-6">
      <motion.span
        style={{ opacity: numeralOpacity }}
        className="font-serif text-6xl font-medium leading-none tracking-tight text-ink sm:text-7xl"
      >
        {String(index + 1).padStart(2, '0')}
      </motion.span>

      <motion.div variants={fadeUp} whileHover={CARD_HOVER} className="shine-hover group mt-6 rounded-2xl">
        <motion.span
          variants={iconPop(0.1 + index * 0.05)}
          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-white transition-transform duration-300 group-hover:scale-110 ${
            accent === 'violet'
              ? 'bg-gradient-to-br from-violet to-violet-dark shadow-[0_8px_20px_-6px_rgba(123,92,245,0.5)]'
              : 'bg-gradient-to-br from-brand-orange to-violet shadow-[0_8px_20px_-6px_rgba(249,115,22,0.5)]'
          }`}
        >
          <Icon size={18} />
        </motion.span>
        <h3 className="mt-4 text-lg font-bold text-ink">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.desc}</p>
      </motion.div>
    </div>
  );
}

export function HowItWorks() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.how} className="bg-paper py-28">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mb-16 max-w-2xl">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft">
            {d.how.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={d.how.heading}
            delay={0.1}
            className="mt-3 whitespace-nowrap font-serif text-xl font-medium text-ink sm:text-2xl md:text-3xl lg:text-4xl"
          />
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger()}
          className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8"
        >
          {d.how.steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} Icon={ICONS[i] ?? FaUserPlus} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
