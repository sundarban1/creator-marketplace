import { useEffect, useRef, useState, type FormEvent } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, UserRound, Search, MessageCircle, ChevronDown } from 'lucide-react';
import { useAppAuth } from '../auth/AppAuthContext';
import { useT } from '../i18n';
import { navFor, bottomNavFor, type NavItem } from './nav';
import { BottomNav } from './BottomNav';
import { cn } from '../ui/cn';
import { Logo } from '../ui/Logo';
import { Avatar } from '../ui/Avatar';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { NotificationsProvider } from '../notifications/NotificationsContext';
import { NotificationsBell } from '../notifications/NotificationsBell';
import type { AppRole } from '../api/auth';

/**
 * Authenticated shell for /creator/* and /business/*. Desktop: persistent
 * sidebar + slim topbar. Mobile: the sidebar becomes a slide-in drawer and the
 * topbar carries the menu button (spec §53–54, §81).
 */
export function AppShell() {
  const { user, logout } = useAppAuth();
  const t = useT();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
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
  const items = navFor(user.role);
  const messagesPath = user.role === 'BUSINESS' ? '/business/messages' : '/creator/messages';
  const searchTarget = user.role === 'BUSINESS' ? '/business/creators' : '/creator/events';
  const dashboardPath = user.role === 'BUSINESS' ? '/business' : '/creator';

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `${searchTarget}?q=${encodeURIComponent(q)}` : searchTarget);
  };

  return (
    <NotificationsProvider>
    <div className="min-h-screen bg-paper text-ink lg:flex">
      {/* ── Sidebar (desktop) ── */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo className="h-7" to={dashboardPath} />
        </div>
        <SidebarNav items={items} />
        <SidebarCopyright />
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
              <Logo className="h-7" to={dashboardPath} />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label={t('nav.closeMenu')}
                className="rounded-lg p-2 text-ink-soft hover:bg-surface-dim"
              >
                <X size={20} />
              </button>
            </div>
            <SidebarNav items={items} onNavigate={closeDrawer} />
            <SidebarCopyright />
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
          <Logo className="h-6 lg:hidden" to={dashboardPath} />

          <form onSubmit={submitSearch} className="hidden max-w-md flex-1 lg:block">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('dashboard.searchPlaceholder')}
                aria-label={t('dashboard.searchPlaceholder')}
                className="h-10 w-full rounded-full border border-line bg-surface-dim/60 pl-9 pr-4 text-[13.5px] text-ink placeholder:text-ink-soft/70 focus:border-violet/40 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-violet/20"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <NavLink
              to={messagesPath}
              aria-label={t('nav.messages')}
              className={({ isActive }) =>
                cn(
                  'flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-surface-dim hover:text-ink',
                  isActive && 'bg-violet/10 text-violet-dark',
                )
              }
            >
              <MessageCircle size={18} strokeWidth={2} />
            </NavLink>
            <NotificationsBell />
            <UserMenu name={user.name} avatar={user.avatar} role={user.role} onSignOut={logout} />
          </div>
        </header>

        <main className="relative flex-1 px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
          {/* Ambient editorial glow — same violet/orange mesh the public
              browse + detail pages carry, so the canvas reads as one site. */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] overflow-hidden">
            <div className="mesh-blob absolute left-[3%] top-[-40%] h-[340px] w-[340px] rounded-full bg-violet/[0.09] blur-[120px]" />
            <div
              className="mesh-blob absolute right-[-6%] top-[-20%] h-[300px] w-[300px] rounded-full bg-brand-orange/[0.07] blur-[120px]"
              style={{ animationDelay: '3s' }}
            />
          </div>
          {/* Wide app canvas — detail/reading views constrain themselves
              (e.g. EventDetailBody's max-w-4xl) so long-form content stays
              legible while lists and dashboards use the full width. */}
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
                  'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors',
                  isActive
                    ? 'bg-violet/10 text-violet-dark before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-full before:bg-gradient-to-b before:from-violet before:to-brand-orange'
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

function SidebarCopyright() {
  const t = useT();
  return (
    <div className="border-t border-line px-4 py-3">
      <p className="text-[11.5px] leading-relaxed text-ink-soft">
        {t('common.copyright', { year: String(new Date().getFullYear()) })}
      </p>
    </div>
  );
}

function UserMenu({
  name,
  avatar,
  role,
  onSignOut,
}: {
  name: string;
  avatar: string | null;
  role: AppRole;
  onSignOut: () => void;
}) {
  const t = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const profilePath = role === 'BUSINESS' ? '/business/profile' : '/creator/profile';

  return (
    <div ref={ref} className="relative ml-1">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-surface-dim focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Avatar name={name} src={avatar} size="sm" />
        <span className="max-w-[120px] truncate text-[13px] font-semibold text-ink">{name}</span>
        <ChevronDown
          size={15}
          className={cn('flex-shrink-0 text-ink-soft transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-line bg-surface py-1 shadow-xl">
          <button
            onClick={() => {
              setOpen(false);
              navigate(profilePath);
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-ink hover:bg-surface-dim"
          >
            <UserRound size={16} />
            {t('nav.profile')}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-ink hover:bg-surface-dim hover:text-danger"
          >
            <LogOut size={16} />
            {t('common.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}
