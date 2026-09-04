import { motion } from 'framer-motion';
import { ArrowRight, MapPin } from 'lucide-react';
import { fadeUp, stagger, VP, CARD_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { useLenisScroll } from '../hooks/useLenis';

const OPPORTUNITY_PHOTOS = [
  'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=500&h=380&fit=crop',
  'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=500&h=380&fit=crop',
  'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=500&h=380&fit=crop',
];
// Positionally paired with `opportunities[i].badge` — Paid / Event / Free.
const BADGE_STYLES = ['bg-violet text-white', 'bg-brand-orange text-white', 'bg-emerald-500 text-white'];

const FEATURED_EVENT_PHOTO = 'https://images.pexels.com/photos/2263436/pexels-photo-2263436.jpeg?auto=compress&cs=tinysrgb&w=700&h=900&fit=crop';
// Positionally paired with `moreEvents[i]` — a busy restaurant floor, a
// beauty-parlour vanity, then a clothing shop interior.
const MORE_EVENT_PHOTOS = [
  'https://images.pexels.com/photos/12181619/pexels-photo-12181619.jpeg?auto=compress&cs=tinysrgb&w=260&h=260&fit=crop',
  'https://images.pexels.com/photos/5178007/pexels-photo-5178007.jpeg?auto=compress&cs=tinysrgb&w=260&h=260&fit=crop',
  'https://images.pexels.com/photos/37080685/pexels-photo-37080685.jpeg?auto=compress&cs=tinysrgb&w=260&h=260&fit=crop',
];
const MORE_OPPORTUNITY_PHOTOS = [
  'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=260&h=260&fit=crop',
  'https://images.pexels.com/photos/1058277/pexels-photo-1058277.jpeg?auto=compress&cs=tinysrgb&w=260&h=260&fit=crop',
  'https://images.pexels.com/photos/1051073/pexels-photo-1051073.jpeg?auto=compress&cs=tinysrgb&w=260&h=260&fit=crop',
];

export function OpportunityFeed() {
  const { d } = useLandingLanguage();
  const { scrollTo } = useLenisScroll();
  const feed = d.opportunityFeed;
  const goToDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollTo(`#${SECTION_IDS.finalCta}`);
  };

  return (
    <section id={SECTION_IDS.opportunities} className="relative bg-white py-24 dark:bg-ink">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white">
            {feed.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={feed.heading}
            delay={0.1}
            className="mt-3 text-balance font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white"
          />
        </motion.div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-8">
          <div>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink dark:text-white">{feed.opportunitiesLabel}</h3>
              <a href="#" onClick={goToDownload} className="inline-flex items-center gap-1 text-xs font-semibold text-violet transition-opacity hover:opacity-75">
                {feed.viewAllOpportunities}
                <ArrowRight size={12} />
              </a>
            </div>

            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.1)} className="grid gap-4 sm:grid-cols-3">
              {feed.opportunities.map((op, i) => (
                <motion.div
                  key={op.title}
                  variants={fadeUp}
                  whileHover={CARD_HOVER}
                  className="group overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_2px_10px_rgba(20,17,16,0.04)] dark:border-white/10 dark:bg-ink-elevated"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <img
                      src={OPPORTUNITY_PHOTOS[i]}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${BADGE_STYLES[i] ?? BADGE_STYLES[0]}`}>
                      {op.badge}
                    </span>
                  </div>
                  <div className="p-4">
                    <h4 className="text-sm font-bold leading-snug text-ink dark:text-white">{op.title}</h4>
                    <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft dark:text-white">
                      <MapPin size={11} />
                      {op.location}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-ink dark:text-white">{op.meta}</p>
                    <p className="text-xs text-ink-soft dark:text-white">{op.sub}</p>
                    <a
                      href="#"
                      onClick={goToDownload}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-violet transition-transform duration-300 group-hover:translate-x-0.5"
                    >
                      {feed.applyNow}
                      <ArrowRight size={11} />
                    </a>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.08)} className="mt-3 grid grid-cols-3 gap-4">
              {feed.moreOpportunities.map((op, i) => (
                <motion.div key={op.title} variants={fadeUp} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-ink/10 dark:border-white/10">
                  <img
                    src={MORE_OPPORTUNITY_PHOTOS[i]}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-2">
                    <p className="truncate text-[10px] font-bold leading-tight text-white">{op.title}</p>
                    <p className="truncate text-[9px] text-white/75">{op.date} · {op.location}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink dark:text-white">{feed.eventsLabel}</h3>
              <a href="#" onClick={goToDownload} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-orange transition-opacity hover:opacity-75">
                {feed.viewAllEvents}
                <ArrowRight size={12} />
              </a>
            </div>

            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={VP}
              variants={fadeUp}
              whileHover={CARD_HOVER}
              className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-ink/10 shadow-[0_2px_10px_rgba(20,17,16,0.04)] dark:border-white/10"
            >
              <img
                src={FEATURED_EVENT_PHOTO}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <div className="absolute left-3 top-3 flex flex-col items-center rounded-xl bg-white px-2.5 py-1.5 leading-none shadow-lg">
                <span className="text-[10px] font-bold uppercase tracking-wide text-brand-orange">{feed.featuredEvent.dateMonth}</span>
                <span className="text-base font-bold text-ink">{feed.featuredEvent.dateDay}</span>
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4">
                <h4 className="text-base font-bold leading-[1.5] text-white">{feed.featuredEvent.title}</h4>
                <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
                  <MapPin size={11} />
                  {feed.featuredEvent.location} · {feed.featuredEvent.sub}
                </p>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.08)} className="mt-3 grid grid-cols-3 gap-2">
              {feed.moreEvents.map((ev, i) => (
                <motion.div key={ev.title} variants={fadeUp} className="group relative aspect-square overflow-hidden rounded-xl border border-ink/10 dark:border-white/10">
                  <img
                    src={MORE_EVENT_PHOTOS[i]}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-2">
                    {/* Two lines, not `truncate`: these titles name a real
                        occasion ("Opening Clothing Store") and run longer
                        than a ~137px tile fits on one line. */}
                    <p className="line-clamp-2 text-[10px] font-bold leading-[1.5] text-white">{ev.title}</p>
                    <p className="truncate text-[9px] text-white/75">{ev.date} · {ev.location}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
