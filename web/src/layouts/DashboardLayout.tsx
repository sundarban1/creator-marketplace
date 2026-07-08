import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';

function resolveTitle(pathname: string): string {
  if (pathname === '/categories/new') return 'New Category';
  if (pathname.startsWith('/categories/edit/')) return 'Edit Category';
  if (pathname === '/platforms/new') return 'New Platform';
  if (pathname.startsWith('/platforms/edit/')) return 'Edit Platform';
  const exact: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/users': 'Users',
    '/creators': 'Creators',
    '/businesses': 'Businesses',
    '/campaigns': 'Events',
    '/categories': 'Categories',
    '/platforms': 'Platforms',
    '/payments':    'Payments',
    '/reports':     'Reports',
    '/help-center':   'Help Center',
    '/faqs':          'FAQ Manager',
    '/support-inbox': 'Support Inbox',
    '/legal':         'Legal Editor',
    '/settings':      'Settings',
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
    </div>
  );
}
