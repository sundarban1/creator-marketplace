import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { NAV_LINKS } from '../constants';
import { useLenisScroll } from '../hooks/useLenis';
import { useLandingLanguage } from '../context/LanguageContext';
import { useLandingTheme } from '../context/ThemeContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { pillCtaClass } from '../components/PillCta';

const LANGUAGE_NAMES: Record<'en' | 'ne', string> = { en: 'English', ne: 'नेपाली' };

// Full-width row used in the mobile menu overlay — mirrors LanguageSwitchMobile's
// segmented-control treatment so the two settings read as one family.
function ThemeToggleMobile() {
  const { theme, toggleTheme } = useLandingTheme();
  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-lp-fg/10 bg-lp-navy-2 p-1.5">
      {(['light', 'dark'] as const).map((t) => (
        <button
          key={t}
          onClick={() => t !== theme && toggleTheme()}
          aria-pressed={theme === t}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-center text-base font-medium transition-all duration-300 ${
            theme === t
              ? 'bg-gradient-to-r from-lp-brinjal via-[#8B5CF6] to-lp-orange text-white shadow-sm'
              : 'text-lp-fg/65 hover:text-lp-fg'
          }`}
        >
          {t === 'light' ? <Sun size={16} /> : <Moon size={16} />}
          {t === 'light' ? 'Light' : 'Dark'}
        </button>
      ))}
    </div>
  );
}

// Single toggle, same shell as ThemeToggle (h-7 circle, matching border
// treatment) so the two sit together as one visual unit — and same
// convention: like ThemeToggle shows the Sun icon (the target) while dark
// rather than the Moon (current state), this shows the language you'll
// *switch to* on click, not the one currently active.
function LanguageSwitch({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useLandingLanguage();
  const other = lang === 'en' ? 'ne' : 'en';
  return (
    <button
      onClick={() => setLang(other)}
      aria-label={`Switch to ${LANGUAGE_NAMES[other]}`}
      className={`flex h-7 min-w-7 items-center justify-center rounded-full border px-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors duration-300 ${
        dark
          ? 'border-ink/10 text-ink-soft hover:text-ink dark:border-lp-fg/10 dark:text-lp-fg dark:hover:text-lp-fg'
          : 'border-lp-fg/20 text-lp-fg/70 hover:text-lp-fg'
      }`}
    >
      {other === 'en' ? 'EN' : 'ने'}
    </button>
  );
}

// Full-width, full-name segmented control used in the mobile menu overlay — the
// compact icon-sized pill above reads as an afterthought at that scale, so this
// gets larger touch targets and spelled-out language names instead of EN/ने.
function LanguageSwitchMobile() {
  const { lang, setLang } = useLandingLanguage();
  return (
    <div className="flex items-center gap-1.5 rounded-2xl border border-lp-fg/10 bg-lp-navy-2 p-1.5">
      {(['en', 'ne'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`flex-1 rounded-xl px-4 py-3 text-center text-base font-medium transition-all duration-300 ${
            lang === l ? 'bg-gradient-to-r from-lp-brinjal via-[#8B5CF6] to-lp-orange text-white shadow-sm' : 'text-lp-fg/65 hover:text-lp-fg'
          }`}
        >
          {LANGUAGE_NAMES[l]}
        </button>
      ))}
    </div>
  );
}

export function LandingNav() {
  const { scrollTo } = useLenisScroll();
  const { d } = useLandingLanguage();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function go(id: string, offset?: number) {
    setOpen(false);
    setTimeout(() => scrollTo(`#${id}`, { offset }), open ? 350 : 0);
  }

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50">
        <div
          className={`border-b bg-lp-navy/90 backdrop-blur-xl transition-colors duration-300 ${scrolled ? 'border-lp-fg/10' : 'border-transparent'}`}
        >
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
            <button onClick={() => go('hero')} className="flex flex-shrink-0 items-center">
              <img src="/logo.png" alt="Kolab" className="h-8 w-auto object-contain" />
            </button>

            <nav className="hidden items-center gap-7 lg:flex">
              {NAV_LINKS.map((l) => {
                const cls =
                  'text-[15px] text-lp-fg/85 transition-colors duration-200 hover:text-lp-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lp-glow';
                return l.to ? (
                  <Link key={l.key} to={l.to} onClick={() => setOpen(false)} className={cls}>
                    {d.nav.links[l.key]}
                  </Link>
                ) : (
                  <button key={l.key} onClick={() => go(l.id!, l.offset)} className={cls}>
                    {d.nav.links[l.key]}
                  </button>
                );
              })}
            </nav>

            <div className="hidden flex-shrink-0 items-center gap-3 lg:flex">
              <LanguageSwitch dark />
              <ThemeToggle dark />
              <Link to="/signup" className={pillCtaClass('gradient')}>
                {d.nav.getStarted}
              </Link>
              <span aria-hidden className="h-5 w-px bg-lp-fg/25" />
              <Link to="/login" className="text-[15px] font-medium text-lp-fg/90 transition-colors hover:text-lp-fg">
                {d.nav.login}
              </Link>
            </div>

            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={d.nav.toggleMenuAriaLabel}
              aria-expanded={open}
              className="rounded-full p-1.5 text-lp-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lp-glow lg:hidden"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            data-lenis-prevent
            className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-lp-navy px-8 py-24"
          >
            <div className="m-auto flex w-full flex-col gap-1">
              {NAV_LINKS.map((l, i) => {
                const cls =
                  'group relative w-fit rounded py-2.5 text-left lp-display text-4xl text-lp-fg/90 transition-colors duration-300 hover:text-lp-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lp-glow';
                const anim = {
                  initial: { opacity: 0, x: -16 },
                  animate: { opacity: 1, x: 0 },
                  transition: { delay: 0.08 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
                };
                const inner = (
                  <>
                    {d.nav.links[l.key]}
                    <span
                      aria-hidden
                      className="absolute bottom-1 left-0 h-[1.5px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-lp-brinjal via-[#8B5CF6] to-lp-orange transition-transform duration-300 ease-out group-hover:scale-x-100"
                    />
                  </>
                );
                return l.to ? (
                  <motion.div key={l.key} {...anim}>
                    <Link to={l.to} onClick={() => setOpen(false)} className={cls}>
                      {inner}
                    </Link>
                  </motion.div>
                ) : (
                  <motion.button key={l.key} onClick={() => go(l.id!, l.offset)} {...anim} className={cls}>
                    {inner}
                  </motion.button>
                );
              })}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + NAV_LINKS.length * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 flex flex-wrap items-center gap-3"
              >
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className={pillCtaClass('outline-ink', 'lg')}
                >
                  {d.nav.login}
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setOpen(false)}
                  className={pillCtaClass('gradient', 'lg')}
                >
                  {d.nav.getStarted}
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + (NAV_LINKS.length + 1) * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="mt-10 w-full max-w-xs border-t border-lp-fg/10 pt-6"
              >
                <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-lp-fg/55">
                  <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-lp-brinjal to-lp-orange" />
                  {d.nav.languageLabel}
                </p>
                <div className="mt-3">
                  <LanguageSwitchMobile />
                </div>
                <p className="mt-5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-lp-fg/55">
                  <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-lp-brinjal to-lp-orange" />
                  {d.nav.appearanceLabel}
                </p>
                <div className="mt-3">
                  <ThemeToggleMobile />
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
