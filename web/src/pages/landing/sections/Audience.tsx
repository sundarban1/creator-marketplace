import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { useLandingTheme } from '../context/ThemeContext';
import { SectionWave } from '../components/SectionWave';
import { useReducedMotion } from '../hooks/useReducedMotion';

// One point is "huge" for this long before auto-advancing to the next.
const STEP_MS = 2400;

// Step-flow style spotlight: points auto-advance on a timer, one at a time —
// the active row grows into huge text with a background highlight (shared
// `layoutId`, so the panel slides rather than jump-cuts between rows) while
// every other row shrinks back down. Namespaced per column (`${id}-highlight`)
// so the creator list's highlight never gets dragged into the business list.
// Autoplay pauses off-screen and for prefers-reduced-motion, same as the
// campaign-flow timeline above.
function AudiencePoints({ id, points, badgeClass }: { id: string; points: string[]; badgeClass: string }) {
  const listRef = useRef<HTMLUListElement>(null);
  const inView = useInView(listRef, { amount: 0.6 });
  const reducedMotion = useReducedMotion();
  const { theme } = useLandingTheme();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!inView || reducedMotion) return;
    const timer = setInterval(() => setActive((a) => (a + 1) % points.length), STEP_MS);
    return () => clearInterval(timer);
  }, [inView, reducedMotion, points.length]);

  // framer-motion's `animate` color here is a raw rgba, not a Tailwind class,
  // so it can't pick up `dark:` on its own — pick the pair by hand from the
  // same theme context the nav toggle drives.
  const activeColor = theme === 'dark' ? 'rgba(255,255,255,1)' : 'rgba(20,17,16,1)';
  const inactiveColor = theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(20,17,16,0.5)';

  return (
    <motion.ul ref={listRef} variants={stagger(0.1)} className="mt-6 flex flex-col gap-1 border-t border-ink/10 pt-6 dark:border-white/10">
      {points.map((p, j) => {
        const isActive = active === j;
        return (
          <motion.li key={j} variants={fadeUp} layout className="relative flex items-center gap-3 rounded-xl px-3 py-3">
            {isActive && (
              <motion.span
                layoutId={`${id}-highlight`}
                className="absolute inset-0 -z-10 rounded-xl bg-ink/5 dark:bg-white/10"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <motion.span
              animate={{ scale: isActive ? 1 : 0.8, opacity: isActive ? 1 : 0.55 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: 'center' }}
              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${badgeClass}`}
            >
              {j + 1}
            </motion.span>
            <motion.span
              animate={{
                fontSize: isActive ? '1.2rem' : '0.875rem',
                color: isActive ? activeColor : inactiveColor,
              }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className={`leading-snug ${isActive ? 'font-semibold' : 'font-normal'}`}
            >
              {p}
            </motion.span>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}

export function Audience() {
  const { d } = useLandingLanguage();
  const { theme } = useLandingTheme();
  const cards = [d.audience.creator, d.audience.business];

  return (
    <section id={SECTION_IDS.audience} className="relative overflow-hidden bg-paper py-28 text-ink dark:bg-ink dark:text-white">
      {/* Wave is filled with this section's own top-edge color, not a fixed
          one, so the dip still reads as a seam once the section itself
          switches between light and dark backgrounds. */}
      <SectionWave fill={theme === 'dark' ? '#141110' : '#FBF9F5'} />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[10%] top-0 h-[340px] w-[340px] rounded-full bg-violet/[0.12] blur-[110px]" />
        <div className="mesh-blob absolute right-[5%] bottom-0 h-[340px] w-[340px] rounded-full bg-brand-orange/[0.1] blur-[110px]" style={{ animationDelay: '2.5s' }} />
      </div>
      <div className="mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mb-16 max-w-2xl">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white/50">
            {d.audience.eyebrow}
          </motion.p>
          <motion.h2 variants={fadeUp} className="mt-3 whitespace-nowrap font-serif text-2xl font-medium sm:text-3xl md:text-5xl">
            {d.audience.heading}
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger(0.15)}
          className="grid gap-12 md:grid-cols-2 md:divide-x md:divide-ink/15 md:dark:divide-white/15"
        >
          {cards.map((card, i) => (
            <motion.div key={i} variants={fadeUp} className={i === 1 ? 'md:pl-12' : ''}>
              <span className={`font-serif text-sm italic ${i === 0 ? 'text-violet' : 'text-brand-orange'}`}>{card.title}</span>
              <p className="mt-3 text-xl font-medium leading-snug text-ink dark:text-white">{card.sub}</p>
              <AudiencePoints
                id={i === 0 ? 'creator' : 'business'}
                points={card.points}
                badgeClass={i === 0 ? 'bg-violet shadow-[0_2px_6px_rgba(123,92,245,0.5)]' : 'bg-brand-orange shadow-[0_2px_6px_rgba(249,115,22,0.5)]'}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
