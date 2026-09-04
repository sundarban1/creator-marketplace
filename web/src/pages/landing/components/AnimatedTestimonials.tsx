import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

// Ported from Aceternity UI's "Animated Testimonials" (ui.aceternity.com) — the
// original targets Next.js/shadcn (motion/react, @tabler/icons-react, a `cn()`
// util). This project is Vite + framer-motion + lucide-react, so those are
// swapped for the equivalents already in use elsewhere on this page, and
// colors are reskinned to the site's own ink/paper/violet/brand-orange tokens
// (incl. `dark:` variants for the landing page's theme toggle) instead of
// Tailwind's default gray scale. Animation structure/timing is unchanged.

type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  src?: string | null;
};

const PLACEHOLDER_BG = [
  'bg-violet-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
];

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function AnimatedTestimonials({
  testimonials,
  autoplay = false,
}: {
  testimonials: Testimonial[];
  autoplay?: boolean;
}) {
  const [active, setActive] = useState(0);

  // `testimonials` can change length between renders (static fallback copy →
  // fewer/more stories once the API resolves), which leaves `active` pointing
  // past the end of the new array. Clamp it so `testimonials[active]` is never
  // undefined.
  useEffect(() => {
    setActive((prev) => (prev >= testimonials.length ? 0 : prev));
  }, [testimonials.length]);

  const handleNext = () => {
    setActive((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const isActive = (index: number) => index === active;

  useEffect(() => {
    if (!autoplay || testimonials.length === 0) return;
    const interval = setInterval(handleNext, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, testimonials.length]);

  const randomRotateY = () => Math.floor(Math.random() * 21) - 10;

  if (testimonials.length === 0) return null;
  // The clamping effect above runs after render, so guard the first render that
  // follows a length shrink here too.
  const current = testimonials[active] ?? testimonials[0]!;

  return (
    <div className="mx-auto max-w-sm px-4 md:max-w-4xl md:px-8 lg:px-12">
      <div className="relative grid grid-cols-1 gap-16 md:grid-cols-2 md:gap-20">
        <div>
          <div className="relative h-80 w-full">
            <AnimatePresence>
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9, z: -100, rotate: randomRotateY() }}
                  animate={{
                    opacity: isActive(index) ? 1 : 0.7,
                    scale: isActive(index) ? 1 : 0.95,
                    z: isActive(index) ? 0 : -100,
                    rotate: isActive(index) ? 0 : randomRotateY(),
                    zIndex: isActive(index) ? 40 : testimonials.length + 2 - index,
                    y: isActive(index) ? [0, -80, 0] : 0,
                  }}
                  exit={{ opacity: 0, scale: 0.9, z: 100, rotate: randomRotateY() }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="absolute inset-0 origin-bottom"
                >
                  {testimonial.src ? (
                    <img
                      src={testimonial.src}
                      alt={testimonial.name}
                      draggable={false}
                      loading="lazy"
                      className="h-full w-full rounded-3xl border border-ink/10 object-cover object-center shadow-[0_20px_50px_-20px_rgba(20,17,16,0.25)] dark:border-white/10"
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center rounded-3xl border border-ink/10 shadow-[0_20px_50px_-20px_rgba(20,17,16,0.25)] dark:border-white/10 ${PLACEHOLDER_BG[index % PLACEHOLDER_BG.length]}`}
                    >
                      <span className="text-6xl font-semibold text-white">{initials(testimonial.name)}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex flex-col justify-between py-4">
          <motion.div
            key={active}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <h3 className="text-2xl font-bold text-ink dark:text-white">{current.name}</h3>
            <p className="text-sm text-ink-soft dark:text-white">{current.designation}</p>
            <motion.p className="mt-3 font-serif text-lg italic leading-relaxed text-ink-soft dark:text-white">
              {current.quote.split(' ').map((word, index) => (
                <motion.span
                  key={index}
                  initial={{ filter: 'blur(10px)', opacity: 0, y: 5 }}
                  animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut', delay: 0.02 * index }}
                  className="inline-block"
                >
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.p>
          </motion.div>
          <div className="flex gap-4 pt-12 md:pt-0">
            <button
              onClick={handlePrev}
              aria-label="Previous story"
              className="group/button flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 transition-colors duration-300 hover:bg-ink/10 dark:bg-white/10 dark:hover:bg-white/20"
            >
              <ArrowLeft size={18} className="text-ink transition-transform duration-300 group-hover/button:-translate-x-0.5 dark:text-white" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Next story"
              className="group/button flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 transition-colors duration-300 hover:bg-ink/10 dark:bg-white/10 dark:hover:bg-white/20"
            >
              <ArrowRight size={18} className="text-ink transition-transform duration-300 group-hover/button:translate-x-0.5 dark:text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
