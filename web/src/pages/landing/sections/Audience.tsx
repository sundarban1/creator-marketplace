import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  Camera,
  MapPin,
  Sparkles,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { fadeUp, scaleIn, stagger, VP, CARD_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { useLenisScroll } from '../hooks/useLenis';

const PROFILE_PHOTO =
  'https://images.pexels.com/photos/15594934/pexels-photo-15594934.jpeg?auto=compress&cs=tinysrgb&w=400&h=460&fit=crop';
// Positionally paired with `taker.talent` (Content Creator, Influencer, UGC Creator).
const TALENT_AVATARS = [
  'https://images.unsplash.com/photo-1637589308599-3478cc55510d?auto=format&fit=crop&w=100&h=100&q=80',
  'https://images.unsplash.com/photo-1704088030734-96769c4593a2?auto=format&fit=crop&w=100&h=100&q=80',
  'https://images.pexels.com/photos/31880387/pexels-photo-31880387.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
];
// Positionally paired with `giver.notifications`.
const NOTIFICATION_ICONS = [Bookmark, Camera, Star];

export function Audience() {
  const { d } = useLandingLanguage();
  const { scrollTo } = useLenisScroll();
  const a = d.audience;
  const giver = a.giver;
  const taker = a.taker;

  return (
    <section id={SECTION_IDS.audience} className="relative overflow-hidden bg-white py-24 dark:bg-ink">
      {/* Soft two-tone wash — orange (giver) fading into violet (taker),
          echoing the accent colors each column carries below. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-orange/[0.05] via-transparent to-violet/[0.06] dark:from-brand-orange/[0.04] dark:to-violet/[0.05]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[38%] h-64 w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand-orange/10 via-transparent to-violet/10 blur-[90px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/80 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-violet shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-ink-elevated-2/80"
          >
            <Sparkles size={12} />
            {a.eyebrow}
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-4 text-balance font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white">
            {a.heading}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-ink-soft dark:text-white">
            {a.sub}
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.12)} className="relative mt-16 grid gap-y-14 lg:grid-cols-2 lg:gap-x-10 lg:gap-y-8">
          {/* Service giver — header */}
          <motion.div variants={fadeUp} className="flex flex-col items-center text-center lg:col-start-1 lg:row-start-1 lg:items-start lg:text-left">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-orange">{giver.label}</span>
            <h3 className="mt-2 text-xl font-bold leading-snug text-ink dark:text-white">{giver.title}</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft dark:text-white">{giver.sub}</p>
          </motion.div>

          {/* Service taker — header */}
          <motion.div variants={fadeUp} className="flex flex-col items-center text-center lg:col-start-2 lg:row-start-1 lg:items-end lg:text-right">
            <span className="text-xs font-bold uppercase tracking-wide text-violet">{taker.label}</span>
            <h3 className="mt-2 text-xl font-bold leading-snug text-ink dark:text-white">{taker.title}</h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-soft dark:text-white">{taker.sub}</p>
          </motion.div>

          {/* Service giver — card, with a connector line reaching toward the
              hub. Placed in the same grid row as the taker card below so
              both start at an identical y regardless of header length. */}
          <motion.div variants={fadeUp} className="relative flex w-full flex-col items-center lg:col-start-1 lg:row-start-2 lg:items-start">
            <div className="mb-4 hidden w-max flex-nowrap items-center gap-2 sm:flex">
              {giver.notifications.map((text, i) => {
                const Icon = NOTIFICATION_ICONS[i] ?? Bookmark;
                return (
                  <motion.div
                    key={text}
                    variants={fadeUp}
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-sm dark:border-white/10 dark:bg-ink-elevated-2 dark:text-white"
                  >
                    <Icon size={12} className="text-brand-orange" />
                    {text}
                  </motion.div>
                );
              })}
            </div>

            <div className="flex w-full items-start justify-center gap-4 lg:justify-start">
              <motion.div
                whileHover={CARD_HOVER}
                className="relative w-full max-w-sm shrink-0 overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-[0_8px_30px_-14px_rgba(20,17,16,0.18)] dark:border-white/10 dark:bg-ink-elevated"
              >
                <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-brand-orange to-brand-orange/30" />
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <img src={PROFILE_PHOTO} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-ink shadow-sm">
                    <Star size={10} className="fill-brand-orange text-brand-orange" />
                    {giver.badge}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-4 pt-10">
                    <div>
                      <span className="text-base font-bold text-white">{giver.name}</span>
                      <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-white/90">
                        {giver.role}
                        <BadgeCheck size={13} />
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-white/90">
                      <MapPin size={11} />
                      {giver.location}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Connector — dashed line from the "Top Creator" card toward
                  the hub logo. flex-1 so it always spans exactly the gap
                  between the card and the grid's centerline, at any width. */}
              <span
                aria-hidden
                className="mt-[135px] hidden h-px flex-1 self-start bg-[repeating-linear-gradient(90deg,rgba(249,115,22,0.5)_0_6px,transparent_6px_12px)] lg:block"
              />
            </div>
          </motion.div>

          {/* Service taker — card, mirrored connector on the left */}
          <motion.div variants={fadeUp} className="relative flex w-full flex-col items-center lg:col-start-2 lg:row-start-2 lg:items-end">
            <div className="mb-4 flex w-full max-w-sm flex-wrap items-center gap-2">
              {taker.talent.map((role, i) => (
                <motion.div
                  key={role}
                  variants={fadeUp}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ink/10 bg-white py-1.5 pl-1.5 pr-3 text-xs font-semibold text-ink shadow-sm dark:border-white/10 dark:bg-ink-elevated-2 dark:text-white"
                >
                  <img src={TALENT_AVATARS[i]} alt="" loading="lazy" className="h-5 w-5 rounded-full object-cover" />
                  {role}
                </motion.div>
              ))}
            </div>
            <div className="flex w-full items-start justify-center gap-4 lg:justify-end">
              {/* Connector — dashed line from the hub logo toward the
                  "Content Creators Needed" card. */}
              <span
                aria-hidden
                className="mt-[135px] hidden h-px flex-1 self-start bg-[repeating-linear-gradient(90deg,rgba(123,92,245,0.5)_0_6px,transparent_6px_12px)] lg:block"
              />
              <motion.div
                whileHover={CARD_HOVER}
                className="relative w-full max-w-sm shrink-0 overflow-hidden rounded-3xl border border-ink/10 bg-violet/[0.04] p-5 text-left shadow-[0_8px_30px_-14px_rgba(20,17,16,0.18)] dark:border-white/10 dark:bg-violet/[0.06]"
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet/30 to-violet" />
                <div className="flex items-start justify-between">
                  <span className="rounded-full bg-violet/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet">{taker.opportunityBadge}</span>
                  <Bookmark size={16} className="text-ink-soft dark:text-white" />
                </div>
                <h4 className="mt-3 text-base font-bold leading-snug text-ink dark:text-white">{taker.opportunityTitle}</h4>
                <div className="mt-2.5 space-y-1.5 text-xs text-ink-soft dark:text-white">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={12} />
                    {taker.location}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Wallet size={12} />
                    {taker.budget}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={12} />
                    {taker.creators}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3 dark:border-white/10">
                  <span className="text-xs font-semibold text-ink dark:text-white">{taker.project}</span>
                  <span className="rounded-full bg-paper-dim px-2.5 py-1 text-[10px] font-semibold text-ink-soft dark:bg-white/10 dark:text-white">{taker.projectTag}</span>
                </div>
                <button
                  onClick={() => scrollTo(`#${SECTION_IDS.finalCta}`)}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full bg-violet px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(123,92,245,0.55)] transition-all duration-200 hover:opacity-90"
                >
                  {taker.opportunityCta}
                  <ArrowRight size={14} />
                </button>
              </motion.div>
            </div>
          </motion.div>

          {/* Center hub — the Kolab mark sits at the hinge between the two
              cards, spanning the full row so its shared mt offset lines up
              with both connector lines near the cards' bottom edge. */}
          <motion.div
            variants={scaleIn}
            transition={{ delay: 0.5 }}
            aria-hidden
            className="pointer-events-none relative z-10 hidden lg:col-start-1 lg:col-span-2 lg:row-start-2 lg:flex lg:items-start lg:justify-center"
          >
            <div className="flex flex-col items-center gap-3 lg:mt-[103px]">
              <span className="flex h-16 w-16 translate-y-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-violet p-[2px] shadow-[0_10px_30px_-8px_rgba(123,92,245,0.45)]">
                <span className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-ink-elevated-2">
                  <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
                </span>
              </span>
              <span className="flex translate-y-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <BadgeCheck size={12} />
                {a.matchFound}
              </span>
            </div>
          </motion.div>

          {/* CTAs — both in one row so "Find Opportunities" and "Find Talent"
              always line up side by side, regardless of how tall the cards
              above them are. */}
          <div className="flex flex-wrap items-start justify-center gap-8 lg:col-span-2 lg:row-start-3 lg:justify-between">
            {/* Service giver — CTA */}
            <motion.div variants={fadeUp} className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <button
                onClick={() => scrollTo(`#${SECTION_IDS.finalCta}`)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(249,115,22,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
              >
                {giver.cta}
                <ArrowRight size={14} />
              </button>
              <span className="mt-2 text-xs text-ink-soft dark:text-white">{giver.ctaCaption}</span>
            </motion.div>

            {/* Service taker — CTA */}
            <motion.div variants={fadeUp} className="flex flex-col items-center text-center lg:items-end lg:text-right">
              <button
                onClick={() => scrollTo(`#${SECTION_IDS.finalCta}`)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-violet px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(123,92,245,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
              >
                {taker.cta}
                <ArrowRight size={14} />
              </button>
              <span className="mt-2 text-xs text-ink-soft dark:text-white">{taker.ctaCaption}</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
