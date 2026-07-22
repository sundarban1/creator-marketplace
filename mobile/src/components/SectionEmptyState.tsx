import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { F, RADIUS } from '@/utilities/constants';

type Props = {
  icon: string;
  title: string;
  hint: string;
  cta: string;
  onPress: () => void;
};

// Compact "this section is empty" card for a single section within a longer
// scrollable page (e.g. a profile's Social Accounts / Categories / Past Work
// cards) — always paired with an action, unlike the full-screen `EmptyState`.
export function SectionEmptyState({ icon, title, hint, cta, onPress }: Props) {
  const C = useAppColors();
  return (
    <View style={[styles.wrap, { borderColor: C.border }]}>
      <FontAwesome5 name={icon} solid size={28} color={C.border} />
      <Text style={[styles.title, { color: C.text }]}>{title}</Text>
      <Text style={[styles.hint, { color: C.textSecondary }]}>{hint}</Text>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        style={[
          styles.cta,
          {
            backgroundColor: C.brinjal1, shadowColor: C.brinjal1,
            shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
          },
        ]}
        onPress={onPress}>
        <Text style={styles.ctaText}>{cta}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:    { alignItems: 'center', gap: 8, paddingVertical: 20, paddingHorizontal: 12, borderWidth: 1.5, borderRadius: RADIUS.lg, borderStyle: 'dashed' },
  title:   { fontSize: 14, fontFamily: F.bold },
  hint:    { fontSize: 12, textAlign: 'center', lineHeight: 18, fontFamily: F.regular },
  cta:     { borderRadius: RADIUS.full, paddingHorizontal: 20, paddingVertical: 9, minHeight: 40, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  ctaText: { fontSize: 13, color: '#fff', fontFamily: F.bold },
});
