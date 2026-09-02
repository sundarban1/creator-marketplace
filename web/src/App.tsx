import { lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CategoriesProvider } from './context/CategoriesContext';
import { PlatformsProvider } from './context/PlatformsContext';
import { PaymentMethodsProvider } from './context/PaymentMethodsContext';
import { SuccessStoriesProvider } from './context/SuccessStoriesContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RouteFallback } from './components/RouteFallback';

// The landing page is the LCP-critical, prerendered entry point — keep it in
// the main chunk so first paint never waits on a second network round trip.
import { LandingPage } from './pages/landing/LandingPage';

// Everything else is code-split. The public marketing/SEO pages are each
// prerendered to their own HTML, so lazy-loading means a visitor to one niche
// page only downloads that page's code, not all ~40 of them. The entire authed
// admin dashboard (TipTap editor, Recharts, Google Maps, Framer Motion) now
// splits out of the bundle that marketing visitors download.
//
// `named` unwraps a named export into the default shape React.lazy expects.
function named(
  loader: () => Promise<Record<string, unknown>>,
  key: string,
) {
  return lazy(() =>
    loader().then((m) => ({ default: m[key] as ComponentType<Record<string, unknown>> })),
  );
}

const PrivacyPage = named(() => import('./pages/landing/LegalDocPage'), 'PrivacyPage');
const TermsPage = named(() => import('./pages/landing/LegalDocPage'), 'TermsPage');
const SupportPage = named(() => import('./pages/landing/SupportPage'), 'SupportPage');
const NotFoundPage = named(() => import('./pages/landing/NotFoundPage'), 'NotFoundPage');
const CreatorMarketplaceNepalPage = named(() => import('./pages/landing/content/CreatorMarketplaceNepalPage'), 'CreatorMarketplaceNepalPage');
const ContentCreatorsPage = named(() => import('./pages/landing/content/ContentCreatorsPage'), 'ContentCreatorsPage');
const BrandsPage = named(() => import('./pages/landing/content/BrandsPage'), 'BrandsPage');
const InfluencerMarketingNepalPage = named(() => import('./pages/landing/content/InfluencerMarketingNepalPage'), 'InfluencerMarketingNepalPage');
const BrandCollaborationNepalPage = named(() => import('./pages/landing/content/BrandCollaborationNepalPage'), 'BrandCollaborationNepalPage');
const TikTokCreatorsPage = named(() => import('./pages/landing/content/TikTokCreatorsPage'), 'TikTokCreatorsPage');
const InstagramCreatorsPage = named(() => import('./pages/landing/content/InstagramCreatorsPage'), 'InstagramCreatorsPage');
const YouTubeCreatorsPage = named(() => import('./pages/landing/content/YouTubeCreatorsPage'), 'YouTubeCreatorsPage');
const FacebookCreatorsPage = named(() => import('./pages/landing/content/FacebookCreatorsPage'), 'FacebookCreatorsPage');
const InfluencersPage = named(() => import('./pages/landing/content/InfluencersPage'), 'InfluencersPage');
const FindCampaignsPage = named(() => import('./pages/landing/content/FindCampaignsPage'), 'FindCampaignsPage');
const PaidCollaborationsPage = named(() => import('./pages/landing/content/PaidCollaborationsPage'), 'PaidCollaborationsPage');
const UGCCreatorsPage = named(() => import('./pages/landing/content/UGCCreatorsPage'), 'UGCCreatorsPage');
const IndustriesHubPage = named(() => import('./pages/landing/content/IndustriesHubPage'), 'IndustriesHubPage');
const CitiesHubPage = named(() => import('./pages/landing/content/CitiesHubPage'), 'CitiesHubPage');
const NichePage = named(() => import('./pages/landing/content/niche/NichePage'), 'NichePage');
import { INDUSTRY_PAGES } from './pages/landing/content/niche/industries.data';
import { CITY_PAGES } from './pages/landing/content/niche/cities.data';

const Login = named(() => import('./pages/Login'), 'Login');
const DashboardLayout = named(() => import('./layouts/DashboardLayout'), 'DashboardLayout');
const Dashboard = named(() => import('./pages/Dashboard'), 'Dashboard');
const Users = named(() => import('./pages/Users'), 'Users');
const Creators = named(() => import('./pages/Creators'), 'Creators');
const Businesses = named(() => import('./pages/Businesses'), 'Businesses');
const Campaigns = named(() => import('./pages/Campaigns'), 'Campaigns');
const Payments = named(() => import('./pages/Payments'), 'Payments');
const Referrals = named(() => import('./pages/Referrals'), 'Referrals');
const Reports = named(() => import('./pages/Reports'), 'Reports');
const Settings = named(() => import('./pages/Settings'), 'Settings');
const ContactInfo = named(() => import('./pages/ContactInfo'), 'ContactInfo');
const RateLimits = named(() => import('./pages/RateLimits'), 'RateLimits');
const AuditLogs = named(() => import('./pages/AuditLogs'), 'AuditLogs');
const VerificationDashboard = named(() => import('./pages/VerificationDashboard'), 'VerificationDashboard');
const ActivityLogs = named(() => import('./pages/ActivityLogs'), 'ActivityLogs');
const HelpCenter = named(() => import('./pages/HelpCenter'), 'HelpCenter');
const FAQManager = named(() => import('./pages/FAQManager'), 'FAQManager');
const SupportInbox = named(() => import('./pages/SupportInbox'), 'SupportInbox');
const GetInTouch = named(() => import('./pages/GetInTouch'), 'GetInTouch');
const LegalEditor = named(() => import('./pages/LegalEditor'), 'LegalEditor');
const ContractTemplateEditor = named(() => import('./pages/ContractTemplateEditor'), 'ContractTemplateEditor');
const Conversations = named(() => import('./pages/Conversations'), 'Conversations');
const Notifications = named(() => import('./pages/Notifications'), 'Notifications');
const CampaignDetail = named(() => import('./pages/CampaignDetail'), 'CampaignDetail');
const UserAnalytics = named(() => import('./pages/UserAnalytics'), 'UserAnalytics');
const CategoriesPage = named(() => import('./pages/categories/CategoriesPage'), 'CategoriesPage');
const NewCategoryPage = named(() => import('./pages/categories/NewCategoryPage'), 'NewCategoryPage');
const EditCategoryPage = named(() => import('./pages/categories/EditCategoryPage'), 'EditCategoryPage');
const PlatformsPage = named(() => import('./pages/platforms/PlatformsPage'), 'PlatformsPage');
const NewPlatformPage = named(() => import('./pages/platforms/NewPlatformPage'), 'NewPlatformPage');
const EditPlatformPage = named(() => import('./pages/platforms/EditPlatformPage'), 'EditPlatformPage');
const SuccessStoriesPage = named(() => import('./pages/success-stories/SuccessStoriesPage'), 'SuccessStoriesPage');
const NewSuccessStoryPage = named(() => import('./pages/success-stories/NewSuccessStoryPage'), 'NewSuccessStoryPage');
const EditSuccessStoryPage = named(() => import('./pages/success-stories/EditSuccessStoryPage'), 'EditSuccessStoryPage');

// Admin-only data providers — mounted only inside the authenticated dashboard
// so public routes (landing page, login) never trigger admin-scoped API calls.
function AdminProviders() {
  return (
    <CategoriesProvider>
      <PlatformsProvider>
        <PaymentMethodsProvider>
          <SuccessStoriesProvider>
            <NotificationProvider>
              <Outlet />
            </NotificationProvider>
          </SuccessStoriesProvider>
        </PaymentMethodsProvider>
      </PlatformsProvider>
    </CategoriesProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
       <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/creator-marketplace-nepal" element={<CreatorMarketplaceNepalPage />} />
          <Route path="/content-creators" element={<ContentCreatorsPage />} />
          <Route path="/brands" element={<BrandsPage />} />
          <Route path="/influencer-marketing-nepal" element={<InfluencerMarketingNepalPage />} />
          <Route path="/brand-collaboration-nepal" element={<BrandCollaborationNepalPage />} />
          <Route path="/tiktok-creators" element={<TikTokCreatorsPage />} />
          <Route path="/instagram-creators" element={<InstagramCreatorsPage />} />
          <Route path="/youtube-creators" element={<YouTubeCreatorsPage />} />
          <Route path="/facebook-creators" element={<FacebookCreatorsPage />} />
          <Route path="/influencers" element={<InfluencersPage />} />
          <Route path="/find-campaigns" element={<FindCampaignsPage />} />
          <Route path="/paid-collaborations-nepal" element={<PaidCollaborationsPage />} />
          <Route path="/ugc-creators-nepal" element={<UGCCreatorsPage />} />
          <Route path="/industries-nepal" element={<IndustriesHubPage />} />
          <Route path="/cities-nepal" element={<CitiesHubPage />} />
          {INDUSTRY_PAGES.map((cfg) => (
            <Route key={cfg.slug} path={`/${cfg.slug}`} element={<NichePage config={cfg} />} />
          ))}
          {CITY_PAGES.map((cfg) => (
            <Route key={cfg.slug} path={`/${cfg.slug}`} element={<NichePage config={cfg} />} />
          ))}
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminProviders />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/users" element={<Users />} />
                <Route path="/creators" element={<Creators />} />
                <Route path="/businesses" element={<Businesses />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/campaigns/:id" element={<CampaignDetail />} />
                <Route path="/analytics/:userId" element={<UserAnalytics />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/categories/new" element={<NewCategoryPage />} />
                <Route path="/categories/edit/:id" element={<EditCategoryPage />} />
                <Route path="/platforms" element={<PlatformsPage />} />
                <Route path="/platforms/new" element={<NewPlatformPage />} />
                <Route path="/platforms/edit/:id" element={<EditPlatformPage />} />
                <Route path="/success-stories" element={<SuccessStoriesPage />} />
                <Route path="/success-stories/new" element={<NewSuccessStoryPage />} />
                <Route path="/success-stories/edit/:id" element={<EditSuccessStoryPage />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/referrals" element={<Referrals />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/help-center" element={<HelpCenter />} />
                <Route path="/faqs" element={<FAQManager />} />
                <Route path="/support-inbox" element={<SupportInbox />} />
                <Route path="/get-in-touch" element={<GetInTouch />} />
                <Route path="/legal"          element={<LegalEditor />} />
                <Route path="/contracts"      element={<ContractTemplateEditor />} />
                <Route path="/conversations" element={<Conversations />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/contact-info" element={<ContactInfo />} />
                <Route path="/rate-limits" element={<RateLimits />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                <Route path="/verification" element={<VerificationDashboard />} />
                <Route path="/activity-logs" element={<ActivityLogs />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
       </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
