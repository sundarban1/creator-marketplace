import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, CheckCircle2, Mic, Search, Sparkles } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useLenisScroll } from '../hooks/useLenis';

// Reuses three of Hero's avatar photos so "real people" imagery stays
// consistent across the page instead of introducing a fresh photo set here.
const MATCH_AVATARS = [
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
];

// How long one full loop (typed query -> checklist -> matches) stays on
// screen before the panels replay from the top — long enough to read all
// three stages once they've each finished revealing.
const CYCLE_MS = 6400;

function PanelCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full flex-1 rounded-3xl border border-ink/10 bg-paper-dim/60 p-5 shadow-[0_2px_10px_rgba(20,17,16,0.04)] dark:border-white/10 dark:bg-ink-elevated ${className}`}>
      {children}
    </div>
  );
}

export function AIDiscovery() {
  const { d } = useLandingLanguage();
  const { scrollTo } = useLenisScroll();
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { amount: 0.4 });
  const reducedMotion = useReducedMotion();
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!inView || reducedMotion || paused) return;
    const id = setInterval(() => setCycle((c) => c + 1), CYCLE_MS);
    return () => clearInterval(id);
  }, [inView, reducedMotion, paused]);

  // A stable `cycle` (0, and reduced-motion) still renders every panel fully
  // revealed rather than stuck mid-animation — TextReveal/stagger `eager`
  // variants resolve to their `show` state immediately when never re-keyed.
  const ai = d.aiDiscovery;
  const current = ai.queries[cycle % ai.queries.length]!;

  return (
    <section id={SECTION_IDS.aiDiscovery} className="relative overflow-hidden bg-paper py-24 dark:bg-ink">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[6%] top-0 h-[360px] w-[360px] rounded-full bg-violet/[0.1] blur-[110px]" />
        <div className="mesh-blob absolute right-[4%] bottom-0 h-[320px] w-[320px] rounded-full bg-brand-orange/[0.1] blur-[110px]" style={{ animationDelay: '2s' }} />
      </div>

      <div ref={sectionRef} className="mx-auto max-w-6xl px-6" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white/50">
            {ai.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={ai.heading}
            delay={0.1}
            className="mt-3 text-balance font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white"
          />
          <motion.p variants={fadeUp} className="mt-4 text-ink-soft dark:text-white/60">
            {ai.sub}
          </motion.p>
        </motion.div>

        <div className="mt-14 flex flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:gap-3">
          <PanelCard>
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft dark:text-white/50">
              <Search size={13} className="text-violet" />
              {ai.eyebrow}
            </span>
            <div key={`query-${cycle}`} className="mt-4 flex items-start gap-2 rounded-2xl border border-ink/10 bg-white px-4 py-3.5 dark:border-white/10 dark:bg-ink-elevated-2">
              <TextReveal
                as="p"
                eager
                text={current.text}
                stagger={0.025}
                className="flex-1 text-sm leading-relaxed text-ink dark:text-white"
              />
              <Mic size={14} className="mt-0.5 flex-shrink-0 text-ink-soft dark:text-white/40" />
            </div>
          </PanelCard>

          <ArrowRight aria-hidden size={20} className="mx-auto hidden flex-shrink-0 text-ink/20 lg:block dark:text-white/20" />

          <PanelCard>
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft dark:text-white/50">
              <Sparkles size={13} className="text-violet" />
              {ai.understandingLabel}
            </span>
            <motion.ul key={`checklist-${cycle}`} initial="hidden" animate="show" variants={stagger(0.15)} transition={{ delay: 1 }} className="mt-4 flex flex-col gap-2">
              {current.checklist.map((item) => (
                <motion.li
                  key={item}
                  variants={fadeUp}
                  className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-ink dark:bg-ink-elevated-2 dark:text-white"
                >
                  <CheckCircle2 size={14} className="flex-shrink-0 text-emerald-500" />
                  {item}
                </motion.li>
              ))}
            </motion.ul>
          </PanelCard>

          <ArrowRight aria-hidden size={20} className="mx-auto hidden flex-shrink-0 text-ink/20 lg:block dark:text-white/20" />

          <PanelCard className="flex flex-col items-center justify-center text-center">
            <motion.div key={`matches-${cycle}`} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.1, type: 'spring', stiffness: 240, damping: 18 }}>
              <span className="bg-gradient-to-br from-violet to-brand-orange bg-clip-text text-4xl font-bold text-transparent">{current.matches}</span>
              <p className="mt-1 text-xs font-semibold text-ink-soft dark:text-white/50">{ai.matchesLabel}</p>
              <div className="mt-4 flex items-center justify-center -space-x-2.5">
                {MATCH_AVATARS.map((src) => (
                  <img key={src} src={src} alt="" loading="lazy" className="h-8 w-8 flex-shrink-0 rounded-full border-2 border-paper-dim object-cover dark:border-ink-elevated" />
                ))}
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-paper-dim bg-ink/10 text-[10px] font-bold text-ink dark:border-ink-elevated dark:bg-white/10 dark:text-white">
                  +21
                </span>
              </div>
              <button
                onClick={() => scrollTo(`#${SECTION_IDS.finalCta}`)}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-violet to-brand-orange px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
              >
                {ai.viewMatches}
                <ArrowRight size={14} />
              </button>
            </motion.div>
          </PanelCard>
        </div>
      </div>
    </section>
  );
}
