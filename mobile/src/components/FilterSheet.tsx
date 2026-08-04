import type { ReactNode } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { BottomSheet } from '@/components/BottomSheet';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

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
// the chrome (backdrop, handle, header, scroll body, apply footer) is shared,
// via the app-wide BottomSheet primitive.
export function FilterSheet({ visible, title, resetLabel, applyLabel, onApply, onReset, onClose, children }: Props) {
  const C = useAppColors();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      maxHeightPct={0.92}
      contentContainerStyle={s.body}
      headerRight={
        <Pressable onPress={onReset}>
          <Text style={[s.reset, { color: C.brinjal1 }]}>{resetLabel}</Text>
        </Pressable>
      }
      footer={
        <Pressable
          style={({ pressed }) => [s.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.9 }]}
          onPress={onApply}>
          <Text style={s.applyTxt}>{applyLabel}</Text>
        </Pressable>
      }>
      {children}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  reset:    { fontSize: 14, fontFamily: F.semibold },
  body:     { gap: 24 },
  applyBtn: { borderRadius: RADIUS.md, height: 54, justifyContent: 'center', alignItems: 'center', ...SHADOW.raised },
  applyTxt: { color: '#fff', fontSize: 16, fontFamily: F.bold },
});

// ─── Shared section chrome ────────────────────────────────────────────────────
// The same "icon + uppercase label (+ optional hint)" header is used to
// introduce every section in every filter sheet across the app, so it lives
// here once instead of being redrawn per screen.

type IoniconName = keyof typeof FontAwesome5.glyphMap;

export function FilterSectionHeader({ icon, label, hint }: { icon: IoniconName; label: string; hint?: string }) {
  const C = useAppColors();
  return (
    <View style={h.row}>
      <View style={h.titleRow}>
        <FontAwesome5 name={icon} size={13} color={C.textSecondary} />
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
        <Pressable
          key={chip.key}
          style={[a.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}
          onPress={chip.onClear}>
          <Text style={[a.chipText, { color: C.brinjal1 }]} numberOfLines={1}>{chip.label}</Text>
          <FontAwesome5 name="times" solid size={13} color={C.brinjal1} />
        </Pressable>
      ))}
    </View>
  );
}

const a = StyleSheet.create({
  row:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.full, borderWidth: 1.5, maxWidth: '100%' },
  chipText: { fontSize: 12, fontFamily: F.semibold, flexShrink: 1 },
});
