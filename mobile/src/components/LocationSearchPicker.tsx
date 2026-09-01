import { useState } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F } from '@/utilities/constants';
import { LocationSearchModal } from '@/components/LocationSearchModal';

export type LocationEntry = { label: string; lat: number | null; lng: number | null };
export type LocationFilter = LocationEntry[];

const MAX_LOCS = 3;

export function LocationSearchPicker({
  selected,
  onSelect,
  showRemoteOption = true,
}: {
  selected: LocationFilter;
  onSelect: (v: LocationFilter) => void;
  // Callers that already have a dedicated Onsite/Remote toggle elsewhere
  // (e.g. the creator home feed's Filter modal) pass false here so this
  // picker doesn't offer a second, redundant way to express "remote".
  showRemoteOption?: boolean;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [modalOpen, setModalOpen] = useState(false);

  // 'Remote' is a data sentinel compared against campaign/creator location
  // elsewhere in the app — keep it untranslated in the stored label, only
  // the displayed text below is localized.
  const remoteSelected = selected.some((l) => l.label === 'Remote');
  const atMax = selected.length >= MAX_LOCS;

  function toggleRemote() {
    if (remoteSelected) {
      onSelect(selected.filter((l) => l.label !== 'Remote'));
    } else if (!atMax) {
      onSelect([...selected, { label: 'Remote', lat: null, lng: null }]);
    }
  }

  function handleLocationSelect(address: string, lat: number, lng: number) {
    setModalOpen(false);
    if (atMax || selected.some((l) => l.label === address)) return;
    onSelect([...selected, { label: address, lat: lat || null, lng: lng || null }]);
  }

  return (
    <View style={ls.container}>
      {/* Selected places are surfaced by the sheet's own ActiveFilterChips row
          at the top, so we don't echo them here above the search box. Only the
          Remote chip stays — it's an interactive toggle, not a status echo. */}
      {showRemoteOption && (
        <View style={ls.selectedChips}>
          <Pressable
            style={[ls.remoteChip, { borderColor: remoteSelected ? C.brinjal1 : C.border, backgroundColor: remoteSelected ? C.primaryLight : C.background }, !remoteSelected && atMax && { opacity: 0.35 }]}
            onPress={toggleRemote}
            disabled={!remoteSelected && atMax}>
            <FontAwesome5 name="globe" solid size={13} color={remoteSelected ? C.brinjal1 : C.textSecondary} />
            <Text style={[ls.remoteText, { color: remoteSelected ? C.brinjal1 : C.text, fontWeight: remoteSelected ? '700' : '500' }]}>
              {t('filterModal.remote')}
            </Text>
            {remoteSelected && <FontAwesome5 name="times" solid size={13} color={C.brinjal1} />}
          </Pressable>
        </View>
      )}

      {/* Trigger — matches the edit-profile location field: a tappable box
          that opens the full search modal, instead of an inline dropdown. */}
      {!atMax && (
        <Pressable
          style={[ls.addBtn, { backgroundColor: C.background, borderColor: C.border }]}
          onPress={() => setModalOpen(true)}>
          <FontAwesome5 name="search" solid size={15} color={C.textSecondary} />
          <Text style={[ls.addBtnTxt, { color: C.textSecondary }]}>{t('filterModal.searchCityPlaceholder')}</Text>
          <Text style={[ls.addBtnArrow, { color: C.textSecondary }]}>›</Text>
        </Pressable>
      )}

      <LocationSearchModal
        visible={modalOpen}
        initialValue=""
        onSelect={handleLocationSelect}
        onClose={() => setModalOpen(false)}
      />
    </View>
  );
}

const ls = StyleSheet.create({
  container:       { gap: 8 },
  remoteChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  remoteText:      { fontSize: 13, fontFamily: F.regular },
  selectedChips:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  addBtn:          { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
  addBtnTxt:       { flex: 1, fontSize: 14, fontFamily: F.regular },
  addBtnArrow:     { fontSize: 20 },
});
