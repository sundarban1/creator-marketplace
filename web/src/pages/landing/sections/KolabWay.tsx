import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  FileVideo,
  MessageCircle,
  Mic,
  Search,
  Star,
  TrendingUp,
  UploadCloud,
} from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import type { LandingDict } from '../i18n/en';
import { TextReveal } from '../components/TextReveal';
import { useReducedMotion } from '../hooks/useReducedMotion';

type KolabWaySteps = LandingDict['kolabWay']['steps'];
type StepKey = keyof KolabWaySteps;

const STEP_ORDER: StepKey[] = ['discover', 'connect', 'collaborate', 'deliver', 'complete', 'grow'];
const STEP_ICONS = { discover: Search, connect: MessageCircle, collaborate: ClipboardList, deliver: UploadCloud, complete: CheckCircle2, grow: TrendingUp };
const CYCLE_MS = 5200;

const CREATOR_PHOTO = 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop';

function PanelCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full rounded-3xl border border-ink/10 bg-paper-dim/60 p-5 shadow-[0_2px_10px_rgba(20,17,16,0.04)] dark:border-white/10 dark:bg-ink-elevated ${className}`}>
      {children}
    </div>
  );
}

function StepContent({ stepKey, steps }: { stepKey: StepKey; steps: KolabWaySteps }) {
  if (stepKey === 'discover') {
    const s = steps.discover;
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <PanelCard>
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft dark:text-white">
            <Search size={13} className="text-violet" />
            {s.label}
          </span>
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-ink/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-ink-elevated-2">
            <p className="flex-1 text-sm leading-relaxed text-ink dark:text-white">{s.sampleQuery}</p>
            <Mic size={14} className="mt-0.5 flex-shrink-0 text-ink-soft dark:text-white" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {s.checklist.map((item) => (
              <span key={item} className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink dark:bg-ink-elevated-2 dark:text-white">
                <CheckCircle2 size={11} className="flex-shrink-0 text-emerald-500" />
                {item}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs font-semibold text-ink-soft dark:text-white">
            <span className="bg-gradient-to-br from-violet to-brand-orange bg-clip-text text-base font-bold text-transparent">{s.matches}</span> {s.matchesLabel}
          </p>
        </PanelCard>
        <PanelCard>
          <div className="flex items-center gap-3">
            <img src={CREATOR_PHOTO} alt="" loading="lazy" className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
            <div>
              <p className="flex items-center gap-1 text-sm font-bold text-ink dark:text-white">
                {s.creatorName}
                <BadgeCheck size={13} className="text-violet" />
              </p>
              <p className="text-xs text-ink-soft dark:text-white">{s.creatorRole} · {s.creatorLocation}</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {s.platforms.map((p) => (
              <span key={p.name} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-ink dark:bg-ink-elevated-2 dark:text-white">
                {p.name} · {p.value}
              </span>
            ))}
          </div>
          <button className="mt-4 w-full rounded-full bg-violet px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90">
            {s.viewProfile}
          </button>
        </PanelCard>
      </div>
    );
  }

  if (stepKey === 'connect') {
    const s = steps.connect;
    return (
      <PanelCard className="mx-auto max-w-md">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft dark:text-white">
          {s.campaignLabel}: <span className="text-ink dark:text-white">{s.campaignName}</span>
        </span>
        <div className="mt-4 flex flex-col gap-2.5">
          {s.messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.from === 'business'
                  ? 'ml-auto bg-gradient-to-br from-violet to-violet-dark text-white'
                  : 'bg-white text-ink dark:bg-ink-elevated-2 dark:text-white'
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>
      </PanelCard>
    );
  }

  if (stepKey === 'collaborate') {
    const s = steps.collaborate;
    return (
      <PanelCard className="mx-auto max-w-md">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft dark:text-white">{s.campaignName}</span>
        <div className="mt-4 grid grid-cols-2 gap-3.5">
          {s.fields.map((f) => (
            <div key={f.label} className="rounded-2xl bg-white px-3.5 py-2.5 dark:bg-ink-elevated-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-soft dark:text-white/60">{f.label}</p>
              <p className="mt-0.5 text-sm font-semibold text-ink dark:text-white">{f.value}</p>
            </div>
          ))}
        </div>
      </PanelCard>
    );
  }

  if (stepKey === 'deliver') {
    const s = steps.deliver;
    return (
      <PanelCard className="mx-auto max-w-md">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-violet dark:bg-ink-elevated-2">
            <FileVideo size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-ink dark:text-white">{s.fileName}</p>
            <p className="text-xs text-ink-soft dark:text-white">{s.fileType}</p>
          </div>
        </div>
        <div className="relative mt-5">
          <span aria-hidden className="absolute left-3 right-3 top-3 h-px bg-emerald-500/30" />
          <div className="relative flex items-start justify-between">
            {s.stages.map((stage) => (
              <div key={stage} className="flex flex-col items-center gap-1.5">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <CheckCircle2 size={12} />
                </span>
                <span className="text-center text-[10px] font-semibold text-ink-soft dark:text-white">{stage}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 text-xs text-ink-soft dark:text-white">
          {s.submittedLabel} · {s.submittedDate}
        </p>
      </PanelCard>
    );
  }

  if (stepKey === 'complete') {
    const s = steps.complete;
    return (
      <PanelCard className="mx-auto max-w-md text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 size={22} />
        </span>
        <h4 className="mt-3 text-base font-bold text-ink dark:text-white">{s.heading}</h4>
        <ul className="mx-auto mt-4 flex max-w-xs flex-col gap-2 text-left">
          {s.checklist.map((item) => (
            <li key={item} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-medium text-ink dark:bg-ink-elevated-2 dark:text-white">
              <CheckCircle2 size={13} className="flex-shrink-0 text-emerald-500" />
              {item}
            </li>
          ))}
        </ul>
      </PanelCard>
    );
  }

  const s = steps.grow;
  return (
    <PanelCard className="mx-auto max-w-md">
      <div className="flex items-center gap-3">
        <img src={CREATOR_PHOTO} alt="" loading="lazy" className="h-12 w-12 flex-shrink-0 rounded-full object-cover" />
        <div>
          <p className="text-sm font-bold text-ink dark:text-white">{s.creatorName}</p>
          <p className="flex items-center gap-1 text-xs text-ink-soft dark:text-white">
            {s.collaborationsCount}
            <span className="inline-flex items-center gap-0.5">
              <Star size={11} className="fill-brand-orange text-brand-orange" />
              {s.rating}
            </span>
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {s.history.map((h) => (
          <span key={h} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink dark:bg-ink-elevated-2 dark:text-white">
            {h}
          </span>
        ))}
      </div>
      <p className="mt-4 font-serif text-sm italic text-ink-soft dark:text-white">{s.closingLine}</p>
    </PanelCard>
  );
}

export function KolabWay() {
  const { d } = useLandingLanguage();
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { amount: 0.3 });
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const steps = d.kolabWay.steps;
  const activeKey = STEP_ORDER[activeIndex]!;

  useEffect(() => {
    if (!inView || reducedMotion || paused) return;
    const id = setInterval(() => setActiveIndex((i) => (i + 1) % STEP_ORDER.length), CYCLE_MS);
    return () => clearInterval(id);
  }, [inView, reducedMotion, paused]);

  return (
    <section id={SECTION_IDS.kolabWay} className="relative overflow-hidden bg-paper py-28 dark:bg-ink">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-[6%] top-0 h-[360px] w-[360px] rounded-full bg-violet/[0.1] blur-[110px]" />
        <div className="mesh-blob absolute right-[4%] bottom-0 h-[320px] w-[320px] rounded-full bg-brand-orange/[0.1] blur-[110px]" style={{ animationDelay: '2s' }} />
      </div>

      <div ref={sectionRef} className="mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white">
            {d.kolabWay.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={d.kolabWay.heading}
            delay={0.1}
            className="mt-3 text-balance font-serif text-3xl font-medium text-ink sm:text-4xl md:text-5xl dark:text-white"
          />
          <TextReveal
            as="p"
            text={d.kolabWay.headingAccent}
            delay={0.25}
            className="mt-2 text-balance font-serif text-xl italic text-violet sm:text-2xl md:text-3xl"
          />
        </motion.div>

        {/* Desktop — tabbed, auto-advancing single panel. */}
        <div
          className="mt-14 hidden lg:block"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-1">
            {STEP_ORDER.map((key, i) => {
              const Icon = STEP_ICONS[key];
              const active = key === activeKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className="flex flex-1 flex-col items-center gap-2 py-2"
                >
                  <span
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl transition-colors duration-300 ${
                      active ? 'bg-gradient-to-br from-violet to-brand-orange text-white shadow-[0_8px_20px_-8px_rgba(123,92,245,0.55)]' : 'bg-white text-ink-soft dark:bg-ink-elevated-2 dark:text-white/60'
                    }`}
                  >
                    <Icon size={16} />
                  </span>
                  <span className={`text-xs font-semibold transition-colors duration-300 ${active ? 'text-ink dark:text-white' : 'text-ink-soft dark:text-white/50'}`}>
                    {steps[key].label}
                  </span>
                </button>
              );
            })}
          </div>

          <motion.p
            key={`title-${activeKey}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-auto max-w-lg text-center text-sm font-medium text-ink-soft dark:text-white"
          >
            {steps[activeKey].title}
          </motion.p>

          <motion.div key={`panel-${activeKey}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="mt-6">
            <StepContent stepKey={activeKey} steps={steps} />
          </motion.div>
        </div>

        {/* Mobile / tablet — vertical timeline, every step visible at once. */}
        <div className="mt-14 flex flex-col gap-10 lg:hidden">
          {STEP_ORDER.map((key, i) => {
            const Icon = STEP_ICONS[key];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VP}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="relative pl-11"
              >
                {i < STEP_ORDER.length - 1 && (
                  <span aria-hidden className="absolute left-[19px] top-10 h-[calc(100%+1.5rem)] w-px bg-ink/10 dark:bg-white/10" />
                )}
                <span className="absolute left-0 top-0 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet to-brand-orange text-white shadow-[0_8px_20px_-8px_rgba(123,92,245,0.55)]">
                  <Icon size={16} />
                </span>
                <p className="pt-1.5 text-sm font-bold text-ink dark:text-white">{steps[key].label}</p>
                <p className="mt-0.5 text-xs text-ink-soft dark:text-white">{steps[key].title}</p>
                <div className="mt-4">
                  <StepContent stepKey={key} steps={steps} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
