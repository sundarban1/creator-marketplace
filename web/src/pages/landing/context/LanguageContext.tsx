import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { en } from '../i18n/en';
import { ne } from '../i18n/ne';
import type { LandingDict } from '../i18n/en';

export type LandingLang = 'en' | 'ne';

const DICTS: Record<LandingLang, LandingDict> = { en, ne };

interface LanguageContextValue {
  lang: LandingLang;
  setLang: (lang: LandingLang) => void;
  d: LandingDict;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LandingLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LandingLang>('en');
  const value = useMemo(() => ({ lang, setLang, d: DICTS[lang] }), [lang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLandingLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLandingLanguage must be used within LandingLanguageProvider');
  return ctx;
}
