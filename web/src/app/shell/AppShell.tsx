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
import { TestPhasePill } from './TestPhasePill';
import { LandingThemeProvider } from '../../pages/landing/context/ThemeContext';
import { ThemeToggle } from '../../pages/landing/components/ThemeToggle';

/**
 * Authenticated shell for /creator/* and /business/*, in the landing page's
 * design language (same as the admin): the theme-aware lavender/navy base
 * with brand glows (+ starfield in dark), a glass sidebar with a gradient
 * pill for the active page, and a glass topbar with the theme toggle.
 * `.app-scope` (index.css) re-points the semantic tokens the pages use for
 * both themes; `.creator-scope`/`.business-scope` pick the brinjal or green
 * accent. Desktop: persistent sidebar + topbar. Mobile: the sidebar becomes a
 * slide-in drawer and the topbar carries the menu button + bottom tab bar.
 */
export function AppShell() {
  return (
    <LandingThemeProvider>
      <AppShellInner />
    </LandingThemeProvider>
  );
}

function AppShellInner() {
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
        'app-scope lp-stars relative isolate min-h-screen bg-paper text-ink lg:flex',
        user.role === 'BUSINESS' ? 'business-scope' : 'creator-scope',
      )}
    >
      {/* Brand glows — accent wash top-left, saffron ember bottom-right. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-48 -top-48 h-[560px] w-[560px] rounded-full bg-brand/20 blur-[140px]" />
        <div className="absolute -bottom-48 -right-40 h-[480px] w-[480px] rounded-full bg-lp-orange/10 blur-[140px]" />
      </div>

      {/* ── Sidebar (desktop) ── */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-line bg-surface/80 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center px-5 border-b border-line">
          <Logo className="h-7" to={dashboardPath} />
        </div>
        <SidebarNav groups={groups} onSignOut={handleLogout} />
        <SidebarUser identifier={identifier} />
      </aside>

      {/* ── Mobile drawer ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-lp-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col border-r border-line bg-surface shadow-xl">
            <div className="flex h-16 items-center justify-between px-5 border-b border-line">
              <Logo className="h-7" to={dashboardPath} />
              {/* Theme toggle lives here on phones — the topbar is too tight. */}
              <ThemeToggle className="ml-auto mr-3 flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:text-ink sm:hidden" />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label={t('nav.closeMenu')}
                className="text-ink-soft hover:text-ink transition-colors"
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
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-surface/70 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label={t('nav.openMenu')}
            className="rounded-full p-2 text-ink-soft hover:bg-surface-dim lg:hidden"
          >
            <Menu size={20} />
          </button>
          <span className="flex-shrink-0 lg:hidden"><Logo className="h-6" to={dashboardPath} /></span>

          <form onSubmit={submitSearch} className="hidden max-w-md flex-1 lg:block">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('dashboard.searchPlaceholder')}
                aria-label={t('dashboard.searchPlaceholder')}
                className="h-10 w-full rounded-full border border-line bg-surface-dim pl-9 pr-4 text-[13.5px] text-ink transition-[color,box-shadow] duration-150 placeholder:text-ink-soft/70 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand/60 focus:shadow-[0_0_30px_-8px_var(--app-glow)]"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            <TestPhasePill />
            <LanguageSwitcher />
            <ThemeToggle className="hidden h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:bg-surface-dim hover:text-ink sm:flex" />
            <NavLink
              to={messagesPath}
              aria-label={t('nav.messages')}
              className={({ isActive }) =>
                cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft hover:bg-surface-dim hover:text-ink transition-colors',
                  isActive && 'bg-surface-dim text-ink',
                )
              }
            >
              <MessageCircle size={16} strokeWidth={2} />
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

        <main className="relative flex-1 px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
          <div className="mx-auto w-full max-w-7xl">
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
    <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-5 scrollbar-hide">
      {groups.map((group) => (
        <div key={group.labelKey}>
          <p className="px-3 mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft/70">
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
                    'flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm transition-all',
                    isActive ? 'app-active-pill font-medium' : 'text-ink-soft hover:text-ink hover:bg-surface-dim',
                  )
                }
              >
                <Icon size={17} strokeWidth={1.75} />
                {t(`nav.${key}`)}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
      <div>
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <LogOut size={17} strokeWidth={1.75} />
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
    <div className="border-t border-line px-3 py-4">
      <div className="flex items-center gap-3 px-2 py-2">
        <Avatar name={user.name} src={user.avatar} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{user.name}</p>
          <p className="truncate text-xs text-ink-soft">{identifier}</p>
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
        className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-2.5 transition-colors hover:bg-surface-dim"
      >
        <Avatar name={user.name} src={user.avatar} size="sm" />
        <ChevronDown size={14} className={cn('text-ink-soft transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-[0_24px_60px_-24px_rgba(10,16,51,0.45)]">
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
