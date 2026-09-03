import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { F, RADIUS } from '@/utilities/constants';
import { withAlpha } from '@/utilities/color';

type Props = {
  label: string;
  value: string;
  placeholder: string;
  onPress: () => void;
  onClear?: () => void;
  clearLabel?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  rightSlot?: ReactNode;
};

// A tap-to-open location picker styled to match `TextInputWithLabel` — same
// label row, filled/tonal row with a circular icon badge, feedback line — so
// it sits flush next to real text fields (e.g. Website) on the Edit Profile
// screens. Opening the actual search UI is the caller's job (`onPress`).
export function LocationField({
  label, value, placeholder, onPress, onClear, clearLabel, hint, error, required, rightSlot,
}: Props) {
  const C = useAppColors();
  const filled = !!value;

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: C.text, fontFamily: F.semibold }]}>
          {label}
          {required ? <Text style={{ color: C.text }}> *</Text> : null}
        </Text>
        {rightSlot}
      </View>

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={[
          styles.row,
          {
            backgroundColor: C.primaryLight,
            borderColor: error ? withAlpha(C.error, 0.35) : C.border,
          },
        ]}>
        <View style={[styles.iconWrap, { backgroundColor: C.border }]}>
          <FontAwesome5 name="map-marker-alt" size={16} color={C.textSecondary} />
        </View>
        <Text
          style={[styles.value, { color: filled ? C.text : C.textPlaceholder, fontFamily: F.regular }]}
          numberOfLines={2}>
          {value || placeholder}
        </Text>
        <FontAwesome5 name="chevron-right" size={13} color={C.textSecondary} style={styles.chevron} />
      </Pressable>

      {(error || hint) && (
        <View style={styles.feedbackRow}>
          {error ? (
            <>
              <FontAwesome5 name="exclamation-circle" solid size={12} color={C.error} />
              <Text style={[styles.errorText, { color: C.error, fontFamily: F.medium }]}>{error}</Text>
            </>
          ) : (
            <Text style={[styles.hintText, { color: C.textSecondary, fontFamily: F.regular }]}>{hint}</Text>
          )}
        </View>
      )}

      {filled && onClear ? (
        <Pressable onPress={onClear} hitSlop={8}>
          <Text style={[styles.clear, { color: C.error }]}>{clearLabel ?? 'Clear'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:  { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:    { fontSize: 13, letterSpacing: 0.2 },
  row:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: RADIUS.lg, paddingHorizontal: 5, minHeight: 54, gap: 4 },
  iconWrap: { width: 38, height: 38, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginLeft: 4, flexShrink: 0 },
  value:    { flex: 1, paddingHorizontal: 10, fontSize: 15, lineHeight: 21 },
  chevron:  { paddingHorizontal: 10 },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  errorText:   { fontSize: 11, flexShrink: 1 },
  hintText:    { fontSize: 11, paddingHorizontal: 2 },
  clear:       { fontSize: 12, marginTop: 2, fontFamily: F.semibold },
});
