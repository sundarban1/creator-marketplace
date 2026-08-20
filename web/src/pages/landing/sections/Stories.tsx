import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { AnimatedTestimonials } from '../components/AnimatedTestimonials';
import type { ApiSuccessStory } from '../../../lib/api';

type StoryItem = { quote: string; name: string; role: string; photoUrl?: string | null };
type PublicSuccessStory = Pick<ApiSuccessStory, 'id' | 'name' | 'role' | 'quote' | 'photoUrl'>;

interface StoriesProps {
  stories: PublicSuccessStory[] | null;
}

export function Stories({ stories }: StoriesProps) {
  const { d } = useLandingLanguage();
  // null = not yet loaded / fetch failed → fall back to static copy.
  // A resolved empty array is genuine "no active stories" and renders nothing.
  const items: StoryItem[] = stories !== null ? stories : d.stories.items;
  if (items.length === 0) return null;

  const testimonials = items.map((item) => ({
    quote: item.quote,
    name: item.name,
    designation: item.role,
    src: item.photoUrl,
  }));

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

        <div className="mt-14">
          <AnimatedTestimonials testimonials={testimonials} autoplay />
        </div>
      </div>
    </section>
  );
}
