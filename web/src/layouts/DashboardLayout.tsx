import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { AdminChatWidget } from '../components/AdminChatWidget';
import { LandingThemeProvider } from '../pages/landing/context/ThemeContext';

function resolveTitle(pathname: string): string {
  if (pathname === '/admin/categories/new') return 'New Category';
  if (pathname.startsWith('/admin/categories/edit/')) return 'Edit Category';
  if (pathname === '/admin/platforms/new') return 'New Platform';
  if (pathname.startsWith('/admin/platforms/edit/')) return 'Edit Platform';
  const exact: Record<string, string> = {
    '/admin/dashboard': 'Dashboard',
    '/admin/users': 'Users',
    '/admin/creators': 'Creators',
    '/admin/businesses': 'Businesses',
    '/admin/campaigns': 'Events',
    '/admin/categories': 'Categories',
    '/admin/platforms': 'Platforms',
    '/admin/payments':    'Payments',
    '/admin/reports':     'Reports',
    '/admin/help-center':   'Help Center',
    '/admin/faqs':          'FAQ Manager',
    '/admin/support-inbox': 'Support Inbox',
    '/admin/legal':         'Legal Editor',
    '/admin/settings':      'Settings',
  };
  return exact[pathname] ?? 'Admin';
}

// Admin shell in the landing page's design language: the theme-aware
// lavender/navy base with brand glows (+ starfield in dark), a glass sidebar
// and topbar. `.admin-scope` (index.css) re-points the palette the page
// bodies are built from, so they follow the same look in both themes.
export function DashboardLayout() {
  return (
    <LandingThemeProvider>
      <DashboardLayoutInner />
    </LandingThemeProvider>
  );
}

function DashboardLayoutInner() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = resolveTitle(location.pathname);

  return (
    <div className="admin-scope lp-stars relative isolate flex h-screen overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-48 -top-48 h-[560px] w-[560px] rounded-full bg-lp-brinjal/20 blur-[140px]" />
        <div className="absolute -bottom-48 -right-40 h-[480px] w-[480px] rounded-full bg-lp-orange/10 blur-[140px]" />
      </div>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
      <AdminChatWidget />
    </div>
  );
}
