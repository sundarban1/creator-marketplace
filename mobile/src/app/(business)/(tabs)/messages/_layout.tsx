import { Stack } from 'expo-router';
import { useAppColors } from '@/context/ThemeContext';

export default function MessagesLayout() {
  const C = useAppColors();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" dangerouslySingular={false} />
    </Stack>
  );
}
