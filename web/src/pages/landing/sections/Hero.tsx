import { motion } from 'framer-motion';
import { ShieldCheck, Wallet, BadgeCheck, Sparkles } from 'lucide-react';
import { fadeUp, stagger } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { AppStoreBadges } from '../components/AppStoreBadges';

export function Hero() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.hero} className="relative overflow-hidden bg-white pt-40 pb-28">
      {/* Decorative texture + gradient lighting */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="dot-grid absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black_10%,transparent_70%)]" />
        <div className="mesh-blob absolute left-1/2 top-[-15%] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-indigo/15 to-brand-orange/10 blur-[110px]" />
        <div className="mesh-blob absolute right-[-10%] top-[15%] h-[400px] w-[400px] rounded-full bg-brand-orange/10 blur-[110px]" />
        <div className="mesh-blob absolute left-[-8%] bottom-[-10%] h-[320px] w-[320px] rounded-full bg-brand-indigo/10 blur-[100px]" style={{ animationDelay: '3s' }} />
      </div>

      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <motion.div initial="hidden" animate="show" variants={stagger()}>
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-brand-indigo/20 bg-gradient-to-r from-brand-indigo/8 to-brand-orange/8 px-4 py-1.5 text-xs font-semibold text-brand-indigo shadow-[0_1px_2px_rgba(79,70,229,0.08)]"
          >
            <Sparkles size={12} className="text-brand-orange" />
            {d.hero.eyebrow}
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="text-balance mt-7 text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl md:text-6xl"
          >
            {d.hero.headline}{' '}
            <span className="relative inline-block bg-gradient-to-r from-brand-indigo via-brand-indigo to-brand-orange bg-clip-text text-transparent">
              {d.hero.headlineEmphasis}
              <svg
                aria-hidden
                viewBox="0 0 200 20"
                className="absolute -bottom-2 left-0 h-3 w-full text-brand-orange/50"
                preserveAspectRatio="none"
              >
                <path d="M2 15 Q 50 4, 100 12 T 198 10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-ink-soft">
            {d.hero.sub}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10">
            <AppStoreBadges />
          </motion.div>

          <motion.div variants={fadeUp} className="mt-12 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-ink-soft">
            <span className="flex items-center gap-1.5 rounded-full border border-ink/8 bg-white/80 px-3.5 py-2 shadow-sm backdrop-blur-sm">
              <BadgeCheck size={14} className="text-brand-indigo" /> Verified creators
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-ink/8 bg-white/80 px-3.5 py-2 shadow-sm backdrop-blur-sm">
              <ShieldCheck size={14} className="text-brand-indigo" /> Escrow-protected payments
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-ink/8 bg-white/80 px-3.5 py-2 shadow-sm backdrop-blur-sm">
              <Wallet size={14} className="text-brand-indigo" /> eSewa · Khalti · Fonepay
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
