import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { AdminChatWidget } from '../components/AdminChatWidget';

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

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = resolveTitle(location.pathname);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title={title} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <AdminChatWidget />
    </div>
  );
}
