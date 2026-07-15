import { motion } from 'framer-motion';
import { ShieldCheck, Wallet, BadgeCheck } from 'lucide-react';
import { fadeUp, stagger } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { AppStoreBadges } from '../components/AppStoreBadges';

export function Hero() {
  const { d } = useLandingLanguage();

  return (
    <section id={SECTION_IDS.hero} className="relative overflow-hidden bg-white pt-40 pb-28">
      {/* Soft gradient lighting */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/2 top-[-15%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-brand-indigo/10 blur-[110px]" />
        <div className="mesh-blob absolute right-[-10%] top-[20%] h-[380px] w-[380px] rounded-full bg-brand-orange/10 blur-[110px]" />
      </div>

      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <motion.div initial="hidden" animate="show" variants={stagger()}>
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-indigo/20 bg-brand-indigo/5 px-4 py-1.5 text-xs font-semibold text-brand-indigo"
          >
            {d.hero.eyebrow}
          </motion.span>

          <motion.h1
            variants={fadeUp}
            className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl md:text-6xl"
          >
            {d.hero.headline}{' '}
            <span className="bg-gradient-to-r from-brand-indigo to-brand-orange bg-clip-text text-transparent">
              {d.hero.headlineEmphasis}
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            {d.hero.sub}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-9">
            <AppStoreBadges />
          </motion.div>

          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-ink-soft">
            <span className="flex items-center gap-1.5"><BadgeCheck size={14} className="text-brand-indigo" /> Verified creators</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand-indigo" /> Escrow-protected payments</span>
            <span className="flex items-center gap-1.5"><Wallet size={14} className="text-brand-indigo" /> eSewa · Khalti · Fonepay</span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
