import { Outlet } from 'react-router-dom';
import { AppLanguageProvider } from './i18n';
import { AppAuthProvider } from './auth/AppAuthContext';

/**
 * Wraps every marketplace route (public + authed) in the app's language and
 * auth contexts. Mounted as a layout route so the admin dashboard and the
 * prerendered landing pages never pay for these providers.
 */
export function AppProviders() {
  return (
    <AppLanguageProvider>
      <AppAuthProvider>
        <Outlet />
      </AppAuthProvider>
    </AppLanguageProvider>
  );
}
