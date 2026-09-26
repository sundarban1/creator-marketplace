import { useEffect, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppLanguageProvider } from '../i18n';
import { LandingThemeProvider } from '../../pages/landing/context/ThemeContext';
import { LandingLanguageProvider, useLandingLanguage } from '../../pages/landing/context/LanguageContext';
import { LandingFooter } from '../../pages/landing/nav/LandingFooter';
import { LandingNav } from '../../pages/landing/nav/LandingNav';

/**
 * Layout for the public marketplace pages (/creators, /events and their detail
 * pages). Uses the landing site's own nav (LandingNav, the same component as
 * the home page), theme, footer and language —
 * so the pages read as one continuous site with the marketing pages:
 *  - LandingThemeProvider drives the dark-mode toggle (index.css defines dark
 *    values for every marketplace token under `.dark .market-scope`);
 *  - LandingLanguageProvider is the single language source; `<LanguageBridge>`
 *    mirrors it into this app's `AppLanguageProvider` so `useT()` follows the
 *    same EN/ने toggle;
 *  - LandingFooter is rendered verbatim.
 */
export function PublicLayout() {
  return (
    <LandingThemeProvider>
      <LandingLanguageProvider>
        <LanguageBridge>
          <div className="market-scope flex min-h-screen flex-col bg-paper font-display text-ink">
            {/* Fixed h-16 header — the main area starts below it. */}
            <div className="footer-landing-scope">
              <LandingNav />
            </div>
            <main className="flex-1 pt-16">
              <ScrollToTop />
              <Outlet />
            </main>
            {/* Landing footer keeps its own dark handling — see index.css. */}
            <div className="footer-landing-scope">
              <LandingFooter />
            </div>
          </div>
        </LanguageBridge>
      </LandingLanguageProvider>
    </LandingThemeProvider>
  );
}

/** Feeds the landing language context into this app's provider (controlled). */
function LanguageBridge({ children }: { children: ReactNode }) {
  const { lang, setLang } = useLandingLanguage();
  return (
    <AppLanguageProvider language={lang} onLanguageChange={setLang}>
      {children}
    </AppLanguageProvider>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
