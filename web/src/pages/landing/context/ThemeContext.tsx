import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type LandingTheme = 'light' | 'dark';

const STORAGE_KEY = 'kolab-landing-theme';

interface ThemeContextValue {
  theme: LandingTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readInitialTheme(): LandingTheme {
  // index.html's blocking script already applied `.dark` before paint using
  // this same storage key + system-preference fallback — read the class it
  // set rather than re-deriving the value, so the two can never disagree.
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function LandingThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<LandingTheme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useLandingTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useLandingTheme must be used within LandingThemeProvider');
  return ctx;
}
