import { Stack } from 'expo-router';
import { useAppColors } from '@/context/ThemeContext';

export default function AuthLayout() {
  const C = useAppColors();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
