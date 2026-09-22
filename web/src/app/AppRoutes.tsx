import { lazy, type ComponentType } from 'react';
import { Route } from 'react-router-dom';
import { AppProviders } from './AppProviders';
import { RequireAuth, RequireGuest, RequireRole, RequireOnboarding, RequireNotOnboarded } from './auth/guards';
import { withChunkRetry } from '../lib/chunkRetry';

/**
 * The marketplace web app's route subtree. Rendered inside <Routes> in
 * src/App.tsx via `{marketplaceRoutes()}` — it slots alongside the landing and
 * admin routes without either provider tree wrapping the other.
 *
 * Screens are code-split so a visitor to the prerendered marketing site never
 * downloads the app's code. The <Suspense> boundary in src/App.tsx
 * (RouteFallback) covers the load.
 *
 * Phase 2/3 replace the <ComingSoon> leaves with the real screens; the shell,
 * nav, guards and dashboards are final.
 */
function screen(loader: () => Promise<Record<string, unknown>>, key: string) {
  return lazy(() => withChunkRetry(loader, key).then((m) => ({ default: m[key] as ComponentType })));
}

const LoginScreen = screen(() => import('./auth/LoginScreen'), 'LoginScreen');
const GoogleCallbackScreen = screen(() => import('./auth/GoogleCallbackScreen'), 'GoogleCallbackScreen');
const SignupScreen = screen(() => import('./auth/SignupScreen'), 'SignupScreen');
const VerifyOtpScreen = screen(() => import('./auth/VerifyOtpScreen'), 'VerifyOtpScreen');
const ForgotPasswordScreen = screen(() => import('./auth/ForgotPasswordScreen'), 'ForgotPasswordScreen');
const OnboardingScreen = screen(() => import('./onboarding/OnboardingScreen'), 'OnboardingScreen');
const AppShell = screen(() => import('./shell/AppShell'), 'AppShell');
const CreatorDashboard = screen(() => import('./creator/CreatorDashboard'), 'CreatorDashboard');
const BusinessDashboard = screen(() => import('./business/BusinessDashboard'), 'BusinessDashboard');

const PublicLayout = screen(() => import('./public/PublicLayout'), 'PublicLayout');
const CreatorsPage = screen(() => import('./public/CreatorsPage'), 'CreatorsPage');
const CreatorProfilePage = screen(() => import('./public/CreatorProfilePage'), 'CreatorProfilePage');
const PublicBusinessesPage = screen(() => import('./public/BusinessesPage'), 'BusinessesPage');
const PublicBusinessProfilePage = screen(() => import('./public/BusinessProfilePage'), 'BusinessProfilePage');
const EventsPage = screen(() => import('./public/EventsPage'), 'EventsPage');
const EventDetailPage = screen(() => import('./public/EventDetailPage'), 'EventDetailPage');
const CreatorEventsPage = screen(() => import('./creator/CreatorEventsPage'), 'CreatorEventsPage');
const CreatorEventDetailPage = screen(() => import('./creator/CreatorEventDetailPage'), 'CreatorEventDetailPage');
const CreatorDiscoverCreatorsPage = screen(() => import('./creator/CreatorDiscoverCreatorsPage'), 'CreatorDiscoverCreatorsPage');
const CreatorDiscoverCreatorDetailPage = screen(() => import('./creator/CreatorDiscoverCreatorDetailPage'), 'CreatorDiscoverCreatorDetailPage');
const CreatorDiscoverBusinessesPage = screen(() => import('./creator/CreatorDiscoverBusinessesPage'), 'CreatorDiscoverBusinessesPage');
const CreatorDiscoverBusinessDetailPage = screen(() => import('./creator/CreatorDiscoverBusinessDetailPage'), 'CreatorDiscoverBusinessDetailPage');
const CreatorApplicationsPage = screen(() => import('./creator/CreatorApplicationsPage'), 'CreatorApplicationsPage');
const CreatorWorkPage = screen(() => import('./creator/CreatorWorkPage'), 'CreatorWorkPage');
const CreatorWorkDetailPage = screen(() => import('./creator/CreatorWorkDetailPage'), 'CreatorWorkDetailPage');
const CreatorWalletPage = screen(() => import('./creator/CreatorWalletPage'), 'CreatorWalletPage');
const CreatorProfileEditPage = screen(() => import('./creator/CreatorProfilePage'), 'CreatorProfilePage');
const CreatorSettingsPage = screen(() => import('./creator/CreatorSettingsPage'), 'CreatorSettingsPage');
const CreatorVerificationPage = screen(() => import('./creator/CreatorVerificationPage'), 'CreatorVerificationPage');
const CreatorMeetupsPage = screen(() => import('./creator/CreatorMeetupsPage'), 'CreatorMeetupsPage');
const CreatorMeetupRegisterPage = screen(() => import('./creator/CreatorMeetupRegisterPage'), 'CreatorMeetupRegisterPage');
const CreatorReferralsPage = screen(() => import('./creator/CreatorReferralsPage'), 'CreatorReferralsPage');
const AccountSettingsPage = screen(() => import('./shell/AccountSettingsPage'), 'AccountSettingsPage');
const HelpSupportPage = screen(() => import('./shell/HelpSupportPage'), 'HelpSupportPage');
const AboutKolabPage = screen(() => import('./shell/AboutKolabPage'), 'AboutKolabPage');

const BusinessCreatorsPage = screen(() => import('./business/BusinessCreatorsPage'), 'BusinessCreatorsPage');
const BusinessCreatorDetailPage = screen(() => import('./business/BusinessCreatorDetailPage'), 'BusinessCreatorDetailPage');
const BusinessEventsPage = screen(() => import('./business/BusinessEventsPage'), 'BusinessEventsPage');
const BusinessEventDetailPage = screen(() => import('./business/BusinessEventDetailPage'), 'BusinessEventDetailPage');
const CreateEventPage = screen(() => import('./business/CreateEventPage'), 'CreateEventPage');
const EditEventPage = screen(() => import('./business/EditEventPage'), 'EditEventPage');
const BusinessPromotionsPage = screen(() => import('./business/BusinessPromotionsPage'), 'BusinessPromotionsPage');
const BusinessPromotionFormPage = screen(() => import('./business/BusinessPromotionFormPage'), 'BusinessPromotionFormPage');
const ChatPage = screen(() => import('./chat/ChatPage'), 'ChatPage');
const NotificationsPage = screen(() => import('./notifications/NotificationsPage'), 'NotificationsPage');
const BusinessApplicationsPage = screen(() => import('./business/BusinessApplicationsPage'), 'BusinessApplicationsPage');
const BusinessDeliverablesPage = screen(() => import('./business/BusinessDeliverablesPage'), 'BusinessDeliverablesPage');
const BusinessPaymentsPage = screen(() => import('./business/BusinessPaymentsPage'), 'BusinessPaymentsPage');
const BusinessProfilePage = screen(() => import('./business/BusinessProfilePage'), 'BusinessProfilePage');
const BusinessReferralsPage = screen(() => import('./business/BusinessReferralsPage'), 'BusinessReferralsPage');
const BusinessVerificationPage = screen(() => import('./business/BusinessVerificationPage'), 'BusinessVerificationPage');

export function marketplaceRoutes() {
  return (
    <>
    <Route element={<AppProviders />}>
      {/* Public marketplace — no auth, indexable, own marketing chrome.
          Nested under AppProviders (not RequireAuth) so the auth context is
          available to gate specific actions (apply, message, hire) behind a
          signup/login prompt without blocking the page itself for signed-out
          visitors. */}
      <Route element={<PublicLayout />}>
        {/* Events/creators/businesses lists require sign-in (unlike their
            detail pages, which stay open so landing-page links work for
            signed-out visitors). */}
        <Route element={<RequireAuth />}>
          <Route path="/events" element={<EventsPage />} />
          <Route path="/creators" element={<CreatorsPage />} />
          <Route path="/businesses" element={<PublicBusinessesPage />} />
        </Route>
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/creators/:handle" element={<CreatorProfilePage />} />
        <Route path="/businesses/:id" element={<PublicBusinessProfilePage />} />
      </Route>

      {/* Auth — redirect away if already signed in */}
      <Route element={<RequireGuest />}>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/verify" element={<VerifyOtpScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      </Route>

      {/* Google's redirect lands here regardless of session state (mid-flow it's
          neither authed nor a "guest" in the RequireGuest sense), so it's not
          nested under either guard — see GoogleCallbackScreen. */}
      <Route path="/auth/google/callback" element={<GoogleCallbackScreen />} />

      {/* First-login onboarding — role-branches internally, so it needs an
          authed user but not a specific `RequireRole`. */}
      <Route element={<RequireAuth />}>
        <Route element={<RequireNotOnboarded />}>
          <Route path="/onboarding" element={<OnboardingScreen />} />
        </Route>
      </Route>

      {/* Creator app */}
      <Route element={<RequireAuth />}>
        <Route element={<RequireRole role="CREATOR" />}>
          <Route element={<RequireOnboarding />}>
            <Route path="/creator" element={<AppShell />}>
              <Route index element={<CreatorDashboard />} />
              <Route path="events" element={<CreatorEventsPage />} />
              <Route path="events/:id" element={<CreatorEventDetailPage />} />
              <Route path="creators" element={<CreatorDiscoverCreatorsPage />} />
              <Route path="creators/:handle" element={<CreatorDiscoverCreatorDetailPage />} />
              <Route path="businesses" element={<CreatorDiscoverBusinessesPage />} />
              <Route path="businesses/:id" element={<CreatorDiscoverBusinessDetailPage />} />
              <Route path="applications" element={<CreatorApplicationsPage />} />
              <Route path="applications/:id" element={<CreatorWorkDetailPage />} />
              <Route path="work" element={<CreatorWorkPage />} />
              <Route path="work/:id" element={<CreatorWorkDetailPage />} />
              <Route path="meetups" element={<CreatorMeetupsPage />} />
              <Route path="meetups/:meetupId" element={<CreatorMeetupRegisterPage />} />
              <Route path="messages" element={<ChatPage />} />
              <Route path="messages/:id" element={<ChatPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="wallet" element={<CreatorWalletPage />} />
              <Route path="profile" element={<CreatorProfileEditPage />} />
              <Route path="settings" element={<CreatorSettingsPage />} />
              <Route path="verification" element={<CreatorVerificationPage />} />
              <Route path="referrals" element={<CreatorReferralsPage />} />
              <Route path="support" element={<HelpSupportPage />} />
              <Route path="about" element={<AboutKolabPage />} />
            </Route>
          </Route>
        </Route>

        {/* Business app */}
        <Route element={<RequireRole role="BUSINESS" />}>
          <Route element={<RequireOnboarding />}>
            <Route path="/business" element={<AppShell />}>
              <Route index element={<BusinessDashboard />} />
              <Route path="creators" element={<BusinessCreatorsPage />} />
              <Route path="creators/:id" element={<BusinessCreatorDetailPage />} />
              <Route path="events" element={<BusinessEventsPage />} />
              <Route path="events/create" element={<CreateEventPage />} />
              <Route path="events/:id" element={<BusinessEventDetailPage />} />
              <Route path="events/:id/edit" element={<EditEventPage />} />
              <Route path="promotions" element={<BusinessPromotionsPage />} />
              <Route path="promotions/create" element={<BusinessPromotionFormPage />} />
              <Route path="promotions/:id/edit" element={<BusinessPromotionFormPage />} />
              <Route path="applications" element={<BusinessApplicationsPage />} />
              <Route path="messages" element={<ChatPage />} />
              <Route path="messages/:id" element={<ChatPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="deliverables" element={<BusinessDeliverablesPage />} />
              <Route path="payments" element={<BusinessPaymentsPage />} />
              <Route path="profile" element={<BusinessProfilePage />} />
              <Route path="settings" element={<AccountSettingsPage />} />
              <Route path="referrals" element={<BusinessReferralsPage />} />
              <Route path="verification" element={<BusinessVerificationPage />} />
              <Route path="support" element={<HelpSupportPage />} />
              <Route path="about" element={<AboutKolabPage />} />
            </Route>
          </Route>
        </Route>
      </Route>
    </Route>
    </>
  );
}
