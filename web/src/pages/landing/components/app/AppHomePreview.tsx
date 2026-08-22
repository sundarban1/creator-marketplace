import { motion } from 'framer-motion';
import {
  Bell,
  Briefcase,
  Building2,
  ChevronRight,
  ClipboardList,
  Compass,
  MapPin,
  Search,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLandingLanguage } from '../../context/LanguageContext';
import { QUICK_ACTION_COLORS, type QuickActionColor } from './AppUI';

/* A screen-accurate replica of the app's creator home
   (mobile/src/app/(creator)/(tabs)/index.tsx) in a phone frame — the header
   with greeting + location + notification bell + avatar, the read-only search
   row, the amber attention banner, the gradient CTA card, the five
   quick-action tiles and the recommended rail, in that exact order and with
   the app's own spacing rhythm (a tight cluster up top, a wide step down to
   the feed). Everything else on this landing page is styled after these
   blocks, so showing the original once, up front, is what makes the rest of
   the page read as the product rather than as decoration. */

// Positionally paired with `appPreview.quickActions` in en.ts / ne.ts, and
// carrying the app's own five quick-action colors.
const QUICK_ACTIONS: { icon: LucideIcon; color: QuickActionColor }[] = [
  { icon: Briefcase, color: 'purple' },
  { icon: ClipboardList, color: 'amber' },
  { icon: Compass, color: 'blue' },
  { icon: Building2, color: 'teal' },
  { icon: Users, color: 'pink' },
];

const CARD_PHOTOS = ['/landing/opportunitites.jpeg', '/landing/photographer.jpeg'];

function MiniCard({
  title,
  budget,
  brand,
  category,
  photo,
  isNew,
  applyLabel,
}: {
  title: string;
  budget: string;
  brand: string;
  category: string;
  photo: string;
  isNew?: boolean;
  applyLabel: string;
}) {
  return (
    <div className="w-[148px] flex-shrink-0 overflow-hidden rounded-app-lg border border-app-border bg-white shadow-app-card">
      <div className="relative h-[62px] w-full">
        <img src={photo} alt="" loading="lazy" className="h-full w-full object-cover" />
        <span aria-hidden className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/35 to-transparent" />
        <span className="absolute left-1.5 top-1.5 rounded-full bg-[rgba(17,24,39,0.55)] px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wider text-white">
          {category}
        </span>
        {isNew && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-[#064E3B] px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-wider text-white">
            New
          </span>
        )}
        <span className="absolute bottom-1.5 right-1.5 rounded-[6px] bg-[#EEF2FF] px-1.5 py-px text-[7px] font-bold text-app-primary">
          PAID
        </span>
      </div>
      <div className="p-2">
        <p className="truncate text-[10px] font-bold leading-[1.5] text-app-text">{title}</p>
        <p className="truncate text-[9px] font-bold leading-[1.5] text-app-text">{budget}</p>
        <p className="mt-0.5 truncate text-[8px] leading-[1.5] text-app-muted">{brand}</p>
        <span className="mt-1.5 flex h-[22px] items-center justify-center rounded-[6px] bg-app-primary text-[8px] font-bold text-white">
          {applyLabel}
        </span>
      </div>
    </div>
  );
}

export function AppHomePreview() {
  const { d } = useLandingLanguage();
  const p = d.appPreview;

  return (
    <div className="relative w-[300px] rounded-[44px] border-[10px] border-slate-900 bg-white shadow-app-floating dark:border-slate-700">
      {/* Notch */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-slate-900 dark:bg-slate-700"
      />
      <div className="h-[600px] overflow-hidden rounded-[34px] bg-white">
        {/* Header — pinned above the scroll area in the app, so pinned here too */}
        <div className="flex items-center gap-3 px-5 pb-4 pt-9">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold leading-[1.5] text-app-text">{p.greeting}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium leading-[1.5] text-app-muted">
              <MapPin size={9} />
              {p.location}
            </p>
          </div>
          <span className="relative text-app-text">
            <Bell size={18} />
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[8px] font-bold text-white">
              3
            </span>
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-app-primary-tint text-xs font-bold text-app-primary shadow-app-card">
            AG
          </span>
        </div>

        <div className="px-5">
          {/* Action zone — search / alert / CTA, clustered tight (the app's gap: md) */}
          <div className="flex flex-col gap-3">
            <div className="flex h-11 items-center gap-2 rounded-app-lg border-[1.5px] border-app-border bg-app-primary-tint px-3">
              <Search size={14} className="flex-shrink-0 text-app-muted" />
              <span className="truncate text-[11px] text-app-muted">{p.searchPlaceholder}</span>
            </div>

            <div className="flex items-center gap-2 rounded-app-md border border-[#FDE68A] bg-[#FFFBEB] p-2.5">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-app-md bg-[#FEF3C7] text-[#D97706]">
                <ClipboardList size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold leading-[1.5] text-[#92400E]">{p.attentionTitle}</span>
                <span className="block truncate text-[9px] leading-[1.5] text-[#B45309]">{p.attentionSub}</span>
              </span>
              <ChevronRight size={13} className="flex-shrink-0 text-[#D97706]" />
            </div>

            <div className="rounded-app-xl bg-[linear-gradient(135deg,#4F46E5_0%,#7C3AED_100%)] p-4 shadow-app-floating">
              <div className="flex items-center gap-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold leading-[1.5] text-white">{p.ctaTitle}</p>
                  <p className="mt-0.5 text-[10px] leading-[1.6] text-white/85">{p.ctaSub}</p>
                </div>
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
                  <Briefcase size={17} />
                </span>
              </div>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[10px] font-bold text-app-primary">
                {p.ctaBtn}
                <ChevronRight size={11} />
              </span>
            </div>
          </div>

          {/* Quick actions — a full step (the app's xxl) below the cluster above */}
          <div className="mt-7 flex items-start gap-1.5">
            {QUICK_ACTIONS.map(({ icon: Icon, color }, i) => {
              const { icon, bg } = QUICK_ACTION_COLORS[color];
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <span
                    style={{ backgroundColor: bg, color: icon }}
                    className="flex h-10 w-10 items-center justify-center rounded-app-md shadow-app-card"
                  >
                    <Icon size={15} strokeWidth={2.4} />
                  </span>
                  <span className="text-center text-[8px] font-medium leading-[1.5] text-app-text">
                    {p.quickActions[i]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Feed */}
          <div className="mt-7">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-app-text">{p.recommended}</p>
              <span className="text-[10px] font-semibold text-app-primary">{p.seeAll}</span>
            </div>
            <div className="mt-2.5 flex gap-2.5 overflow-hidden">
              {p.cards.map((c, i) => (
                <MiniCard
                  key={c.title}
                  title={c.title}
                  budget={c.budget}
                  brand={c.brand}
                  category={c.category}
                  photo={CARD_PHOTOS[i]!}
                  isNew={i === 0}
                  applyLabel={d.opportunityFeed.applyNow}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Screen label — states outright that this is the shipped UI rather
          than leaving a visitor to assume it is an illustration. */}
      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
        className="absolute -left-4 top-28 hidden rounded-full border border-app-border bg-white px-3 py-1.5 text-[11px] font-bold text-app-primary shadow-app-raised lg:block"
      >
        {p.label}
      </motion.span>
    </div>
  );
}
