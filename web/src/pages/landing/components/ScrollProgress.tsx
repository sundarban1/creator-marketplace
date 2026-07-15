import { motion, useScroll, useSpring } from 'framer-motion';

/** Thin gradient bar pinned to the very top of the viewport, filling left to
 *  right as the visitor scrolls — a small, proven "premium site" signature. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed left-0 right-0 top-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-violet via-violet-dark to-brand-orange"
    />
  );
}
