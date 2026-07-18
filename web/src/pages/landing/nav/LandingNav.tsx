import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '../constants';
import { useLenisScroll } from '../hooks/useLenis';
import { useLandingLanguage } from '../context/LanguageContext';

function LanguageSwitch({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useLandingLanguage();
  return (
    <div className={`flex items-center gap-1 rounded-full border px-1 py-1 text-[11px] font-semibold uppercase tracking-wide ${dark ? 'border-ink/10' : 'border-white/20'}`}>
      {(['en', 'ne'] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`rounded-full px-2.5 py-1 transition-all duration-300 ${
            lang === l
              ? 'bg-gradient-to-r from-violet to-brand-orange text-white shadow-sm'
              : dark
                ? 'text-ink-soft hover:text-ink'
                : 'text-white/70 hover:text-white'
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
      <motion.header
        initial={false}
        animate={{
          backgroundColor: scrolled ? 'rgba(251,249,245,0.85)' : 'rgba(251,249,245,0)',
          borderColor: scrolled ? 'rgba(20,17,16,0.08)' : 'rgba(20,17,16,0)',
          boxShadow: scrolled ? '0 10px 30px -10px rgba(20,17,16,0.12)' : '0 0 0 rgba(0,0,0,0)',
        }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-0 right-0 top-0 z-50 border-b backdrop-blur-xl"
      >
        <div
          className={`mx-auto flex max-w-5xl items-center justify-between px-6 transition-[padding] duration-300 ease-out ${scrolled ? 'py-3.5' : 'py-5'}`}
        >
          <button onClick={() => go('hero')} className="group flex items-center transition-transform duration-300 ease-out hover:scale-[1.04]">
            <img src="/logo.png" alt="kolab" className="h-9 w-auto object-contain" />
          </button>

          <nav className="hidden items-center gap-9 lg:flex">
            {NAV_LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className="group relative rounded pb-1 font-serif text-[13px] font-bold italic tracking-wide text-ink-soft transition-colors duration-300 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet"
              >
                {d.nav.links[l.key]}
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 h-[1.5px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-violet to-brand-orange transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
                />
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-5 lg:flex">
            <span aria-hidden className="h-5 w-px bg-ink/10" />
            <LanguageSwitch dark />
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={d.nav.toggleMenuAriaLabel}
            className="rounded-full p-1.5 text-ink transition-colors duration-300 hover:bg-ink/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet lg:hidden"
          >
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
              {NAV_LINKS.map((l, i) => (
                <motion.button
                  key={l.id}
                  onClick={() => go(l.id)}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="group relative w-fit rounded py-2.5 text-left font-serif text-4xl font-bold italic text-ink/85 transition-colors duration-300 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet"
                >
                  {d.nav.links[l.key]}
                  <span
                    aria-hidden
                    className="absolute bottom-1 left-0 h-[1.5px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-violet to-brand-orange transition-transform duration-300 ease-out group-hover:scale-x-100"
                  />
                </motion.button>
              ))}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + NAV_LINKS.length * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="mt-8"
              >
                <LanguageSwitch dark />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
