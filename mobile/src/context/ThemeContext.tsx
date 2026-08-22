import { createContext, useContext, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS, BUSINESS_COLORS } from '@/utilities/constants';
import { useAuth } from '@/context/AuthContext';

// brinjal1/brinjal2 are hue-matched to the light theme's brinjal (#4F46E5) —
// lightened for legibility against a dark surface, rather than an unrelated violet.
export const DARK_COLORS: typeof COLORS = {
  brinjal1:    '#7C74EE',
  brinjal2:    '#5B52D6',
  primaryLight:'#2D2B52',
  accent:      '#FB923C',
  accentLight: '#431407',
  background:  '#12121E',
  surface:     '#1E1E30',
  preLoginBackground: '#12121E',
  border:      '#2E2E45',
  borderDark:  '#3D3D58',
  text:        '#F1F5F9',
  textSecondary:'#94A3B8',
  active:      '#34D399',
  draft:       '#FBBF24',
  closed:      '#6B7280',
  error:       '#F87171',
  badgeFeatured:'#312E81',
  badgeNew:    '#064E3B',
};

// Dark-mode counterpart of BUSINESS_COLORS (@/utilities/constants) — same
// green hue as the light theme's business primary, lightened for legibility
// against a dark surface, matching how DARK_COLORS relates to COLORS above.
export const BUSINESS_DARK_COLORS: typeof COLORS = {
  ...DARK_COLORS,
  brinjal1:    '#4ADE80',
  brinjal2:    '#22C55E',
  primaryLight:'#14291C',
};

// Scopes a subtree to the neutral pre-login palette, ignoring the signed-in
// user's role. The auth stack wraps itself in this because `login()` sets the
// user *before* RootNavigator redirects — without it, a business login repaints
// the login screen green for the frame (plus the push animation) between auth
// state landing and the business home mounting.
const PreLoginThemeContext = createContext(false);

export function PreLoginTheme({ children }: { children: ReactNode }) {
  return <PreLoginThemeContext.Provider value={true}>{children}</PreLoginThemeContext.Provider>;
}

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
  const { user } = useAuth();
  const preLogin = useContext(PreLoginThemeContext);
  const isBusiness = user?.role === 'BUSINESS' && !preLogin;
  if (isBusiness) return isDark ? BUSINESS_DARK_COLORS : BUSINESS_COLORS;
  return isDark ? DARK_COLORS : COLORS;
}
