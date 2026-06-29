import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { type Lang, getString, translations } from '@/i18n';
import { storage } from '@/utilities/storage';
import { setApiLanguage } from '@/lib/api';

const LANG_KEY = 'app_language';

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

type LanguageCtx = {
  language: Lang;
  setLanguage: (lang: Lang) => void;
  t: TFn;
  /** Increments every time the language is changed. Add to useEffect deps to re-fetch DB content on language switch. */
  languageVersion: number;
};

const LanguageContext = createContext<LanguageCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLangState] = useState<Lang>(() => {
    const stored = storage.get(LANG_KEY);
    return stored === 'ne' ? 'ne' : 'en';
  });
  const [languageVersion, setLanguageVersion] = useState(0);

  // Async read from SecureStore on mount to restore persisted language
  useEffect(() => {
    SecureStore.getItemAsync(LANG_KEY).then((v) => {
      if (v === 'ne' || v === 'en') {
        setLangState(v);
        setApiLanguage(v);
      }
    });
  }, []);

  function setLanguage(lang: Lang) {
    storage.set(LANG_KEY, lang);
    setApiLanguage(lang);
    setLangState(lang);
    setLanguageVersion((v) => v + 1);
  }

  function t(key: string, vars?: Record<string, string | number>): string {
    const raw = getString(translations[language], key);
    if (!vars) return raw;
    return raw.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ''));
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languageVersion }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
