import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, UserRound } from 'lucide-react';
import { useAppAuth } from '../auth/AppAuthContext';
import { useT } from '../i18n';
import { navFor, type NavItem } from './nav';
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
            <UserMenu name={user.name} avatar={user.avatar} role={user.role} onSignOut={logout} />
          </div>
        </header>

        <main className="relative flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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

function UserFooter({
  name,
  sub,
  avatar,
}: {
  name: string;
  sub: string;
  avatar: string | null;
}) {
  return (
    <div className="border-t border-line p-3">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <Avatar name={name} src={avatar} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">{name}</p>
          <p className="truncate text-[12px] text-ink-soft">{sub}</p>
        </div>
      </div>
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
        aria-label={name}
        className="block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Avatar name={name} src={avatar} size="sm" />
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
