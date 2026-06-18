import { createContext, useContext, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS } from '@/utilities/constants';

export const DARK_COLORS: typeof COLORS = {
  brinjal1:    '#6366F1',
  brinjal2:    '#4338CA',
  primaryLight:'#1E1B4B',
  accent:      '#FB923C',
  accentLight: '#431407',
  background:  '#0A0A12',
  surface:     '#14141E',
  border:      '#252535',
  borderDark:  '#333348',
  text:        '#F1F5F9',
  textSecondary:'#94A3B8',
  active:      '#34D399',
  draft:       '#FBBF24',
  closed:      '#6B7280',
  error:       '#F87171',
  badgeFeatured:'#312E81',
  badgeNew:    '#064E3B',
};

type AppThemeContextType = {
  isDark: boolean;
  toggleDark: () => void;
};

const AppThemeContext = createContext<AppThemeContextType>({ isDark: false, toggleDark: () => {} });

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [override, setOverride] = useState<boolean | null>(null);
  const isDark = override !== null ? override : system === 'dark';

  return (
    <AppThemeContext.Provider value={{ isDark, toggleDark: () => setOverride(!isDark) }}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useIsDark() {
  return useContext(AppThemeContext);
}

export function useAppColors(): typeof COLORS {
  const { isDark } = useContext(AppThemeContext);
  return isDark ? DARK_COLORS : COLORS;
}
