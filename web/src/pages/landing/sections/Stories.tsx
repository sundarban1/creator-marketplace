import { motion } from 'framer-motion';
import { fadeUp, VP, CARD_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { useAutoScroll } from '../hooks/useAutoScroll';
import type { ApiSuccessStory } from '../../../lib/api';

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase();
}

type StoryItem = { quote: string; name: string; role: string; photoUrl?: string | null };

function StoryCard({ quote, name, role, photoUrl, i }: StoryItem & { i: number }) {
  return (
    <motion.figure
      whileHover={CARD_HOVER}
      className="flex w-[320px] flex-shrink-0 flex-col rounded-2xl border border-ink/10 bg-white p-7 shadow-[0_2px_10px_rgba(20,17,16,0.04)] transition-shadow duration-300 hover:shadow-[0_20px_40px_-14px_rgba(123,92,245,0.18)] sm:w-[380px]"
    >
      <div className={`mb-6 h-0.5 w-10 rounded-full bg-gradient-to-r ${i % 2 === 0 ? 'from-violet to-violet-dark' : 'from-brand-orange to-violet'}`} />
      <blockquote className="font-serif text-xl italic leading-snug text-ink sm:text-2xl">
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3 text-sm text-ink-soft">
        {photoUrl ? (
          <img src={photoUrl} alt={name} className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white ${i % 2 === 0 ? 'from-violet to-violet-dark' : 'from-brand-orange to-violet'}`}
          >
            {initials(name)}
          </span>
        )}
        <span>
          <span className="font-semibold text-ink">{name}</span> — {role}
        </span>
      </figcaption>
    </motion.figure>
  );
}

type PublicSuccessStory = Pick<ApiSuccessStory, 'id' | 'name' | 'role' | 'quote' | 'photoUrl'>;

interface StoriesProps {
  stories: PublicSuccessStory[] | null;
}

export function Stories({ stories }: StoriesProps) {
  const { d } = useLandingLanguage();
  const scrollRef = useAutoScroll<HTMLDivElement>(0.3);
  // null = not yet loaded / fetch failed → fall back to static copy.
  // A resolved empty array is genuine "no active stories" and renders empty.
  const items: StoryItem[] = stories !== null ? stories : d.stories.items;

  return (
    <section id={SECTION_IDS.stories} className="bg-paper py-28">
      <motion.p
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={fadeUp}
        className="mb-14 text-center font-serif text-base italic text-ink-soft"
      >
        {d.stories.eyebrow}
      </motion.p>

      <motion.div
        initial="hidden"
        whileInView="show"
        viewport={VP}
        variants={fadeUp}
        ref={scrollRef}
        className="scrollbar-hide flex gap-6 overflow-x-hidden px-6 [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      >
        {[items, items].map((group, gi) => (
          <div key={gi} aria-hidden={gi === 1} className="flex flex-shrink-0 gap-6">
            {group.map((item, i) => (
              <StoryCard key={i} {...item} i={i} />
            ))}
          </div>
        ))}
      </motion.div>
    </section>
  );
}
