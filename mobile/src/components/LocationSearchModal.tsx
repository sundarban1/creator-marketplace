import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

const PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY ?? '';

type Prediction = {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
};

export function LocationSearchModal({
  visible,
  initialValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  initialValue: string;
  onSelect: (address: string, lat: number, lng: number) => void;
  onClose: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setQuery(initialValue);
      setPredictions([]);
    }
  }, [visible, initialValue]);

  function handleChangeText(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setPredictions([]); return; }
    debounceRef.current = setTimeout(() => fetchPredictions(text), 350);
  }

  async function fetchPredictions(text: string) {
    if (!PLACES_KEY) { setPredictions([]); return; }
    setSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${PLACES_KEY}&language=en&components=country:np`;
      const res = await fetch(url);
      const data = (await res.json()) as { predictions: Prediction[]; status: string };
      setPredictions(data.status === 'OK' ? data.predictions : []);
    } catch {
      setPredictions([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleSelectPrediction(prediction: Prediction) {
    if (!PLACES_KEY) {
      onSelect(prediction.description, 0, 0);
      return;
    }
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,formatted_address&key=${PLACES_KEY}`;
      const res = await fetch(url);
      const data = (await res.json()) as {
        result: { geometry: { location: { lat: number; lng: number } }; formatted_address: string };
        status: string;
      };
      if (data.status === 'OK') {
        onSelect(
          data.result.formatted_address,
          data.result.geometry.location.lat,
          data.result.geometry.location.lng,
        );
      } else {
        onSelect(prediction.description, 0, 0);
      }
    } catch {
      onSelect(prediction.description, 0, 0);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => inputRef.current?.focus()}>
      <SafeAreaView style={[lsm.container, { backgroundColor: C.background }]} edges={['top']}>
        <View style={[lsm.topBar, { borderBottomColor: C.border, backgroundColor: C.background }]}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={onClose} hitSlop={12} style={lsm.cancelBtn}>
            <Text style={[lsm.cancelTxt, { color: C.brinjal1 }]}>{t('profile.editCreator.locationModalCancel')}</Text>
          </Pressable>
          <Text style={[lsm.title, { color: C.text }]}>{t('profile.editCreator.locationModalTitle')}</Text>
          <View style={{ width: 56 }} />
        </View>

        <View style={[lsm.inputRow, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            ref={inputRef}
            style={[lsm.input, { color: C.text }]}
            value={query}
            onChangeText={handleChangeText}
            placeholder={t('profile.editCreator.locationModalPlaceholder')}
            placeholderTextColor={C.textSecondary}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searching && <ActivityIndicator size="small" color={C.brinjal1} style={{ marginRight: 12 }} />}
        </View>

        <FlatList
          data={predictions}
          keyExtractor={(item) => item.place_id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[lsm.row, { borderBottomColor: C.border }]}
              onPress={() => handleSelectPrediction(item)}>
              <Ionicons name="location" size={18} color="#9CA3AF" />
              <View style={lsm.rowText}>
                <Text style={[lsm.mainTxt, { color: C.text }]}>{item.structured_formatting.main_text}</Text>
                <Text style={[lsm.secTxt, { color: C.textSecondary }]} numberOfLines={1}>
                  {item.structured_formatting.secondary_text}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            query.trim() && !searching ? (
              <View style={lsm.empty}>
                <Text style={[lsm.emptyTxt, { color: C.textSecondary }]}>{t('profile.editCreator.locationModalNoResults')}</Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const lsm = StyleSheet.create({
  container:  { flex: 1 },
  topBar:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1 },
  cancelBtn:  { paddingVertical: 6, paddingRight: 12 },
  cancelTxt:  { fontSize: 15, fontWeight: '600' },
  title:      { fontSize: 16, fontWeight: '700' },
  inputRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderBottomWidth: 1 },
  input:      { flex: 1, fontSize: 15, paddingVertical: 14 },
  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  rowText:    { flex: 1, gap: 2 },
  mainTxt:    { fontSize: 14, fontWeight: '600' },
  secTxt:     { fontSize: 12 },
  empty:      { paddingVertical: 40, alignItems: 'center' },
  emptyTxt:   { fontSize: 14 },
});
