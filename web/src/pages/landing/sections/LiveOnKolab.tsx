import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { SectionCutAccent, sectionCutStyle } from '../components/SectionWave';
import { perCreatorBudget } from '../../../app/lib/format';
import type { EventCard as EventCardData } from '../../../app/api/publicMarketplace';
import type { PublicCreatorLite, PublicBusinessLite } from '../../../lib/api';
import type { CategoryMeta } from '../../../app/public/categoryLookup';

type Tab = 'opportunities' | 'creators' | 'businesses';

interface Props {
  events: EventCardData[] | null;
  creators: PublicCreatorLite[] | null;
  businesses: PublicBusinessLite[] | null;
  categoryMeta: (name: string) => CategoryMeta;
}

type EventCell = { key: string; title: string; business: string | null; location: string | null; isPaid: boolean; meta: string; imageUrl: string | null; to: string };
type PeopleCell = { key: string; name: string; categories: string[]; location: string | null; imageUrl: string | null; meta: string | null; verified: boolean; to: string };

const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));
const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export function LiveOnKolab({ events, creators, businesses, categoryMeta }: Props) {
  const { d } = useLandingLanguage();
  const [tab, setTab] = useState<Tab>('opportunities');
  const copy = d.liveOnKolab;

  let eventCells: EventCell[];
  if (events && events.length) {
    eventCells = events.slice(0, 4).map((e) => {
      const isPaid = e.campaignType !== 'OPEN_EVENT';
      const perks = (e.benefits ?? []).filter(Boolean);
      return {
        key: e.id,
        title: e.title,
        business: e.business?.businessName ?? null,
        location: e.location ?? null,
        isPaid,
        meta: isPaid ? perCreatorBudget(e).amount : (perks[0] ?? d.events.freeBadge),
        imageUrl: e.featureImageUrl ?? e.business?.logoUrl ?? null,
        to: `/events/${e.slug || e.id}`,
      };
    });
  } else {
    eventCells = d.events.fallback.map((f, i) => ({
      key: `fallback-${i}`,
      title: f.title,
      business: f.business,
      location: f.location,
      isPaid: f.badge !== d.events.freeBadge,
      meta: f.meta,
      imageUrl: null,
      to: '/events',
    }));
  }

  function peopleCells(kind: 'creators' | 'businesses'): PeopleCell[] {
    const isCreators = kind === 'creators';
    const copyKind = isCreators ? d.marketplace.creators : d.marketplace.businesses;
    if (isCreators && creators && creators.length) {
      return creators.slice(0, 4).map((c) => {
        const followers = Math.max(0, ...c.socialAccounts.map((s) => s.followers));
        return {
          key: c.id,
          name: c.fullName || c.username || '—',
          categories: c.categories,
          location: c.location,
          imageUrl: c.avatarUrl,
          meta: followers >= 500 ? `${fmtCount(followers)} ${d.marketplace.creators.followers}` : null,
          verified: c.isVerified,
          to: `/creators/${c.username || c.id}`,
        };
      });
    }
    if (!isCreators && businesses && businesses.length) {
      return businesses.slice(0, 4).map((b) => ({
        key: b.id,
        name: b.businessName || '—',
        categories: b.categories,
        location: null,
        imageUrl: b.logoUrl,
        meta: b.city || b.district || null,
        verified: b.isVerified,
        to: `/businesses/${b.slug || b.id}`,
      }));
    }
    return copyKind.fallback.map((f, i) => ({
      key: `fallback-${i}`,
      name: f.name,
      categories: f.category ? [f.category] : [],
      location: null,
      imageUrl: null,
      meta: null,
      verified: false,
      to: isCreators ? '/creators' : '/businesses',
    }));
  }

  const TAB_META: Record<Tab, { label: string; to: string; cta: string; accent: string }> = {
    opportunities: { label: copy.tabs.opportunities, to: '/events', cta: d.events.cta, accent: 'bg-violet' },
    creators: { label: copy.tabs.creators, to: '/creators', cta: d.marketplace.creators.cta, accent: 'bg-violet' },
    businesses: { label: copy.tabs.businesses, to: '/businesses', cta: d.marketplace.businesses.cta, accent: 'bg-brand-orange' },
  };

  return (
    <section
      id={SECTION_IDS.liveOnKolab}
      style={sectionCutStyle(true)}
      className="relative overflow-hidden bg-white py-28 dark:bg-ink"
    >
      <SectionCutAccent flip />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[8%] top-0 h-[320px] w-[320px] rounded-full bg-violet/[0.06] blur-[110px]" />
        <div className="mesh-blob absolute bottom-[-8%] right-[10%] h-[300px] w-[300px] rounded-full bg-brand-orange/[0.06] blur-[110px]" style={{ animationDelay: '2s' }} />
      </div>
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-violet dark:text-white">
            {copy.eyebrow}
          </motion.p>
          <motion.h2 variants={fadeUp} className="mt-3 text-balance font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white">
            {copy.heading}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-ink-soft dark:text-white">
            {copy.sub}
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp} className="mt-10 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-paper-dim/60 p-1 dark:border-white/10 dark:bg-ink-elevated-2">
            {(Object.keys(TAB_META) as Tab[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-300 sm:px-5 sm:text-sm ${
                  tab === key ? 'bg-white text-ink shadow-sm dark:bg-ink-elevated dark:text-white' : 'text-ink-soft hover:text-ink dark:text-white/60 dark:hover:text-white'
                }`}
              >
                {TAB_META[key].label}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {tab === 'opportunities' && (
            <motion.div
              key="opportunities"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4"
            >
              {eventCells.map((card) => (
                <div key={card.key}>
                  <Link
                    to={card.to}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white text-left shadow-[0_8px_30px_-14px_rgba(20,17,16,0.18)] transition-all hover:border-violet/30 hover:-translate-y-1 dark:border-white/10 dark:bg-ink-elevated dark:hover:border-violet/40"
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
                        {card.isPaid ? d.events.paidBadge : d.events.freeBadge}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="line-clamp-2 text-sm font-bold leading-snug text-ink dark:text-white">{card.title}</p>
                      {card.business && <p className="mt-1 line-clamp-1 text-xs text-ink-soft dark:text-white">{card.business}</p>}
                      <p className="mt-2 text-xs font-semibold text-ink dark:text-white">{card.meta}</p>
                      {card.location && (
                        <p className="mt-auto flex items-center gap-1 pt-2 text-[11px] text-ink-soft dark:text-white">
                          <MapPin size={11} />
                          {card.location}
                        </p>
                      )}
                    </div>
                  </Link>
                </div>
              ))}
            </motion.div>
          )}

          {(tab === 'creators' || tab === 'businesses') && (
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4"
            >
              {peopleCells(tab).map((card) => (
                <div key={card.key}>
                  <Link
                    to={card.to}
                    className="flex h-full flex-col items-center rounded-2xl border border-ink/10 bg-white p-5 text-center shadow-[0_8px_30px_-14px_rgba(20,17,16,0.18)] transition-all hover:border-violet/30 hover:-translate-y-1 dark:border-white/10 dark:bg-ink-elevated dark:hover:border-violet/40"
                  >
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet/15 to-brand-orange/15 text-sm font-bold text-ink dark:text-white">
                      {card.imageUrl ? <img src={card.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" /> : initials(card.name)}
                    </div>
                    <p className="mt-3 flex items-center gap-1 text-sm font-bold leading-tight text-ink dark:text-white">
                      <span className="line-clamp-1">{card.name}</span>
                      {card.verified && <BadgeCheck size={13} className="shrink-0 text-violet" />}
                    </p>
                    {card.categories.length > 0 &&
                      (() => {
                        const { Icon, color } = categoryMeta(card.categories[0]!);
                        const extra = card.categories.length - 1;
                        return (
                          <span
                            className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-ink dark:text-white"
                            style={{ backgroundColor: `${color}1f`, boxShadow: `inset 0 0 0 1px ${color}3d` }}
                          >
                            <Icon size={10} style={{ color }} className="shrink-0" />
                            <span className="line-clamp-1">{card.categories[0]}</span>
                            {extra > 0 && <span className="shrink-0">+{extra}</span>}
                          </span>
                        );
                      })()}
                    {card.location && (
                      <span className="mt-2 flex items-center gap-1 text-[11px] text-ink-soft dark:text-white">
                        <MapPin size={11} className="shrink-0" />
                        <span className="line-clamp-1">{card.location}</span>
                      </span>
                    )}
                    {card.meta && (
                      <span className="mt-2 flex items-center gap-1 text-[11px] text-ink-soft dark:text-white">
                        {tab === 'creators' ? <Users size={11} /> : <MapPin size={11} />}
                        {card.meta}
                      </span>
                    )}
                  </Link>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp} className="mt-12 flex justify-center">
          <Link
            to={TAB_META[tab].to}
            className={`inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(123,92,245,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 ${TAB_META[tab].accent}`}
          >
            {TAB_META[tab].cta}
            <ArrowRight size={14} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
