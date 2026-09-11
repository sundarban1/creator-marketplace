import { lazy, type ComponentType } from 'react';
import { Route } from 'react-router-dom';
import { AppProviders } from './AppProviders';
import { RequireAuth, RequireGuest, RequireRole } from './auth/guards';

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
  return lazy(() => loader().then((m) => ({ default: m[key] as ComponentType })));
}

const LoginScreen = screen(() => import('./auth/LoginScreen'), 'LoginScreen');
const SignupScreen = screen(() => import('./auth/SignupScreen'), 'SignupScreen');
const VerifyOtpScreen = screen(() => import('./auth/VerifyOtpScreen'), 'VerifyOtpScreen');
const ForgotPasswordScreen = screen(() => import('./auth/ForgotPasswordScreen'), 'ForgotPasswordScreen');
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
const CreatorApplicationsPage = screen(() => import('./creator/CreatorApplicationsPage'), 'CreatorApplicationsPage');
const CreatorWorkPage = screen(() => import('./creator/CreatorWorkPage'), 'CreatorWorkPage');
const CreatorWorkDetailPage = screen(() => import('./creator/CreatorWorkDetailPage'), 'CreatorWorkDetailPage');
const CreatorWalletPage = screen(() => import('./creator/CreatorWalletPage'), 'CreatorWalletPage');
const CreatorProfileEditPage = screen(() => import('./creator/CreatorProfilePage'), 'CreatorProfilePage');
const AccountSettingsPage = screen(() => import('./shell/AccountSettingsPage'), 'AccountSettingsPage');

const BusinessCreatorsPage = screen(() => import('./business/BusinessCreatorsPage'), 'BusinessCreatorsPage');
const BusinessCreatorDetailPage = screen(() => import('./business/BusinessCreatorDetailPage'), 'BusinessCreatorDetailPage');
const BusinessEventsPage = screen(() => import('./business/BusinessEventsPage'), 'BusinessEventsPage');
const BusinessEventDetailPage = screen(() => import('./business/BusinessEventDetailPage'), 'BusinessEventDetailPage');
const CreateEventPage = screen(() => import('./business/CreateEventPage'), 'CreateEventPage');
const BusinessApplicationsPage = screen(() => import('./business/BusinessApplicationsPage'), 'BusinessApplicationsPage');
const BusinessDeliverablesPage = screen(() => import('./business/BusinessDeliverablesPage'), 'BusinessDeliverablesPage');
const BusinessPaymentsPage = screen(() => import('./business/BusinessPaymentsPage'), 'BusinessPaymentsPage');
const BusinessProfilePage = screen(() => import('./business/BusinessProfilePage'), 'BusinessProfilePage');

export function marketplaceRoutes() {
  return (
    <>
    {/* Public marketplace — no auth, indexable, own marketing chrome */}
    <Route element={<PublicLayout />}>
      <Route path="/creators" element={<CreatorsPage />} />
      <Route path="/creators/:handle" element={<CreatorProfilePage />} />
      <Route path="/businesses" element={<PublicBusinessesPage />} />
      <Route path="/businesses/:id" element={<PublicBusinessProfilePage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/events/:id" element={<EventDetailPage />} />
    </Route>

    <Route element={<AppProviders />}>
      {/* Auth — redirect away if already signed in */}
      <Route element={<RequireGuest />}>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/verify" element={<VerifyOtpScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      </Route>

      {/* Creator app */}
      <Route element={<RequireAuth />}>
        <Route element={<RequireRole role="CREATOR" />}>
          <Route path="/creator" element={<AppShell />}>
            <Route index element={<CreatorDashboard />} />
            <Route path="events" element={<CreatorEventsPage />} />
            <Route path="events/:id" element={<CreatorEventDetailPage />} />
            <Route path="applications" element={<CreatorApplicationsPage />} />
            <Route path="applications/:id" element={<CreatorWorkDetailPage />} />
            <Route path="work" element={<CreatorWorkPage />} />
            <Route path="work/:id" element={<CreatorWorkDetailPage />} />
            <Route path="wallet" element={<CreatorWalletPage />} />
            <Route path="profile" element={<CreatorProfileEditPage />} />
            <Route path="settings" element={<AccountSettingsPage />} />
          </Route>
        </Route>

        {/* Business app */}
        <Route element={<RequireRole role="BUSINESS" />}>
          <Route path="/business" element={<AppShell />}>
            <Route index element={<BusinessDashboard />} />
            <Route path="creators" element={<BusinessCreatorsPage />} />
            <Route path="creators/:id" element={<BusinessCreatorDetailPage />} />
            <Route path="events" element={<BusinessEventsPage />} />
            <Route path="events/create" element={<CreateEventPage />} />
            <Route path="events/:id" element={<BusinessEventDetailPage />} />
            <Route path="applications" element={<BusinessApplicationsPage />} />
            <Route path="deliverables" element={<BusinessDeliverablesPage />} />
            <Route path="payments" element={<BusinessPaymentsPage />} />
            <Route path="profile" element={<BusinessProfilePage />} />
            <Route path="settings" element={<AccountSettingsPage />} />
          </Route>
        </Route>
      </Route>
    </Route>
    </>
  );
}
