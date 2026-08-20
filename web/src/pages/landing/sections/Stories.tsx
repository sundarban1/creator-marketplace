import { motion } from 'framer-motion';
import { Quote } from 'lucide-react';
import { fadeUp, stagger, VP, CARD_HOVER } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import type { ApiSuccessStory } from '../../../lib/api';

type StoryItem = { quote: string; name: string; role: string; photoUrl?: string | null };
type PublicSuccessStory = Pick<ApiSuccessStory, 'id' | 'name' | 'role' | 'quote' | 'photoUrl'>;

interface StoriesProps {
  stories: PublicSuccessStory[] | null;
}

// Same "colored initials" fallback used by AnimatedTestimonials, kept local
// here since this grid no longer renders through that carousel component.
const PLACEHOLDER_BG = ['bg-violet', 'bg-brand-orange', 'bg-emerald-500', 'bg-blue-500', 'bg-rose-500', 'bg-amber-500'];

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export function Stories({ stories }: StoriesProps) {
  const { d } = useLandingLanguage();
  // null = not yet loaded / fetch failed → fall back to static copy.
  // A resolved empty array is genuine "no active stories" and renders nothing.
  const items: StoryItem[] = stories !== null ? stories : d.stories.items;
  if (items.length === 0) return null;
  const visible = items.slice(0, 3);

  return (
    <section id={SECTION_IDS.stories} className="bg-paper py-24 dark:bg-ink">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white/50">
            {d.stories.eyebrow}
          </motion.p>
          <TextReveal
            as="h2"
            text={d.stories.heading}
            delay={0.1}
            className="mt-3 text-balance font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white"
          />
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={VP}
          variants={stagger(0.12)}
          className={`mx-auto mt-14 grid gap-5 ${
            visible.length === 1 ? 'max-w-md' : visible.length === 2 ? 'max-w-3xl md:grid-cols-2' : 'md:grid-cols-3'
          }`}
        >
          {visible.map((item, i) => (
            <motion.div
              key={`${item.name}-${i}`}
              variants={fadeUp}
              whileHover={CARD_HOVER}
              className="rounded-3xl border border-ink/10 bg-white p-6 shadow-[0_2px_10px_rgba(20,17,16,0.04)] dark:border-white/10 dark:bg-ink-elevated"
            >
              <Quote aria-hidden size={22} className="text-violet/30" />
              <p className="mt-4 font-serif text-lg italic leading-relaxed text-ink dark:text-white">{item.quote}</p>
              <div className="mt-6 flex items-center gap-3">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt="" loading="lazy" className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
                ) : (
                  <span
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${PLACEHOLDER_BG[i % PLACEHOLDER_BG.length]}`}
                  >
                    {initials(item.name)}
                  </span>
                )}
                <span className="leading-tight">
                  <span className="block text-sm font-bold text-ink dark:text-white">{item.name}</span>
                  <span className="block text-xs text-ink-soft dark:text-white/50">{item.role}</span>
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
