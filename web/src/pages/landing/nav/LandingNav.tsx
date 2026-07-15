import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '../constants';
import { useLenisScroll } from '../hooks/useLenis';
import { useLandingLanguage } from '../context/LanguageContext';

function LanguageSwitch({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useLandingLanguage();
  return (
    <div className={`flex items-center gap-3 text-xs font-semibold uppercase tracking-wide ${dark ? 'text-ink/90' : 'text-white/70'}`}>
      {(['en', 'ne'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={lang === l ? (dark ? 'text-ink' : 'text-white') + ' underline underline-offset-4' : 'opacity-60 hover:opacity-100'}
        >
          {l === 'en' ? 'EN' : 'ने'}
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

  function go(id: string) {
    setOpen(false);
    setTimeout(() => scrollTo(`#${id}`), open ? 350 : 0);
  }

  return (
    <>
      <motion.header
        initial={false}
        animate={{
          backgroundColor: scrolled ? 'rgba(251,249,245,0.92)' : 'rgba(251,249,245,0)',
          borderColor: scrolled ? 'rgba(20,17,16,0.1)' : 'rgba(20,17,16,0)',
        }}
        className="fixed left-0 right-0 top-0 z-50 border-b backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <button onClick={() => go('hero')} className="flex items-center">
            <img src="/logo.png" alt="kolab" className="h-6 w-auto object-contain" />
          </button>

          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className="text-xs font-semibold uppercase tracking-wide text-ink-soft transition-colors hover:text-ink"
              >
                {d.nav.links[l.key]}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-6 lg:flex">
            <LanguageSwitch dark />
          </div>

          <button onClick={() => setOpen((v) => !v)} aria-label="Toggle menu" className="text-ink lg:hidden">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 flex flex-col justify-center bg-paper px-8"
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => go(l.id)}
                  className="py-2.5 text-left font-serif text-4xl italic text-ink/85 hover:text-ink"
                >
                  {d.nav.links[l.key]}
                </button>
              ))}
              <div className="mt-8">
                <LanguageSwitch dark />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
