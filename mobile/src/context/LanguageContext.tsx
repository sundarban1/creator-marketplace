import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { type Lang, getString, translations } from '@/i18n';
import { storage } from '@/utilities/storage';

const LANG_KEY = 'app_language';

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

type LanguageCtx = {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  t: TFn;
};

const LanguageContext = createContext<LanguageCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLangState] = useState<Lang>(() => {
    const stored = storage.get(LANG_KEY);
    return stored === 'ne' ? 'ne' : 'en';
  });

  function setLanguage(lang: Lang) {
    storage.set(LANG_KEY, lang);
    setLangState(lang);
  }

  function t(key: string, vars?: Record<string, string | number>): string {
    const raw = getString(translations[language], key);
    if (!vars) return raw;
    return raw.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
