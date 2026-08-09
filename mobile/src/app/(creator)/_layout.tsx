import { Stack } from 'expo-router';
import { useAppColors } from '@/context/ThemeContext';

export default function CreatorGroupLayout() {
  const C = useAppColors();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.background } }} />;
}
