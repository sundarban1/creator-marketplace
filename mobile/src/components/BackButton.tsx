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
    <Pressable style={[styles.btn, { backgroundColor: C.primaryLight }]} onPress={handlePress} hitSlop={8}>
      <Ionicons name="chevron-back" size={22} color={C.brinjal1} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
});
