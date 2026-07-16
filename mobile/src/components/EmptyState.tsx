import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { getIconColor } from '@/features/creator/data/filterOptions';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

type Props = {
  emoji?:    string;
  icon?:     keyof typeof Ionicons.glyphMap;
  faIcon?:   string;
  title:     string;
  subtitle?: string;
  action?:   { label: string; onPress: () => void };
  children?: ReactNode;
};

export function EmptyState({ emoji, icon = 'cube-outline', faIcon, title, subtitle, action, children }: Props) {
  const C = useAppColors();
  const faIconColor = faIcon ? getIconColor(faIcon, C.brinjal1) : C.brinjal1;

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: C.surface, ...SHADOW.raised, shadowColor: faIconColor }]}>
        {faIcon ? (
          <FontAwesome5 name={faIcon as any} size={34} color={faIconColor} />
        ) : emoji ? (
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
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={action.onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, marginTop: 6 })}>
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
  // Anchored from the top (not centered) so the icon/title sit at the same
  // spot regardless of whether trailing content (e.g. an optional action
  // button) is rendered below — centering the whole variable-height block
  // would shift the icon up or down depending on what follows it.
  container: { flex: 1, alignItems: 'center', paddingHorizontal: 40, paddingTop: 72, paddingBottom: 60, gap: 12 },
  iconWrap:  { width: 88, height: 88, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emoji:     { fontSize: 40 },
  title:     { fontSize: 19, textAlign: 'center', letterSpacing: 0.1 },
  subtitle:  { fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: -2 },
  btn:       { paddingHorizontal: 32, paddingVertical: 14, borderRadius: RADIUS.md },
  btnText:   { color: '#fff', fontSize: 14 },
});
