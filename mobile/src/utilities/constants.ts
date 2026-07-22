export const COLORS = {
  // Primary — deep indigo
  brinjal1: '#4F46E5',
  brinjal2: '#3730A3',
  primaryLight: '#EEF2FF',

  // Nepal accent — warm saffron/orange
  accent:      '#F97316',
  accentLight: '#FFF7ED',

  // Surfaces
  background: '#FFFFFF',
  surface:    '#FFFFFF',
  // Only for pre-login screens (auth + onboarding) — kept as the app's old
  // light-grey background so those flows are unaffected by `background`
  // above being flattened to white for the logged-in app.
  preLoginBackground: '#F4F6FB',

  // Borders
  border:     '#E5E7F0',
  borderDark: '#C7C9D9',

  // Typography
  text:          '#0F172A',
  textSecondary: '#64748B',

  // Status
  active: '#10B981',
  draft:  '#F59E0B',
  closed: '#94A3B8',
  error:  '#EF4444',

  // Badge accents
  badgeFeatured: '#1E1B4B',
  badgeNew:      '#064E3B',
};

// Poppins font families — loaded globally in src/app/_layout.tsx
export const F = {
  regular:    'Poppins-Regular',
  medium:     'Poppins-Medium',
  semibold:   'Poppins-SemiBold',
  bold:       'Poppins-Bold',
  boldItalic: 'Poppins-BoldItalic',
  extrabold:  'Poppins-ExtraBold',
};

// Shared corner-radius scale — screens previously hand-rolled one-off values
// (10/11/12/14/16/20...) with no consistent logic. Use these everywhere instead
// so every card/button/sheet reads as one coherent system.
export const RADIUS = {
  sm:   10,  // chips, small icon buttons, inputs
  md:   14,  // standard cards, list rows
  lg:   18,  // section cards, banners
  xl:   24,  // hero panels, bottom sheets, modals
  full: 999, // pills, avatars, circular buttons
};

// Shared elevation scale (shadow on iOS, elevation on Android) — same reasoning
// as RADIUS: screens were duplicating slightly-different shadow objects everywhere.
// `card` = resting surface, `raised` = interactive/hover-like emphasis (banners,
// featured cards), `floating` = sheets/modals/FABs that sit above everything.
export const SHADOW = {
  card:    { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 8,  shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  raised:  { shadowColor: '#0F172A', shadowOpacity: 0.10, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  floating:{ shadowColor: '#0F172A', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
};

// Shared spacing scale — pair with RADIUS/SHADOW above instead of hand-rolling
// one-off padding/margin/gap numbers per screen.
export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  xxxl: 48,
};

// Shared type scale. Floor is 11 — iOS HIG's smallest practical size
// ("Caption 2"); anything below that stops being reliably legible once a
// user has bumped up their system text-size accessibility setting.
export const FONT_SIZE = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   17,
  xl:   20,
  xxl:  24,
  xxxl: 32,
};

// Caps content width on tablets / large-screen Android so cards and text
// lines don't stretch full-bleed — every phone width is comfortably under
// this, so it's a no-op there and only kicks in on tablet-class screens.
export const MAX_CONTENT_WIDTH = 800;

// Minimum touch target per iOS HIG (44pt) / Material Design (48dp) — when a
// control's visual size must stay smaller than this for layout reasons, pair
// it with a `hitSlop` that pads the tappable area out to this minimum.
export const MIN_TOUCH_TARGET = 44;

export const USER_KEY               = 'ch_user';
export const ACCESS_TOKEN_KEY       = 'ch_access_token';
export const REFRESH_TOKEN_KEY      = 'ch_refresh_token';
export const BIOMETRIC_ENABLED_KEY  = 'ch_biometric_enabled';

// User roles — use these instead of the bare 'CREATOR'/'BUSINESS' string literals
export const ROLE = {
  CREATOR:  'CREATOR',
  BUSINESS: 'BUSINESS',
} as const;
export type Role = typeof ROLE[keyof typeof ROLE];

// ── Google Places API ───────────────────────────────────────────────────────
export const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';
export const GOOGLE_PLACES_AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
export const GOOGLE_PLACES_DETAILS_URL      = 'https://maps.googleapis.com/maps/api/place/details/json';
export const GOOGLE_GEOCODE_URL             = 'https://maps.googleapis.com/maps/api/geocode/json';

// Nepal-restricted place autocomplete, matching how every screen in this app scopes location search.
export function buildPlacesAutocompleteUrl(input: string, opts?: { types?: string }): string {
  const params = new URLSearchParams({
    input,
    key: GOOGLE_PLACES_API_KEY,
    language: 'en',
    components: 'country:np',
  });
  if (opts?.types) params.set('types', opts.types);
  return `${GOOGLE_PLACES_AUTOCOMPLETE_URL}?${params.toString()}`;
}

export function buildPlaceDetailsUrl(placeId: string, fields = 'geometry'): string {
  const params = new URLSearchParams({ place_id: placeId, fields, key: GOOGLE_PLACES_API_KEY });
  return `${GOOGLE_PLACES_DETAILS_URL}?${params.toString()}`;
}

export function buildGeocodeUrl(address: string): string {
  const params = new URLSearchParams({ address, key: GOOGLE_PLACES_API_KEY, region: 'np' });
  return `${GOOGLE_GEOCODE_URL}?${params.toString()}`;
}
