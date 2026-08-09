import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  onPress?: () => void;
  fallback?: string;
  // 'overlay' is for a back button sitting on a hero image/gradient — a
  // translucent white circle with no border, instead of the default solid
  // themed-surface look.
  variant?: 'solid' | 'overlay';
  icon?: keyof typeof FontAwesome5.glyphMap;
};

export function BackButton({ onPress, fallback = '/', variant = 'solid', icon = 'chevron-left' }: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const overlay = variant === 'overlay';

  function handlePress() {
    if (onPress) { onPress(); return; }
    if (router.canGoBack()) router.back();
    else router.replace(fallback as never);
  }

  return (
    <Pressable
      style={({ pressed }) => [
        overlay ? styles.overlayBtn : styles.btn,
        !overlay && { backgroundColor: C.surface, borderColor: C.border },
        { opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={handlePress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}>
      <FontAwesome5 name={icon} size={overlay ? 22 : 20} color={overlay ? '#fff' : C.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  overlayBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
});
