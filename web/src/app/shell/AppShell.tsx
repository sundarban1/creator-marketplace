import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAppAuth } from '../auth/AppAuthContext';
import { useT } from '../i18n';
import { navFor, type NavItem } from './nav';
import { cn } from '../ui/cn';
import { Logo } from '../ui/Logo';
import { Avatar } from '../ui/Avatar';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { NotificationsProvider } from '../notifications/NotificationsContext';
import { NotificationsBell } from '../notifications/NotificationsBell';

/**
 * Authenticated shell for /creator/* and /business/*. Desktop: persistent
 * sidebar + slim topbar. Mobile: the sidebar becomes a slide-in drawer and the
 * topbar carries the menu button (spec §53–54, §81).
 */
export function AppShell() {
  const { user, logout } = useAppAuth();
  const t = useT();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  if (!user) return null;
  const items = navFor(user.role);

  return (
    <NotificationsProvider>
    <div className="min-h-screen bg-paper text-ink lg:flex">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo className="h-7" />
        </div>
        <SidebarNav items={items} />
        <UserFooter
          name={user.name}
          sub={user.role === 'BUSINESS' ? t('roles.business') : t('roles.creator')}
          avatar={user.avatar}
          onSignOut={logout}
          signOutLabel={t('common.signOut')}
        />
      </aside>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between px-5">
              <Logo className="h-7" />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label={t('nav.closeMenu')}
                className="rounded-lg p-2 text-ink-soft hover:bg-surface-dim"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarNav items={items} onNavigate={closeDrawer} />
            <UserFooter
              name={user.name}
              sub={user.role === 'BUSINESS' ? t('roles.business') : t('roles.creator')}
              avatar={user.avatar}
              onSignOut={logout}
              signOutLabel={t('common.signOut')}
            />
          </aside>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label={t('nav.openMenu')}
            className="rounded-lg p-2 text-ink-soft hover:bg-surface-dim lg:hidden"
          >
            <Menu size={20} />
          </button>
          <Logo className="h-6 lg:hidden" />

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <NotificationsBell />
            <Avatar name={user.name} src={user.avatar} size="sm" className="ml-1" />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Wide app canvas — detail/reading views constrain themselves
              (e.g. EventDetailBody's max-w-4xl) so long-form content stays
              legible while lists and dashboards use the full width. */}
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    </NotificationsProvider>
  );
}

function SidebarNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const t = useT();
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-2">
      <ul className="space-y-0.5">
        {items.map(({ key, to, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors',
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-ink-soft hover:bg-surface-dim hover:text-ink',
                )
              }
            >
              <Icon size={18} strokeWidth={2} />
              {t(`nav.${key}`)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function UserFooter({
  name,
  sub,
  avatar,
  onSignOut,
  signOutLabel,
}: {
  name: string;
  sub: string;
  avatar: string | null;
  onSignOut: () => void;
  signOutLabel: string;
}) {
  return (
    <div className="border-t border-line p-3">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <Avatar name={name} src={avatar} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">{name}</p>
          <p className="truncate text-[12px] text-ink-soft">{sub}</p>
        </div>
        <button
          onClick={onSignOut}
          aria-label={signOutLabel}
          title={signOutLabel}
          className="rounded-lg p-2 text-ink-soft hover:bg-surface-dim hover:text-danger"
        >
          <LogOut size={17} />
        </button>
      </div>
    </div>
  );
}
