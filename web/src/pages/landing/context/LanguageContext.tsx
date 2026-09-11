import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { en } from '../i18n/en';
import { ne } from '../i18n/ne';
import type { LandingDict } from '../i18n/en';

export type LandingLang = 'en' | 'ne';

const DICTS: Record<LandingLang, LandingDict> = { en, ne };

// Shared with the marketplace app (src/app/i18n) so a visitor's EN/ने choice
// carries between the landing page and /creators, /events, … and survives a
// reload.
const STORAGE_KEY = 'kolab_landing_lang';

function readStoredLang(): LandingLang {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem(STORAGE_KEY) === 'ne' ? 'ne' : 'en';
}

interface LanguageContextValue {
  lang: LandingLang;
  setLang: (lang: LandingLang) => void;
  d: LandingDict;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LandingLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LandingLang>(readStoredLang);
  const setLang = useCallback((l: LandingLang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* private-mode storage denial */
    }
  }, []);
  const value = useMemo(() => ({ lang, setLang, d: DICTS[lang] }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLandingLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLandingLanguage must be used within LandingLanguageProvider');
  return ctx;
}
