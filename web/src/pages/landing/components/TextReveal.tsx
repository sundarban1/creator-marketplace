import { motion } from 'framer-motion';
import { VP } from '../lib/motion';

// Splits text into words and reveals them left-to-right with a soft
// blur/rise — the same treatment already used for the testimonial quote in
// AnimatedTestimonials, generalized here so section headings and hero copy
// get the same elegant, editorial-feeling reveal instead of fading in as one
// flat block. Triggers on scroll into view by default (`whileInView`); pass
// `eager` for copy that should animate immediately on mount instead (e.g.
// inside a hero that's already visible on load).
interface TextRevealProps {
  text: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  eager?: boolean;
}

export function TextReveal({
  text,
  as: Tag = 'span',
  className = '',
  wordClassName = 'inline-block',
  delay = 0,
  stagger = 0.045,
  eager = false,
}: TextRevealProps) {
  const words = text.split(' ');
  const trigger = eager
    ? { initial: 'hidden' as const, animate: 'show' as const }
    : { initial: 'hidden' as const, whileInView: 'show' as const, viewport: VP };

  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          {...trigger}
          variants={{
            hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
            show: {
              opacity: 1,
              y: 0,
              filter: 'blur(0px)',
              transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: delay + i * stagger },
            },
          }}
          className={wordClassName}
        >
          {word}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </Tag>
  );
}
