import { useCallback, useRef } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LOADER } from '../../lib/googleMaps';

export interface PlacePrediction {
  description: string;
  placeId: string;
}

/**
 * Google Places autocomplete for the web marketplace — Nepal-restricted, to
 * match how the mobile app scopes its location search. Uses the classic
 * `AutocompleteService` (same Places API the mobile REST calls hit) rather
 * than the newer `AutocompleteSuggestion`, so it works with the key as-is.
 *
 * Degrades silently: if the Maps script fails to load (no/invalid key), `ready`
 * stays false and `getPredictions` returns `[]` — the caller's input then just
 * behaves as a plain text field.
 */
export function usePlacesAutocomplete() {
  const { isLoaded, loadError } = useJsApiLoader(GOOGLE_MAPS_LOADER);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const ready = isLoaded && !loadError;

  const getPredictions = useCallback(
    async (input: string): Promise<PlacePrediction[]> => {
      const q = input.trim();
      if (!ready || !q) return [];

      if (!serviceRef.current) {
        serviceRef.current = new google.maps.places.AutocompleteService();
      }
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      }

      return new Promise((resolve) => {
        serviceRef.current!.getPlacePredictions(
          {
            input: q,
            componentRestrictions: { country: 'np' },
            sessionToken: sessionTokenRef.current!,
          },
          (predictions) => {
            resolve(
              (predictions ?? []).map((p) => ({
                description: p.description,
                placeId: p.place_id,
              })),
            );
          },
        );
      });
    },
    [ready],
  );

  /** Call after a suggestion is chosen — a fresh session token keeps billing sane. */
  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
  }, []);

  return { ready, getPredictions, resetSession };
}
