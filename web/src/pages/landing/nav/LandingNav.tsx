import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '../constants';
import { useLenisScroll } from '../hooks/useLenis';

export function LandingNav() {
  const navigate = useNavigate();
  const { scrollTo } = useLenisScroll();
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
      <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 pt-4 md:pt-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => go('hero')} className="flex items-center gap-2 bg-white rounded-full pl-2 pr-4 py-2 shadow-sm ring-1 ring-black/5">
            <img src="/logo.png" alt="kolab" className="h-6 w-6 rounded-full object-cover" />
            <span className="font-extrabold text-gray-900 tracking-tight text-sm">kolab</span>
          </button>

          <motion.nav
            initial={false}
            animate={{ backgroundColor: scrolled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.1)' }}
            className="hidden lg:flex items-center gap-1 rounded-full px-2 py-2 backdrop-blur-md ring-1 ring-white/15 shadow-sm"
          >
            {NAV_LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => go(l.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${scrolled ? 'text-gray-600 hover:text-brand-indigo hover:bg-indigo-50' : 'text-white/85 hover:text-white hover:bg-white/10'}`}
              >
                {l.label}
              </button>
            ))}
          </motion.nav>

          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${scrolled ? 'text-gray-700 hover:text-brand-indigo' : 'text-white/85 hover:text-white'}`}
            >
              Login
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-full text-sm font-bold bg-brand-indigo text-white hover:bg-brand-indigo-dark transition-colors shadow-sm"
            >
              Get Started
            </button>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className={`lg:hidden w-10 h-10 rounded-full flex items-center justify-center transition-colors ${scrolled || open ? 'bg-brand-indigo text-white' : 'bg-white/15 text-white backdrop-blur'}`}
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
            className="fixed inset-0 z-40 flex flex-col justify-center px-8"
            style={{ background: 'linear-gradient(160deg,#0B0B1F 0%,#151537 55%,#3730A3 100%)' }}
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((l, i) => (
                <button
                  key={l.id}
                  onClick={() => go(l.id)}
                  className="text-left text-4xl font-extrabold text-white/90 hover:text-white py-2 tracking-tight"
                >
                  <span className="text-white/30 text-lg align-super mr-3">0{i + 1}</span>{l.label}
                </button>
              ))}
              <button onClick={() => navigate('/login')} className="text-left text-4xl font-extrabold text-orange-400 py-2 tracking-tight mt-2">
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
