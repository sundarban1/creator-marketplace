import { useEffect } from 'react';
import { LandingLanguageProvider } from './context/LanguageContext';
import { LandingThemeProvider } from './context/ThemeContext';
import { LandingFooter } from './nav/LandingFooter';
import { LandingNav } from './nav/LandingNav';

// Same top nav as the home page (LandingNav) so About, Trust & Safety, legal
// and SEO pages don't swap the navbar out. Off the home page there's no
// LenisProvider, so LandingNav's section links navigate to `/` and scroll
// there. LandingNav's header is fixed (h-16) — the spacer keeps content
// below it. Wrapped in footer-landing-scope like PublicLayout does;
// font-body matches the home page's root font so link widths line up.
export function StandaloneHeader() {
  return (
    <div className="footer-landing-scope font-body">
      <LandingNav />
      <div aria-hidden className="h-16" />
    </div>
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
    <div className="min-h-screen bg-paper font-display dark:bg-ink">
      <StandaloneHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20">{children}</main>
      <LandingFooter />
    </div>
  );
}

export function StandalonePageShell({ children }: { children: React.ReactNode }) {
  return (
    <LandingThemeProvider>
      <LandingLanguageProvider>
        <StandalonePageShellInner>{children}</StandalonePageShellInner>
      </LandingLanguageProvider>
    </LandingThemeProvider>
  );
}
