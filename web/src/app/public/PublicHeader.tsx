import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useT } from '../i18n';
import { paths } from '../routes';
import { cn } from '../ui/cn';
import { Logo } from '../ui/Logo';
import { Button } from '../ui/Button';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

const LINKS = [
  { key: 'public.navHowItWorks', to: '/' },
  { key: 'public.navForCreators', to: '/content-creators' },
  { key: 'public.navForBusinesses', to: '/brands' },
  { key: 'public.navCreators', to: '/creators' },
  { key: 'public.navEvents', to: '/events' },
];

export function PublicHeader() {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo className="h-7" />

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-[14px] font-medium transition-colors',
                  isActive && l.to !== '/'
                    ? 'text-brand'
                    : 'text-ink-soft hover:text-ink',
                )
              }
            >
              {t(l.key)}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <Link to={paths.login} className="hidden sm:block">
            <Button variant="ghost" size="sm">
              {t('public.logIn')}
            </Button>
          </Link>
          <Link to={paths.signup} className="hidden sm:block">
            <Button size="sm">{t('public.getStarted')}</Button>
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={t('nav.openMenu')}
            aria-expanded={open}
            className="rounded-lg p-2 text-ink-soft hover:bg-surface-dim lg:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-paper px-4 py-3 lg:hidden">
          <nav className="flex flex-col">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink"
              >
                {t(l.key)}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <LanguageSwitcher />
            <div className="flex gap-2">
              <Link to={paths.login}>
                <Button variant="secondary" size="sm">
                  {t('public.logIn')}
                </Button>
              </Link>
              <Link to={paths.signup}>
                <Button size="sm">{t('public.getStarted')}</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
