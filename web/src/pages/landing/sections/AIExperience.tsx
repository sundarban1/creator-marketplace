import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useLandingLanguage } from '../context/LanguageContext';

const TYPE_SPEED = 75;
const REVEAL_DELAY = 350;
const FIELD_STAGGER = 320;
const DWELL_AFTER_COMPLETE = 2600;

export function AIExperience() {
  const { d } = useLandingLanguage();
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [pressed, setPressed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [fieldCount, setFieldCount] = useState(0);

  const prompts = d.ai.prompts;
  const templates = d.ai.templates;
  const activePrompt = prompts[promptIndex]!;
  const activeTemplate = templates[promptIndex]!;

  // Start the whole auto-cycle only once the section is actually visible.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || reducedMotion) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setStarted(true); observer.disconnect(); }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  // Type the active prompt char-by-char, then auto-press the button.
  useEffect(() => {
    if (!started || reducedMotion) return;
    setTypedText('');
    setRevealed(false);
    setFieldCount(0);
    setPressed(false);

    let i = 0;
    let pressTimeout: ReturnType<typeof setTimeout> | undefined;
    let revealTimeout: ReturnType<typeof setTimeout> | undefined;
    const typeInterval = setInterval(() => {
      i += 1;
      setTypedText(activePrompt.slice(0, i));
      if (i >= activePrompt.length) {
        clearInterval(typeInterval);
        pressTimeout = setTimeout(() => {
          setPressed(true);
          revealTimeout = setTimeout(() => setRevealed(true), 220);
        }, REVEAL_DELAY);
      }
    }, TYPE_SPEED);

    return () => {
      clearInterval(typeInterval);
      if (pressTimeout) clearTimeout(pressTimeout);
      if (revealTimeout) clearTimeout(revealTimeout);
    };
  }, [started, promptIndex, activePrompt, reducedMotion]);

  // Once revealed, stagger the fields in one at a time.
  useEffect(() => {
    if (!revealed || reducedMotion) return;
    const fieldInterval = setInterval(() => {
      setFieldCount((n) => {
        if (n >= 5) { clearInterval(fieldInterval); return n; }
        return n + 1;
      });
    }, FIELD_STAGGER);
    return () => clearInterval(fieldInterval);
  }, [revealed, reducedMotion]);

  // After the template is fully shown, dwell, then move to the next prompt (looping).
  useEffect(() => {
    if (!revealed || fieldCount < 5 || reducedMotion) return;
    const dwell = setTimeout(() => {
      setPromptIndex((i) => (i + 1) % prompts.length);
    }, DWELL_AFTER_COMPLETE);
    return () => clearTimeout(dwell);
  }, [revealed, fieldCount, reducedMotion, prompts.length]);

  const displayedPrompt = reducedMotion ? activePrompt : typedText;
  const showFields = reducedMotion || revealed;
  const displayedFieldCount = reducedMotion ? 5 : fieldCount;

  const fields = [
    { label: d.ai.fieldLabels.objective, value: activeTemplate.objective },
    { label: d.ai.fieldLabels.budget, value: activeTemplate.budget },
    { label: d.ai.fieldLabels.deliverables, value: activeTemplate.deliverables },
    { label: d.ai.fieldLabels.timeline, value: activeTemplate.timeline },
    { label: d.ai.fieldLabels.platforms, value: activeTemplate.platforms },
  ];

  return (
    <section ref={sectionRef} id={SECTION_IDS.ai} className="py-24 overflow-hidden" style={{ background: 'linear-gradient(150deg, #0B0B1F 0%, #151537 55%, #3730A3 100%)' }}>
      <div className="max-w-5xl mx-auto px-5">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="text-center mb-12 max-w-xl mx-auto">
          <motion.span variants={fadeUp} className="text-orange-300 font-bold text-xs uppercase tracking-widest">{d.ai.eyebrow}</motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-white mt-3 mb-4">{d.ai.heading}</motion.h2>
          <motion.p variants={fadeUp} className="text-white/55 text-base leading-relaxed">{d.ai.sub}</motion.p>
        </motion.div>

        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp} className="grid md:grid-cols-2 gap-5">
          {/* Left: generator input + prompt queue */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-indigo to-orange-400 flex items-center justify-center">
                <Sparkles size={13} className="text-white" />
              </div>
              <span className="text-white/70 text-xs font-semibold">{d.ai.generatorLabel}</span>
            </div>

            <div className="flex gap-2 mb-5">
              <div className="flex-1 min-w-0 bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white text-sm min-h-[46px] flex items-center">
                <span>{displayedPrompt}</span>
                {!reducedMotion && displayedPrompt.length < activePrompt.length && (
                  <span className="inline-block w-1.5 h-4 bg-white/70 ml-0.5 animate-pulse" />
                )}
              </div>
              <motion.div
                animate={pressed && !reducedMotion ? { scale: [1, 0.86, 1] } : {}}
                transition={{ duration: 0.3 }}
                className="flex-shrink-0 w-12 rounded-2xl bg-brand-indigo text-white flex items-center justify-center"
              >
                <ArrowRight size={18} />
              </motion.div>
            </div>

            <div className="flex flex-col gap-2">
              {prompts.map((p, i) => {
                const active = i === promptIndex;
                return (
                  <div
                    key={p}
                    className={`px-3.5 py-2.5 rounded-xl border text-[12px] leading-snug transition-colors ${
                      active
                        ? 'bg-brand-indigo/25 border-brand-indigo/50 text-white'
                        : 'bg-white/[0.02] border-white/10 text-white/45'
                    }`}
                  >
                    {p}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: generated template */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col">
            <div className="text-white/70 text-xs font-semibold mb-5">{d.ai.templateLabel}</div>
            {!showFields ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/40 py-10">
                <Loader2 size={22} className="animate-spin" />
                <span className="text-sm">{d.ai.generatingLabel}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {fields.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: i < displayedFieldCount ? 1 : 0, y: i < displayedFieldCount ? 0 : 8 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white/[0.05] rounded-xl px-4 py-2.5"
                  >
                    <div className="text-orange-300 text-[10px] font-bold uppercase tracking-wide mb-0.5">{f.label}</div>
                    <div className="text-white/85 text-sm">{f.value}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
