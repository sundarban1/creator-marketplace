import { useAppAuth } from '../auth/AppAuthContext';
import { CreatorOnboarding } from './CreatorOnboarding';
import { BusinessOnboarding } from './BusinessOnboarding';
import { LandingThemeProvider } from '../../pages/landing/context/ThemeContext';
import { cn } from '../ui/cn';

/** Route-level entry — branches on role, same way mobile has two separate
 *  routes (`/onboarding`, `/business-onboarding`) but web keeps one shell.
 *  Wears the same landing-design scope as AppShell (`.app-scope` + the role
 *  accent) and shares the landing theme preference. */
export function OnboardingScreen() {
  const { user } = useAppAuth();
  const isBusiness = user?.role === 'BUSINESS';
  return (
    <LandingThemeProvider>
      <div className={cn('app-scope', isBusiness ? 'business-scope' : 'creator-scope')}>
        {isBusiness ? <BusinessOnboarding /> : <CreatorOnboarding />}
      </div>
    </LandingThemeProvider>
  );
}
