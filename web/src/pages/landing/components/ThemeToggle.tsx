import { Sun, Moon } from 'lucide-react';
import { useLandingTheme } from '../context/ThemeContext';

// Shared between LandingNav (home page) and StandaloneHeader (content pages,
// Privacy/Terms/Support) so the toggle looks and behaves identically
// everywhere it appears — same shell as LanguageSwitch, and same convention:
// shows the icon of what clicking switches *to* (Sun while dark, Moon while
// light), not the current state.
export function ThemeToggle({ dark = false }: { dark?: boolean }) {
  const { theme, toggleTheme } = useLandingTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      className={`flex h-7 w-7 items-center justify-center rounded-full border transition-colors duration-300 ${
        dark
          ? 'border-ink/10 text-ink-soft hover:text-ink dark:border-white/10 dark:text-white dark:hover:text-white'
          : 'border-white/20 text-white/70 hover:text-white'
      }`}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
