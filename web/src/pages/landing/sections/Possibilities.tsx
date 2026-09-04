import { motion } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { fadeUp, stagger, VP, CARD_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { useLenisScroll } from '../hooks/useLenis';

type CardKey = 'people' | 'services' | 'opportunities' | 'events';

// One accent + one photo per card, echoing the reference mockup's
// color-coded four-up grid (rose/People, blue/Services, violet/Opportunities,
// orange/Events). All four photos are local Kolab assets.
const CARDS: { key: CardKey; accent: string; ring: string; photo: string }[] = [
  { key: 'people', accent: 'text-rose-600 dark:text-rose-400', ring: 'from-rose-500/20 to-rose-500/0', photo: '/landing/people.jpg' },
  { key: 'services', accent: 'text-blue-600 dark:text-blue-400', ring: 'from-blue-500/20 to-blue-500/0', photo: '/landing/makeup.jpeg' },
  { key: 'opportunities', accent: 'text-violet dark:text-violet', ring: 'from-violet/20 to-violet/0', photo: '/landing/opportunitites.jpeg' },
  { key: 'events', accent: 'text-brand-orange dark:text-brand-orange', ring: 'from-brand-orange/20 to-brand-orange/0', photo: '/landing/event.jpg' },
];

export function Possibilities() {
  const { d } = useLandingLanguage();
  const { scrollTo } = useLenisScroll();
  const goToDownload = () => scrollTo(`#${SECTION_IDS.finalCta}`);

  return (
    <section id={SECTION_IDS.possibilities} className="relative bg-paper py-24 dark:bg-ink">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white">
            {d.possibilities.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={d.possibilities.heading}
            delay={0.1}
            className="mt-3 text-balance font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white"
          />
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger(0.12)}
          className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {CARDS.map(({ key, accent, ring, photo }) => {
            const copy = d.possibilities.cards[key];
            return (
              <motion.div
                key={key}
                variants={fadeUp}
                whileHover={CARD_HOVER}
                role="button"
                tabIndex={0}
                onClick={goToDownload}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    goToDownload();
                  }
                }}
                className={`group relative cursor-pointer overflow-hidden rounded-3xl border border-ink/10 bg-gradient-to-b ${ring} bg-white shadow-[0_2px_10px_rgba(20,17,16,0.04)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet dark:border-white/10 dark:bg-ink-elevated`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <img
                    src={photo}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  {/* Darker at the foot than a plain scrim needs to be, because
                      the caption sits on top of it over four unrelated photos. */}
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <p className="absolute inset-x-3 bottom-3 flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-medium leading-[1.55] text-white ring-1 ring-white/25 backdrop-blur-sm">
                    <Search size={11} className="flex-shrink-0" />
                    <span className="min-w-0 flex-1">{copy.caption}</span>
                  </p>
                </div>
                <div className="p-5">
                  <h3 className={`text-base font-bold ${accent}`}>{copy.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft dark:text-white">{copy.sub}</p>
                  <span className={`mt-4 inline-flex items-center gap-1.5 text-sm font-semibold transition-transform duration-300 group-hover:translate-x-1 ${accent}`}>
                    {copy.cta}
                    <ArrowRight size={14} />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
