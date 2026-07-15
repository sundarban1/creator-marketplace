import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '../constants';
import { useLenisScroll } from '../hooks/useLenis';
import { useLandingLanguage } from '../context/LanguageContext';

function LanguageSwitch() {
  const { lang, setLang } = useLandingLanguage();
  return (
    <div className="flex items-center rounded-full bg-gray-100 p-0.5 text-xs font-bold">
      {(['en', 'ne'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-full px-2.5 py-1.5 transition-colors ${
            lang === l ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
          }`}
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
      <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4 md:px-6 md:pt-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button onClick={() => go('hero')} className="flex items-center rounded-full bg-white/90 py-2 pl-3 pr-4 shadow-sm ring-1 ring-black/5 backdrop-blur-md">
            <img src="/logo.png" alt="kolab" className="h-6 w-auto object-contain" />
          </button>

          <motion.nav
            initial={false}
            animate={{ boxShadow: scrolled ? '0 8px 30px rgba(15,23,42,0.1)' : '0 4px 16px rgba(15,23,42,0.04)' }}
            className="hidden items-center gap-1 rounded-full bg-white/80 p-2 ring-1 ring-black/5 backdrop-blur-md lg:flex"
          >
            {NAV_LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-brand-indigo/5 hover:text-brand-indigo"
              >
                {d.nav.links[l.key]}
              </button>
            ))}
          </motion.nav>

          <div className="hidden items-center gap-3 lg:flex">
            <LanguageSwitch />
            <button
              onClick={() => go('contact')}
              className="shine-hover rounded-full bg-gradient-to-r from-ink to-ink/90 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              {d.nav.cta}
            </button>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-white lg:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ clipPath: 'circle(4% at 92% 4%)' }}
            animate={{ clipPath: 'circle(150% at 92% 4%)' }}
            exit={{ clipPath: 'circle(4% at 92% 4%)' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 flex flex-col justify-center bg-white px-8"
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((l, i) => (
                <button
                  key={l.id}
                  onClick={() => go(l.id)}
                  className="py-2 text-left text-4xl font-extrabold tracking-tight text-ink/90 hover:text-ink"
                >
                  <span className="mr-3 align-super text-lg text-ink/30">0{i + 1}</span>
                  {d.nav.links[l.key]}
                </button>
              ))}
              <div className="mt-6">
                <LanguageSwitch />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
