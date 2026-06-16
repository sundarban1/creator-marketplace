import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';

type Props = {
  emoji?:    string;
  title:     string;
  subtitle?: string;
  action?:   { label: string; onPress: () => void };
  children?: ReactNode;
};

export function EmptyState({ emoji = '📭', title, subtitle, action, children }: Props) {
  const C = useAppColors();

  return (
    <View style={styles.container}>
      <View style={[styles.emojiCard, { backgroundColor: C.surface, shadowColor: C.brinjal1 }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={[styles.title, { color: C.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>{subtitle}</Text>
      ) : null}
      {action ? (
        <Pressable
          style={[styles.btn, { backgroundColor: C.brinjal1 }]}
          onPress={action.onPress}>
          <Text style={styles.btnText}>{action.label}</Text>
        </Pressable>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    gap: 12,
  },
  emojiCard: {
    width: 88,
    height: 88,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  emoji:    { fontSize: 40 },
  title:    { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: -2 },
  btn:      { marginTop: 10, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  btnText:  { color: '#fff', fontSize: 14, fontWeight: '700' },
});
