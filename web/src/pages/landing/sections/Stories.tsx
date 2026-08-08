import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { AnimatedTestimonials } from '../components/AnimatedTestimonials';
import { TextReveal } from '../components/TextReveal';
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
    src: item.photoUrl ?? null,
  }));

  return (
    <section id={SECTION_IDS.stories} className="bg-paper py-28">
      <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-4xl px-6 text-center">
        <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft">
          {d.stories.eyebrow}
        </motion.p>
        <TextReveal
          as="h2"
          text={d.stories.heading}
          delay={0.1}
          className="mt-3 font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl"
        />
      </motion.div>

      <motion.div initial="hidden" whileInView="show" viewport={VP} variants={fadeUp} className="mt-8">
        <AnimatedTestimonials testimonials={testimonials} autoplay />
      </motion.div>
    </section>
  );
}
