import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { en, type AppDict } from './en';
import { ne } from './ne';

export type Lang = 'en' | 'ne';

const DICTS: Record<Lang, AppDict> = { en, ne };

/** Shared with the landing page so language choice carries across the site. */
const STORAGE_KEY = 'kolab_landing_lang';

function readStoredLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem(STORAGE_KEY) === 'ne' ? 'ne' : 'en';
}

type Vars = Record<string, string | number>;

/** `t('auth.verifySubtitleEmail', { target })` — dotted path + {placeholder}s. */
export type TFn = (path: string, vars?: Vars) => string;

interface AppLanguageValue {
  language: Lang;
  setLanguage: (l: Lang) => void;
  t: TFn;
  dict: AppDict;
}

const AppLanguageContext = createContext<AppLanguageValue | null>(null);

function resolve(dict: AppDict, path: string): string {
  const value = path
    .split('.')
    .reduce<unknown>((acc, key) => (acc == null ? acc : (acc as Record<string, unknown>)[key]), dict);
  return typeof value === 'string' ? value : path;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function AppLanguageProvider({
  children,
  language: controlledLanguage,
  onLanguageChange,
}: {
  children: ReactNode;
  /** When provided, the language is driven from outside (e.g. the landing
   *  header's own EN/ने toggle) and this provider just mirrors it. */
  language?: Lang;
  onLanguageChange?: (l: Lang) => void;
}) {
  const [internal, setInternal] = useState<Lang>(readStoredLang);
  const language = controlledLanguage ?? internal;

  const setLanguage = useCallback(
    (l: Lang) => {
      if (onLanguageChange) {
        onLanguageChange(l);
      } else {
        setInternal(l);
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, l);
      } catch {
        /* private-mode storage denial — language just won't persist */
      }
    },
    [onLanguageChange],
  );

  const value = useMemo<AppLanguageValue>(() => {
    const dict = DICTS[language];
    return {
      language,
      setLanguage,
      dict,
      t: (path, vars) => interpolate(resolve(dict, path), vars),
    };
  }, [language, setLanguage]);

  return <AppLanguageContext.Provider value={value}>{children}</AppLanguageContext.Provider>;
}

export function useAppLanguage(): AppLanguageValue {
  const ctx = useContext(AppLanguageContext);
  if (!ctx) throw new Error('useAppLanguage must be used within <AppLanguageProvider>');
  return ctx;
}

/** Shorthand — most components only need the translate function. */
export function useT(): TFn {
  return useAppLanguage().t;
}
