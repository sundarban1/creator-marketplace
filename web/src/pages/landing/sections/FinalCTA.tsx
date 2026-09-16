import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Sparkles, Star } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { useLandingTheme } from '../context/ThemeContext';
import { AppStoreBadges } from '../components/AppStoreBadges';
import { SectionWave } from '../components/SectionWave';
import type { PublicCreatorLite, PublicBusinessLite } from '../../../lib/api';

type RoleKey = 'business' | 'creator';

// Stock-photo fallback for each avatar slot — used whenever real creator/
// business data isn't available yet (showcase fetch failed/still loading),
// same convention as the Hero's avatar stack.
const ROLE_SLOTS: { key: RoleKey; fallbackPhoto: string; badgeClass: string; wrapClassName: string; delay: number }[] = [
  {
    key: 'creator',
    fallbackPhoto: 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
    badgeClass: 'bg-violet',
    wrapClassName: '-translate-y-2',
    delay: 0.5,
  },
  {
    key: 'creator',
    fallbackPhoto: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
    badgeClass: 'bg-violet',
    wrapClassName: 'translate-y-3',
    delay: 0.62,
  },
  {
    key: 'business',
    fallbackPhoto: 'https://images.pexels.com/photos/3763188/pexels-photo-3763188.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&fit=crop',
    badgeClass: 'bg-brand-orange',
    wrapClassName: '-translate-y-1',
    delay: 0.74,
  },
];

interface Props {
  creators: PublicCreatorLite[] | null;
  businesses: PublicBusinessLite[] | null;
}

export function FinalCTA({ creators, businesses }: Props) {
  const { d } = useLandingLanguage();
  const { theme } = useLandingTheme();

  const realCreatorPhotos = (creators ?? []).map((c) => c.avatarUrl).filter((url): url is string => Boolean(url));
  const realBusinessPhotos = (businesses ?? []).map((b) => b.logoUrl).filter((url): url is string => Boolean(url));
  let creatorIdx = 0;
  const roleAvatars = ROLE_SLOTS.map((slot) => ({
    ...slot,
    photo: slot.key === 'business' ? (realBusinessPhotos[0] ?? slot.fallbackPhoto) : (realCreatorPhotos[creatorIdx++] ?? slot.fallbackPhoto),
  }));

  return (
    <section id={SECTION_IDS.finalCta} className="relative overflow-hidden bg-paper py-32 text-ink dark:bg-ink dark:text-white">
      <SectionWave fill={theme === 'dark' ? '#141110' : '#FBF9F5'} />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/4 top-0 h-[380px] w-[380px] rounded-full bg-violet/[0.18] blur-[110px]" />
        <div className="mesh-blob absolute bottom-0 right-1/4 h-[340px] w-[340px] rounded-full bg-brand-orange/[0.15] blur-[110px]" style={{ animationDelay: '2.5s' }} />
      </div>
      <div className="mx-auto max-w-3xl px-6 text-center">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.span
            variants={fadeUp}
            className="mx-auto block h-1 w-12 rounded-full bg-gradient-to-r from-violet to-brand-orange"
          />
          <motion.h2
            variants={fadeUp}
            className="text-balance mt-7 bg-gradient-to-br from-ink to-violet-dark bg-clip-text font-serif text-3xl font-medium leading-tight text-transparent sm:text-4xl md:text-5xl dark:from-white dark:to-white/70"
          >
            {d.finalCta.heading}
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-ink-soft dark:text-white">
            {d.finalCta.sub}
          </motion.p>

          <motion.div variants={fadeUp} className="mx-auto mt-10 flex items-center justify-center">
            {roleAvatars.map(({ key, photo, fallbackPhoto, badgeClass, wrapClassName, delay }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={VP}
                transition={{ delay, type: 'spring', stiffness: 240, damping: 18 }}
                style={{ zIndex: roleAvatars.length - i }}
                className={`relative ${i > 0 ? '-ml-2' : ''} ${wrapClassName}`}
              >
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = fallbackPhoto;
                  }}
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
            <Link
              to="/creators"
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-violet to-brand-orange px-7 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
            >
              <Sparkles size={14} />
              {d.hero.ctaBusiness}
            </Link>
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/20 px-7 py-3.5 text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/40 dark:border-white/20 dark:text-white dark:hover:border-white/40"
            >
              {d.hero.ctaCreator}
              <ArrowRight size={14} />
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-10 border-t border-ink/10 pt-8 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft dark:text-white">{d.footer.downloadApp}</p>
            <div className="mt-4 flex justify-center">
              <AppStoreBadges />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
