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

// Pins a subtree to one palette instead of deriving it from the live auth
// state. Both auth transitions change `user` while the *outgoing* screens are
// still mounted — `login()` sets the user before RootNavigator redirects, and
// `logout()` nulls it before the redirect back — so without pinning, a business
// login repaints the login screen green and a logout repaints the business
// screens brinjal, each for a frame plus the navigation animation.
type ThemeScope = 'preLogin' | 'business';
const ThemeScopeContext = createContext<ThemeScope | null>(null);

/** Neutral palette for the auth stack, even once a BUSINESS user is signed in. */
export function PreLoginTheme({ children }: { children: ReactNode }) {
  return <ThemeScopeContext.Provider value="preLogin">{children}</ThemeScopeContext.Provider>;
}

/** Business palette for the business stack, even once the user is signed out. */
export function BusinessTheme({ children }: { children: ReactNode }) {
  return <ThemeScopeContext.Provider value="business">{children}</ThemeScopeContext.Provider>;
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
  const scope = useContext(ThemeScopeContext);
  const isBusiness = scope ? scope === 'business' : user?.role === 'BUSINESS';
  if (isBusiness) return isDark ? BUSINESS_DARK_COLORS : BUSINESS_COLORS;
  return isDark ? DARK_COLORS : COLORS;
}
