import { motion } from 'framer-motion';
import { ArrowRight, Heart, Star } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { useLandingTheme } from '../context/ThemeContext';
import { AppStoreBadges } from '../components/AppStoreBadges';
import { ComingSoonBadge } from '../components/ComingSoonBadge';
import { SectionWave } from '../components/SectionWave';
import { useComingSoon } from '../hooks/useComingSoon';
import { useLenisScroll } from '../hooks/useLenis';

type RoleKey = 'designer' | 'business' | 'creator';

const ROLE_AVATARS: { key: RoleKey; photo: string; badgeClass: string; wrapClassName: string; delay: number }[] = [
  {
    key: 'designer',
    photo: 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
    badgeClass: 'bg-blue-500',
    wrapClassName: '-translate-y-2',
    delay: 0.5,
  },
  {
    key: 'business',
    photo: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
    badgeClass: 'bg-brand-orange',
    wrapClassName: 'translate-y-3',
    delay: 0.62,
  },
  {
    key: 'creator',
    photo: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
    badgeClass: 'bg-violet',
    wrapClassName: '-translate-y-1',
    delay: 0.74,
  },
];

export function FinalCTA() {
  const { d } = useLandingLanguage();
  const { theme } = useLandingTheme();
  const { scrollTo } = useLenisScroll();
  const comingSoon = useComingSoon();

  return (
    <section id={SECTION_IDS.finalCta} className="relative overflow-hidden bg-paper py-32 text-ink dark:bg-ink dark:text-white">
      <SectionWave fill={theme === 'dark' ? '#141110' : '#FBF9F5'} />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/4 top-0 h-[380px] w-[380px] rounded-full bg-violet/[0.18] blur-[110px]" />
        <div className="mesh-blob absolute bottom-0 right-1/4 h-[340px] w-[340px] rounded-full bg-brand-orange/[0.15] blur-[110px]" style={{ animationDelay: '2.5s' }} />
      </div>
      <div className="mx-auto max-w-2xl px-6 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.span
            variants={fadeUp}
            className="mx-auto block h-1 w-12 rounded-full bg-gradient-to-r from-violet to-brand-orange"
          />
          <motion.h2
            variants={fadeUp}
            className="text-balance mt-7 bg-gradient-to-br from-ink to-violet-dark bg-clip-text font-serif text-4xl font-medium text-transparent sm:text-5xl md:text-6xl dark:from-white dark:to-white/70"
          >
            {d.finalCta.heading}
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-ink-soft dark:text-white/70">
            {d.finalCta.sub}
          </motion.p>

          <motion.div variants={fadeUp} className="mx-auto mt-10 flex items-center justify-center">
            {ROLE_AVATARS.map(({ key, photo, badgeClass, wrapClassName, delay }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={VP}
                transition={{ delay, type: 'spring', stiffness: 240, damping: 18 }}
                style={{ zIndex: ROLE_AVATARS.length - i }}
                className={`relative ${i > 0 ? '-ml-2' : ''} ${wrapClassName}`}
              >
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  className="h-16 w-16 flex-shrink-0 rounded-full border-4 border-paper object-cover shadow-lg dark:border-ink"
                />
                <span
                  className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-md ${badgeClass}`}
                >
                  {d.finalCta.roles[key]}
                </span>
              </motion.div>
            ))}
            <motion.span
              initial={{ opacity: 0, scale: 0.4, rotate: -10 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={VP}
              transition={{ delay: 0.85, type: 'spring', stiffness: 260, damping: 16 }}
              className="ml-3 -translate-y-4 text-brand-orange"
            >
              <Star size={18} className="fill-brand-orange" />
            </motion.span>
            <motion.span
              initial={{ opacity: 0, scale: 0.4, rotate: 10 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              viewport={VP}
              transition={{ delay: 0.95, type: 'spring', stiffness: 260, damping: 16 }}
              className="-ml-1 translate-y-3 text-rose-500"
            >
              <Heart size={16} className="fill-rose-500" />
            </motion.span>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => scrollTo('#final-cta-download')}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-violet to-brand-orange px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
            >
              {d.finalCta.ctaGetStarted}
              <ArrowRight size={14} />
            </button>
            <button
              onClick={() => document.getElementById(SECTION_IDS.possibilities)?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 px-7 py-3.5 text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/40 dark:border-white/20 dark:text-white dark:hover:border-white/40"
            >
              {d.finalCta.ctaExplore}
            </button>
          </motion.div>

          <motion.div id="final-cta-download" variants={fadeUp} className="mt-8">
            {comingSoon ? <ComingSoonBadge /> : <AppStoreBadges />}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
