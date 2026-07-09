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

  function handleChange(text: string) {
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

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={C.textSecondary}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        style={[styles.input, { backgroundColor: C.background, borderColor: error ? C.error : C.border, color: C.text }]}
      />
      {error ? <Text style={[styles.errorTxt, { color: C.error }]}>{error}</Text> : null}
      {suggestions.length > 0 && (
        <View style={[styles.dropdown, { backgroundColor: C.surface, borderColor: C.border }]}>
          {suggestions.map((place, i) => (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={place.place_id}
              style={[styles.item, i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}
              onPress={() => { onChangeText(place.description); onSelectPlace?.(place); setSuggestions([]); }}>
              <Ionicons name="location" size={14} color={C.textSecondary} />
              <Text style={[styles.itemText, { color: C.text }]} numberOfLines={2}>{place.description}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:     { zIndex: 99 },
  input:    { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 50, fontSize: 15, fontFamily: F.regular },
  errorTxt: { fontSize: 12, marginTop: 4, fontFamily: F.regular },
  dropdown: { borderRadius: 12, borderWidth: 1.5, marginTop: 6, overflow: 'hidden', elevation: 10, zIndex: 100 },
  item:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  itemText: { fontSize: 13, flex: 1, fontFamily: F.regular },
});
