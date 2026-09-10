import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppLanguageProvider } from '../i18n';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

/**
 * Layout for the public marketplace pages (/creators, /events and their detail
 * pages). Wraps them in the app's language context (shared storage key with the
 * landing page) and the marketing header/footer, so they read as part of the
 * same site rather than a separate app.
 */
export function PublicLayout() {
  return (
    <AppLanguageProvider>
      <div className="flex min-h-screen flex-col bg-paper text-ink">
        <PublicHeader />
        <main className="flex-1">
          <ScrollToTop />
          <Outlet />
        </main>
        <PublicFooter />
      </div>
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
