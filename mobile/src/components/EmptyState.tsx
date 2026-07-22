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

// Single source of truth for every "nothing here yet" screen in the app —
// centered card, same icon/title/subtitle/action layout everywhere. Update
// this component, not individual screens, when the empty-state design needs
// to change.
export function EmptyState({ emoji, icon = 'cube-outline', faIcon, title, subtitle, action, children }: Props) {
  const C = useAppColors();
  const faIconColor = faIcon ? getIconColor(faIcon, C.brinjal1) : C.brinjal1;

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.card]}>
        <View style={[styles.iconWrap, { backgroundColor: C.primaryLight }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  // Centers the card as a single unit within whatever space the caller gives
  // it (pair with `flexGrow: 1` on a FlatList's contentContainerStyle when
  // used as ListEmptyComponent). The card itself — not the raw content —
  // is what's centered, so its height varying slightly (e.g. an optional
  // action button) doesn't visibly shift the icon around.
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  card: { width: '100%', maxWidth: 360, alignItems: 'center', borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: 28, paddingVertical: 36, gap: 12 },
  iconWrap:  { width: 88, height: 88, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emoji:     { fontSize: 40 },
  title:     { fontSize: 19, textAlign: 'center', letterSpacing: 0.1 },
  subtitle:  { fontSize: 14, textAlign: 'center', lineHeight: 22, marginTop: -2 },
  btn:       { paddingHorizontal: 32, paddingVertical: 14, borderRadius: RADIUS.md },
  btnText:   { color: '#fff', fontSize: 14 },
});
