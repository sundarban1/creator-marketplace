import { motion } from 'framer-motion';
import { fadeUp, stagger, VP } from '../lib/motion';
import { AppStoreBadges } from './AppStoreBadges';
import { ComingSoonBadge } from './ComingSoonBadge';
import { useComingSoon } from '../hooks/useComingSoon';

interface CTASectionProps {
  heading: string;
  sub: string;
}

// Shared closing-CTA block for the SEO content pages — same dark/mesh-blob
// treatment as the homepage's <FinalCTA/> section so a visitor landing on
// e.g. /content-creators from Google doesn't feel like they've left the
// Kolab site partway through, then reuses the same real-vs-coming-soon
// download-button logic every other CTA on the site already follows.
export function CTASection({ heading, sub }: CTASectionProps) {
  const comingSoon = useComingSoon();

  return (
    <section className="relative mt-20 overflow-hidden rounded-3xl bg-ink px-6 py-16 text-center text-white sm:px-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="mesh-blob absolute left-1/4 top-0 h-[280px] w-[280px] rounded-full bg-violet/[0.18] blur-[100px]" />
        <div className="mesh-blob absolute bottom-0 right-1/4 h-[240px] w-[240px] rounded-full bg-brand-orange/[0.15] blur-[100px]" style={{ animationDelay: '2s' }} />
      </div>
      <motion.div initial="hidden" whileInView="show" viewport={VP} variants={stagger()}>
        <motion.h2 variants={fadeUp} className="text-balance font-serif text-3xl font-medium sm:text-4xl">
          {heading}
        </motion.h2>
        <motion.p variants={fadeUp} className="mx-auto mt-3 max-w-md font-serif text-base italic text-white/50">
          {sub}
        </motion.p>
        <motion.div variants={fadeUp} className="mt-8 flex justify-center">
          {comingSoon ? <ComingSoonBadge variant="light" /> : <AppStoreBadges variant="light" />}
        </motion.div>
      </motion.div>
    </section>
  );
}
