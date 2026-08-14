import { useRef } from 'react';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { fadeUp, scaleIn, stagger } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { AppStoreBadges } from '../components/AppStoreBadges';
import { ComingSoonBadge } from '../components/ComingSoonBadge';
import { PhoneShowcase } from '../components/PhoneShowcase';
import { TextReveal } from '../components/TextReveal';
import { useLenisScroll } from '../hooks/useLenis';
import { useComingSoon } from '../hooks/useComingSoon';
import { useHeadlineTypewriter } from '../hooks/useHeadlineTypewriter';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function Hero() {
  const { d } = useLandingLanguage();
  const { scrollTo } = useLenisScroll();
  const comingSoon = useComingSoon();
  const typed = useHeadlineTypewriter(d.hero.headlinePairs);
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  // Cursor-driven parallax on the background glow — the blobs drift a few
  // pixels toward the pointer, springing back to center on mouse-leave. Kept
  // on a wrapper around the blobs (not the blobs themselves) so it doesn't
  // fight with their own `mesh-drift` CSS transform animation.
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const glowSpringX = useSpring(glowX, { stiffness: 50, damping: 20, mass: 0.6 });
  const glowSpringY = useSpring(glowY, { stiffness: 50, damping: 20, mass: 0.6 });

  // Same pointer spring, remapped to a subtle 3D tilt on the phone mockup —
  // reuses the exact values already driving the background glow instead of
  // introducing a second tracking mechanism, so the whole hero reacts to the
  // cursor as one connected surface rather than isolated pieces.
  const phoneRotateY = useTransform(glowSpringX, [-18, 18], [-7, 7]);
  const phoneRotateX = useTransform(glowSpringY, [-12, 12], [5, -5]);

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

  // Every other section on the page reveals itself in response to scroll
  // (`whileInView`) — the hero, being above the fold at load, never had a
  // scroll trigger of its own. This gives it one: as the user scrolls from
  // hero into Showcase, the content drifts up and fades, so the handoff
  // between sections feels considered rather than an abrupt cut.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.hero}
      onMouseMove={handlePointerMove}
      onMouseLeave={resetPointer}
      className="relative overflow-hidden bg-paper pt-44 pb-28 dark:bg-ink"
    >
      {/* Soft brand-color glow, referencing the logo's violet/orange gradient */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <motion.div style={{ x: glowSpringX, y: glowSpringY }} className="absolute inset-0">
          <div className="mesh-blob absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-violet/[0.08] blur-[100px]" />
          <div className="mesh-blob absolute right-[-8%] top-[10%] h-[360px] w-[360px] rounded-full bg-brand-orange/[0.08] blur-[100px]" style={{ animationDelay: '3s' }} />
        </motion.div>
      </div>

      {/* Oversized watermark numeral — the one editorial flourish. The centered
          max-w-6xl content column's left margin shrinks to ~24px right at the
          lg breakpoint (1024px) — not enough room for any visible flourish
          without colliding with the headline, so it's hidden for 1024-1279px.
          From xl (1280px, a common 13" laptop width) the margin has opened up
          to ~88px, enough for a small version; full size returns at 2xl
          (1536px+, ~14" and wider) where the margin clears it entirely. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-10 top-16 select-none font-serif text-[16rem] italic leading-none text-violet/[0.05] sm:text-[22rem] lg:hidden xl:block xl:-left-4 xl:top-20 xl:text-[7rem] 2xl:-left-10 2xl:top-16 2xl:text-[22rem]"
      >
        K
      </span>

      {/* Fills the empty space below the K watermark with the same faint,
          decorative treatment (low opacity, oversized, non-interactive).
          Same lg/xl/2xl staging as the K watermark above, and for the same
          reason — it also collides with the headline at 13"/14"-laptop
          widths at full size. */}
      <img
        src="/icon.png"
        alt=""
        aria-hidden
        loading="lazy"
        className="pointer-events-none absolute left-24 bottom-32 h-56 w-56 select-none opacity-[0.07] sm:h-72 sm:w-72 lg:hidden xl:block xl:left-0 xl:bottom-40 xl:h-16 xl:w-16 2xl:left-24 2xl:bottom-32 2xl:h-72 2xl:w-72"
      />

      <motion.div
        style={reducedMotion ? undefined : { y: heroY, opacity: heroOpacity }}
        className="relative mx-auto max-w-6xl px-6"
      >
        <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-24">
          <motion.div initial="hidden" animate="show" variants={stagger()} className="mx-auto max-w-xl text-center">
            <motion.p variants={fadeUp} className="flex items-center justify-center gap-2 font-serif text-base italic text-ink-soft dark:text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-violet to-brand-orange" />
              {d.hero.eyebrow}
            </motion.p>

            <motion.h1
              variants={fadeUp}
              className="text-balance mt-6 font-serif text-4xl font-medium leading-[1.1] tracking-tight text-ink sm:text-6xl sm:leading-[1.03] lg:text-7xl dark:text-white"
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
                {/* Always forces a clean "Where Brands" / "Meet Creators" 2-line split —
                    without it, the reserved-width word boxes below (sized to fit the
                    widest word any headline pair ever cycles through) can overflow the
                    text column at the larger desktop type sizes and wrap into an
                    uneven 3rd line instead. Unconditional so it holds regardless of
                    which pair — short or long — is currently typed in. */}
                <br aria-hidden="true" />
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

            <TextReveal
              as="p"
              eager
              text={d.hero.sub}
              delay={0.5}
              stagger={0.018}
              className="mx-auto mt-8 max-w-lg text-lg leading-relaxed text-ink-soft dark:text-white/60"
            />

            <motion.div variants={fadeUp} className="mx-auto mt-10 max-w-lg">
              <span className="mx-auto block h-1 w-10 rounded-full bg-gradient-to-r from-violet to-brand-orange" />
              <p className="mt-4 bg-gradient-to-br from-ink to-violet-dark bg-clip-text font-serif text-2xl font-medium text-transparent sm:text-3xl dark:from-white dark:to-violet">
                {d.finalCta.heading}
              </p>
              <TextReveal
                as="p"
                eager
                text={d.finalCta.sub}
                delay={0.75}
                stagger={0.02}
                className="mt-1.5 text-base text-ink-soft dark:text-white/60"
              />
            </motion.div>

            <motion.div variants={fadeUp} className="mt-6 flex justify-center">
              {comingSoon ? <ComingSoonBadge /> : <AppStoreBadges />}
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="show"
            variants={scaleIn}
            transition={{ delay: 0.25 }}
          >
            {/* Tilts toward the cursor using the same spring values as the
                background glow above — a separate layer from the scaleIn
                entrance and the float-slow bob below so framer's `animate`
                transform, this `style` transform, and the CSS keyframe
                transform each own their own element instead of fighting
                over one. */}
            <motion.div
              style={reducedMotion ? undefined : { rotateY: phoneRotateY, rotateX: phoneRotateX, transformPerspective: 900 }}
            >
              {/* Idle bob lives on this wrapper, not the scaleIn div above — both
                  animate `transform`, and a running CSS keyframe animation would
                  otherwise clobber framer's inline scale/opacity transform. */}
              <div className={reducedMotion ? undefined : 'float-slow'}>
                <PhoneShowcase />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      <motion.button
        aria-label={d.hero.scrollAriaLabel}
        onClick={() => scrollTo(`#${SECTION_IDS.trust}`)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-ink-soft/60 transition-colors hover:text-ink-soft sm:flex dark:text-white/40 dark:hover:text-white/60"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest">{d.hero.scrollLabel}</span>
        <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
          <ChevronDown size={16} />
        </motion.span>
      </motion.button>
    </section>
  );
}
