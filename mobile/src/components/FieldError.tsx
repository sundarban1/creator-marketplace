import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { F, RADIUS, lineHeightFor } from '@/utilities/constants';
import { withAlpha } from '@/utilities/color';

/**
 * The one way a field shows it's invalid — icon + short message directly under
 * the field. Mirrors web `app/ui/FieldError.tsx`; keep the two visually identical
 * (14px icon, 13px medium error text, 6px gap).
 */
export function FieldError({ message, style }: { message?: string | null; style?: StyleProp<ViewStyle> }) {
  const C = useAppColors();
  if (!message) return null;
  return (
    <View style={[styles.row, style]} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <FontAwesome5 name="exclamation-circle" solid size={14} color={C.error} style={styles.icon} />
      <Text style={[styles.text, { color: C.error, fontFamily: F.medium }]}>{message}</Text>
    </View>
  );
}

/** Field label with the shared red required asterisk. */
export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  const C = useAppColors();
  return (
    <Text style={[styles.label, { color: C.text, fontFamily: F.semibold }]}>
      {children}
      {required && <Text style={{ color: C.error }}> *</Text>}
    </Text>
  );
}

/**
 * Form-level error (server rejection, or a rule spanning several fields).
 * Sits directly above the submit button. Field errors never go here, in a
 * toast, or in an Alert pop-up.
 */
export function FormErrorBanner({ message, style }: { message?: string | string[] | null; style?: StyleProp<ViewStyle> }) {
  const C = useAppColors();
  const list = (Array.isArray(message) ? message : message ? [message] : []).filter(Boolean);
  if (!list.length) return null;
  return (
    <View
      style={[styles.banner, { backgroundColor: withAlpha(C.error, 0.1) }, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <FontAwesome5 name="exclamation-circle" solid size={16} color={C.error} style={styles.icon} />
      <View style={{ flex: 1, gap: 2 }}>
        {list.map((m) => (
          <Text key={m} style={[styles.text, { color: C.error, fontFamily: F.medium }]}>
            {list.length > 1 ? `• ${m}` : m}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 2 },
  icon:   { marginTop: 2 },
  text:   { fontSize: 13, lineHeight: lineHeightFor(13), flexShrink: 1 },
  label:  { fontSize: 13, letterSpacing: 0.2 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: RADIUS.sm, paddingHorizontal: 14, paddingVertical: 12 },
});
