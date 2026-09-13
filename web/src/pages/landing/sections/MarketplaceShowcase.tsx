import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, MapPin, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fadeUp, stagger, VP, CARD_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import type { PublicCreatorLite, PublicBusinessLite } from '../../../lib/api';
import type { CategoryMeta } from '../../../app/public/categoryLookup';

interface Props {
  variant: 'creators' | 'businesses';
  creators: PublicCreatorLite[] | null;
  businesses: PublicBusinessLite[] | null;
  categoryMeta: (name: string) => CategoryMeta;
}

type Card = {
  key: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  meta: string | null;
  verified: boolean;
  to: string;
};

const fmtCount = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);

export function MarketplaceShowcase({ variant, creators, businesses, categoryMeta }: Props) {
  const { d } = useLandingLanguage();
  const [showModal, setShowModal] = useState(false);
  const isCreators = variant === 'creators';
  const copy = isCreators ? d.marketplace.creators : d.marketplace.businesses;
  const sectionId = isCreators ? SECTION_IDS.creators : SECTION_IDS.businesses;
  const browseTo = isCreators ? '/creators' : '/businesses';
  const accent = isCreators ? 'text-violet' : 'text-brand-orange';
  // Categories (bg-paper) sits above → creators white, businesses paper-dim so
  // the three read as distinct bands; Stories below is bg-paper.
  const bg = isCreators ? 'bg-white dark:bg-ink' : 'bg-paper-dim dark:bg-ink';

  let cards: Card[];
  if (isCreators && creators && creators.length) {
    cards = creators.slice(0, 4).map((c) => {
      const followers = Math.max(0, ...c.socialAccounts.map((s) => s.followers));
      return {
        key: c.id,
        name: c.fullName || c.username || '—',
        category: c.categories[0] ?? null,
        imageUrl: c.avatarUrl,
        // Seed / freshly-connected accounts report a handful of followers —
        // only show the count once it's worth showing.
        meta: followers >= 500 ? `${fmtCount(followers)} ${(copy as typeof d.marketplace.creators).followers}` : null,
        verified: c.isVerified,
        to: c.username ? `/creators/${c.username}` : '/creators',
      };
    });
  } else if (!isCreators && businesses && businesses.length) {
    cards = businesses.slice(0, 4).map((b) => ({
      key: b.id,
      name: b.businessName || '—',
      category: b.categories[0] ?? null,
      imageUrl: b.logoUrl,
      meta: b.city || b.district || null,
      verified: b.isVerified,
      to: `/businesses/${b.id}`,
    }));
  } else {
    // API unreachable — static fallback so the section never renders empty.
    cards = copy.fallback.map((f, i) => ({
      key: `fallback-${i}`,
      name: f.name,
      category: f.category,
      imageUrl: null,
      meta: null,
      verified: false,
      to: browseTo,
    }));
  }

  const initials = (name: string) =>
    name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  return (
    <section id={sectionId} className={`relative overflow-hidden py-24 ${bg}`}>
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger()}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.p variants={fadeUp} className={`font-serif text-base italic ${accent} dark:text-white`}>
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
            <motion.div key={card.key} variants={fadeUp} whileHover={CARD_HOVER}>
              <Link
                to={card.to}
                className="flex h-full flex-col items-center rounded-3xl border border-ink/10 bg-white p-5 text-center shadow-[0_8px_30px_-14px_rgba(20,17,16,0.18)] transition-colors hover:border-ink/20 dark:border-white/10 dark:bg-ink-elevated dark:hover:border-white/20"
              >
                <div
                  className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet/15 to-brand-orange/15 text-sm font-bold text-ink dark:text-white"
                >
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    initials(card.name)
                  )}
                </div>

                <p className="mt-3 flex items-center gap-1 text-sm font-bold leading-tight text-ink dark:text-white">
                  <span className="line-clamp-1">{card.name}</span>
                  {card.verified && <BadgeCheck size={13} className={`shrink-0 ${accent}`} />}
                </p>

                {card.category && (() => {
                  const { Icon, color } = categoryMeta(card.category);
                  return (
                    <span
                      className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-ink dark:text-white"
                      style={{ backgroundColor: `${color}1f`, boxShadow: `inset 0 0 0 1px ${color}3d` }}
                    >
                      <Icon size={10} style={{ color }} className="shrink-0" />
                      <span className="line-clamp-1">{card.category}</span>
                    </span>
                  );
                })()}

                {card.meta && (
                  <span className="mt-2 flex items-center gap-1 text-[11px] text-ink-soft dark:text-white">
                    {isCreators ? <Users size={11} /> : <MapPin size={11} />}
                    {card.meta}
                  </span>
                )}
              </Link>
            </motion.div>
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
            className={`inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(123,92,245,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 ${
              isCreators ? 'bg-violet' : 'bg-brand-orange'
            }`}
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
                className={`mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(123,92,245,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 ${
                  isCreators ? 'bg-violet' : 'bg-brand-orange'
                }`}
              >
                {copy.modalCta}
                <ArrowRight size={14} />
              </Link>

              <p className="mt-4 text-xs text-ink-soft dark:text-white">
                {copy.modalLoginPrompt}{' '}
                <Link
                  to="/login"
                  onClick={() => setShowModal(false)}
                  className={`font-semibold underline-offset-2 hover:underline ${accent} dark:text-white`}
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
