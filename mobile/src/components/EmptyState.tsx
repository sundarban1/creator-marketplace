import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { F } from '@/utilities/constants';

type Props = {
  emoji?:    string;
  icon?:     keyof typeof Ionicons.glyphMap;
  title:     string;
  subtitle?: string;
  action?:   { label: string; onPress: () => void };
  children?: ReactNode;
};

export function EmptyState({ emoji, icon = 'cube-outline', title, subtitle, action, children }: Props) {
  const C = useAppColors();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: C.surface, shadowColor: C.brinjal1 }]}>
        {emoji ? (
          <Text style={styles.emoji}>{emoji}</Text>
        ) : (
          <Ionicons name={icon} size={38} color={C.brinjal1} />
        )}
      </View>
      <Text style={[styles.title, { color: C.text, fontFamily: F.bold }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: C.textSecondary, fontFamily: F.regular }]}>{subtitle}</Text>
      ) : null}
      {action ? (
        <Pressable onPress={action.onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginTop: 6 })}>
          <LinearGradient
            colors={[C.brinjal1, '#7C3AED']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.btn}>
            <Text style={[styles.btnText, { fontFamily: F.bold }]}>{action.label}</Text>
          </LinearGradient>
        </Pressable>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 60, gap: 12 },
  iconWrap:  { width: 88, height: 88, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 6, shadowOpacity: 0.10, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  emoji:     { fontSize: 40 },
  title:     { fontSize: 18, textAlign: 'center' },
  subtitle:  { fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: -2 },
  btn:       { paddingHorizontal: 32, paddingVertical: 13, borderRadius: 14 },
  btnText:   { color: '#fff', fontSize: 14 },
});
