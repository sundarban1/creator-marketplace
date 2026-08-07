import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { AnimatedTestimonials } from '../components/AnimatedTestimonials';
import { TextReveal } from '../components/TextReveal';
import type { ApiSuccessStory } from '../../../lib/api';

// Used whenever a story (real API row or the static i18n fallback copy) has no
// photoUrl — the carousel is portrait-driven, so every entry needs some image.
// Cycled by index rather than one fixed URL, since the static i18n fallback
// copy has no photoUrl on ANY item — a single shared dummy would show the
// same face for every "different" person in the carousel.
const DUMMY_PHOTOS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1623582854588-d60de57fa33f?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1636041293178-808a6762ab39?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  'https://images.unsplash.com/photo-1624561172888-ac93c696e10c?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
];

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

  const testimonials = items.map((item, i) => ({
    quote: item.quote,
    name: item.name,
    designation: item.role,
    src: item.photoUrl ?? DUMMY_PHOTOS[i % DUMMY_PHOTOS.length]!,
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
