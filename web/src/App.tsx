import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CategoriesProvider } from './context/CategoriesContext';
import { PlatformsProvider } from './context/PlatformsContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Creators } from './pages/Creators';
import { Businesses } from './pages/Businesses';
import { Campaigns } from './pages/Campaigns';
import { Payments } from './pages/Payments';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { HelpCenter } from './pages/HelpCenter';
import { FAQManager } from './pages/FAQManager';
import { SupportInbox } from './pages/SupportInbox';
import { LegalEditor } from './pages/LegalEditor';
import { Conversations } from './pages/Conversations';
import { CampaignDetail } from './pages/CampaignDetail';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { NewCategoryPage } from './pages/categories/NewCategoryPage';
import { EditCategoryPage } from './pages/categories/EditCategoryPage';
import { PlatformsPage } from './pages/platforms/PlatformsPage';
import { NewPlatformPage } from './pages/platforms/NewPlatformPage';
import { EditPlatformPage } from './pages/platforms/EditPlatformPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CategoriesProvider>
          <PlatformsProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/creators" element={<Creators />} />
                  <Route path="/businesses" element={<Businesses />} />
                  <Route path="/campaigns" element={<Campaigns />} />
                  <Route path="/campaigns/:id" element={<CampaignDetail />} />
                  <Route path="/categories" element={<CategoriesPage />} />
                  <Route path="/categories/new" element={<NewCategoryPage />} />
                  <Route path="/categories/edit/:id" element={<EditCategoryPage />} />
                  <Route path="/platforms" element={<PlatformsPage />} />
                  <Route path="/platforms/new" element={<NewPlatformPage />} />
                  <Route path="/platforms/edit/:id" element={<EditPlatformPage />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/help-center" element={<HelpCenter />} />
                  <Route path="/faqs" element={<FAQManager />} />
                  <Route path="/support-inbox" element={<SupportInbox />} />
                  <Route path="/legal"          element={<LegalEditor />} />
                  <Route path="/conversations" element={<Conversations />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
            </Routes>
          </PlatformsProvider>
        </CategoriesProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
