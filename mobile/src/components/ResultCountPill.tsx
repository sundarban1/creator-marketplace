import { StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { F, FONT_SIZE, RADIUS, lineHeightFor } from '@/utilities/constants';

// The "N creators found" line that closes every browse list. Shared rather
// than restyled per screen so People / Services / Businesses all end the same
// way — as a pill matching the category pills above the list, instead of the
// bare centered sentence each list used to render on its own.
export function ResultCountPill({ label }: { label: string }) {
  const C = useAppColors();
  return (
    <View style={s.wrap}>
      <View style={[s.pill, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[s.label, { color: C.textSecondary }]} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // alignItems rather than alignSelf on the pill: inside a FlatList footer the
  // pill would otherwise stretch to the full row width and lose its shape.
  wrap:  { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  pill:  { paddingHorizontal: 14, paddingVertical: 6, borderRadius: RADIUS.full, borderWidth: 1 },
  // lineHeight via lineHeightFor so Devanagari matras aren't clipped in `ne`.
  label: { fontSize: FONT_SIZE.sm, lineHeight: lineHeightFor(FONT_SIZE.sm), fontFamily: F.semibold },
});
