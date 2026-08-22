import { Stack } from 'expo-router';
import { BusinessTheme, useAppColors } from '@/context/ThemeContext';

export default function BusinessGroupLayout() {
  // BusinessTheme pins the whole group to the green palette (BusinessStack reads
  // colours from inside it) so logout doesn't repaint these screens brinjal in
  // the gap between `logout()` clearing the user and the redirect to login.
  return (
    <BusinessTheme>
      <BusinessStack />
    </BusinessTheme>
  );
}

function BusinessStack() {
  const C = useAppColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }} />;
}
