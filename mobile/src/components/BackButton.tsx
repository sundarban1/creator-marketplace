import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAppColors } from '@/context/ThemeContext';

type Props = {
  onPress?: () => void;
  fallback?: string;
};

export function BackButton({ onPress, fallback = '/' }: Props) {
  const C = useAppColors();

  function handlePress() {
    if (onPress) { onPress(); return; }
    if (router.canGoBack()) router.back();
    else router.replace(fallback as never);
  }

  return (
    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: C.surface, borderColor: C.border, opacity: pressed ? 0.7 : 1 },
      ]}
      onPress={handlePress}
      hitSlop={8}>
      <Ionicons name="chevron-back" size={20} color={C.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
});
