import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, MapPin, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fadeUp, stagger, VP, CARD_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { useEventsPreview } from '../hooks/useEventsPreview';
import { perCreatorBudget } from '../../../app/lib/format';

type Card = {
  key: string;
  title: string;
  business: string | null;
  location: string | null;
  isPaid: boolean;
  meta: string;
  imageUrl: string | null;
};

export function EventsShowcase() {
  const { d } = useLandingLanguage();
  const copy = d.events;
  const { events } = useEventsPreview();
  const [showModal, setShowModal] = useState(false);

  let cards: Card[];
  if (events && events.length) {
    cards = events.slice(0, 4).map((e) => {
      const isPaid = e.campaignType !== 'OPEN_EVENT';
      const perks = (e.benefits ?? []).filter(Boolean);
      return {
        key: e.id,
        title: e.title,
        business: e.business?.businessName ?? null,
        location: e.location ?? null,
        isPaid,
        meta: isPaid ? perCreatorBudget(e).amount : (perks[0] ?? copy.freeBadge),
        imageUrl: e.featureImageUrl ?? e.business?.logoUrl ?? null,
      };
    });
  } else {
    cards = copy.fallback.map((f, i) => ({
      key: `fallback-${i}`,
      title: f.title,
      business: f.business,
      location: f.location,
      isPaid: f.badge !== copy.freeBadge,
      meta: f.meta,
      imageUrl: null,
    }));
  }

  const initials = (name: string) =>
    name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <section id={SECTION_IDS.opportunities} className="relative overflow-hidden bg-white py-24 dark:bg-ink">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-violet dark:text-white">
            {copy.eyebrow}
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-3 text-balance font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white"
          >
            {copy.heading}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-ink-soft dark:text-white">
            {copy.sub}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger(0.06)}
          className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {cards.map((card) => (
            <motion.button
              key={card.key}
              type="button"
              onClick={() => setShowModal(true)}
              variants={fadeUp}
              whileHover={CARD_HOVER}
              className="group flex h-full flex-col overflow-hidden rounded-3xl border border-ink/10 bg-white text-left shadow-[0_8px_30px_-14px_rgba(20,17,16,0.18)] transition-colors hover:border-ink/20 dark:border-white/10 dark:bg-ink-elevated dark:hover:border-white/20"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-violet/15 to-brand-orange/15">
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-ink dark:text-white">
                    {initials(card.business ?? card.title)}
                  </div>
                )}
                <span
                  className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${
                    card.isPaid ? 'bg-violet' : 'bg-emerald-500'
                  }`}
                >
                  {card.isPaid ? copy.paidBadge : copy.freeBadge}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-4">
                <p className="line-clamp-2 text-sm font-bold leading-snug text-ink dark:text-white">{card.title}</p>
                {card.business && (
                  <p className="mt-1 line-clamp-1 text-xs text-ink-soft dark:text-white">{card.business}</p>
                )}
                <p className="mt-2 text-xs font-semibold text-ink dark:text-white">{card.meta}</p>
                {card.location && (
                  <p className="mt-auto flex items-center gap-1 pt-2 text-[11px] text-ink-soft dark:text-white">
                    <MapPin size={11} />
                    {card.location}
                  </p>
                )}
              </div>
            </motion.button>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={fadeUp}
          className="mt-12 flex justify-center"
        >
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-violet px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(123,92,245,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
          >
            {copy.cta}
            <ArrowRight size={14} />
          </button>
        </motion.div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-3xl border border-ink/10 bg-white p-7 text-center shadow-2xl dark:border-white/10 dark:bg-ink-elevated"
            >
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label={d.chatWidget.closeAriaLabel}
                className="absolute right-4 top-4 text-ink-soft/60 hover:text-ink dark:text-white/60 dark:hover:text-white"
              >
                <X size={18} />
              </button>

              <h3 className="text-balance font-serif text-xl font-medium text-ink dark:text-white">
                {copy.modalTitle}
              </h3>
              <p className="mt-3 text-sm text-ink-soft dark:text-white">{copy.modalBody}</p>

              <Link
                to="/signup"
                onClick={() => setShowModal(false)}
                className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-violet px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(123,92,245,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
              >
                {copy.modalCta}
                <ArrowRight size={14} />
              </Link>

              <p className="mt-4 text-xs text-ink-soft dark:text-white">
                {copy.modalLoginPrompt}{' '}
                <Link
                  to="/login"
                  onClick={() => setShowModal(false)}
                  className="font-semibold text-violet underline-offset-2 hover:underline dark:text-white"
                >
                  {copy.modalLogin}
                </Link>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
