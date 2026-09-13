import { useAppAuth } from '../auth/AppAuthContext';
import { CreatorOnboarding } from './CreatorOnboarding';
import { BusinessOnboarding } from './BusinessOnboarding';

/** Route-level entry — branches on role, same way mobile has two separate
 *  routes (`/onboarding`, `/business-onboarding`) but web keeps one shell. */
export function OnboardingScreen() {
  const { user } = useAppAuth();
  if (user?.role === 'BUSINESS') return <BusinessOnboarding />;
  return <CreatorOnboarding />;
}
