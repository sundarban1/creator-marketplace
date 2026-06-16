import { Stack } from 'expo-router';

export default function MessagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* getId ensures each conversation ID gets its own screen instance */}
      <Stack.Screen name="[id]" getId={({ params }) => String(params?.id ?? '')} />
    </Stack>
  );
}
