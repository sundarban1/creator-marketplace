import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, ClipboardList, Lock, ShieldAlert, Star, Wallet } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { H2, KICKER, LEAD, panel } from '../lib/surfaces';
import { ensureGsapRegistered, gsap } from '../lib/gsap';

// Positionally mapped to `security.points` in en.ts/ne.ts (Verified Profiles,
// Reviews & Ratings, Agreed Terms Both Sides, Secure Escrow Payments, Secure
// Communication, Report & Safety).
const ICONS = [BadgeCheck, Star, ClipboardList, Wallet, Lock, ShieldAlert];

// One photo per point, picked for what it's literally about rather than
// reused from elsewhere on the page (Showcase/Hero each have their
// own dedicated set too) — a verified headshot, a review rating, a signed
// handshake, Nepal's eSewa/connectIPS payment logos, a text conversation, a
// support headset.
const PHOTOS = [
  'https://images.pexels.com/photos/7216901/pexels-photo-7216901.jpeg?auto=compress&cs=tinysrgb&h=800&w=800&fit=crop',
  'https://images.pexels.com/photos/9821386/pexels-photo-9821386.jpeg?auto=compress&cs=tinysrgb&h=800&w=800&fit=crop',
  'https://images.pexels.com/photos/8112180/pexels-photo-8112180.jpeg?auto=compress&cs=tinysrgb&h=800&w=800&fit=crop',
  '/landing/escrow-payment-partners.png',
  'https://images.pexels.com/photos/5592313/pexels-photo-5592313.jpeg?auto=compress&cs=tinysrgb&h=800&w=800&fit=crop',
  'https://images.pexels.com/photos/7504886/pexels-photo-7504886.jpeg?auto=compress&cs=tinysrgb&h=800&w=800&fit=crop',
];

// One solid brand colour per card (inmark's audience-rail treatment): the
// brinjal / green / saffron families from the app palette, dark enough for
// white text, alternating so neighbouring cards never share a hue.
const CARD_TONES = ['bg-lp-brinjal-dark', 'bg-lp-green-dark', 'bg-[#9A3412]', 'bg-lp-brinjal', 'bg-[#166534]', 'bg-[#C2410C]'];

export function Security() {
  const { d } = useLandingLanguage();
  const points = d.security.points;
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Desktop: pin the stage for the rail's full travel and slide the track
  // right → left on a scrubbed tween (GSAP pin rather than CSS sticky — the
  // landing root's overflow-x-hidden breaks `position: sticky`, see
  // StickyScrollCards). Each card ends up where the first one started, so the
  // previous card peeks in on the left and the next on the right. Below lg or
  // under reduced motion nothing is pinned; the track is a native swipe rail.
  useEffect(() => {
    ensureGsapRegistered();
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const stage = stageRef.current;
      const track = trackRef.current;
      if (!stage || !track) return;
      const cards = gsap.utils.toArray<HTMLElement>('.sec-card', track);
      if (cards.length < 2) return;
      const distance = () => cards[cards.length - 1]!.offsetLeft - cards[0]!.offsetLeft;

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: stage,
          pin: true,
          start: 'top top',
          end: () => '+=' + distance(),
          scrub: 0.8,
          invalidateOnRefresh: true,
          snap: { snapTo: 1 / (cards.length - 1), duration: { min: 0.2, max: 0.5 }, ease: 'power1.inOut' },
        },
      });
      return () => {
        tween.scrollTrigger?.kill();
        tween.kill();
        gsap.set(track, { clearProps: 'all' });
      };
    });
    return () => mm.revert();
  }, [points.length]);

  return (
    <section id={SECTION_IDS.security} className={`${panel('mist')} overflow-hidden`}>
      <div ref={stageRef} className="relative flex flex-col justify-center pb-20 pt-24 lg:h-[100svh] lg:pb-10 lg:pt-28">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-5 text-center sm:px-8">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="max-w-xl">
            <motion.p variants={fadeUp} className={`${KICKER} text-lp-brinjal dark:text-[#A5B4FC]`}>
              {d.security.eyebrow}
            </motion.p>
            <TextReveal as="h2" text={d.security.heading} delay={0.1} className={`${H2} mt-4`} />
            <motion.p variants={fadeUp} className={`${LEAD} mt-4 text-lp-black/65 dark:text-white/65`}>
              {d.security.sub}
            </motion.p>
          </motion.div>
        </div>

        <div
          ref={trackRef}
          className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] sm:scroll-px-8 sm:px-8 lg:mt-12 lg:snap-none lg:gap-6 lg:overflow-visible lg:px-[max(2rem,calc((100vw-72rem)/2+2rem))] [&::-webkit-scrollbar]:hidden"
        >
          {points.map((point, i) => {
            const Icon = ICONS[i] ?? BadgeCheck;
            const isPng = PHOTOS[i]?.endsWith('.png');
            return (
              <article
                key={point.title}
                className={`sec-card relative flex w-[86vw] flex-shrink-0 snap-start flex-col overflow-hidden rounded-[28px] text-white sm:w-[70vw] lg:h-[min(520px,58vh)] lg:w-[min(1060px,78vw)] lg:flex-row lg:rounded-[36px] ${CARD_TONES[i % CARD_TONES.length]}`}
              >
                <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-[80px]" />
                <div className="relative flex flex-1 flex-col p-7 sm:p-10 lg:p-12">
                  <span className="flex items-center gap-3 text-[15px] font-medium">
                    <span className="flex h-8 min-w-11 items-center justify-center rounded-full border border-white/60 px-3 text-sm">{i + 1}</span>
                    <Icon size={18} className="text-white/85" />
                  </span>
                  <h3 className="lp-display mt-8 text-balance text-3xl text-white sm:text-[2.6rem]">{point.title}</h3>
                  <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/85">{point.desc}</p>
                  <p className="mt-3 max-w-md text-sm font-light leading-relaxed text-white/65">{point.detail}</p>
                  <span className="mt-auto pt-8 text-xs font-medium tracking-[0.14em] text-white/50">
                    {String(i + 1).padStart(2, '0')} / {String(points.length).padStart(2, '0')}
                  </span>
                </div>
                <div className="relative order-first h-48 flex-shrink-0 p-3 sm:h-60 lg:order-none lg:h-auto lg:w-[42%] lg:p-5">
                  <img
                    src={PHOTOS[i]}
                    alt={point.title}
                    loading={i < 2 ? 'eager' : 'lazy'}
                    className={`h-full w-full rounded-[20px] lg:rounded-[26px] ${isPng ? 'bg-white object-contain p-6' : 'object-cover'}`}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
