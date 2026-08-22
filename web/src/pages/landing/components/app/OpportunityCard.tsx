import { motion } from 'framer-motion';
import { ArrowRight, Clock, Globe, MapPin, Navigation } from 'lucide-react';
import { fadeUp } from '../../lib/motion';

/* Web port of the app's CampaignCard
   (mobile/src/features/creator/components/CampaignCard.tsx) — same 264px
   width, same 112px image, same stack: category chip over the photo, a NEW
   badge or distance pill top-right, a paid/free tag bottom-right, then
   title / budget / brand · posted / a bordered detail row / the filled
   "Apply Now" button. The only additions are hover affordances, which a
   touch screen has no use for. */

export interface OpportunityCardData {
  title: string;
  budget: string;
  brand: string;
  postedAgo: string;
  category: string;
  location: string;
  /** REMOTE swaps the map pin for a globe, exactly as the app does. */
  remote?: boolean;
  /** Pre-formatted "3 days left" style label + the app's urgency color. */
  deadline: { label: string; tone: 'urgent' | 'soon' | 'calm' };
  type: 'paid' | 'free';
  photo: string;
  isNew?: boolean;
  /** Set instead of `isNew` for the nearby variant's distance pill. */
  distance?: string;
}

const DEADLINE_COLORS = {
  urgent: '#EF4444',
  soon: '#F97316',
  calm: '#6B7280',
} as const;

export function OpportunityCard({
  data,
  applyLabel,
  onApply,
}: {
  data: OpportunityCardData;
  applyLabel: string;
  onApply: () => void;
}) {
  const deadlineColor = DEADLINE_COLORS[data.deadline.tone];
  const LocationIcon = data.remote ? Globe : MapPin;

  return (
    <motion.article
      variants={fadeUp}
      className="group w-[264px] flex-shrink-0 overflow-hidden rounded-app-lg border border-app-border bg-white shadow-app-raised transition-transform duration-300 hover:-translate-y-1.5 dark:border-app-night-border dark:bg-app-night-raised"
    >
      <div className="relative h-28 w-full overflow-hidden bg-app-primary-tint dark:bg-app-primary/10">
        <img
          src={data.photo}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <span aria-hidden className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/35 to-transparent" />

        <span className="absolute left-3 top-3 rounded-full bg-[rgba(17,24,39,0.55)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-white">
          {data.category}
        </span>

        {data.distance ? (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[rgba(17,24,39,0.55)] px-2.5 py-1 text-[9px] font-semibold text-white">
            <Navigation size={9} className="fill-current" />
            {data.distance}
          </span>
        ) : (
          data.isNew && (
            <span className="absolute right-3 top-3 rounded-full bg-[#064E3B] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-white">
              NEW
            </span>
          )
        )}

        <span
          className={`absolute bottom-3 right-3 rounded-app-sm px-2 py-0.5 text-[10px] font-bold ${
            data.type === 'free' ? 'bg-[#F0FDF4] text-[#059669]' : 'bg-[#EEF2FF] text-app-primary'
          }`}
        >
          {data.type === 'free' ? 'FREE' : 'PAID'}
        </span>
      </div>

      <div className="p-3">
        <h4 className="truncate text-sm font-bold leading-[1.5] text-app-text dark:text-white">{data.title}</h4>
        <p className="mt-0.5 truncate text-[13px] font-bold leading-[1.5] text-app-text dark:text-white">{data.budget}</p>
        <p className="mt-1.5 truncate text-[11px] font-medium leading-[1.5] text-app-muted dark:text-white/55">
          {data.brand} · {data.postedAgo}
        </p>

        <div className="mt-2 flex items-center gap-2 border-t border-app-border pt-2 dark:border-app-night-border">
          <span className="flex min-w-0 flex-1 items-center gap-1 text-[11px] text-app-muted dark:text-white/55">
            <LocationIcon size={11} className="flex-shrink-0" />
            <span className="truncate">{data.location}</span>
          </span>
          <span className="flex flex-shrink-0 items-center gap-1 text-[11px]" style={{ color: deadlineColor }}>
            <Clock size={11} />
            {data.deadline.label}
          </span>
        </div>

        <button
          type="button"
          onClick={onApply}
          className="mt-2.5 flex h-[38px] w-full items-center justify-center gap-1.5 rounded-app-sm bg-app-primary text-xs font-bold text-white shadow-[0_5px_10px_-4px_rgba(79,70,229,0.7)] transition-colors hover:bg-app-primary-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary"
        >
          {applyLabel}
          <ArrowRight size={13} strokeWidth={2.5} />
        </button>
      </div>
    </motion.article>
  );
}
