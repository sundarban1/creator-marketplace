import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { Search, Sparkles } from 'lucide-react';
import { fadeUp, stagger } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { PhoneShowcase } from '../components/PhoneShowcase';
import { PillCta, pillCtaClass } from '../components/PillCta';
import { useCountUp } from '../hooks/useCountUp';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { LandingStats, PublicCreatorLite } from '../../../lib/api';

// Stock-photo fallback for the avatar stack — used whenever a real creator
// avatar isn't available yet (showcase fetch failed/still loading, or fewer
// than 4 creators have an avatarUrl), same convention as the Pexels-hosted
// stock imagery used elsewhere on the page (Showcase, PhoneShowcase).
const AVATAR_FALLBACK_PHOTOS = [
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
];

export function Hero({ stats, creators }: { stats: LandingStats | null; creators: PublicCreatorLite[] | null }) {
  const { d } = useLandingLanguage();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');

  // Only show a numeric social-proof count once the live total is genuinely
  // positive — `stats` can resolve to real zeros pre-launch, and a "0+
  // creators are already on Kolab" line would be worse than a qualitative one.
  // No manufactured fallback number is shown while loading or if it's zero.
  const liveTotal = stats ? stats.totalCreators + stats.totalBusinesses : null;
  const hasLiveSocialProof = liveTotal !== null && liveTotal > 0;
  const { ref: countRef, display } = useCountUp(liveTotal ?? 0);

  function goToCreatorSearch(term: string) {
    const trimmed = term.trim();
    navigate(trimmed ? `/creators?q=${encodeURIComponent(trimmed)}` : '/creators');
  }

  // Real creator avatars where we have them, stock photos filling any
  // remaining slots (showcase still loading/failed, or too few avatarUrls).
  const realAvatarUrls = (creators ?? []).map((c) => c.avatarUrl).filter((url): url is string => Boolean(url));
  const avatarPhotos = AVATAR_FALLBACK_PHOTOS.map((fallback, i) => realAvatarUrls[i] ?? fallback);

  // Cursor-driven parallax — the product fan tilts a touch with the pointer,
  // the same ambient touch the previous hero's phone had.
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const glowSpringX = useSpring(glowX, { stiffness: 50, damping: 20, mass: 0.6 });
  const glowSpringY = useSpring(glowY, { stiffness: 50, damping: 20, mass: 0.6 });
  const fanRotateY = useTransform(glowSpringX, [-18, 18], [-4, 4]);
  const fanRotateX = useTransform(glowSpringY, [-12, 12], [3, -3]);

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
  const fanY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <section
      ref={sectionRef}
      id={SECTION_IDS.hero}
      onMouseMove={handlePointerMove}
      onMouseLeave={resetPointer}
      className="relative isolate overflow-hidden bg-lp-navy pt-32 text-white sm:pt-36"
    >
      {/* Brand glows in the navy — a wide brinjal wash behind the headline and
          a saffron ember low on the right. */}
      <HeroRibbon sectionRef={sectionRef} phoneRef={phoneRef} reducedMotion={reducedMotion} />

      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-18%] h-[620px] w-[1100px] -translate-x-1/2 rounded-full bg-lp-brinjal/30 blur-[140px]" />
        <div className="absolute bottom-[10%] right-[-8%] h-[380px] w-[380px] rounded-full bg-lp-orange/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-5 text-center sm:px-8">
        <motion.div initial="hidden" animate="show" variants={stagger()} className="flex flex-col items-center">
          <h1 className="lp-display text-balance text-[clamp(2.5rem,6vw,4.3rem)] leading-[1.06] text-white">
            <TextReveal as="span" eager text={d.hero.headlineLine1} delay={0.1} className="block" wordClassName="inline-block" />
            <TextReveal as="span" eager text={d.hero.headlineLine2} delay={0.35} className="block" wordClassName="inline-block lp-gradient-text" />
            <TextReveal as="span" eager text={d.hero.headlineLine3} delay={0.6} className="block" wordClassName="inline-block" />
          </h1>

          <TextReveal
            as="p"
            eager
            text={d.hero.sub}
            delay={0.85}
            stagger={0.015}
            className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed text-white/80 sm:text-xl"
          />

          {/* Glowing search capsule */}
          <motion.form
            variants={fadeUp}
            onSubmit={(e) => {
              e.preventDefault();
              goToCreatorSearch(query);
            }}
            className="mt-10 w-full max-w-3xl rounded-full bg-lp-navy-2/90 p-2.5 shadow-[0_0_0_1px_rgba(129,140,248,0.35),0_0_40px_-4px_rgba(99,102,241,0.65)]"
          >
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full bg-white/[0.06] px-5 py-3">
                <Search size={18} className="flex-shrink-0 text-white/70" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  type="text"
                  placeholder={d.hero.searchPlaceholder}
                  aria-label={d.hero.searchAriaLabel}
                  className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/45"
                />
              </div>
              <button type="submit" className={`${pillCtaClass('brinjal', 'lg')} flex-shrink-0 px-5 sm:px-7`}>
                <span className="hidden sm:inline">{d.hero.searchCta}</span>
                <Sparkles size={16} />
              </button>
            </div>
          </motion.form>

          <motion.div variants={fadeUp} className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-white/55">{d.hero.popularSearchesLabel}</span>
            {d.hero.popularSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => goToCreatorSearch(term)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-white/80 transition-colors hover:border-white/50 hover:text-white"
              >
                {term}
              </button>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <PillCta to="/events" tone="gradient" size="lg">
              {d.hero.ctaCreator}
            </PillCta>
            <PillCta to="/creators" tone="outline-white" size="lg">
              {d.hero.ctaBusiness}
            </PillCta>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-3">
              {avatarPhotos.map((src, i) => (
                <motion.img
                  key={i}
                  src={src}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = AVATAR_FALLBACK_PHOTOS[i];
                  }}
                  initial={{ opacity: 0, scale: 0.6, x: -8 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 1.1 + i * 0.08, type: 'spring', stiffness: 260, damping: 18 }}
                  className="h-9 w-9 flex-shrink-0 rounded-full border-2 border-lp-navy object-cover"
                />
              ))}
            </div>
            <p ref={countRef} className="text-sm text-white/70">
              {hasLiveSocialProof ? (
                <>
                  <span className="font-bold text-white">{display}+</span> {d.hero.socialProofSuffix}
                </>
              ) : (
                d.hero.socialProofQualitative
              )}
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* The live phone showcase, fading out into the navy — HeroRibbon runs
          behind it, tying it back to the headline above. */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        style={reducedMotion ? undefined : { y: fanY }}
        className="relative mx-auto mt-16 h-[560px] max-w-6xl sm:h-[620px]"
      >
        <motion.div
          style={reducedMotion ? undefined : { rotateY: fanRotateY, rotateX: fanRotateX, transformPerspective: 1200 }}
          className="relative flex h-full items-start justify-center"
        >
          <div ref={phoneRef} className="relative z-10 rounded-[3rem] shadow-[0_0_80px_-10px_rgba(99,102,241,0.7)]">
            <PhoneShowcase />
          </div>
        </motion.div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-64 bg-gradient-to-t from-lp-navy via-lp-navy/80 to-transparent" />
      </motion.div>
    </section>
  );
}

// inmark-style ribbon: one thick brand-gradient stroke that enters from the
// left edge beside the headline, drops down the left gutter, runs straight
// through behind the phone and climbs back out on the right. The path is
// built from the phone's measured position (re-measured on resize) rather
// than fixed coordinates, so it always threads the phone however tall the
// copy above wraps. Wide screens only (xl+), where the gutters beside the
// centred copy are wide enough to carry it without crossing any text.
function HeroRibbon({
  sectionRef,
  phoneRef,
  reducedMotion,
}: {
  sectionRef: React.RefObject<HTMLElement | null>;
  phoneRef: React.RefObject<HTMLDivElement | null>;
  reducedMotion: boolean;
}) {
  const gradientId = useId();
  const [geo, setGeo] = useState<{ w: number; h: number; d: string } | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const phone = phoneRef.current;
    if (!section || !phone) return;

    function measure() {
      const s = section!.getBoundingClientRect();
      const p = phone!.getBoundingClientRect();
      const w = s.width;
      const h = s.height;
      const cy = p.top - s.top + p.height * 0.42; // just above the phone's middle, clear of the bottom fade
      const xL = Math.max(90, (w - 1024) / 2 - 80); // left gutter, outside the max-w-5xl copy column
      const xR = w - xL;
      const y0 = 190; // enters level with the top of the headline
      const r = 150; // corner radius of each bend
      const d = [
        `M -40 ${y0}`,
        `C ${xL * 0.55} ${y0} ${xL} ${y0 + 40} ${xL} ${y0 + r}`,
        `L ${xL} ${cy - r}`,
        `C ${xL} ${cy - r * 0.35} ${xL + r * 0.35} ${cy} ${xL + r} ${cy}`,
        `L ${xR - r} ${cy}`,
        `C ${xR - r * 0.35} ${cy} ${xR} ${cy - r * 0.35} ${xR} ${cy - r}`,
        `L ${xR} ${y0 + r}`,
        `C ${xR} ${y0 + 40} ${w - xL * 0.55} ${y0} ${w + 40} ${y0}`,
      ].join(' ');
      setGeo({ w, h, d });
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(section);
    return () => ro.disconnect();
  }, [sectionRef, phoneRef]);

  if (!geo) return null;

  return (
    <svg
      aria-hidden
      width={geo.w}
      height={geo.h}
      viewBox={`0 0 ${geo.w} ${geo.h}`}
      className="pointer-events-none absolute left-0 top-0 hidden xl:block"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2={geo.w} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#15803D" />
          <stop offset="30%" stopColor="#4F46E5" />
          <stop offset="52%" stopColor="#8B5CF6" />
          <stop offset="78%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#F9A24B" />
        </linearGradient>
      </defs>
      {/* Soft glow underneath the stroke so it reads as light on the navy. */}
      <motion.path
        d={geo.d}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={30}
        strokeLinecap="round"
        opacity={0.35}
        style={{ filter: 'blur(14px)' }}
        initial={reducedMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.2, ease: [0.65, 0, 0.35, 1], delay: 0.3 }}
      />
      <motion.path
        d={geo.d}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={14}
        strokeLinecap="round"
        initial={reducedMotion ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 2.2, ease: [0.65, 0, 0.35, 1], delay: 0.3 }}
      />
    </svg>
  );
}
