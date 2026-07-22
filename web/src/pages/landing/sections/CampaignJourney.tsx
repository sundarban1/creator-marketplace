import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  FaHandshake, FaCreditCard, FaBell, FaBolt, FaCloudArrowUp,
  FaMagnifyingGlass, FaSackDollar, FaCheck,
} from 'react-icons/fa6';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';

const ICONS = [FaHandshake, FaCreditCard, FaBell, FaBolt, FaCloudArrowUp, FaMagnifyingGlass, FaSackDollar];

// One step is "live" for this long before the timeline advances — long enough
// to read the title + description, short enough that the loop stays engaging.
const STEP_MS = 2100;
// Extra beats the timeline holds on the fully-completed state before looping,
// so "payment released" doesn't flash by and reset immediately.
const HOLD_BEATS = 2;

type Role = 'brand' | 'creator' | 'system';

const ROLE_STYLE: Record<Role, string> = {
  brand: 'bg-brand-orange/10 text-brand-orange',
  creator: 'bg-violet/10 text-violet',
  system: 'bg-ink/[0.06] text-ink-soft',
};

type Status = 'pending' | 'current' | 'done';

function StepDot({ Icon, status }: { Icon: (typeof ICONS)[number]; status: Status }) {
  return (
    <span
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-500 ${
        status === 'done'
          ? 'border-transparent bg-emerald-500 text-white'
          : status === 'current'
            ? 'border-transparent bg-gradient-to-br from-violet to-violet-dark text-white shadow-[0_6px_16px_-4px_rgba(123,92,245,0.55)]'
            : 'border-ink/15 bg-white text-ink/25'
      }`}
    >
      {status === 'current' && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-violet/50"
          animate={{ scale: [1, 1.7], opacity: [0.55, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <AnimatePresence mode="wait" initial={false}>
        {status === 'done' ? (
          <motion.span key="check" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
            <FaCheck size={13} />
          </motion.span>
        ) : (
          <motion.span key="icon" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.25 }}>
            <Icon size={13} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

export function CampaignJourney() {
  const { d } = useLandingLanguage();
  const steps = d.journey.steps;
  const totalBeats = steps.length + HOLD_BEATS;

  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { amount: 0.5 });
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setBeat((b) => (b + 1) % totalBeats), STEP_MS);
    return () => clearInterval(id);
  }, [inView, totalBeats]);

  // -1 once the loop is holding on the "all done" beats — no step reads as current then.
  const activeIndex = beat < steps.length ? beat : -1;

  function statusOf(i: number): Status {
    if (activeIndex === -1) return 'done';
    if (i < activeIndex) return 'done';
    if (i === activeIndex) return 'current';
    return 'pending';
  }

  const barSegment = Math.min(beat, steps.length - 1);

  // Single continuous connector line under the dots — its fill grows one
  // segment at a time as steps complete, instead of animating each gap
  // between dots independently.
  const totalGaps = Math.max(steps.length - 1, 1);
  const filledGaps = activeIndex === -1 ? totalGaps : Math.min(activeIndex, totalGaps);
  const fillPercent = (filledGaps / totalGaps) * 100;
  const halfColumn = 50 / steps.length;

  return (
    <section id={SECTION_IDS.journey} className="relative overflow-hidden bg-white py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute right-[-10%] top-0 h-[380px] w-[380px] rounded-full bg-brand-orange/[0.1] blur-[110px]" />
        <div className="mesh-blob absolute left-[-8%] bottom-0 h-[320px] w-[320px] rounded-full bg-violet/[0.1] blur-[110px]" style={{ animationDelay: '2.4s' }} />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        {/* ── Copy ── */}
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft">
            {d.journey.eyebrow}
          </motion.p>
          <motion.h2 variants={fadeUp} className="text-balance mt-3 font-serif text-3xl font-medium text-ink sm:text-4xl">
            {d.journey.heading}
          </motion.h2>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap justify-center gap-3">
            {([
              ['creator', d.journey.legendCreator],
              ['brand', d.journey.legendBrand],
              ['system', d.journey.legendSystem],
            ] as [Role, string][]).map(([role, label]) => (
              <span key={role} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${ROLE_STYLE[role]}`}>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    role === 'brand' ? 'bg-brand-orange' : role === 'creator' ? 'bg-violet' : 'bg-ink-soft'
                  }`}
                />
                {label}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* ── Animated horizontal timeline card ── */}
        <motion.div ref={cardRef} initial="hidden" whileInView="show" viewport={VP} variants={fadeUp} className="mt-14">
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-[0_30px_60px_-24px_rgba(20,17,16,0.18)] sm:p-8">
            {/* Story-style progress bar mirroring the phone showcase up in Hero */}
            <div className="mb-6 flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-ink-soft">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                  animate={{ opacity: [1, 0.35, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                {d.journey.liveBadge}
              </span>
            </div>
            <div className="mb-10 flex gap-1.5">
              {steps.map((_, i) => (
                <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-ink/10">
                  {i === barSegment && activeIndex !== -1 && (
                    <motion.div
                      key={beat}
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: STEP_MS / 1000, ease: 'linear' }}
                      className="h-full bg-gradient-to-r from-violet to-brand-orange"
                    />
                  )}
                  {(i < barSegment || activeIndex === -1) && <div className="h-full w-full bg-emerald-500" />}
                </div>
              ))}
            </div>

            {/* Horizontal step flow — scrolls on narrow screens */}
            <div className="-mx-2 overflow-x-auto pb-1">
              <div className="relative min-w-[720px] px-2 sm:min-w-0">
                {/* Connector track, centered on the dots */}
                <div
                  aria-hidden
                  className="absolute top-[18px] h-[2px] overflow-hidden bg-ink/10"
                  style={{ left: `${halfColumn}%`, right: `${halfColumn}%` }}
                >
                  <motion.div
                    className="h-full origin-left bg-emerald-500"
                    initial={false}
                    animate={{ width: `${fillPercent}%` }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>

                <ol className="relative flex">
                  {steps.map((step, i) => {
                    const status = statusOf(i);
                    const role = step.role as Role;
                    return (
                      <li key={i} className="flex flex-1 flex-col items-center px-1.5 text-center">
                        <StepDot Icon={ICONS[i] ?? FaHandshake} status={status} />
                        <motion.div
                          animate={{ opacity: status === 'pending' ? 0.45 : 1 }}
                          transition={{ duration: 0.4 }}
                          className="mt-3"
                        >
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ROLE_STYLE[role]}`}>
                            {role === 'brand' ? d.journey.legendBrand : role === 'creator' ? d.journey.legendCreator : d.journey.legendSystem}
                          </span>
                          <h3 className={`mt-1.5 text-sm font-bold ${status === 'pending' ? 'text-ink/50' : 'text-ink'}`}>
                            {step.title}
                          </h3>
                        </motion.div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
