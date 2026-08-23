import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

type Props = {
  icon?: keyof typeof FontAwesome5.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

// Sibling of EmptyState (same card/icon-circle/title layout) for the other
// half of "why is this screen not showing my data" — a failed load rather
// than a genuinely empty result. Exists specifically so screens stop
// hand-rolling their own error block and, worse, sometimes putting the raw
// caught error's `.message` in front of the user instead of a sanitized
// sentence — the caller must pass a real `message`, there's no prop that
// accepts an Error/exception here by design.
export function ErrorState({ icon = 'exclamation-triangle', title, message, actionLabel, onAction }: Props) {
  const C = useAppColors();
  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.card]}>
        <View style={[styles.iconWrap, { backgroundColor: '#FEF2F2' }]}>
          <FontAwesome5 name={icon} solid size={32} color="#DC2626" />
        </View>
        <Text style={[styles.title, { color: C.text, fontFamily: F.bold }]}>{title}</Text>
        {message ? (
          <Text style={[styles.message, { color: C.textSecondary, fontFamily: F.regular }]}>{message}</Text>
        ) : null}
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={({ pressed }) => [styles.btn, { backgroundColor: C.brinjal1, opacity: pressed ? 0.88 : 1 }]}>
            <FontAwesome5 name="redo" solid size={13} color="#fff" />
            <Text style={[styles.btnText, { fontFamily: F.bold }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same centering contract as EmptyState — pair with `flexGrow: 1` on a
  // FlatList's contentContainerStyle when used as ListEmptyComponent.
  wrap:     { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.xl },
  card:     { width: '100%', maxWidth: 360, alignItems: 'center', borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: 28, paddingVertical: 36, gap: 12 },
  iconWrap: { width: 88, height: 88, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  title:    { fontSize: 19, textAlign: 'center', letterSpacing: 0.1 },
  message:  { fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: -2 },
  btn:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 13, borderRadius: RADIUS.md, marginTop: 6, ...SHADOW.raised },
  btnText:  { color: '#fff', fontSize: 14 },
});
