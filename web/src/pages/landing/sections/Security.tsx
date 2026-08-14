import { motion } from 'framer-motion';
import { FaFingerprint, FaLock, FaIdBadge, FaStar } from 'react-icons/fa6';
import { fadeUp, stagger, VP, CARD_HOVER, iconPop } from '../lib/motion';
import { useLandingLanguage } from '../context/LanguageContext';
import { useLandingTheme } from '../context/ThemeContext';
import { SectionWave } from '../components/SectionWave';
import { TextReveal } from '../components/TextReveal';

const ICONS = [FaFingerprint, FaLock, FaIdBadge, FaStar];

export function Security() {
  const { d } = useLandingLanguage();
  const { theme } = useLandingTheme();

  return (
    <section id="security" className="relative overflow-hidden bg-paper py-28 text-ink dark:bg-ink dark:text-white">
      <SectionWave fill={theme === 'dark' ? '#141110' : '#FBF9F5'} />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[-10%] top-1/4 h-[380px] w-[380px] rounded-full bg-violet/[0.12] blur-[110px]" />
        <div className="mesh-blob absolute right-[-8%] bottom-0 h-[300px] w-[300px] rounded-full bg-brand-orange/[0.1] blur-[110px]" style={{ animationDelay: '2s' }} />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mb-14 max-w-lg">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white/50">
            {d.security.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={d.security.heading}
            delay={0.1}
            className="text-balance mt-3 font-serif text-3xl font-medium md:text-4xl"
          />
          <motion.p variants={fadeUp} className="mt-4 text-ink-soft dark:text-white/60">
            {d.security.sub}
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger()}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {d.security.points.map((point, i) => {
            const Icon = ICONS[i] ?? FaFingerprint;
            const isViolet = i % 2 === 0;
            const accent = isViolet ? 'text-violet' : 'text-brand-orange';
            const glow = isViolet
              ? 'shadow-[0_6px_16px_-4px_rgba(123,92,245,0.4)]'
              : 'shadow-[0_6px_16px_-4px_rgba(249,115,22,0.4)]';
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={CARD_HOVER}
                className="shine-hover group rounded-2xl border border-ink/10 bg-ink/[0.03] p-5 backdrop-blur-sm transition-all duration-300 hover:border-ink/20 hover:bg-ink/[0.05] dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/25 dark:hover:bg-white/[0.07]"
              >
                <motion.span
                  variants={iconPop(0.1 + i * 0.05)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl bg-ink/8 dark:bg-white/10 ${accent} ${glow} transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon size={16} />
                </motion.span>
                <h3 className="mt-4 text-sm font-bold text-ink dark:text-white">{point.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft dark:text-white/50">{point.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
