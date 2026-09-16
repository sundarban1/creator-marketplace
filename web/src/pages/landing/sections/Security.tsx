import { useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, ClipboardList, Lock, ShieldAlert, Star, Wallet } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { StickyScrollCards } from '../components/StickyScrollCards';

// Positionally mapped to `security.points` in en.ts/ne.ts (Verified Profiles,
// Reviews & Ratings, Agreed Terms Both Sides, Secure Escrow Payments, Secure
// Communication, Report & Safety).
const ICONS = [BadgeCheck, Star, ClipboardList, Wallet, Lock, ShieldAlert];

// One photo per point, picked for what it's literally about rather than
// reused from elsewhere on the page (Showcase/Hero/KolabWay each have their
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

export function Security() {
  const { d } = useLandingLanguage();
  const [active, setActive] = useState(0);
  const points = d.security.points;

  const cards = points.map((point, i) => {
    const Icon = ICONS[i] ?? BadgeCheck;
    const reversed = i % 2 === 1;
    return (
      <div
        key={point.title}
        className={`flex flex-col overflow-hidden rounded-[2rem] border border-ink/10 bg-paper-dim/80 shadow-[0_20px_60px_-30px_rgba(20,17,16,0.35)] sm:flex-row sm:min-h-[60vh] dark:border-white/10 dark:bg-ink-elevated ${
          reversed ? 'sm:flex-row-reverse' : ''
        }`}
      >
        <div className="relative h-48 w-full flex-shrink-0 sm:h-auto sm:w-2/5">
          <img
            src={PHOTOS[i]}
            alt=""
            loading={i < 2 ? 'eager' : 'lazy'}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-1 flex-col justify-center p-8 sm:p-10">
          <div className="flex items-center justify-between">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet to-brand-orange text-white shadow-[0_8px_20px_-8px_rgba(123,92,245,0.55)]">
              <Icon size={20} />
            </span>
            <span className="font-mono text-xs tracking-[0.3em] text-ink/25 dark:text-white/25">
              {String(i + 1).padStart(2, '0')} / {String(points.length).padStart(2, '0')}
            </span>
          </div>
          <h3 className="mt-6 text-balance font-serif text-2xl font-medium leading-snug text-ink sm:text-3xl dark:text-white">
            {point.title}
          </h3>
          <p className="mt-3 text-base leading-relaxed text-ink-soft dark:text-white">{point.desc}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft/80 dark:text-white/70">{point.detail}</p>
        </div>
      </div>
    );
  });

  return (
    <section id={SECTION_IDS.security} className="relative overflow-hidden bg-white py-24 dark:bg-ink">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute right-[8%] top-[10%] h-[280px] w-[280px] rounded-full bg-violet/[0.05] blur-[110px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white">
            {d.security.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={d.security.heading}
            delay={0.1}
            className="mt-3 text-balance font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white"
          />
          <motion.p variants={fadeUp} className="mt-4 text-ink-soft dark:text-white">
            {d.security.sub}
          </motion.p>
        </motion.div>
      </div>

      <StickyScrollCards
        cards={cards}
        cardWidthClassName="max-w-4xl"
        viewportsPerCard={1.6}
        onActiveChange={setActive}
        rail={
          <div aria-hidden className="pointer-events-none absolute right-8 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
            {points.map((point, i) => (
              <span
                key={point.title}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  i === active ? 'h-6 bg-gradient-to-b from-violet to-brand-orange' : 'bg-ink/15 dark:bg-white/15'
                }`}
              />
            ))}
          </div>
        }
      />
    </section>
  );
}
