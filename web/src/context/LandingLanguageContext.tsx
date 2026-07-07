import { createContext, useContext, useState, type ReactNode } from 'react';
import { en, type Dict } from '../i18n/en';
import { ne } from '../i18n/ne';

export type Lang = 'en' | 'ne';

const DICTS: Record<Lang, Dict> = { en, ne };

const STORAGE_KEY = 'kolab_landing_lang';

interface LandingLanguageValue {
  language: Lang;
  setLanguage: (l: Lang) => void;
  t: Dict;
}

const LandingLanguageContext = createContext<LandingLanguageValue | null>(null);

function readStoredLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem(STORAGE_KEY) === 'ne' ? 'ne' : 'en';
}

export function LandingLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Lang>(readStoredLang);

  function setLanguage(l: Lang) {
    setLanguageState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }

  return (
    <LandingLanguageContext.Provider value={{ language, setLanguage, t: DICTS[language] }}>
      {children}
    </LandingLanguageContext.Provider>
  );
}

export function useLandingLanguage(): LandingLanguageValue {
  const ctx = useContext(LandingLanguageContext);
  if (!ctx) throw new Error('useLandingLanguage must be used within LandingLanguageProvider');
  return ctx;
}
