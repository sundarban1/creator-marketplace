import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { SECTION_IDS } from '../constants';
import { useLandingLanguage } from '../context/LanguageContext';
import { TextReveal } from '../components/TextReveal';
import { AnimatedTestimonials } from '../components/AnimatedTestimonials';
import type { ApiSuccessStory } from '../../../lib/api';

type PublicSuccessStory = Pick<ApiSuccessStory, 'id' | 'name' | 'role' | 'quote' | 'photoUrl'>;

interface StoriesProps {
  status: 'loading' | 'ready' | 'error';
  stories: PublicSuccessStory[];
}

export function Stories({ status, stories }: StoriesProps) {
  const { d } = useLandingLanguage();
  // While loading, render nothing rather than a placeholder — a brief blank
  // beat is better than flashing fabricated content. Once resolved (or on
  // error), an empty result shows an honest empty state, never invented quotes.
  if (status === 'loading') return null;

  if (stories.length === 0) {
    return (
      <section id={SECTION_IDS.stories} className="bg-paper-dim py-24 dark:bg-ink-elevated">
        <div className="mx-auto max-w-2xl px-6 text-center">
          <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
            <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white">
              {d.stories.eyebrow}
            </motion.p>
            <TextReveal
              as="h2"
              text={d.stories.emptyTitle}
              delay={0.1}
              className="mt-3 text-balance font-serif text-2xl font-medium text-ink sm:text-3xl md:text-4xl dark:text-white"
            />
            <motion.p variants={fadeUp} className="mt-4 text-sm text-ink-soft dark:text-white">
              {d.stories.emptyBody}
            </motion.p>
          </motion.div>
        </div>
      </section>
    );
  }

  const testimonials = stories.map((item) => ({
    quote: item.quote,
    name: item.name,
    designation: item.role,
    src: item.photoUrl,
  }));

  return (
    <section id={SECTION_IDS.stories} className="bg-paper-dim py-24 dark:bg-ink-elevated">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()} className="mx-auto max-w-2xl text-center">
          <motion.p variants={fadeUp} className="font-serif text-base italic text-ink-soft dark:text-white">
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
          <AnimatedTestimonials
            testimonials={testimonials}
            autoplay
            showMoreLabel={d.stories.showMore}
            showLessLabel={d.stories.showLess}
          />
        </div>
      </div>
    </section>
  );
}
