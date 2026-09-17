import { useEffect, useState, type FormEvent } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Search, MessageCircle, ChevronDown, User as UserIcon } from 'lucide-react';
import { useAppAuth } from '../auth/AppAuthContext';
import { useT } from '../i18n';
import { displayIdentifier } from '../lib/identity';
import { navGroupsFor, bottomNavFor, type NavGroup } from './nav';
import { BottomNav } from './BottomNav';
import { cn } from '../ui/cn';
import { Logo } from '../ui/Logo';
import { Avatar } from '../ui/Avatar';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { NotificationsProvider } from '../notifications/NotificationsContext';
import { NotificationsBell } from '../notifications/NotificationsBell';
import { TestPhaseBanner } from '../public/TestPhaseBanner';

/**
 * Authenticated shell for /creator/* and /business/*, reskinned to match the
 * admin dashboard's plain SaaS chrome: a dark slate sidebar with grouped/
 * labeled nav sections, a white topbar with search + notifications + a user
 * dropdown menu, and a flat gray-50 canvas (no editorial mesh glow). Desktop:
 * persistent sidebar + topbar. Mobile: the sidebar becomes a slide-in drawer
 * and the topbar carries the menu button + bottom tab bar.
 */
export function AppShell() {
  const { user, logout } = useAppAuth();
  const t = useT();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const closeDrawer = () => setDrawerOpen(false);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  if (!user) return null;
  const groups = navGroupsFor(user.role);
  const messagesPath = user.role === 'BUSINESS' ? '/business/messages' : '/creator/messages';
  const searchTarget = user.role === 'BUSINESS' ? '/business/creators' : '/creator/events';
  const dashboardPath = user.role === 'BUSINESS' ? '/business' : '/creator';
  const settingsPath = user.role === 'BUSINESS' ? '/business/settings' : '/creator/settings';
  const identifier = displayIdentifier(user);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `${searchTarget}?q=${encodeURIComponent(q)}` : searchTarget);
  };

  function handleLogout() {
    setUserMenuOpen(false);
    closeDrawer();
    logout();
  }

  return (
    <NotificationsProvider>
    <div
      className={cn(
        'app-scope min-h-screen bg-paper text-ink lg:flex',
        user.role === 'BUSINESS' ? 'business-scope' : 'creator-scope',
      )}
    >
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden w-64 flex-shrink-0 flex-col bg-slate-900 lg:flex">
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5 rounded-lg bg-white px-2.5 py-1.5">
            <Logo className="h-6" to={dashboardPath} />
          </div>
        </div>
        <SidebarNav groups={groups} onSignOut={handleLogout} />
        <SidebarUser identifier={identifier} />
      </aside>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col bg-slate-900 shadow-xl">
            <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
              <div className="flex items-center gap-2.5 rounded-lg bg-white px-2.5 py-1.5">
                <Logo className="h-6" to={dashboardPath} />
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label={t('nav.closeMenu')}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <SidebarNav groups={groups} onNavigate={closeDrawer} onSignOut={handleLogout} />
            <SidebarUser identifier={identifier} />
          </aside>
        </div>
      )}

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 sm:px-6">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label={t('nav.openMenu')}
            className="rounded-lg p-2 text-ink-soft hover:bg-surface-dim lg:hidden"
          >
            <Menu size={20} />
          </button>
          <Logo className="h-6 lg:hidden" to={dashboardPath} />

          <form onSubmit={submitSearch} className="hidden max-w-md flex-1 lg:block">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('dashboard.searchPlaceholder')}
                aria-label={t('dashboard.searchPlaceholder')}
                className="h-10 w-full rounded-full border border-line bg-paper pl-9 pr-4 text-[13.5px] text-ink transition-colors duration-150 placeholder:text-ink-soft/70 focus:border-transparent focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            <LanguageSwitcher />
            <NavLink
              to={messagesPath}
              aria-label={t('nav.messages')}
              className={({ isActive }) =>
                cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-dim hover:text-ink transition-colors',
                  isActive && 'bg-surface-dim text-ink',
                )
              }
            >
              <MessageCircle size={18} strokeWidth={2} />
            </NavLink>
            <NotificationsBell />

            {/* User menu */}
            <UserMenu
              open={userMenuOpen}
              onToggle={() => setUserMenuOpen((v) => !v)}
              onClose={() => setUserMenuOpen(false)}
              onProfileSettings={() => {
                setUserMenuOpen(false);
                navigate(settingsPath);
              }}
              onLogout={handleLogout}
              identifier={identifier}
            />
          </div>
        </header>

        <main className="relative flex-1 bg-paper px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
          <div className="mx-auto w-full max-w-7xl">
            <TestPhaseBanner className="mb-6" />
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav items={bottomNavFor(user.role)} />
    </div>
    </NotificationsProvider>
  );
}

function SidebarNav({
  groups,
  onNavigate,
  onSignOut,
}: {
  groups: NavGroup[];
  onNavigate?: () => void;
  onSignOut: () => void;
}) {
  const t = useT();
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
      {groups.map((group) => (
        <div key={group.labelKey}>
          <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {t(`nav.${group.labelKey}`)}
          </p>
          <div className="space-y-0.5">
            {group.items.map(({ key, to, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-brand text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800',
                  )
                }
              >
                <Icon size={17} strokeWidth={2} />
                {t(`nav.${key}`)}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
      <div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={18} strokeWidth={2} />
          {t('common.signOut')}
        </button>
      </div>
    </nav>
  );
}

function SidebarUser({ identifier }: { identifier: string }) {
  const { user } = useAppAuth();
  if (!user) return null;
  return (
    <div className="border-t border-slate-800 px-3 py-4">
      <div className="flex items-center gap-3 px-2 py-2">
        <Avatar name={user.name} src={user.avatar} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{identifier}</p>
        </div>
      </div>
    </div>
  );
}

function UserMenu({
  open,
  onToggle,
  onClose,
  onProfileSettings,
  onLogout,
  identifier,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onProfileSettings: () => void;
  onLogout: () => void;
  identifier: string;
}) {
  const { user } = useAppAuth();
  const t = useT();

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const el = document.getElementById('app-user-menu');
      if (el && !el.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, onClose]);

  if (!user) return null;

  return (
    <div id="app-user-menu" className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-surface-dim"
      >
        <Avatar name={user.name} src={user.avatar} size="sm" />
        <ChevronDown size={14} className={cn('text-ink-soft transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-line bg-surface py-1 shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="mt-0.5 truncate text-xs text-ink-soft">{identifier}</p>
          </div>
          <button
            onClick={onProfileSettings}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface-dim"
          >
            <UserIcon size={15} className="text-ink-soft" />
            {t('nav.profileSettings')}
          </button>
          <div className="mt-1 border-t border-line pt-1">
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-danger transition-colors hover:bg-danger-soft"
            >
              <LogOut size={15} />
              {t('common.signOut')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
