import { motion } from 'framer-motion';
import { ArrowRight, Handshake } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fadeUp, scaleIn, stagger, VP, CARD_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

export function Audience() {
  const { d } = useLandingLanguage();
  const a = d.audience;
  const creator = a.creatorJourney;
  const business = a.businessJourney;

  return (
    <section id={SECTION_IDS.audience} className="relative overflow-hidden bg-paper-dim py-28 dark:bg-ink-elevated">
      {/* Soft two-tone wash — orange (creator) fading into violet (business),
          echoing the accent colors each column carries below. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-orange/[0.05] via-transparent to-violet/[0.06] dark:from-brand-orange/[0.04] dark:to-violet/[0.05]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-[38%] h-64 w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-brand-orange/10 via-transparent to-violet/10 blur-[90px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white/80 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide text-violet shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-ink-elevated-2/80"
          >
            <Handshake size={12} />
            {a.eyebrow}
          </motion.span>
          <motion.h2 variants={fadeUp} className="mt-4 text-balance font-serif text-3xl font-medium text-ink sm:text-4xl md:text-5xl dark:text-white">
            {a.heading}
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-ink-soft dark:text-white">
            {a.sub}
          </motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger(0.12)} className="relative mt-16 grid gap-y-10 lg:grid-cols-2 lg:gap-x-10">
          {/* Creator journey — header + step list, with a connector line
              reaching toward the center hub. */}
          <motion.div variants={fadeUp} className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-orange">{creator.label}</span>
            <h3 className="mt-2 text-xl font-bold leading-snug text-ink dark:text-white">{creator.title}</h3>

            <div className="mt-6 flex w-full items-start justify-center gap-4 lg:justify-start">
              <motion.ol
                whileHover={CARD_HOVER}
                className="relative w-full max-w-sm shrink-0 overflow-hidden rounded-3xl border border-ink/10 bg-white p-5 shadow-[0_8px_30px_-14px_rgba(20,17,16,0.18)] dark:border-white/10 dark:bg-ink-elevated-2"
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-orange to-brand-orange/30" />
                {creator.steps.map((step, i) => (
                  <motion.li key={step} variants={fadeUp} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-orange/10 text-xs font-bold text-brand-orange">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-ink dark:text-white">{step}</span>
                  </motion.li>
                ))}
              </motion.ol>

              <span
                aria-hidden
                className="mt-[135px] hidden h-px flex-1 self-start bg-[repeating-linear-gradient(90deg,rgba(249,115,22,0.5)_0_6px,transparent_6px_12px)] lg:block"
              />
            </div>

            <div className="mt-6 flex flex-col items-center lg:items-start">
              <Link
                to="/events"
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-orange px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(249,115,22,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
              >
                {d.hero.ctaCreator}
                <ArrowRight size={14} />
              </Link>
              <span className="mt-2 text-xs text-ink-soft dark:text-white">{creator.ctaCaption}</span>
            </div>
          </motion.div>

          {/* Mobile-only stand-in for the desktop center hub below — keeps the
              "collaborate" concept visible between the two stacked journeys
              instead of disappearing along with the desktop-only hub. */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 lg:hidden">
            <span aria-hidden className="h-px flex-1 bg-ink/10 dark:bg-white/10" />
            <span className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 shadow-sm dark:border-white/10 dark:bg-ink-elevated-2">
              <Handshake size={14} className="text-violet" />
              <span className="font-serif text-sm font-semibold italic text-ink dark:text-white">{a.centerWord}</span>
            </span>
            <span aria-hidden className="h-px flex-1 bg-ink/10 dark:bg-white/10" />
          </motion.div>

          {/* Business journey — mirrored, connector on the left. */}
          <motion.div variants={fadeUp} className="flex flex-col items-center text-center lg:items-end lg:text-right">
            <span className="text-xs font-bold uppercase tracking-wide text-violet">{business.label}</span>
            <h3 className="mt-2 text-xl font-bold leading-snug text-ink dark:text-white">{business.title}</h3>

            <div className="mt-6 flex w-full items-start justify-center gap-4 lg:justify-end">
              <span
                aria-hidden
                className="mt-[135px] hidden h-px flex-1 self-start bg-[repeating-linear-gradient(90deg,rgba(123,92,245,0.5)_0_6px,transparent_6px_12px)] lg:block"
              />
              <motion.ol
                whileHover={CARD_HOVER}
                className="relative w-full max-w-sm shrink-0 overflow-hidden rounded-3xl border border-ink/10 bg-violet/[0.04] p-5 text-left shadow-[0_8px_30px_-14px_rgba(20,17,16,0.18)] dark:border-white/10 dark:bg-violet/[0.06]"
              >
                <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet/30 to-violet" />
                {business.steps.map((step, i) => (
                  <motion.li key={step} variants={fadeUp} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-violet/10 text-xs font-bold text-violet">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-ink dark:text-white">{step}</span>
                  </motion.li>
                ))}
              </motion.ol>
            </div>

            <div className="mt-6 flex flex-col items-center lg:items-end">
              <Link
                to="/creators"
                className="inline-flex items-center gap-1.5 rounded-full bg-violet px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(123,92,245,0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
              >
                {d.hero.ctaBusiness}
                <ArrowRight size={14} />
              </Link>
              <span className="mt-2 text-xs text-ink-soft dark:text-white">{business.ctaCaption}</span>
            </div>
          </motion.div>

          {/* Center hub — sits at the hinge between the two step lists,
              spanning the full row so it lines up with both connector lines
              near the lists' top edge. */}
          <motion.div
            variants={scaleIn}
            transition={{ delay: 0.5 }}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-[190px] z-10 hidden lg:flex lg:items-start lg:justify-center"
          >
            <div className="flex flex-col items-center gap-2">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-violet p-[2px] shadow-[0_10px_30px_-8px_rgba(123,92,245,0.45)]">
                <span className="flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-ink-elevated-2">
                  <Handshake size={22} className="text-violet" />
                </span>
              </span>
              <span className="whitespace-nowrap font-serif text-sm font-semibold italic text-ink dark:text-white">{a.centerWord}</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
