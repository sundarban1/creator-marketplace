import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaUser, FaPaperPlane } from 'react-icons/fa6';
import { fadeUp, stagger, VP, CARD_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

// Simplified, stylized silhouette evoking Nepal's elongated east-west shape —
// a decorative watermark, not a precise cartographic boundary. Same low-opacity
// treatment as the oversized "K" watermark in Hero.tsx.
const NEPAL_OUTLINE =
  'M40 175c15-35 55-53 105-57 27-23 63-40 110-36 37-20 80-30 130-24 43-16 87-8 127-10 48-12 93 2 133 18 47 4 87 22 120 50 15 24 3 46-27 54-26 18-66 12-102 24-38 12-80 4-118 16-40 10-82 2-122 8-40 6-82-2-122 4-40 6-82-4-122-14-40-6-84-10-112-33z';

const CITY_HOLD_MS = 2600;

// Cycles through `cities`, one entry at a time, fading out and back in on each
// change — `offset` staggers which city a given label starts on so the two
// side-by-side labels (see below) practically never show the same city at once.
function CityLabel({ cities, offset, className }: { cities: string[]; offset: number; className: string }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), CITY_HOLD_MS);
    return () => clearInterval(id);
  }, []);

  const city = cities[(tick + offset) % cities.length];

  return (
    // Fixed width matters here — the only child is `absolute` (out of flow),
    // so without an explicit width this box collapses to 0 and `overflow-hidden`
    // clips the text into invisibility no matter what the child renders.
    <span className={`relative block h-4 w-24 overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={city}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-x-0 top-0 whitespace-nowrap text-center"
        >
          {city}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Collaboration() {
  const { d } = useLandingLanguage();
  const cities = d.collaboration.cities;
  const rightOffset = Math.floor(cities.length / 2);

  return (
    <section id={SECTION_IDS.collaboration} className="relative overflow-hidden bg-paper-dim py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet/[0.08] blur-[110px]" />
        <svg
          viewBox="0 0 800 260"
          fill="currentColor"
          className="absolute left-1/2 top-1/2 w-[640px] max-w-none -translate-x-1/2 -translate-y-1/2 text-violet/[0.06] sm:w-[820px]"
        >
          <path d={NEPAL_OUTLINE} />
        </svg>
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

        {/* Creator-to-creator connection — one avatar on each side (each
            labeled with a rotating city, so it reads as "a creator somewhere
            in Nepal"), a message "ping" travels along the line between them. */}
        <motion.div variants={fadeUp} className="mx-auto mt-12 flex max-w-sm items-center justify-between">
          <div className="flex flex-shrink-0 flex-col items-center gap-2.5">
            <CityLabel cities={cities} offset={0} className="text-[11px] font-semibold uppercase tracking-wide text-violet" />
            <motion.span
              whileHover={CARD_HOVER}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-violet/25 bg-white text-violet shadow-[0_10px_24px_-8px_rgba(123,92,245,0.35)]"
            >
              <FaUser size={20} />
            </motion.span>
            <span className="text-[11px] font-semibold text-ink-soft">{d.collaboration.creatorOneLabel}</span>
          </div>

          <div className="relative mx-3 mt-[27px] h-px flex-1 bg-gradient-to-r from-violet/50 via-ink/15 to-brand-orange/50">
            {/* Two messages in flight, one each direction, offset in time —
                reads as a back-and-forth exchange rather than a one-way ping. */}
            <motion.span
              aria-hidden
              className="absolute -top-[8px] flex h-4 w-4 items-center justify-center rounded-full bg-violet text-white shadow-[0_2px_6px_rgba(124,58,237,0.4)]"
              style={{ marginLeft: '-8px' }}
              animate={{ left: ['0%', '100%'] }}
              transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.7, ease: 'easeInOut' }}
            >
              <FaPaperPlane size={8} />
            </motion.span>
            <motion.span
              aria-hidden
              className="absolute -top-[8px] flex h-4 w-4 items-center justify-center rounded-full bg-brand-orange text-white shadow-[0_2px_6px_rgba(249,115,22,0.4)]"
              style={{ marginLeft: '-8px', transform: 'scaleX(-1)' }}
              animate={{ left: ['100%', '0%'] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: 1.1, repeatDelay: 1.7, ease: 'easeInOut' }}
            >
              <FaPaperPlane size={8} />
            </motion.span>
          </div>

          <div className="flex flex-shrink-0 flex-col items-center gap-2.5">
            <CityLabel cities={cities} offset={rightOffset} className="text-[11px] font-semibold uppercase tracking-wide text-brand-orange" />
            <motion.span
              whileHover={CARD_HOVER}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-brand-orange/25 bg-white text-brand-orange shadow-[0_10px_24px_-8px_rgba(249,115,22,0.35)]"
            >
              <FaUser size={20} />
            </motion.span>
            <span className="text-[11px] font-semibold text-ink-soft">{d.collaboration.creatorTwoLabel}</span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
