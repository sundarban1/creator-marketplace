import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { buildPlacesAutocompleteUrl, GOOGLE_PLACES_API_KEY, F } from '@/utilities/constants';

export type PlacePrediction = { place_id: string; description: string };

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  /** Google Places `types` filter, e.g. 'geocode' or '(cities)'. Omit for unrestricted search. */
  types?: string;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  autoCorrect?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Fires alongside onChangeText when a suggestion is tapped, for callers that need the place_id (e.g. to resolve lat/lng). */
  onSelectPlace?: (place: PlacePrediction) => void;
};

/**
 * Nepal-restricted Google Places autocomplete text input with a suggestion dropdown.
 * Shared across every screen that just needs to fill a text field with a chosen place
 * (location fields on create/edit forms). Pass `onSelectPlace` if the caller also needs
 * the place_id to resolve lat/lng itself (e.g. geocoding a campaign's location).
 */
export function PlacesAutocompleteInput({
  value, onChangeText, placeholder, error, types, autoCapitalize, autoCorrect = true, style, onSelectPlace,
}: Props) {
  const C = useAppColors();
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Enforces "must pick a suggestion" — `selectedValueRef` is the last confirmed
  // value (either a tapped suggestion, or whatever the parent supplied before the
  // user touched this field, e.g. a saved location loaded from the profile).
  // `userEditedRef` flips true the moment the user types, so external prop updates
  // (async data loading) don't fight the field once they're actively editing it.
  const selectedValueRef = useRef(value);
  const userEditedRef = useRef(false);
  // Mirrors the latest value/onChangeText into refs so the delayed blur check
  // (below) never reads a stale closure from the render that scheduled it.
  const valueRef = useRef(value);
  const onChangeTextRef = useRef(onChangeText);

  useEffect(() => {
    valueRef.current = value;
    onChangeTextRef.current = onChangeText;
    if (!userEditedRef.current) selectedValueRef.current = value;
  }, [value, onChangeText]);

  function handleChange(text: string) {
    userEditedRef.current = true;
    onChangeText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim() || !GOOGLE_PLACES_API_KEY) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(buildPlacesAutocompleteUrl(text, { types }));
        const json = await res.json();
        setSuggestions(json.status === 'OK' ? json.predictions : []);
      } catch { setSuggestions([]); }
    }, 350);
  }

  function handleSelect(place: PlacePrediction) {
    selectedValueRef.current = place.description;
    userEditedRef.current = false;
    onChangeText(place.description);
    onSelectPlace?.(place);
    setSuggestions([]);
  }

  // Free-typed text that was never picked from the dropdown gets reverted on
  // blur — an empty field is always allowed (clears the location). Delayed
  // slightly so a suggestion tap (which blurs the input first) has a chance to
  // land — handleSelect updates the refs synchronously, so by the time this
  // runs it correctly sees "the user did select something" and skips the revert.
  function handleBlur() {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = setTimeout(() => {
      const current = valueRef.current;
      if (!current.trim()) {
        selectedValueRef.current = '';
      } else if (userEditedRef.current && current !== selectedValueRef.current) {
        onChangeTextRef.current(selectedValueRef.current);
      }
      userEditedRef.current = false;
      setSuggestions([]);
    }, 150);
  }

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
  }, []);

  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        value={value}
        onChangeText={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor={C.textSecondary}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        style={[styles.input, { backgroundColor: C.background, borderColor: error ? C.error : C.border, color: C.text }]}
      />
      {error ? <Text style={[styles.errorTxt, { color: C.error }]}>{error}</Text> : null}
      {suggestions.length > 0 && (
        // Shadow lives on the outer view (no overflow clipping) and the rounded-corner
        // clip lives on the inner view — iOS drops a shadow on any view that also has
        // overflow:hidden, and `elevation` alone (Android's shadow) renders nothing on iOS.
        <View style={styles.dropdownOuter}>
          <View style={[styles.dropdown, { backgroundColor: C.surface, borderColor: C.border }]}>
            {suggestions.map((place, i) => (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                key={place.place_id}
                style={[styles.item, i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
                onPress={() => handleSelect(place)}>
                <Ionicons name="location" size={14} color={C.textSecondary} />
                <Text style={[styles.itemText, { color: C.text }]} numberOfLines={2}>{place.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:     { zIndex: 99 },
  input:    { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 50, fontSize: 15, fontFamily: F.regular },
  errorTxt: { fontSize: 12, marginTop: 4, fontFamily: F.regular },
  dropdownOuter: { marginTop: 6, borderRadius: 12, zIndex: 100, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  dropdown: { borderRadius: 12, borderWidth: 1.5, overflow: 'hidden' },
  item:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  itemText: { fontSize: 13, flex: 1, fontFamily: F.regular },
});
