import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F } from '@/utilities/constants';

export type LocationEntry = { label: string; lat: number | null; lng: number | null };
export type LocationFilter = LocationEntry[];

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';
const MAX_LOCS = 3;

type Prediction = {
  place_id: string;
  structured_formatting: { main_text: string; secondary_text: string };
};

export function LocationSearchPicker({
  selected,
  onSelect,
}: {
  selected: LocationFilter;
  onSelect: (v: LocationFilter) => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 'Remote' is a data sentinel compared against campaign/creator location
  // elsewhere in the app — keep it untranslated in the stored label, only
  // the displayed text below is localized.
  const remoteSelected = selected.some((l) => l.label === 'Remote');
  const nonRemote = selected.filter((l) => l.label !== 'Remote');
  const atMax = selected.length >= MAX_LOCS;

  function toggleRemote() {
    if (remoteSelected) {
      onSelect(selected.filter((l) => l.label !== 'Remote'));
    } else if (!atMax) {
      onSelect([...selected, { label: 'Remote', lat: null, lng: null }]);
    }
  }

  function remove(label: string) {
    onSelect(selected.filter((l) => l.label !== label));
  }

  function handleSearchChange(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setPredictions([]); return; }
    debounceRef.current = setTimeout(() => fetchPredictions(text), 350);
  }

  async function fetchPredictions(text: string) {
    if (!PLACES_KEY) return;
    setSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${PLACES_KEY}&language=en&types=(cities)&components=country:np`;
      const res = await fetch(url);
      const data = (await res.json()) as { predictions: Prediction[]; status: string };
      setPredictions(data.status === 'OK' ? data.predictions : []);
    } catch {
      setPredictions([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSelectPrediction(pred: Prediction) {
    const label = pred.structured_formatting.main_text;
    if (selected.some((l) => l.label === label)) return;
    setQuery('');
    setPredictions([]);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${pred.place_id}&fields=geometry&key=${PLACES_KEY}`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        result: { geometry: { location: { lat: number; lng: number } } };
        status: string;
      };
      if (data.status === 'OK') {
        const { lat, lng } = data.result.geometry.location;
        onSelect([...selected, { label, lat, lng }]);
      } else {
        onSelect([...selected, { label, lat: null, lng: null }]);
      }
    } catch {
      onSelect([...selected, { label, lat: null, lng: null }]);
    }
  }

  return (
    <View style={ls.container}>
      {/* Remote + selected places share one wrapping row — they're the same
          kind of thing (a chosen location filter), so they shouldn't cost two
          separate rows of vertical space. */}
      <View style={ls.selectedChips}>
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          style={[ls.remoteChip, { borderColor: remoteSelected ? C.brinjal1 : C.border, backgroundColor: remoteSelected ? C.primaryLight : C.background }, !remoteSelected && atMax && { opacity: 0.35 }]}
          onPress={toggleRemote}
          disabled={!remoteSelected && atMax}>
          <Ionicons name="globe-outline" size={13} color={remoteSelected ? C.brinjal1 : C.textSecondary} />
          <Text style={[ls.remoteText, { color: remoteSelected ? C.brinjal1 : C.text, fontWeight: remoteSelected ? '700' : '500' }]}>
            {t('filterModal.remote')}
          </Text>
          {remoteSelected && <Ionicons name="close" size={13} color={C.brinjal1} />}
        </Pressable>

        {nonRemote.map((loc) => (
          <View key={loc.label} style={[ls.selectedChip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
            <Ionicons name="location" size={12} color={C.brinjal1} />
            <Text style={[ls.selectedChipText, { color: C.brinjal1 }]}>{loc.label}</Text>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => remove(loc.label)} hitSlop={8}>
              <Ionicons name="close" size={13} color={C.brinjal1} />
            </Pressable>
          </View>
        ))}
      </View>

      {/* Search input — hidden when limit reached */}
      {!atMax && (
        <>
          <View style={[ls.searchRow, { backgroundColor: C.background, borderColor: C.border }]}>
            <Ionicons name="search" size={15} color={C.textSecondary} />
            <TextInput
              style={[ls.searchInput, { color: C.text }]}
              value={query}
              onChangeText={handleSearchChange}
              placeholder={t('filterModal.searchCityPlaceholder')}
              placeholderTextColor={C.textSecondary}
              returnKeyType="search"
            />
            {searching
              ? <ActivityIndicator size="small" color={C.brinjal1} />
              : query.length > 0
              ? <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => { setQuery(''); setPredictions([]); }} hitSlop={8}>
                  <Ionicons name="close" size={15} color={C.textSecondary} />
                </Pressable>
              : null}
          </View>

          {predictions.length > 0 && (
            <View style={[ls.dropdown, { backgroundColor: C.surface, borderColor: C.border }]}>
              {predictions.slice(0, 5).map((pred, idx) => (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  key={pred.place_id}
                  style={[ls.dropRow, { borderBottomColor: idx < Math.min(predictions.length, 5) - 1 ? C.border : 'transparent' }]}
                  onPress={() => handleSelectPrediction(pred)}>
                  <Ionicons name="location" size={16} color={C.textSecondary} />
                  <View style={ls.dropTexts}>
                    <Text style={[ls.dropMain, { color: C.text }]}>{pred.structured_formatting.main_text}</Text>
                    <Text style={[ls.dropSec, { color: C.textSecondary }]} numberOfLines={1}>{pred.structured_formatting.secondary_text}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const ls = StyleSheet.create({
  container:       { gap: 8 },
  remoteChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  remoteText:      { fontSize: 13, fontFamily: F.regular },
  selectedChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectedChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  selectedChipText:{ fontSize: 13, fontFamily: F.semibold },
  searchRow:       { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, height: 40, gap: 8 },
  searchInput:     { flex: 1, fontSize: 14, fontFamily: F.regular },
  dropdown:        { borderRadius: 12, borderWidth: 1.5, overflow: 'hidden' },
  dropRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10, borderBottomWidth: 1 },
  dropTexts:       { flex: 1 },
  dropMain:        { fontSize: 14, fontFamily: F.semibold },
  dropSec:         { fontSize: 11, marginTop: 1, fontFamily: F.regular },
});
