import { Stack } from 'expo-router';

export default function MessagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" getId={({ params }) => String(params?.id ?? '')} />
    </Stack>
  );
}
