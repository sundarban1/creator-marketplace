import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BadgeCheck, CalendarClock, Loader2, MapPin, RotateCw, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { useLandingSession } from '../hooks/useLandingSession';
import { H2, KICKER, LEAD, band } from '../lib/surfaces';
import { PillCta } from '../components/PillCta';
import { perCreatorBudget } from '../../../app/lib/format';
import type { EventCard as EventCardData } from '../../../app/api/publicMarketplace';
import type { PublicCreatorLite, PublicBusinessLite } from '../../../lib/api';
import type { CategoryMeta } from '../../../app/public/categoryLookup';
import { platformMeta } from '../../../app/ui/PlatformIcon';

export type LiveTab = 'opportunities' | 'creators' | 'businesses';
type Tab = LiveTab;

// Other sections (the hero CTAs) jump here with a specific tab pre-selected by
// dispatching this window event before scrolling to the section.
export const LIVE_TAB_EVENT = 'landing:live-on-kolab-tab';
export function selectLiveTab(tab: LiveTab) {
  window.dispatchEvent(new CustomEvent<LiveTab>(LIVE_TAB_EVENT, { detail: tab }));
}

interface Props {
  events: EventCardData[] | null;
  /** Showcase fetch state — opportunities render loading / error / empty from it. */
  eventsStatus: 'loading' | 'ready' | 'error';
  onRetryEvents: () => void;
  creators: PublicCreatorLite[] | null;
  businesses: PublicBusinessLite[] | null;
  categoryMeta: (name: string) => CategoryMeta;
}

type EventCell = { key: string; title: string; business: string | null; location: string | null; isPaid: boolean; meta: string; imageUrl: string | null; to: string };
type PeopleCell = { key: string; name: string; categories: string[]; location: string | null; imageUrl: string | null; meta: string | null; topPlatform?: string; verified: boolean; to: string };

const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));
const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export function LiveOnKolab({ events, eventsStatus, onRetryEvents, creators, businesses, categoryMeta }: Props) {
  const { d } = useLandingLanguage();
  const [tab, setTab] = useState<Tab>('opportunities');
  useEffect(() => {
    const onSelect = (e: Event) => setTab((e as CustomEvent<Tab>).detail);
    window.addEventListener(LIVE_TAB_EVENT, onSelect);
    return () => window.removeEventListener(LIVE_TAB_EVENT, onSelect);
  }, []);
  const copy = d.liveOnKolab;
  const sessionRole = useLandingSession();

  // Real events only — an empty list shows the "coming soon" state, never
  // placeholder cards.
  const eventCells: EventCell[] = (events ?? []).slice(0, 4).map((e) => {
    const isPaid = e.campaignType !== 'OPEN_EVENT';
    const perks = (e.benefits ?? []).filter(Boolean);
    return {
      key: e.id,
      title: e.title,
      business: e.business?.businessName ?? null,
      location: e.locationType === 'REMOTE' ? d.events.remote : (e.location ?? null),
      isPaid,
      meta: isPaid ? perCreatorBudget(e).amount : (perks[0] ?? d.events.freeBadge),
      imageUrl: e.featureImageUrl ?? e.business?.logoUrl ?? null,
      to: `/events/${e.slug || e.id}`,
    };
  });
  const opportunitiesView: 'loading' | 'error' | 'empty' | 'list' =
    eventCells.length ? 'list' : eventsStatus === 'ready' ? 'empty' : eventsStatus;
  // Empty-state copy + CTA by session: guests sign up, creators polish their
  // profile, businesses are pitched to post the first opportunity. Route
  // guards on the targets handle unfinished onboarding.
  const ec = copy.opportunitiesEmpty;
  const emptyState =
    sessionRole === 'BUSINESS'
      ? { ...ec.business, to: '/business/events/create' }
      : sessionRole === 'CREATOR'
        ? { heading: ec.heading, body: ec.body, readyTitle: ec.readyTitle, readyBody: ec.memberBody, cta: ec.memberCta, to: '/creator/profile' }
        : { heading: ec.heading, body: ec.body, readyTitle: ec.readyTitle, readyBody: ec.guestBody, cta: ec.guestCta, to: '/signup' };

  function peopleCells(kind: 'creators' | 'businesses'): PeopleCell[] {
    const isCreators = kind === 'creators';
    const copyKind = isCreators ? d.marketplace.creators : d.marketplace.businesses;
    if (isCreators && creators && creators.length) {
      return creators.slice(0, 4).map((c) => {
        // Only the creator's biggest account — "[tiktok] 12K followers".
        const top = c.socialAccounts.reduce<(typeof c.socialAccounts)[number] | null>(
          (best, s) => (!best || s.followers > best.followers ? s : best),
          null,
        );
        const topPlatform = top?.platform.toLowerCase();
        const unit = topPlatform === 'youtube' ? d.marketplace.creators.subscribers : d.marketplace.creators.followers;
        return {
          key: c.id,
          name: c.fullName || c.username || '—',
          categories: c.categories,
          location: c.location,
          imageUrl: c.avatarUrl,
          meta: top && top.followers > 0 ? `${fmtCount(top.followers)} ${unit}` : null,
          topPlatform: top && top.followers > 0 ? topPlatform : undefined,
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

  const TAB_META: Record<Tab, { label: string; to: string; cta: string }> = {
    opportunities: { label: copy.tabs.opportunities, to: '/events', cta: d.events.cta },
    creators: { label: copy.tabs.creators, to: '/creators/search', cta: d.marketplace.creators.cta },
    businesses: { label: copy.tabs.businesses, to: '/businesses', cta: d.marketplace.businesses.cta },
  };

  return (
    <section
      id={SECTION_IDS.liveOnKolab}
      className={`${band('navy')} overflow-hidden pb-32 pt-16`}
    >
      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className={`${KICKER} text-lp-accent-ink`}>
            {copy.eyebrow}
          </motion.p>
          <motion.h2 variants={fadeUp} className={`${H2} mt-4 text-lp-fg`}>
            {copy.heading}
          </motion.h2>
          <motion.p variants={fadeUp} className={`${LEAD} mx-auto mt-4 max-w-xl text-lp-fg/70`}>
            {copy.sub}
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp} className="mt-10 flex flex-wrap justify-center gap-3">
          {(Object.keys(TAB_META) as Tab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={`h-11 rounded-full border px-6 text-[15px] transition-colors duration-300 ${
                tab === key ? 'border-lp-fg bg-lp-fg/10 text-lp-fg' : 'border-lp-fg/20 text-lp-fg/70 hover:border-lp-fg/50 hover:text-lp-fg'
              }`}
            >
              {TAB_META[key].label}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {tab === 'opportunities' && opportunitiesView !== 'list' && (
            <motion.div
              key={`opportunities-${opportunitiesView}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
              className="mt-12"
            >
              {/* Full grid width, at least one creator-card row tall (218px)
                  so switching tabs doesn't collapse the section. */}
              {opportunitiesView === 'loading' && (
                <div role="status" className="flex min-h-[218px] items-center justify-center gap-2 text-[15px] text-lp-fg/70">
                  <Loader2 size={18} className="animate-spin" aria-hidden />
                  {copy.opportunitiesLoading}
                </div>
              )}

              {opportunitiesView === 'error' && (
                <div role="alert" className="flex min-h-[218px] flex-col items-center justify-center rounded-2xl lp-glass px-6 py-8 text-center">
                  <p className="lp-heading text-lg text-lp-fg">{copy.opportunitiesError.heading}</p>
                  <p className="mt-2 text-[15px] text-lp-fg/70">{copy.opportunitiesError.body}</p>
                  <button
                    type="button"
                    onClick={onRetryEvents}
                    className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-lp-fg/30 px-6 text-[15px] text-lp-fg transition-colors hover:border-lp-fg/60"
                  >
                    <RotateCw size={15} aria-hidden />
                    {copy.opportunitiesError.retry}
                  </button>
                </div>
              )}

              {opportunitiesView === 'empty' && (
                <div className="grid min-h-[218px] rounded-2xl lp-glass px-6 py-8 text-center lg:grid-cols-2 lg:items-center lg:gap-x-10 lg:gap-y-6 lg:px-10 lg:py-6 lg:text-left">
                  <div className="flex flex-col items-center lg:flex-row lg:items-start lg:gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lp-brinjal/30 text-lp-fg">
                      <CalendarClock size={20} aria-hidden />
                    </span>
                    <div>
                      <h3 className="lp-heading mt-4 text-xl text-lp-fg lg:mt-0 lg:text-2xl">{emptyState.heading}</h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-lp-fg/70">{emptyState.body}</p>
                    </div>
                  </div>
                  <div className="mt-6 border-t border-lp-fg/10 pt-6 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
                    <p className="lp-heading text-[17px] text-lp-fg">{emptyState.readyTitle}</p>
                    <p className="mt-2 text-[15px] leading-relaxed text-lp-fg/70">
                      {emptyState.readyBody}
                    </p>
                  </div>
                  <div className="mt-6 flex justify-center lg:col-span-2 lg:mt-0">
                    <PillCta to={emptyState.to} tone="brinjal" size="lg">
                      {emptyState.cta}
                    </PillCta>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {tab === 'opportunities' && opportunitiesView === 'list' && (
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
                    className="group flex h-full flex-col overflow-hidden rounded-2xl lp-glass text-left transition-all hover:-translate-y-1 hover:border-[#818CF8]/50 hover:shadow-[0_20px_50px_-24px_rgba(99,102,241,0.7)]"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-lp-brinjal/30 to-lp-orange/20">
                      {card.imageUrl ? (
                        <img src={card.imageUrl} alt={card.business ?? card.title} width={320} height={180} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-lp-fg">
                          {initials(card.business ?? card.title)}
                        </div>
                      )}
                      <span
                        className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${
                          card.isPaid ? 'bg-lp-brinjal' : 'bg-lp-green'
                        }`}
                      >
                        {card.isPaid ? d.events.paidBadge : d.events.freeBadge}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <p className="lp-heading line-clamp-2 text-[15px] leading-snug text-lp-fg">{card.title}</p>
                      {card.business && <p className="mt-1 line-clamp-1 text-xs text-lp-fg/60">{card.business}</p>}
                      <p className="mt-2 text-xs font-semibold text-lp-fg">{card.meta}</p>
                      {card.location && (
                        <p className="mt-auto flex items-center gap-1 pt-2 text-[11px] text-lp-fg/60">
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
                    className="flex h-full flex-col items-center p-5 !text-center rounded-2xl lp-glass text-left transition-all hover:-translate-y-1 hover:border-[#818CF8]/50 hover:shadow-[0_20px_50px_-24px_rgba(99,102,241,0.7)]"
                  >
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-lp-brinjal/30 to-lp-orange/20 text-sm font-bold text-lp-fg">
                      {card.imageUrl ? <img src={card.imageUrl} alt={card.name} width={96} height={96} loading="lazy" className="h-full w-full object-cover" /> : initials(card.name)}
                    </div>
                    <p className="lp-heading mt-3 flex items-center gap-1 text-[15px] leading-tight text-lp-fg">
                      <span className="line-clamp-1">{card.name}</span>
                      {card.verified && <BadgeCheck size={13} className="shrink-0 text-lp-accent-ink" />}
                    </p>
                    {card.categories.length > 0 &&
                      (() => {
                        const { Icon, color } = categoryMeta(card.categories[0]!);
                        const extra = card.categories.length - 1;
                        return (
                          <span
                            className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-lp-fg"
                            style={{ backgroundColor: `${color}1f`, boxShadow: `inset 0 0 0 1px ${color}3d` }}
                          >
                            <Icon size={10} style={{ color }} className="shrink-0" />
                            <span className="line-clamp-1">{card.categories[0]}</span>
                            {extra > 0 && <span className="shrink-0">+{extra}</span>}
                          </span>
                        );
                      })()}
                    {card.location && (
                      <span className="mt-2 flex items-center gap-1 text-[11px] text-lp-fg/60">
                        <MapPin size={11} className="shrink-0" />
                        <span className="line-clamp-1">{card.location}</span>
                      </span>
                    )}
                    {card.meta && (
                      <span className="mt-2 flex items-center gap-1 text-[11px] text-lp-fg/60">
                        {card.topPlatform
                          ? (() => {
                              const { Icon, color, label } = platformMeta(card.topPlatform);
                              // TikTok/X brand black disappears on the navy band.
                              const mono = color === '#000000';
                              return <Icon size={12} color={mono ? 'currentColor' : color} className={mono ? 'text-lp-fg' : undefined} aria-label={label} />;
                            })()
                          : tab === 'creators' ? <Users size={11} /> : <MapPin size={11} />}
                        {card.meta}
                      </span>
                    )}
                  </Link>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {(tab !== 'opportunities' || opportunitiesView === 'list') && (
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp} className="mt-12 flex justify-center">
            <PillCta to={TAB_META[tab].to} tone="brinjal" size="lg">
              {TAB_META[tab].cta}
            </PillCta>
          </motion.div>
        )}
      </div>
    </section>
  );
}
