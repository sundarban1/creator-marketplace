import { Stack } from 'expo-router';
import { PreLoginTheme, useAppColors } from '@/context/ThemeContext';

export default function AuthLayout() {
  // PreLoginTheme wraps the whole stack (and AuthStack reads colours from
  // inside it) so login/signup keep the neutral palette even once `login()`
  // has set a BUSINESS user — the green theme starts at the business home,
  // not mid-transition on the login screen.
  return (
    <PreLoginTheme>
      <AuthStack />
    </PreLoginTheme>
  );
}

function AuthStack() {
  const C = useAppColors();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
