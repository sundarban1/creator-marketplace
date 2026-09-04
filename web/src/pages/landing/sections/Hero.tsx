import { useRef, useState } from 'react';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { ChevronDown, Search } from 'lucide-react';
import { fadeUp, scaleIn, stagger } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { PhoneShowcase } from '../components/PhoneShowcase';
import { useCountUp } from '../hooks/useCountUp';
import { useLenisScroll } from '../hooks/useLenis';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { LandingStats } from '../../../lib/api';

// Decorative avatar-stack photos — no real "recently joined" feed exists yet,
// same convention as the Pexels-hosted stock imagery used elsewhere on the
// page (Showcase, PhoneShowcase) rather than a local asset.
const AVATAR_PHOTOS = [
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
];

export function Hero({ stats }: { stats: LandingStats | null }) {
  const { d } = useLandingLanguage();
  const { scrollTo } = useLenisScroll();
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');

  const socialProofTarget = stats ? stats.totalCreators + stats.totalBusinesses : d.hero.socialProofFallback;
  const { ref: countRef, display } = useCountUp(socialProofTarget);

  // Cursor-driven parallax on the background glow + a matching subtle 3D tilt
  // on the phone mockup — same recipe as the previous hero, kept because it's
  // an ambient touch independent of the specific layout above it.
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const glowSpringX = useSpring(glowX, { stiffness: 50, damping: 20, mass: 0.6 });
  const glowSpringY = useSpring(glowY, { stiffness: 50, damping: 20, mass: 0.6 });
  const phoneRotateY = useTransform(glowSpringX, [-18, 18], [-6, 6]);
  const phoneRotateX = useTransform(glowSpringY, [-12, 12], [4, -4]);

  function handlePointerMove(e: React.MouseEvent<HTMLElement>) {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    glowX.set(((e.clientX - rect.left) / rect.width - 0.5) * 36);
    glowY.set(((e.clientY - rect.top) / rect.height - 0.5) * 24);
  }

  function resetPointer() {
    glowX.set(0);
    glowY.set(0);
  }

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.hero}
      onMouseMove={handlePointerMove}
      onMouseLeave={resetPointer}
      className="relative overflow-hidden bg-paper pt-40 pb-24 dark:bg-ink"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <motion.div style={{ x: glowSpringX, y: glowSpringY }} className="absolute inset-0">
          <div className="mesh-blob absolute left-[8%] top-[-15%] h-[460px] w-[460px] rounded-full bg-violet/[0.09] blur-[110px]" />
          <div className="mesh-blob absolute right-[-6%] top-[5%] h-[380px] w-[380px] rounded-full bg-brand-orange/[0.09] blur-[110px]" style={{ animationDelay: '3s' }} />
        </motion.div>
      </div>

      <motion.div
        style={reducedMotion ? undefined : { y: heroY, opacity: heroOpacity }}
        className="relative mx-auto max-w-6xl px-6"
      >
        <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <motion.div initial="hidden" animate="show" variants={stagger()} className="max-w-xl">
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-violet/20 bg-violet/[0.06] px-3.5 py-1.5 font-serif text-sm italic text-violet dark:border-violet/30 dark:bg-violet/10 dark:text-white"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet to-brand-orange" />
              {d.hero.eyebrow}
            </motion.span>

            <h1 className="text-balance mt-6 font-serif text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem] dark:text-white">
              <TextReveal as="span" eager text={d.hero.headlineLine1} delay={0.15} className="block" wordClassName="inline-block" />
              <TextReveal
                as="span"
                eager
                text={d.hero.headlineLine2}
                delay={0.4}
                className="block"
                wordClassName="inline-block bg-gradient-to-r from-brand-orange to-violet bg-clip-text text-transparent"
              />
              <TextReveal as="span" eager text={d.hero.headlineLine3} delay={0.65} className="block" wordClassName="inline-block text-violet" />
            </h1>

            <TextReveal
              as="p"
              eager
              text={d.hero.sub}
              delay={0.9}
              stagger={0.015}
              className="mt-6 max-w-md text-base leading-relaxed text-ink-soft dark:text-white"
            />

            <motion.form
              variants={fadeUp}
              onSubmit={(e) => {
                e.preventDefault();
                scrollTo(`#${SECTION_IDS.finalCta}`);
              }}
              className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:items-center"
            >
              <div className="relative flex-1">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft dark:text-white" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="text"
                  placeholder={d.hero.searchPlaceholder}
                  aria-label={d.hero.searchAriaLabel}
                  className="w-full rounded-full border border-ink/10 bg-white py-3.5 pl-11 pr-4 text-sm text-ink placeholder:text-ink-soft/60 shadow-[0_10px_30px_-14px_rgba(20,17,16,0.25)] outline-none transition-colors focus:border-violet/50 dark:border-white/10 dark:bg-ink-elevated dark:text-white dark:placeholder:text-white/35"
                />
              </div>
              <button
                type="submit"
                className="inline-flex flex-shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-violet to-brand-orange px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
              >
                {d.hero.searchCta}
              </button>
            </motion.form>

            <motion.div variants={fadeUp} className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-ink-soft dark:text-white">{d.hero.popularSearchesLabel}</span>
              {d.hero.popularSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="rounded-full border border-ink/10 bg-white px-3 py-1.5 font-medium text-ink-soft transition-colors hover:border-violet/40 hover:text-violet dark:border-white/10 dark:bg-ink-elevated dark:text-white dark:hover:text-white"
                >
                  {term}
                </button>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-3">
                {AVATAR_PHOTOS.map((src, i) => (
                  <motion.img
                    key={src}
                    src={src}
                    alt=""
                    loading="lazy"
                    initial={{ opacity: 0, scale: 0.6, x: -8 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: 1.1 + i * 0.08, type: 'spring', stiffness: 260, damping: 18 }}
                    className="h-9 w-9 flex-shrink-0 rounded-full border-2 border-paper object-cover dark:border-ink"
                  />
                ))}
              </div>
              <p ref={countRef} className="text-sm text-ink-soft dark:text-white">
                <span className="font-bold text-ink dark:text-white">{display}+</span> {d.hero.socialProofSuffix}
              </p>
            </motion.div>
          </motion.div>

          <motion.div initial="hidden" animate="show" variants={scaleIn} transition={{ delay: 0.3 }} className="relative mx-auto w-fit">
            <motion.div
              style={reducedMotion ? undefined : { rotateY: phoneRotateY, rotateX: phoneRotateX, transformPerspective: 900 }}
              className="relative"
            >
              <PhoneShowcase />
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      <motion.button
        aria-label={d.hero.scrollAriaLabel}
        onClick={() => scrollTo(`#${SECTION_IDS.possibilities}`)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-ink-soft/60 transition-colors hover:text-ink-soft sm:flex dark:text-white dark:hover:text-white/60"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest">{d.hero.scrollLabel}</span>
        <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
          <ChevronDown size={16} />
        </motion.span>
      </motion.button>
    </section>
  );
}
