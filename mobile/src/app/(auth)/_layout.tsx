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
  // No pre-join agreement screen: Terms of Use / Privacy Policy / Community
  // Guidelines are agreed via the checkbox on the login + create-account forms
  // (stored on the device, recorded on the server once signed in).
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
