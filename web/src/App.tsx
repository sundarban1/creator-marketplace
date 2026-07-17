import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CategoriesProvider } from './context/CategoriesContext';
import { PlatformsProvider } from './context/PlatformsContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LandingPage } from './pages/landing/LandingPage';
import { PrivacyPage, TermsPage } from './pages/landing/LegalDocPage';
import { SupportPage } from './pages/landing/SupportPage';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Creators } from './pages/Creators';
import { Businesses } from './pages/Businesses';
import { Campaigns } from './pages/Campaigns';
import { Payments } from './pages/Payments';
import { Referrals } from './pages/Referrals';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { HelpCenter } from './pages/HelpCenter';
import { FAQManager } from './pages/FAQManager';
import { SupportInbox } from './pages/SupportInbox';
import { GetInTouch } from './pages/GetInTouch';
import { LegalEditor } from './pages/LegalEditor';
import { Conversations } from './pages/Conversations';
import { Notifications } from './pages/Notifications';
import { CampaignDetail } from './pages/CampaignDetail';
import { UserAnalytics } from './pages/UserAnalytics';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { NewCategoryPage } from './pages/categories/NewCategoryPage';
import { EditCategoryPage } from './pages/categories/EditCategoryPage';
import { PlatformsPage } from './pages/platforms/PlatformsPage';
import { NewPlatformPage } from './pages/platforms/NewPlatformPage';
import { EditPlatformPage } from './pages/platforms/EditPlatformPage';

// Admin-only data providers — mounted only inside the authenticated dashboard
// so public routes (landing page, login) never trigger admin-scoped API calls.
function AdminProviders() {
  return (
    <CategoriesProvider>
      <PlatformsProvider>
        <NotificationProvider>
          <Outlet />
        </NotificationProvider>
      </PlatformsProvider>
    </CategoriesProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/support" element={<SupportPage />} />
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
                <Route path="/payments" element={<Payments />} />
                <Route path="/referrals" element={<Referrals />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/help-center" element={<HelpCenter />} />
                <Route path="/faqs" element={<FAQManager />} />
                <Route path="/support-inbox" element={<SupportInbox />} />
                <Route path="/get-in-touch" element={<GetInTouch />} />
                <Route path="/legal"          element={<LegalEditor />} />
                <Route path="/conversations" element={<Conversations />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
