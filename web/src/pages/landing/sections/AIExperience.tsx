import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useReducedMotion } from '../hooks/useReducedMotion';

const PROMPT = 'Promote my new coffee shop this weekend.';
const FIELDS: { label: string; value: string }[] = [
  { label: 'Objective', value: 'Drive weekend foot traffic & brand awareness' },
  { label: 'Budget', value: 'Rs. 8,000 – 15,000' },
  { label: 'Deliverables', value: '2 Reels + 3 Stories' },
  { label: 'Timeline', value: '5-day campaign window' },
  { label: 'Platforms', value: 'Instagram, TikTok' },
];

function useTypewriter(fullText: string, active: boolean, speed = 28) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!active) return;
    setText('');
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setText(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [active, fullText, speed]);
  return text;
}

export function AIExperience() {
  const reducedMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [fieldCount, setFieldCount] = useState(reducedMotion ? FIELDS.length : 0);

  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setStarted(true); observer.disconnect(); }
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  const promptText = useTypewriter(PROMPT, started, 32);

  useEffect(() => {
    if (!started || reducedMotion) return;
    if (promptText !== PROMPT) return;
    const id = setInterval(() => {
      setFieldCount((n) => {
        if (n >= FIELDS.length) { clearInterval(id); return n; }
        return n + 1;
      });
    }, 550);
    return () => clearInterval(id);
  }, [started, promptText, reducedMotion]);

  return (
    <section id={SECTION_IDS.ai} className="py-24 overflow-hidden" style={{ background: 'linear-gradient(150deg, #0B0B1F 0%, #151537 55%, #3730A3 100%)' }}>
      <div className="max-w-5xl mx-auto px-5 grid md:grid-cols-2 gap-14 items-center">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
          <motion.span variants={fadeUp} className="text-orange-300 font-bold text-xs uppercase tracking-widest">AI Experience</motion.span>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-extrabold text-white mt-3 mb-5">Describe it. AI builds it.</motion.h2>
          <motion.p variants={fadeUp} className="text-white/55 text-base leading-relaxed max-w-md">
            Brands don't need a marketing team to launch a great campaign. Type one sentence, and Kolab's AI drafts the objective, budget, deliverables, timeline, and platform mix — ready to publish or fine-tune.
          </motion.p>
        </motion.div>

        <div ref={ref} className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-indigo to-orange-400 flex items-center justify-center">
              <Sparkles size={13} className="text-white" />
            </div>
            <span className="text-white/70 text-xs font-semibold">Kolab AI Campaign Generator</span>
          </div>

          <div className="bg-brand-indigo/25 border border-brand-indigo/30 rounded-2xl px-4 py-3 mb-4 min-h-[44px]">
            <span className="text-white text-sm">{promptText}</span>
            {promptText.length < PROMPT.length && <span className="inline-block w-1.5 h-4 bg-white/70 ml-0.5 align-middle animate-pulse" />}
          </div>

          <div className="flex flex-col gap-3">
            {FIELDS.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: i < fieldCount ? 1 : 0, y: i < fieldCount ? 0 : 8 }}
                transition={{ duration: 0.4 }}
                className="bg-white/[0.05] rounded-xl px-4 py-2.5"
              >
                <div className="text-orange-300 text-[10px] font-bold uppercase tracking-wide mb-0.5">{f.label}</div>
                <div className="text-white/85 text-sm">{f.value}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
