import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset';
import { F } from '@/utilities/constants';

type Props = {
  visible: boolean;
  title: string;
  resetLabel: string;
  applyLabel: string;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
  children: ReactNode;
};

// Shared bottom-sheet shell for filter modals (Home / Explore Brands / Explore
// Creators) — each screen supplies its own section content as children, only
// the chrome (backdrop, handle, header, scroll body, apply footer) is shared.
export function FilterSheet({ visible, title, resetLabel, applyLabel, onApply, onReset, onClose, children }: Props) {
  const C = useAppColors();
  const keyboardOffset = useKeyboardOffset();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={s.backdrop} onPress={onClose} />
      <Animated.View style={[s.sheet, { backgroundColor: C.surface, transform: [{ translateY: keyboardOffset }] }]}>
        <View style={[s.handle, { backgroundColor: C.border }]} />

        <View style={[s.header, { borderBottomColor: C.border }]}>
          <Text style={[s.title, { color: C.text }]}>{title}</Text>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={onReset}>
            <Text style={[s.reset, { color: C.brinjal1 }]}>{resetLabel}</Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
          {children}
        </ScrollView>

        <View style={[s.footer, { borderTopColor: C.border }]}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={({ pressed }) => [s.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
            onPress={onApply}>
            <Text style={s.applyTxt}>{applyLabel}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:    { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 20 },
  handle:   { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title:    { fontSize: 17, fontFamily: F.extrabold },
  reset:    { fontSize: 14, fontFamily: F.semibold },
  body:     { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, gap: 24 },
  footer:   { padding: 20, borderTopWidth: 1 },
  applyBtn: { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  applyTxt: { color: '#fff', fontSize: 16, fontFamily: F.bold },
});

// ─── Shared section chrome ────────────────────────────────────────────────────
// The same "icon + uppercase label (+ optional hint)" header is used to
// introduce every section in every filter sheet across the app, so it lives
// here once instead of being redrawn per screen.

type IoniconName = keyof typeof Ionicons.glyphMap;

export function FilterSectionHeader({ icon, label, hint }: { icon: IoniconName; label: string; hint?: string }) {
  const C = useAppColors();
  return (
    <View style={h.row}>
      <View style={h.titleRow}>
        <Ionicons name={icon} size={13} color={C.textSecondary} />
        <Text style={[h.label, { color: C.textSecondary }]}>{label}</Text>
      </View>
      {hint ? <Text style={[h.hint, { color: C.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

const h = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label:    { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: F.bold },
  hint:     { fontSize: 11, fontFamily: F.semibold },
});

// ─── Shared active-filter summary row ─────────────────────────────────────────
// A quick-glance, one-tap-to-clear summary of what's currently set inside a
// filter sheet, rendered as the first thing in the scrollable body — reviewing
// or undoing a choice shouldn't require scrolling down to find its section.

export type ActiveFilterChip = { key: string; label: string; onClear: () => void };

export function ActiveFilterChips({ chips }: { chips: ActiveFilterChip[] }) {
  const C = useAppColors();
  if (chips.length === 0) return null;
  return (
    <View style={a.row}>
      {chips.map((chip) => (
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          key={chip.key}
          style={[a.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
          onPress={chip.onClear}>
          <Text style={[a.chipText, { color: C.brinjal1 }]} numberOfLines={1}>{chip.label}</Text>
          <Ionicons name="close" size={13} color={C.brinjal1} />
        </Pressable>
      ))}
    </View>
  );
}

const a = StyleSheet.create({
  row:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, maxWidth: '100%' },
  chipText: { fontSize: 12, fontFamily: F.semibold, flexShrink: 1 },
});
