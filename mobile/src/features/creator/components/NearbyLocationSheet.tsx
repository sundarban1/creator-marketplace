import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

const RADIUS_PRESETS = [5, 10, 25, 50, 100];

export type NearbySource = 'current' | 'home';

type Props = {
  visible: boolean;
  onClose: () => void;
  source: NearbySource;
  radiusKm: number;
  homeLabel: string | null;
  onApply: (source: NearbySource, radiusKm: number) => void;
};

/**
 * Radius is a "set once, rarely change" setting, so it lives behind the chip
 * in this sheet rather than inline in the row header.
 */
export function NearbyLocationSheet({ visible, onClose, source, radiusKm, homeLabel, onApply }: Props) {
  const C = useAppColors();

  // Local draft state so Cancel doesn't mutate the committed setting
  const [draftSource, setDraftSource] = useState<NearbySource>(source);
  const [draftRadius, setDraftRadius] = useState(radiusKm);

  useEffect(() => {
    if (visible) {
      setDraftSource(source);
      setDraftRadius(radiusKm);
    }
  }, [visible, source, radiusKm]);

  function handleApply() {
    onApply(draftSource, draftRadius);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: C.surface }]}>
        <View style={[styles.handle, { backgroundColor: C.border }]} />

        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>Nearby Events</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={C.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>LOCATION SOURCE</Text>
          <View style={styles.sourceRow}>
            <Pressable
              style={[
                styles.sourceCard,
                { borderColor: draftSource === 'current' ? C.brinjal1 : C.border, backgroundColor: draftSource === 'current' ? C.primaryLight : C.background },
              ]}
              onPress={() => setDraftSource('current')}>
              <Ionicons name="navigate" size={20} color={draftSource === 'current' ? C.brinjal1 : C.textSecondary} />
              <Text style={[styles.sourceCardTitle, { color: draftSource === 'current' ? C.brinjal1 : C.text }]}>Current Location</Text>
              <Text style={[styles.sourceCardSub, { color: C.textSecondary }]} numberOfLines={1}>Uses your device's GPS</Text>
            </Pressable>
            <Pressable
              style={[
                styles.sourceCard,
                { borderColor: draftSource === 'home' ? C.brinjal1 : C.border, backgroundColor: draftSource === 'home' ? C.primaryLight : C.background },
                !homeLabel && { opacity: 0.5 },
              ]}
              disabled={!homeLabel}
              onPress={() => setDraftSource('home')}>
              <Ionicons name="home" size={20} color={draftSource === 'home' ? C.brinjal1 : C.textSecondary} />
              <Text style={[styles.sourceCardTitle, { color: draftSource === 'home' ? C.brinjal1 : C.text }]} numberOfLines={1}>
                Home{homeLabel ? ` · ${homeLabel}` : ''}
              </Text>
              <Text style={[styles.sourceCardSub, { color: C.textSecondary }]} numberOfLines={1}>
                {homeLabel ? 'Your saved location' : 'Set a location in your profile'}
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionLabel, { color: C.textSecondary, marginTop: 20 }]}>RADIUS</Text>
          <View style={styles.radiusRow}>
            {RADIUS_PRESETS.map((r) => {
              const active = draftRadius === r;
              return (
                <Pressable
                  key={r}
                  style={[
                    styles.radiusChip,
                    { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.brinjal1 : C.background },
                  ]}
                  onPress={() => setDraftRadius(r)}>
                  <Text style={[styles.radiusChipText, { color: active ? '#fff' : C.text }]}>{r} km</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.footer, { borderTopColor: C.border }]}>
          <Pressable
            style={({ pressed }) => [styles.applyBtn, { backgroundColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={handleApply}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:    { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 20 },
  handle:   { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title:    { fontSize: 17, fontWeight: '700', fontFamily: F.bold },

  body: { padding: 20, gap: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, fontFamily: F.bold },

  sourceRow:  { flexDirection: 'row', gap: 10, marginTop: 10 },
  sourceCard: { flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 12, gap: 4 },
  sourceCardTitle: { fontSize: 13, fontWeight: '700', fontFamily: F.bold },
  sourceCardSub:   { fontSize: 11, fontFamily: F.regular },

  radiusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  radiusChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  radiusChipText: { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  footer:   { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1 },
  applyBtn: { height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, fontFamily: F.bold },
});
