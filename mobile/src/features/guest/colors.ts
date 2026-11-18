// Guest Home keeps the light theme's saffron orange (#F97316) in dark mode too.
// The app-wide dark palette swaps `accent` for a muted terracotta (#CC785C);
// on the guest landing page the brand orange should read the same in both
// themes. Everything else (surfaces, text, accentLight tints) still follows
// the active theme.
import { useAppColors } from '@/context/ThemeContext';
import { COLORS } from '@/utilities/constants';

// Dark orange (Tailwind orange-600) for the solid orange fills behind white
// labels on guest screens — header "Create Account" pill, Discover's Creators
// slider — and the guest bottom tab bar's active tab. Same in light and dark mode; deeper than #F97316 for white-label contrast.
export const GUEST_DARK_ORANGE = '#EA580C';

export function useGuestColors() {
  const C = useAppColors();
  return { ...C, accent: COLORS.accent };
}
