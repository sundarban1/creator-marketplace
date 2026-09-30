import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import { fadeUp } from '../lib/motion';

// Shared bits of the two audience cards (CreatorStory / BusinessStory).
// `accent` follows the app's role colours: brinjal for creators, green for
// businesses.
type Accent = 'brinjal' | 'green';

const ACCENT = {
  brinjal: { text: 'text-lp-brinjal dark:text-[#A5B4FC]', chip: 'bg-lp-brinjal-tint text-lp-brinjal' },
  green: { text: 'text-lp-green dark:text-[#86EFAC]', chip: 'bg-lp-green-tint text-lp-green' },
} as const;

export function AudienceTag({ label, icon, accent }: { label: string; icon: React.ReactNode; accent: Accent }) {
  return (
    <motion.span variants={fadeUp} className={`inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] ${ACCENT[accent].text}`}>
      <span className={`flex h-7 w-7 items-center justify-center rounded-full ${ACCENT[accent].chip}`}>{icon}</span>
      {label}
    </motion.span>
  );
}

/** Numbered steps; each step's description lives in an info tooltip shown on
 * hover, keyboard focus or tap (focus), so the list stays a compact scan of
 * titles. */
export function AudienceSteps({ steps, accent }: { steps: readonly { title: string; desc: string }[]; accent: Accent }) {
  return (
    <motion.ol variants={fadeUp} className="mt-8 grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {steps.map((step, i) => (
        <li key={i} className="flex items-center gap-3">
          <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${ACCENT[accent].chip}`}>
            {i + 1}
          </span>
          <span className="group relative">
            <button
              type="button"
              aria-describedby={`step-${accent}-${i}`}
              className="inline cursor-help rounded-md text-left text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-lp-brinjal/40"
            >
              {step.title}
              <Info size={13} className={`ml-1.5 inline-block align-[-2px] opacity-60 transition-opacity group-hover:opacity-100 ${ACCENT[accent].text}`} />
            </button>
            <span
              id={`step-${accent}-${i}`}
              role="tooltip"
              className="pointer-events-none invisible absolute left-0 top-full z-30 mt-2 w-60 translate-y-1 rounded-xl bg-white px-3.5 py-2.5 text-[13px] font-normal leading-relaxed text-lp-black/75 opacity-0 shadow-[0_18px_40px_-18px_rgba(10,16,51,0.45)] ring-1 ring-lp-black/[0.06] transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
            >
              <span aria-hidden className="absolute -top-1.5 left-4 h-3 w-3 rotate-45 bg-white ring-1 ring-lp-black/[0.06] [clip-path:polygon(0_0,100%_0,0_100%)]" />
              {step.desc}
            </span>
          </span>
        </li>
      ))}
    </motion.ol>
  );
}
