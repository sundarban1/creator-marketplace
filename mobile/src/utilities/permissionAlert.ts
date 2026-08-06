import { Alert, Linking } from 'react-native';

// A denied permission previously just failed the action silently or with a
// dead-end "go to Settings" message the user had to act on manually — this
// gives them a direct path back instead. requestXPermissionsAsync() never
// re-prompts once denied (both platforms), so without this the feature is
// permanently broken for that user until they happen to find the right
// Settings screen on their own.
export function showPermissionDeniedAlert(title: string, message: string) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open Settings', onPress: () => { void Linking.openSettings(); } },
  ]);
}
