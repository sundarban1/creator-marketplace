import { Outlet } from 'react-router-dom';
import { AppLanguageProvider } from './i18n';
import { AppAuthProvider } from './auth/AppAuthContext';
import { ToastProvider } from './ui/Toast';

/**
 * Wraps every marketplace route (public + authed) in the app's language,
 * auth and toast contexts. Mounted as a layout route so the admin dashboard
 * and the prerendered landing pages never pay for these providers.
 */
export function AppProviders() {
  return (
    <AppLanguageProvider>
      <AppAuthProvider>
        <ToastProvider>
          <Outlet />
        </ToastProvider>
      </AppAuthProvider>
    </AppLanguageProvider>
  );
}
