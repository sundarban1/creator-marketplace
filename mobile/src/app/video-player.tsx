import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Full-screen modal (not the app's usual 'modal' presentation, used by
// submit-proposal/create-campaign) — edge-to-edge black background suits
// video playback; those two are forms, this is media.
export default function VideoPlayerScreen() {
  const { url } = useLocalSearchParams<{ url: string; thumbnail?: string }>();
  // Read insets via the hook, not <SafeAreaView>, and apply them as explicit
  // padding below — this screen is a `fullScreenModal` presentation, which
  // renders into its own native window; <SafeAreaView>'s own on-mount
  // remeasurement doesn't land in time on the very first open (only catches
  // up on later ones), which is exactly why the close button overlapped the
  // status bar clock only the first time. Same fix as LocationSearchModal.
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(url ?? null, (p) => {
    p.play();
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        allowsPictureInPicture
        contentFit="contain"
      />
      <View style={[styles.closeWrap, { top: insets.top }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  closeWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  closeBtn: {
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
