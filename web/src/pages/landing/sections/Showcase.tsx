import { useEffect, useRef, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, scaleIn, stagger, VP } from '../lib/motion';
import { useLandingLanguage } from '../context/LanguageContext';
import { ensureGsapRegistered, gsap } from '../lib/gsap';

const ACCENTS = ['text-violet', 'text-brand-orange'] as const;

function pexelsVideo(id: string, file: string) {
  return `https://videos.pexels.com/video-files/${id}/${file}`;
}

// One clip per panel, picked for what it's about — a stock creator filming
// herself (Find the Right Match), a checklist board (Everything in One
// Place), a genuine handshake (Real Opportunities, Less Hassle), a signature
// on an agreement (Collaborate with Confidence), and a contactless payment
// (Get Paid Securely). Not reused from PhoneShowcase.tsx (Hero) — a separate,
// dedicated set for this section.
const VIDEOS = [
  {
    poster: 'https://images.pexels.com/videos/6965038/pexels-photo-6965038.jpeg?auto=compress&cs=tinysrgb&h=627&fit=crop&w=1200',
    src: pexelsVideo('6965038', '6965038-sd_506_960_25fps.mp4'),
  },
  {
    poster: 'https://images.pexels.com/videos/38611417/achievement-approval-business-checkbox-38611417.jpeg?auto=compress&cs=tinysrgb&h=627&fit=crop&w=1200',
    src: pexelsVideo('38611417', '16398571_960_540_25fps.mp4'),
  },
  {
    poster: 'https://images.pexels.com/videos/6648429/pexels-photo-6648429.jpeg?auto=compress&cs=tinysrgb&h=627&fit=crop&w=1200',
    src: pexelsVideo('6648429', '6648429-sd_960_506_25fps.mp4'),
  },
  {
    poster: 'https://images.pexels.com/videos/8814706/pexels-photo-8814706.jpeg?auto=compress&cs=tinysrgb&h=627&fit=crop&w=1200',
    src: pexelsVideo('8814706', '8814706-sd_540_960_25fps.mp4'),
  },
  {
    poster: 'https://images.pexels.com/videos/7669659/adult-analogue-banking-bill-7669659.jpeg?auto=compress&cs=tinysrgb&h=627&fit=crop&w=1200',
    src: pexelsVideo('7669659', '7669659-sd_540_960_25fps.mp4'),
  },
];

// Draws one C-curve hump per panel across the track's full width (100 SVG
// units per panel) so the squiggle always spans exactly as many humps as
// there are panels, however many that ends up being.
function buildSquigglePath(count: number) {
  let d = 'M0,50';
  for (let i = 0; i < count; i++) {
    const midX = i * 100 + 50;
    const endX = (i + 1) * 100;
    d += ` C${midX},8 ${midX},92 ${endX},50`;
  }
  return d;
}

/** Full-bleed section: on desktop (lg+, motion allowed) the three panels pin
 *  and slide horizontally as the user scrolls vertically, connected by a
 *  hand-drawn squiggle line. Below that breakpoint, or under reduced motion,
 *  the exact same panels just render as a plain stacked vertical scroll with
 *  framer-motion `fadeUp` reveals — no GSAP involved at all, not a shrunken
 *  version of the desktop treatment. */
export function Showcase() {
  const { d } = useLandingLanguage();
  const panels = d.showcase.panels;
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    ensureGsapRegistered();
    const mm = gsap.matchMedia();

    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const track = trackRef.current;
      const root = rootRef.current;
      if (!track || !root) return;

      const panelEls = gsap.utils.toArray<HTMLElement>('.showcase-panel', track);
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          pin: true,
          scrub: 1,
          start: 'top top',
          end: () => '+=' + (track.scrollWidth - window.innerWidth),
          invalidateOnRefresh: true,
        },
      });
      // xPercent here is relative to the TRACK's own width (panels.length *
      // 100vw), not any single panel's — so reaching the last panel needs
      // -100 * (n-1)/n percent, not -100 * (n-1). Getting this wrong (an
      // earlier bug) overshoots the translation by a factor of `n`, sliding
      // the track past all real content into blank track space for the back
      // half of the pinned scroll range before the pin finally releases.
      tl.to(track, { xPercent: (-100 * (panelEls.length - 1)) / panelEls.length, ease: 'none' }, 0);

      const path = pathRef.current;
      if (path) {
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
        tl.to(path, { strokeDashoffset: 0, ease: 'none' }, 0);
      }

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    });

    return () => mm.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      id="showcase"
      className="relative overflow-hidden bg-paper text-ink lg:h-screen dark:bg-ink dark:text-white"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[6%] top-[10%] h-[420px] w-[420px] rounded-full bg-violet/[0.14] blur-[120px]" />
        <div className="mesh-blob absolute right-[8%] bottom-[10%] h-[380px] w-[380px] rounded-full bg-brand-orange/[0.12] blur-[120px]" style={{ animationDelay: '2s' }} />
      </div>

      <motion.p
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={fadeUp}
        className="absolute left-6 top-10 z-10 font-serif text-base italic text-ink-soft sm:left-10 dark:text-white/50"
      >
        {d.showcase.eyebrow}
      </motion.p>

      <div
        ref={trackRef}
        style={{ '--track-w': `${panels.length * 100}vw` } as CSSProperties}
        className="relative flex h-full flex-col lg:w-[var(--track-w)] lg:flex-row"
      >
        {/* Spans the whole track (all panels), not any single one — moves in
            lockstep with the panels since it's a direct sibling inside the
            same translated track, and its stroke draws in sync via the same
            GSAP timeline that drives the panel slide. */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
          viewBox={`0 0 ${panels.length * 100} 100`}
          preserveAspectRatio="none"
        >
          <path
            ref={pathRef}
            d={buildSquigglePath(panels.length)}
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
            className="text-ink/15 dark:text-white/15"
          />
        </svg>

        {panels.map((panel, i) => (
          <div
            key={i}
            className="showcase-panel relative flex flex-shrink-0 flex-col justify-center px-6 py-20 sm:px-10 sm:py-24 lg:h-full lg:w-screen lg:px-20 lg:py-0"
          >
            <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={VP}
                variants={stagger()}
                className="relative"
              >
                <motion.h3
                  variants={fadeUp}
                  className={`text-balance font-serif text-[clamp(2.25rem,6vw,5rem)] font-medium leading-[1.02] tracking-tight ${ACCENTS[i % ACCENTS.length]}`}
                >
                  {panel.heading}
                </motion.h3>
                <motion.p variants={fadeUp} className="mt-5 max-w-md text-lg text-ink-soft dark:text-white/60">
                  {panel.sub}
                </motion.p>
              </motion.div>

              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={VP}
                variants={scaleIn}
                className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-ink/10 shadow-2xl shadow-ink/10 dark:border-white/10 dark:shadow-black/40"
              >
                <video
                  className="h-full w-full object-cover"
                  src={VIDEOS[i].src}
                  poster={VIDEOS[i].poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  aria-label={panel.heading}
                />
                <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
              </motion.div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
