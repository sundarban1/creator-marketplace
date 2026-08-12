import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  FaBullhorn, FaPaperPlane, FaHandshake, FaCreditCard, FaBell, FaBolt, FaCloudArrowUp,
  FaMagnifyingGlass, FaSackDollar,
} from 'react-icons/fa6';
import { fadeUp, stagger, VP } from '../lib/motion';
import { EASE, SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { SectionWave } from '../components/SectionWave';
import { TextReveal } from '../components/TextReveal';
import { useReducedMotion } from '../hooks/useReducedMotion';

// Positionally mapped to `journey.steps` in en.ts/ne.ts (icon[i] illustrates
// step[i]) — reordering or adding a step there requires updating this array
// in the same position, since nothing ties them together by key.
const ICONS = [FaBullhorn, FaPaperPlane, FaHandshake, FaCreditCard, FaBell, FaBolt, FaCloudArrowUp, FaMagnifyingGlass, FaSackDollar];

// One step is "live" for this long before auto-advancing to the next — long
// enough to read the title + description, short enough the loop stays engaging.
const STEP_MS = 4200;

type Role = 'brand' | 'creator' | 'system';

const ROLE_STYLE: Record<Role, string> = {
  brand: 'bg-brand-orange/15 text-brand-orange',
  creator: 'bg-violet/15 text-violet',
  system: 'bg-white/10 text-white/60',
};
const BADGE_STYLE: Record<Role, string> = {
  brand: 'bg-gradient-to-br from-brand-orange to-orange-700 shadow-[0_6px_16px_-4px_rgba(249,115,22,0.55)]',
  creator: 'bg-gradient-to-br from-violet to-violet-dark shadow-[0_6px_16px_-4px_rgba(123,92,245,0.55)]',
  system: 'bg-white/15 shadow-[0_6px_16px_-4px_rgba(255,255,255,0.15)]',
};
const PANEL_BG: Record<Role, string> = {
  brand: 'bg-gradient-to-br from-brand-orange/25 via-ink to-ink',
  creator: 'bg-gradient-to-br from-violet/25 via-ink to-ink',
  system: 'bg-gradient-to-br from-white/10 via-ink to-ink',
};

// Always moves forward (auto-play loops 0→1→…→n→0) — the outgoing panel
// exits left, the next one enters from the right, so the whole stage reads
// as a single timeline flowing left to right, not a random crossfade.
const slideVariants = {
  enter: { opacity: 0, x: 48 },
  center: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE.out } },
  exit: { opacity: 0, x: -48, transition: { duration: 0.4, ease: EASE.out } },
};

export function CampaignJourney() {
  const { d } = useLandingLanguage();
  const steps = d.journey.steps;

  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { amount: 0.4 });
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Autoplay only runs while the section is actually on screen, motion isn't
  // reduced, and the visitor isn't hovering (see onMouseEnter/Leave below) —
  // wraps back to step 0 after the last step so the timeline loops forever.
  useEffect(() => {
    if (!inView || reducedMotion || paused) return;
    const id = setInterval(() => setActive((a) => (a + 1) % steps.length), STEP_MS);
    return () => clearInterval(id);
  }, [inView, reducedMotion, paused, steps.length]);

  const step = steps[active];
  const role = step.role as Role;
  const Icon = ICONS[active] ?? FaHandshake;
  // Rail fill as a % of steps completed, e.g. step 3 of 9 → 25% filled — the
  // last step (active === steps.length - 1) always reads as 100%.
  const fillPercent = steps.length > 1 ? (active / (steps.length - 1)) * 100 : 0;

  return (
    <section id={SECTION_IDS.journey} className="relative overflow-hidden bg-ink py-28 text-white">
      <SectionWave fill="#141110" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute right-[-10%] top-0 h-[380px] w-[380px] rounded-full bg-brand-orange/[0.12] blur-[110px]" />
        <div className="mesh-blob absolute left-[-8%] bottom-0 h-[320px] w-[320px] rounded-full bg-violet/[0.12] blur-[110px]" style={{ animationDelay: '2.4s' }} />
      </div>

      <div ref={sectionRef} className="relative mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-white/50">
            {d.journey.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={d.journey.heading}
            delay={0.1}
            className="mt-3 text-balance font-serif text-2xl font-medium text-white sm:text-3xl md:text-4xl"
          />
          <motion.p variants={fadeUp} className="mt-4 text-white/60">
            {d.journey.sub}
          </motion.p>
        </motion.div>

        <div
          className="mt-16"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Background timeline rail — the "line" the flow moves along, filling left to right as steps advance */}
          <div className="relative mb-12 h-2.5">
            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/10" />
            <motion.div
              animate={{ width: `${fillPercent}%` }}
              transition={{ duration: 0.5, ease: EASE.out }}
              className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-violet to-brand-orange"
            />
            {/* Each dot also doubles as a manual step-select control — clicking
                jumps `active` directly, independent of the autoplay interval. */}
            <div className="absolute inset-0 flex items-center justify-between">
              {steps.map((_, i) => (
                <button
                  key={i}
                  aria-label={steps[i].title}
                  onClick={() => setActive(i)}
                  className={`h-2.5 w-2.5 rounded-full border-2 transition-all duration-500 ${
                    i === active
                      ? 'scale-125 border-transparent bg-gradient-to-br from-violet to-brand-orange' // current step
                      : i < active
                        ? 'border-transparent bg-white/40' // already passed
                        : 'border-white/20 bg-ink hover:border-white/40' // upcoming
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden">
            {/* `key={active}` swaps the whole panel on every step change, so
                AnimatePresence treats it as exit-old/enter-new rather than an
                update — `mode="wait"` keeps that sequential (no overlap),
                `initial={false}` skips the enter animation on first mount. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
              >
                <div>
                  <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${ROLE_STYLE[role]}`}>
                    {role === 'brand' ? d.journey.legendBrand : role === 'creator' ? d.journey.legendCreator : d.journey.legendSystem}
                  </span>
                  <div className="mt-5 flex items-center gap-4">
                    <span className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-white ${BADGE_STYLE[role]}`}>
                      <Icon size={18} />
                    </span>
                    <span className="font-mono text-xs tracking-[0.3em] text-white/35">
                      {String(active + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mt-5 text-balance font-serif text-3xl font-medium leading-tight tracking-tight text-white md:text-4xl">
                    {step.title}
                  </h3>
                  <p className="mt-4 max-w-md text-base leading-relaxed text-white/60">{step.desc}</p>
                </div>

                <div className={`relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/40 ${PANEL_BG[role]}`}>
                  <Icon aria-hidden size={220} className="absolute -bottom-10 -right-10 text-white/[0.06]" />
                  <div className="relative flex h-full items-center justify-center">
                    <span className={`flex h-24 w-24 items-center justify-center rounded-3xl text-white ${BADGE_STYLE[role]}`}>
                      <Icon size={40} />
                    </span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
