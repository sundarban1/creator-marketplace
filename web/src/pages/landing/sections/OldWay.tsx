import { motion } from 'framer-motion';
import { Banknote, CalendarClock, MessageCircle, Pin, Table2 } from 'lucide-react';
import { VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { H2, KICKER, LEAD, band } from '../lib/surfaces';
import { useReducedMotion } from '../hooks/useReducedMotion';

type ClosingLine = { pre: string; highlight: string; post: string };

// Renders a closing line with its key word (conversations/manual/uncertainty)
// bumped up a size and picked out in the brand gradient, so the three lines
// read as an escalating drumbeat rather than one flat block of text.
function HighlightLine({ line, className = '' }: { line: ClosingLine; className?: string }) {
  return (
    <p className={`lp-display text-2xl text-lp-fg sm:text-3xl ${className}`}>
      {line.pre}
      <span className="lp-gradient-text">
        {line.highlight}
      </span>
      {line.post}
    </p>
  );
}

// Scatter geometry for the desktop "messy canvas" — purely presentational
// (position/rotation), zipped by index with the six `oldWay.messages` chat
// bubbles from i18n. Kept separate from copy so translators never need to
// touch layout.
// Loose 3-column x 4-row grid (each cell ~33% wide, well clear of a 224px
// card) so scattered items never collide, however the jitter rotation lands.
const MESSAGE_LAYOUT = [
  { top: '2%', left: '2%', rotate: -4 },
  { top: '28%', left: '4%', rotate: 3 },
  { top: '2%', left: '72%', rotate: -2 },
  { top: '52%', left: '2%', rotate: 2 },
  { top: '76%', left: '39%', rotate: -3 },
  { top: '38%', left: '37%', rotate: 4 },
] as const;

function ClutterCard({
  top,
  left,
  rotate,
  delay,
  reducedMotion,
  className = '',
  children,
}: {
  top: string;
  left: string;
  rotate: number;
  delay: number;
  reducedMotion: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1, x: 0, y: 0, rotate } : { opacity: 0, x: 0, y: 24, rotate: rotate * 2.5 }}
      whileInView={{ opacity: 1, x: 0, y: 0, rotate }}
      viewport={VP}
      transition={{ duration: 0.5, delay: reducedMotion ? 0 : delay, ease: [0.16, 1, 0.3, 1] }}
      style={{ top, left }}
      className={`absolute w-56 ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function OldWay() {
  const { d } = useLandingLanguage();
  const reducedMotion = useReducedMotion();
  const o = d.oldWay;

  return (
    <section
      id={SECTION_IDS.oldWay}
      className={`${band('navy')} overflow-hidden pb-28 pt-12`}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[20%] h-[420px] w-[420px] rounded-full bg-lp-brinjal/20 blur-[130px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className={`${KICKER} text-lp-accent-ink`}>{o.eyebrow}</p>
          <TextReveal as="h2" text={o.heading} delay={0.1} className={`${H2} mt-4 text-lp-fg`} />
          <p className="mt-4 text-lg font-medium text-lp-fg/90">{o.problemIntro}</p>
          <p className={`${LEAD} mx-auto mt-2 max-w-xl text-lp-fg/65`}>{o.sub}</p>
        </div>

        {/* Mobile / tablet — simple stacked clutter, no absolute scatter. */}
        <div className="mt-12 flex flex-col gap-3 lg:hidden">
          {o.messages.map((msg, i) => (
            <motion.div
              key={msg}
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VP}
              transition={{ delay: reducedMotion ? 0 : i * 0.08, duration: 0.4 }}
              className="flex items-center gap-2 rounded-2xl lp-glass text-lp-fg px-4 py-3 text-sm"
            >
              <MessageCircle size={14} className="flex-shrink-0 text-lp-fg/55" />
              {msg}
            </motion.div>
          ))}
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VP}
            transition={{ delay: reducedMotion ? 0 : 0.5, duration: 0.4 }}
            className="flex items-center gap-2 rounded-2xl lp-glass text-lp-fg px-4 py-3 text-sm"
          >
            <CalendarClock size={14} className="flex-shrink-0 text-lp-accent-ink" />
            {o.calendarText}
          </motion.div>
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VP}
            transition={{ delay: reducedMotion ? 0 : 0.58, duration: 0.4 }}
            className="flex items-center gap-2 rounded-2xl lp-glass text-lp-fg px-4 py-3 text-sm"
          >
            <Table2 size={14} className="flex-shrink-0 text-lp-fg/55" />
            {o.spreadsheetText}
          </motion.div>
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VP}
            transition={{ delay: reducedMotion ? 0 : 0.66, duration: 0.4 }}
            className="flex items-center gap-2 rounded-2xl lp-glass text-lp-fg px-4 py-3 text-sm"
          >
            <Banknote size={14} className="flex-shrink-0 text-emerald-700 dark:text-emerald-300" />
            {o.paymentText}
          </motion.div>
        </div>

        {/* Desktop — scattered "messy canvas". */}
        <div className="relative mt-14 hidden h-[420px] lg:block">
          {o.messages.map((msg, i) => {
            const layout = MESSAGE_LAYOUT[i]!;
            return (
              <ClutterCard key={msg} {...layout} delay={i * 0.12} reducedMotion={reducedMotion}>
                <div className="flex items-start gap-2 rounded-2xl rounded-tl-md lp-glass text-lp-fg px-4 py-2.5 text-sm shadow-[0_20px_40px_-24px_rgba(0,0,0,0.8)]">
                  <MessageCircle size={13} className="mt-0.5 flex-shrink-0 text-lp-fg/55" />
                  {msg}
                </div>
              </ClutterCard>
            );
          })}

          <ClutterCard top="28%" left="72%" rotate={-6} delay={0.7} reducedMotion={reducedMotion}>
            <div className="rounded-xl border border-lp-orange/30 bg-lp-orange/10 px-4 py-3 backdrop-blur">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-lp-fg/55">
                <Pin size={11} />
                {o.noteLabel}
              </span>
              <p className="mt-1.5 text-xs font-medium text-lp-fg">{o.noteText}</p>
            </div>
          </ClutterCard>

          <ClutterCard top="76%" left="2%" rotate={3} delay={0.82} reducedMotion={reducedMotion}>
            <div className="flex items-center gap-2 rounded-xl lp-glass text-lp-fg px-3.5 py-2.5">
              <CalendarClock size={14} className="flex-shrink-0 text-lp-accent-ink" />
              <div>
                <p className="text-[10px] font-bold text-lp-fg/55">{o.calendarLabel}</p>
                <p className="text-xs font-semibold text-lp-fg">{o.calendarText}</p>
              </div>
            </div>
          </ClutterCard>

          <ClutterCard top="52%" left="72%" rotate={-3} delay={0.94} reducedMotion={reducedMotion}>
            <div className="flex items-center gap-2 rounded-xl lp-glass text-lp-fg px-3.5 py-2.5">
              <Table2 size={14} className="flex-shrink-0 text-lp-fg/55" />
              <div>
                <p className="text-[10px] font-bold text-lp-fg/55">{o.spreadsheetLabel}</p>
                <p className="text-xs font-semibold text-lp-fg">{o.spreadsheetText}</p>
              </div>
            </div>
          </ClutterCard>

          <ClutterCard top="2%" left="39%" rotate={5} delay={1.06} reducedMotion={reducedMotion}>
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-2.5 backdrop-blur">
              <Banknote size={14} className="flex-shrink-0 text-emerald-700 dark:text-emerald-300" />
              <div>
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">{o.paymentLabel}</p>
                <p className="text-xs font-semibold text-lp-fg">{o.paymentText}</p>
              </div>
            </div>
          </ClutterCard>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VP}
          transition={{ delay: reducedMotion ? 0.1 : 1.3, duration: 0.6 }}
          className="relative z-10 mx-auto mt-14 max-w-lg text-center"
        >
          <HighlightLine line={o.closingLine1} />
          <HighlightLine line={o.closingLine2} className="mt-1" />
          <HighlightLine line={o.closingLine3} className="mt-1" />
        </motion.div>
      </div>
    </section>
  );
}
