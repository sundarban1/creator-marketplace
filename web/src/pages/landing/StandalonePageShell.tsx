import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LandingLanguageProvider, useLandingLanguage } from './context/LanguageContext';
import { LandingFooter } from './nav/LandingFooter';

// Lightweight header for standalone pages (Privacy, Terms, Support) — separate
// from LandingNav because that one's links scroll to in-page anchors
// (#hero, #trust, ...) that only exist on the single-page home route.
function StandaloneHeader() {
  const { lang, setLang } = useLandingLanguage();
  return (
    <header className="border-b border-ink/10 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center">
          <img src="/logo.png" alt="kolab" className="h-6 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {(['en', 'ne'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={lang === l ? 'text-ink underline underline-offset-4' : 'opacity-60 hover:opacity-100'}
            >
              {l === 'en' ? 'EN' : 'ने'}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function StandalonePageShellInner({ children }: { children: React.ReactNode }) {
  // These pages are entered via in-app <Link> navigation from a scrolled-down
  // landing page — React Router doesn't reset scroll position on its own, so
  // without this the new page opens wherever the user had scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-paper font-display">
      <StandaloneHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">{children}</main>
      <LandingFooter />
    </div>
  );
}

export function StandalonePageShell({ children }: { children: React.ReactNode }) {
  return (
    <LandingLanguageProvider>
      <StandalonePageShellInner>{children}</StandalonePageShellInner>
    </LandingLanguageProvider>
  );
}
