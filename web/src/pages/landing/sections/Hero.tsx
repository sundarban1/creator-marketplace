import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { fadeUp, scaleIn, stagger } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { AppStoreBadges } from '../components/AppStoreBadges';
import { ComingSoonBadge } from '../components/ComingSoonBadge';
import { PhoneShowcase } from '../components/PhoneShowcase';
import { useLenisScroll } from '../hooks/useLenis';
import { useComingSoon } from '../hooks/useComingSoon';
import { useHeadlineTypewriter } from '../hooks/useHeadlineTypewriter';

export function Hero() {
  const { d } = useLandingLanguage();
  const { scrollTo } = useLenisScroll();
  const comingSoon = useComingSoon();
  const typed = useHeadlineTypewriter(d.hero.headlinePairs);

  return (
    <section id={SECTION_IDS.hero} className="relative overflow-hidden bg-paper pt-44 pb-28">
      {/* Soft brand-color glow, referencing the logo's violet/orange gradient */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet/[0.08] blur-[100px]" />
        <div className="mesh-blob absolute right-[-8%] top-[10%] h-[360px] w-[360px] rounded-full bg-brand-orange/[0.08] blur-[100px]" style={{ animationDelay: '3s' }} />
      </div>

      {/* Oversized watermark numeral — the one editorial flourish */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-10 top-16 select-none font-serif text-[16rem] italic leading-none text-violet/[0.05] sm:text-[22rem]"
      >
        K
      </span>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
          <motion.div initial="hidden" animate="show" variants={stagger()} className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
            <motion.p variants={fadeUp} className="flex items-center justify-center gap-2 font-serif text-base italic text-ink-soft lg:justify-start">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet to-brand-orange" />
              {d.hero.eyebrow}
            </motion.p>

            <motion.h1
              variants={fadeUp}
              className="text-balance mt-6 font-serif text-5xl font-medium leading-[1.03] tracking-tight text-ink sm:text-6xl lg:text-7xl"
            >
              {/* Screen readers get one stable sentence instead of the rapidly
                  retyping text below, which is hidden from assistive tech. */}
              <span className="sr-only">
                {d.hero.headlinePrefix} {d.hero.headlineBrands} {d.hero.headlineMiddle} {d.hero.headlineCreators}
                {!!d.hero.headlineSuffix && ` ${d.hero.headlineSuffix}`}
              </span>
              <span aria-hidden="true">
                {d.hero.headlinePrefix}{' '}
                <em className="relative inline-grid align-baseline text-left text-violet underline decoration-violet/30 decoration-2 underline-offset-8">
                  {/* Invisible copies of every word this slot ever cycles through, stacked
                      in the same grid cell — the box sizes itself to the widest one, so
                      typing/deleting a shorter or longer word never changes this element's
                      width. That's what keeps "Where"/"Meet" from shifting position. */}
                  {d.hero.headlinePairs.map((p, i) => (
                    <span key={i} aria-hidden className="invisible whitespace-nowrap [grid-area:1/1]">{p.a}</span>
                  ))}
                  <span className="whitespace-nowrap [grid-area:1/1]">
                    {typed.a}
                    <span className="animate-pulse">▏</span>
                  </span>
                </em>{' '}
                {d.hero.headlineMiddle}{' '}
                <em className="relative inline-grid align-baseline text-left text-brand-orange underline decoration-brand-orange/30 decoration-2 underline-offset-8">
                  {d.hero.headlinePairs.map((p, i) => (
                    <span key={i} aria-hidden className="invisible whitespace-nowrap [grid-area:1/1]">{p.b}</span>
                  ))}
                  <span className="whitespace-nowrap [grid-area:1/1]">
                    {typed.b}
                    <span className="animate-pulse">▏</span>
                  </span>
                </em>
                {!!d.hero.headlineSuffix && <> {d.hero.headlineSuffix}</>}
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mx-auto mt-8 max-w-lg text-lg leading-relaxed text-ink-soft lg:mx-0">
              {d.hero.sub}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex justify-center lg:justify-start">
              {comingSoon ? <ComingSoonBadge /> : <AppStoreBadges />}
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={scaleIn}
            transition={{ delay: 0.25 }}
          >
            <PhoneShowcase />
          </motion.div>
        </div>
      </div>

      <motion.button
        aria-label={d.hero.scrollAriaLabel}
        onClick={() => scrollTo(`#${SECTION_IDS.trust}`)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-ink-soft/60 transition-colors hover:text-ink-soft sm:flex"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest">{d.hero.scrollLabel}</span>
        <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
          <ChevronDown size={16} />
        </motion.span>
      </motion.button>
    </section>
  );
}
