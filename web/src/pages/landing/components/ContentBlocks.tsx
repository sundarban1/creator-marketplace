import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { fadeUp, stagger, VP, CARD_HOVER } from '../lib/motion';

// Shared body building blocks for the SEO content pages (ContentPageLayout's
// children) — kept separate from ContentPageLayout itself so page authors
// only import what a given section actually needs.

export function ContentSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <motion.section initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
      <motion.h2 variants={fadeUp} className="font-serif text-2xl font-medium text-ink sm:text-3xl">{heading}</motion.h2>
      <motion.div variants={fadeUp} className="prose-content mt-4 max-w-2xl space-y-4 text-[15px] leading-relaxed text-ink-soft">
        {children}
      </motion.div>
    </motion.section>
  );
}

export interface BenefitItem {
  icon: LucideIcon;
  title: string;
  desc: string;
  accent?: 'violet' | 'orange';
}

// Same icon-badge-in-card treatment as the homepage's HowItWorks/Security
// sections (gradient badge, group-hover scale) so a benefit grid dropped
// into any content page reads as the same design system, not a bolted-on
// afterthought.
export function BenefitGrid({ items }: { items: BenefitItem[] }) {
  return (
    <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="grid gap-4 sm:grid-cols-2">
      {items.map((item, i) => {
        const accent = item.accent ?? (i % 2 === 0 ? 'violet' : 'orange');
        const badgeClass = accent === 'violet' ? 'bg-violet/10 text-violet' : 'bg-brand-orange/10 text-brand-orange';
        return (
          <motion.div
            key={i}
            variants={fadeUp}
            whileHover={CARD_HOVER}
            className="group rounded-2xl border border-ink/10 bg-white p-5 shadow-[0_2px_10px_rgba(20,17,16,0.04)] transition-shadow duration-300 hover:shadow-[0_16px_32px_-14px_rgba(20,17,16,0.12)]"
          >
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${badgeClass}`}>
              <item.icon size={18} />
            </span>
            <h3 className="mt-4 text-[15px] font-bold text-ink">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{item.desc}</p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

export function ContentList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-ink-soft">
          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gradient-to-br from-violet to-brand-orange" />
          {item}
        </li>
      ))}
    </ul>
  );
}
