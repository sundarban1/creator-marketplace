import { motion } from 'framer-motion';
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

export function AudienceSteps({ steps, accent }: { steps: readonly { title: string; desc: string }[]; accent: Accent }) {
  return (
    <motion.ol variants={fadeUp} className="mt-8 grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${ACCENT[accent].chip}`}>
            {i + 1}
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold">{step.title}</span>
            <span className="mt-0.5 text-[13px] font-light leading-relaxed text-lp-black/60 dark:text-white/60">{step.desc}</span>
          </span>
        </li>
      ))}
    </motion.ol>
  );
}
