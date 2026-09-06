import { createContext, useContext, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS, BUSINESS_COLORS } from '@/utilities/constants';
import { useAuth } from '@/context/AuthContext';

// Dark palette modelled on Instagram's dark mode: a neutral, near-black system
// (pure-black app background, flat dark-grey surfaces, hairline #262626-style
// borders instead of shadows, muted-grey secondary text) rather than a tinted
// dark blue. Brand hues (brinjal / accent) stay saturated for interactive
// elements — the way Instagram keeps its action blue on a neutral ground.
// brinjal1/brinjal2 are hue-matched to the light theme's brinjal (#4F46E5),
// lightened for legibility against a dark surface.
//
// `accent` in dark mode is Claude's "crail" terracotta (#CC785C) rather than
// the light theme's Nepal saffron (#F97316) — the brighter orange reads as
// harsh/alerting against the near-black ground, the softer terracotta sits
// better. Only screens that consume the `accent` *token* pick this up;
// hardcoded orange hexes elsewhere (status badges, warning icons) are
// unchanged.
export const DARK_COLORS: typeof COLORS = {
  brinjal1:    '#7C74EE',
  brinjal2:    '#5B52D6',
  primaryLight:'#1C1C1C',
  accent:      '#CC785C',
  accentLight: '#2A1C16',
  background:  '#000000',
  surface:     '#1A1A1A',
  preLoginBackground: '#000000',
  border:      '#262626',
  borderDark:  '#363636',
  text:        '#FFFFFF',
  textSecondary:'#A8A8A8',
  textPlaceholder:'#8E8E8E',
  active:      '#34D399',
  draft:       '#FBBF24',
  closed:      '#8E8E8E',
  error:       '#ED4956',
  badgeFeatured:'#262626',
  badgeNew:    '#0A2A1E',
};

// Dark-mode counterpart of BUSINESS_COLORS (@/utilities/constants) — same
// green hue as the light theme's business primary, lightened for legibility
// against a dark surface, matching how DARK_COLORS relates to COLORS above.
export const BUSINESS_DARK_COLORS: typeof COLORS = {
  ...DARK_COLORS,
  brinjal1:    '#4ADE80',
  brinjal2:    '#22C55E',
  primaryLight:'#12261A',
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
