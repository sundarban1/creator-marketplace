export const COLORS = {
  // Primary — deep indigo
  brinjal1: '#4F46E5',
  brinjal2: '#3730A3',
  primaryLight: '#EEF2FF',

  // Nepal accent — warm saffron/orange
  accent:      '#F97316',
  accentLight: '#FFF7ED',

  // Surfaces
  background: '#F4F6FB',
  surface:    '#FFFFFF',

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
  regular:   'Poppins-Regular',
  medium:    'Poppins-Medium',
  semibold:  'Poppins-SemiBold',
  bold:      'Poppins-Bold',
  extrabold: 'Poppins-ExtraBold',
};

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
