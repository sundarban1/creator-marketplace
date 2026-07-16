import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { fadeUp, scaleIn, stagger } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { AppStoreBadges } from '../components/AppStoreBadges';
import { PhoneShowcase } from '../components/PhoneShowcase';
import { useLenisScroll } from '../hooks/useLenis';

export function Hero() {
  const { d } = useLandingLanguage();
  const { scrollTo } = useLenisScroll();

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
              {d.hero.headline}{' '}
              <em className="bg-gradient-to-r from-violet to-brand-orange bg-clip-text text-transparent not-italic">
                {d.hero.headlineEmphasis}
              </em>
            </motion.h1>

            <motion.p variants={fadeUp} className="mx-auto mt-8 max-w-lg text-lg leading-relaxed text-ink-soft lg:mx-0">
              {d.hero.sub}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex justify-center lg:justify-start">
              <AppStoreBadges />
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

        {/* Editorial rule + masthead-style credentials line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-20 border-t border-ink/10 pt-6"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs font-medium uppercase tracking-widest text-ink-soft">
            <span>Verified creators</span>
            <span className="text-ink/20">·</span>
            <span>Escrow-protected payments</span>
            <span className="text-ink/20">·</span>
            <span>eSewa &middot; Khalti &middot; Fonepay</span>
          </div>
        </motion.div>
      </div>

      <motion.button
        aria-label="Scroll to explore"
        onClick={() => scrollTo(`#${SECTION_IDS.trust}`)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 text-ink-soft/60 transition-colors hover:text-ink-soft sm:flex"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest">Scroll</span>
        <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}>
          <ChevronDown size={16} />
        </motion.span>
      </motion.button>
    </section>
  );
}
