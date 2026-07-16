import type { Variants } from 'framer-motion';

export const VP = { once: true, amount: 0.25 } as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

export const stagger = (gap = 0.09): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap } },
});

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

// Shared whileHover targets so every card/tile across the page lifts by the
// same amount — small per-section variance (y: -3 vs -5, scale: 1.02 vs 1.05)
// reads as inconsistency once you notice it while scrolling through sections
// back to back. CARD_HOVER for content cards (HowItWorks, Security, Stories,
// TrustStats); PILL_HOVER for smaller chip-like elements (Categories).
export const CARD_HOVER = { y: -4, scale: 1.03 };
export const PILL_HOVER = { y: -3, scale: 1.05 };
