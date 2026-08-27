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

// Single source of truth for the BUSINESS-role primary color. `useAppColors()`
// (@/context/ThemeContext) swaps `brinjal1`/`brinjal2`/`primaryLight` to this
// green for any authenticated BUSINESS user — every screen/component that
// reads its color from `useAppColors()` retheme automatically. Change the
// three hex values below to retheme the whole business side in one place.
export const BUSINESS_COLORS: typeof COLORS = {
  ...COLORS,
  brinjal1:     '#15803D', // primary buttons/accents — readable white-on-green
  brinjal2:     '#14532D', // pressed states, drawer/header backgrounds
  primaryLight: '#F0FDF4', // light tint for chips/highlighted rows on white
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

// Minimum `lineHeight / fontSize` ratio for any Text that can render Nepali.
//
// Devanagari hangs its consonants from a headline (shirorekha) and then stacks
// vowel signs and nasal marks *above* it, so it needs far more room above the
// baseline than Latin does. Measured from the shipped Poppins TTF (1000 upm):
//
//   'A' (Latin cap)   693      <- what tight line heights were tuned against
//   'द' (consonant)   740
//   'ि' / 'ी'          996
//   'ै'               1041
//   'ँ'               1065     <- chandrabindu, the tallest mark
//   hhea/typo ascent 1050
//
// Poppins' own natural line height is (1050 + 350 + 100) / 1000 = 1.5em, so any
// tighter value clips the matras off the top — on Android RN's CustomLineHeightSpan
// clamps the ascent to `-lineHeight + descent` once lineHeight drops below the
// font's natural extent, which is exactly what shaved the marks in the ne locale.
//
// Caveat: at exactly 1.5 the chandrabindu 'ँ' (1065) still grazes the 1050 ascent
// by 15/1000 em (~1px at fontSize 48, sub-pixel at body sizes). Bump an individual
// style higher, or drop its explicit lineHeight entirely, if you see a shaved 'ँ'
// on a large Nepali heading.
export const LINE_HEIGHT_RATIO = 1.5;

/**
 * Devanagari-safe line height for a given font size. Prefer this over hand-picked
 * `lineHeight` values so Nepali text can't get clipped as new styles are added.
 */
export const lineHeightFor = (fontSize: number) =>
  Math.ceil(fontSize * LINE_HEIGHT_RATIO);

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
//
// Which token goes where (this mapping is applied across every screen; keep new
// screens on it so the app reads as one system):
//
//   Screen gutter      SCREEN_GUTTER (20)  outer horizontal inset of anything that
//                                          touches the screen edge — scroll/list
//                                          contentContainer, header + footer bars,
//                                          hairline separators under a header, and
//                                          the marginHorizontal of full-width cards
//   Card padding       lg (16)             interior padding of a standard card
//   Compact padding    md (12)             interior of dense rows / small cards
//   Rows inside a card lg (16)             a row nested in a card is on the CARD
//                                          scale, not the screen gutter — it is
//                                          already inset by the card's own margin
//   Bar rhythm         md (12)             paddingVertical of header/footer/CTA bars
//   List rhythm        md (12)             gap between cards in a list
//   List top inset     lg (16)             paddingTop of scroll/list content
//   List bottom inset  xxxl (48)           paddingBottom of scroll/list content
//
// Intrinsic controls — buttons, chips, pills, badges, inputs, avatars — size
// themselves and are deliberately NOT on this mapping; see CONTROL_HEIGHT.
export const SPACING = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  xxxl: 48,
};

// The app's de facto "content starts this far from the screen edge" gutter —
// already used as a bare `paddingHorizontal: 20` across most list/section
// screens (outside the SPACING scale above, which tops out lg=16/xl=24 either
// side of it). Named here so screens with several independently-styled rows
// that must share one left edge (e.g. Discover's search bar/tab slider/
// category pills) reference one source instead of three copies of the
// literal 20 silently drifting apart.
export const SCREEN_GUTTER = 20;

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

// Shared control-height scale for Button/IconButton — `small` sits exactly at
// MIN_TOUCH_TARGET so it never needs a compensating hitSlop, `large` matches
// the height every full-width primary CTA in the app already used before
// this scale existed (kept as-is so introducing it doesn't shift any
// existing screen).
export const CONTROL_HEIGHT = {
  small:  MIN_TOUCH_TARGET,
  medium: 48,
  large:  54,
};

export const USER_KEY               = 'ch_user';
export const ACCESS_TOKEN_KEY       = 'ch_access_token';
export const REFRESH_TOKEN_KEY      = 'ch_refresh_token';
export const BIOMETRIC_ENABLED_KEY  = 'ch_biometric_enabled';
// One-shot marker for the post-login "Enable Face ID / Fingerprint?" offer —
// set whether the user taps Enable or Not now, so the offer never nags twice.
export const BIOMETRIC_OFFERED_KEY  = 'ch_biometric_offered';
export const RECENT_SEARCHES_KEY    = 'ch_recent_searches';
// Apple's stable user id (`sub`) for whoever is signed in, when they've linked
// Apple. Lets the app poll AppleAuthentication.getCredentialStateAsync on
// launch/foreground and react if the user revoked access from iOS Settings.
export const APPLE_USER_ID_KEY      = 'ch_apple_user_id';

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
