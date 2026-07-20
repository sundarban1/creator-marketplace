import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass } from 'lucide-react';
import { StandalonePageShell } from './StandalonePageShell';
import { fadeUp, stagger } from './lib/motion';
import { SEO } from '../../lib/seo/SEO';

export function NotFoundPage() {
  return (
    <StandalonePageShell>
      <SEO
        title="Page Not Found"
        description="This page doesn't exist on Kolab, Nepal's creator marketplace."
        path="/404"
        noindex
      />
      <motion.div initial="hidden" animate="show" variants={stagger()} className="flex flex-col items-center py-16 text-center">
        <motion.span variants={fadeUp} className="flex h-14 w-14 items-center justify-center rounded-full bg-violet/10 text-violet">
          <Compass size={26} />
        </motion.span>
        <motion.p variants={fadeUp} className="mt-6 font-serif text-7xl italic text-ink/15">404</motion.p>
        <motion.h1 variants={fadeUp} className="mt-2 text-balance font-serif text-3xl font-medium tracking-tight text-ink sm:text-4xl">
          This page wandered off
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-3 max-w-sm text-ink-soft">
          The page you're looking for doesn't exist or may have moved. Let's get you back on track.
        </motion.p>
        <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            Back to Home
          </Link>
          <Link to="/support" className="rounded-full border border-ink/15 px-6 py-3 text-sm font-semibold text-ink transition-colors hover:bg-ink/5">
            Get Support
          </Link>
        </motion.div>
      </motion.div>
    </StandalonePageShell>
  );
}
