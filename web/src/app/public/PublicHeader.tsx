import { useEffect, useState } from 'react';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAppLanguage, useT, type Lang } from '../i18n';
import { useLandingTheme } from '../../pages/landing/context/ThemeContext';
import { NAV_LINKS } from '../../pages/landing/constants';

/**
 * Header for the public marketplace pages (/creators, /events, …). Carries the
 * same menu as the landing site's nav plus the EN/ने + dark-mode toggles, so
 * moving from the landing into the marketplace feels like one site.
 *
 * The landing's own `id` nav links scroll to sections that only exist on `/`;
 * here they navigate to `/#section` and the home page scrolls on arrival
 * (LandingPage reads `location.hash`). `to` links navigate directly.
 *
 * Language runs off this app's persistent `useAppLanguage`; the theme toggle
 * uses the landing ThemeProvider that PublicLayout mounts.
 */
export function PublicHeader() {
  const t = useT();
  const { language, setLanguage } = useAppLanguage();
  const { theme, toggleTheme } = useLandingTheme();
  const isDark = theme === 'dark';
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const label = (key: string) =>
    t(
      `public.nav${key.charAt(0).toUpperCase()}${key.slice(1)}`,
    );

  const hrefFor = (l: (typeof NAV_LINKS)[number]) => (l.to ? l.to : `/#${l.id}`);

  // `id` links point at a section that normally only exists on the landing
  // page — but a few of them (notably #contact, rendered by PublicLayout's
  // LandingFooter) are present on these pages too. When the target is on the
  // current page, smooth-scroll to it instead of navigating home.
  const onNavClick = (e: React.MouseEvent, l: (typeof NAV_LINKS)[number]) => {
    setOpen(false);
    // Re-clicking the link for the page you're already on (e.g. "Creators"
    // while on /creators) doesn't change the route, so PublicLayout's
    // ScrollToTop never fires — scroll back up here instead.
    if (l.to && l.to === pathname) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (l.to || !l.id) return;
    const el = document.getElementById(l.id);
    if (!el) return; // section isn't here — let the <Link> navigate to /#id
    e.preventDefault();
    const top = el.getBoundingClientRect().top + window.scrollY + (l.offset ?? 0);
    window.scrollTo({ top, behavior: 'smooth' });
  };

  // Single toggle showing the language you'll switch *to* (matches the landing
  // nav's LanguageSwitch), not two separate EN / ने buttons.
  const other: Lang = language === 'en' ? 'ne' : 'en';
  const langToggle = (
    <button
      onClick={() => setLanguage(other)}
      aria-label={other === 'en' ? 'Switch to English' : 'नेपालीमा बदल्नुहोस्'}
      className="flex h-7 min-w-7 items-center justify-center rounded-full border border-line-strong px-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-soft transition-colors hover:text-ink"
    >
      {other === 'en' ? 'EN' : 'ने'}
    </button>
  );

  const getStartedPill = (
    <Link
      to="/login"
      onClick={() => setOpen(false)}
      className="inline-flex items-center rounded-full bg-gradient-to-r from-violet to-brand-orange px-4 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-transform duration-300 hover:scale-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/40"
    >
      {t('public.getStarted')}
    </Link>
  );

  const themeToggle = (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-line-strong text-ink-soft transition-colors hover:text-ink"
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/" className="group flex flex-shrink-0 items-center transition-transform duration-300 ease-out hover:scale-[1.04]" aria-label="Kolab home">
          {/* h-9 matches LandingNav's logo (src/pages/landing/nav/LandingNav.tsx)
              so the wordmark stays the same size when navigating between the
              landing page and the marketplace pages (/creators, /businesses,
              /events). Keep the two in sync. */}
          <img src="/logo.png" alt="Kolab" className="h-9 w-auto object-contain" />
        </Link>

        {/* Desktop menu — landing's italic serif treatment. Every link gets the
            same hover-only gradient underline; none stays lit on its page, so
            the row reads identically wherever you are. */}
        <nav className="hidden items-center gap-9 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.key}
              to={hrefFor(l)}
              onClick={(e) => onNavClick(e, l)}
              className="group relative rounded pb-1 font-serif text-[13px] font-bold italic tracking-wide text-ink-soft transition-colors duration-300 hover:text-ink"
            >
              {label(l.key)}
              <span
                aria-hidden
                className="absolute bottom-0 left-0 h-[1.5px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-violet to-brand-orange transition-transform duration-300 ease-out group-hover:scale-x-100"
              />
            </Link>
          ))}
          {getStartedPill}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          {langToggle}
          <span aria-hidden className="h-5 w-px bg-line-strong" />
          {themeToggle}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={t('public.menu')}
          aria-expanded={open}
          className="rounded-full p-1 text-ink transition-colors duration-300 hover:bg-ink/5 lg:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-line bg-paper px-6 py-4 lg:hidden">
          <nav className="flex flex-col">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.key}
                to={hrefFor(l)}
                onClick={(e) => onNavClick(e, l)}
                className="rounded-lg py-2.5 font-serif text-lg font-bold italic text-ink"
              >
                {label(l.key)}
              </Link>
            ))}
            <div className="py-2.5">{getStartedPill}</div>
          </nav>
          <div className="mt-4 flex items-center gap-4 border-t border-line pt-4">
            {langToggle}
            <span aria-hidden className="h-5 w-px bg-line-strong" />
            {themeToggle}
          </div>
        </div>
      )}
    </header>
  );
}
