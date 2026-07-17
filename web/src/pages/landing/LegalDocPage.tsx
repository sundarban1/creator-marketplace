import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileQuestion } from 'lucide-react';
import { StandalonePageShell } from './StandalonePageShell';
import { useLandingLanguage } from './context/LanguageContext';
import { fadeUp, stagger } from './lib/motion';
import { api, type LegalSection } from '../../lib/api';

type LegalSlug = 'privacy-policy' | 'terms';

function LegalDocContent({ slug }: { slug: LegalSlug }) {
  const { d } = useLandingLanguage();
  const [sections, setSections] = useState<LegalSection[] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Both PrivacyPage and TermsPage render this with a fixed, never-changing
    // `slug` — no need to reset state on a slug change that can't happen; the
    // initial `useState` values already cover the pre-fetch state.
    let cancelled = false;
    api.public.legalDoc(slug)
      .then((res) => {
        if (cancelled) return;
        setSections(res.data.sections);
        setLastUpdated(res.data.lastUpdated);
      })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [slug]);

  const title = slug === 'privacy-policy' ? d.legalPages.privacyTitle : d.legalPages.termsTitle;

  return (
    <motion.div initial="hidden" animate="show" variants={stagger()}>
      <motion.p variants={fadeUp} className="font-serif text-sm italic text-ink-soft">
        <a href="/" className="hover:text-ink">{d.legalPages.backToHome}</a>
      </motion.p>

      <motion.h1 variants={fadeUp} className="mt-4 text-balance font-serif text-4xl font-medium tracking-tight text-ink sm:text-5xl">
        {title}
      </motion.h1>

      {lastUpdated && (
        <motion.p variants={fadeUp} className="mt-3 text-sm text-ink-soft">
          {d.legalPages.lastUpdated.replace('{{date}}', new Date(lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))}
        </motion.p>
      )}

      <motion.div variants={fadeUp} className="mt-10 border-t border-ink/10" />

      {error ? (
        <motion.p variants={fadeUp} className="mt-10 text-ink-soft">{d.legalPages.loadError}</motion.p>
      ) : sections === null ? (
        <div className="mt-10 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-4 w-1/3 rounded bg-ink/10" />
              <div className="h-3 w-full rounded bg-ink/5" />
              <div className="h-3 w-5/6 rounded bg-ink/5" />
            </div>
          ))}
        </div>
      ) : sections.length === 0 ? (
        <motion.div variants={fadeUp} className="mt-14 flex flex-col items-center gap-3 text-center text-ink-soft">
          <FileQuestion size={32} className="text-ink/20" />
          <p className="font-serif text-lg italic text-ink">{d.legalPages.emptyTitle}</p>
          <p className="max-w-sm text-sm">{d.legalPages.emptyBody}</p>
        </motion.div>
      ) : (
        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <motion.section key={section.id} variants={fadeUp}>
              <h2 className="font-serif text-xl font-medium text-ink">{section.title}</h2>
              <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">{section.body}</p>
            </motion.section>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function PrivacyPage() {
  return (
    <StandalonePageShell>
      <LegalDocContent slug="privacy-policy" />
    </StandalonePageShell>
  );
}

export function TermsPage() {
  return (
    <StandalonePageShell>
      <LegalDocContent slug="terms" />
    </StandalonePageShell>
  );
}
