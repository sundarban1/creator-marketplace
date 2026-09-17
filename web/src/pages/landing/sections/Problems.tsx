import { useState } from 'react';
import { motion } from 'framer-motion';
import { Banknote, CalendarClock, ClipboardX, MessagesSquare, UserSearch } from 'lucide-react';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { StackingCards } from '../components/StackingCards';
import { Card, CardHeader, CardContent } from '../components/ui/card';

// Positionally mapped to `problems.items` in en.ts/ne.ts (Finding the right
// creator, Scattered communication, Unclear expectations, Payment
// uncertainty, Manual coordination).
const ICONS = [UserSearch, MessagesSquare, ClipboardX, Banknote, CalendarClock];

// One photo per problem, in the same spirit as Security's "Built for better
// collaboration" cards (a real photo alongside the copy, not just an icon) —
// but leaning into the frustration each point describes: stressed phone
// search, an angry video call, head-in-hands confusion, a hand of Nepali
// rupee notes for payment uncertainty, and flying papers for coordination
// overwhelm.
const PHOTOS = [
  'https://images.pexels.com/photos/4333575/pexels-photo-4333575.jpeg?auto=compress&cs=tinysrgb&h=800&w=800&fit=crop',
  'https://images.pexels.com/photos/7927041/pexels-photo-7927041.jpeg?auto=compress&cs=tinysrgb&h=800&w=800&fit=crop',
  'https://images.pexels.com/photos/8560717/pexels-photo-8560717.jpeg?auto=compress&cs=tinysrgb&h=800&w=800&fit=crop',
  'https://images.pexels.com/photos/6085721/pexels-photo-6085721.jpeg?auto=compress&cs=tinysrgb&h=800&w=800&fit=crop',
  'https://images.pexels.com/photos/8468818/pexels-photo-8468818.jpeg?auto=compress&cs=tinysrgb&h=800&w=800&fit=crop',
];

export function Problems() {
  const { d } = useLandingLanguage();
  const [active, setActive] = useState(0);
  const items = d.problems.items;

  const cards = items.map((item, i) => {
    const Icon = ICONS[i] ?? UserSearch;
    const reversed = i % 2 === 1;
    return (
      // The outer motion.div only matters below `lg` (or under reduced
      // motion), where StackingCards never applies its own transform to
      // this node and this fadeUp is the entire reveal. On the pinned
      // desktop deck, StackingCards positions/scales the *parent*
      // `.stack-deck-card` wrapper instead, so this inner reveal settles
      // instantly and out of the way rather than fighting it for the same
      // transform.
      <motion.div key={item.title} initial="hidden" whileInView="show" viewport={VP} variants={fadeUp} className="px-6 lg:px-0">
        <Card
          className={`mx-auto flex max-w-3xl flex-col overflow-hidden sm:h-[420px] sm:flex-row ${
            reversed ? 'sm:flex-row-reverse' : ''
          }`}
        >
          <div className="relative h-44 w-full flex-shrink-0 sm:h-auto sm:w-2/5">
            <img src={PHOTOS[i]} alt="" loading={i < 2 ? 'eager' : 'lazy'} className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-1 flex-col justify-center p-8 sm:p-10">
            <CardHeader>
              <span className="stack-deck-icon flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet to-brand-orange text-white shadow-[0_8px_20px_-8px_rgba(123,92,245,0.55)]">
                <Icon size={20} />
              </span>
              <span className="font-mono text-xs tracking-[0.3em] text-ink/25 dark:text-white/25">
                {String(i + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
              </span>
            </CardHeader>
            <CardContent>
              <h3 className="mt-6 text-balance font-serif text-2xl font-medium leading-snug text-ink sm:text-3xl dark:text-white">
                {item.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-ink-soft dark:text-white">{item.desc}</p>
            </CardContent>
          </div>
        </Card>
      </motion.div>
    );
  });

  return (
    <section
      id={SECTION_IDS.problems}
      className="relative overflow-hidden border-t border-ink/[0.06] bg-paper-dim py-24 dark:border-white/[0.06] dark:bg-ink-elevated"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute right-[12%] top-[-6%] h-[300px] w-[300px] rounded-full bg-violet/[0.05] blur-[110px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white">
            {d.problems.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={d.problems.heading}
            delay={0.1}
            className="mt-3 text-balance font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white"
          />
          <TextReveal
            as="p"
            text={d.problems.headingAccent}
            delay={0.25}
            className="mt-2 text-balance font-serif text-xl italic text-ink-soft sm:text-2xl dark:text-white/70"
          />
        </motion.div>
      </div>

      <div className="mt-8 lg:mt-0">
        <StackingCards
          cards={cards}
          cardWidthClassName="max-w-3xl px-6"
          viewportsPerCard={1.1}
          onActiveChange={setActive}
          rail={
            <div className="pointer-events-none absolute right-8 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
              {items.map((item, i) => (
                <span
                  key={item.title}
                  className={`h-2 w-2 rounded-full transition-all duration-300 ${
                    i === active ? 'h-6 bg-gradient-to-b from-violet to-brand-orange' : 'bg-ink/15 dark:bg-white/15'
                  }`}
                />
              ))}
            </div>
          }
        />
      </div>
    </section>
  );
}
