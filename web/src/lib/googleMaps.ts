import type { Libraries } from '@react-google-maps/api';

/**
 * The one canonical Google Maps JS API loader config for the whole web app.
 *
 * `@react-google-maps/api` (via `@googlemaps/js-api-loader`) keeps a single
 * global loader — every `useJsApiLoader()` call must hand it an *identical*
 * options object (same `id`, same `libraries` contents) or it throws
 * "Loader must not be called again with different options". So the map on the
 * landing page and the Places autocomplete on /creators + /businesses both
 * import this, and `libraries` is the union of what any of them needs.
 *
 * Must be a module-level constant (stable reference) — passing a fresh array
 * each render makes the loader reload and warn.
 */
export const GOOGLE_MAPS_LIBRARIES: Libraries = ['places'];

export const GOOGLE_MAPS_LOADER = {
  id: 'kolab-google-maps',
  googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) ?? '',
  libraries: GOOGLE_MAPS_LIBRARIES,
};
