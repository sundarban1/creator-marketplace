import { useEvent } from 'expo';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
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
  // Without this, a load/decode failure (stale CDN response, unsupported
  // format) leaves nativeControls sitting on a black frame with no feedback
  // — same class of "looks like it's playing but isn't" bug VoiceBubblePlayer
  // had for audio. `status` starts at 'loading' so a spinner shows until the
  // player actually confirms it's ready.
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  function handleRetry() {
    if (!url) return;
    player.replace(url);
    player.play();
  }

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
      {status === 'loading' && (
        <View style={styles.centerOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      {status === 'error' && (
        <View style={styles.centerOverlay}>
          <FontAwesome5 name="exclamation-triangle" solid size={28} color="#fff" />
          <Text style={styles.errorTxt}>Couldn&apos;t play this video</Text>
          <Pressable onPress={handleRetry} style={styles.retryBtn} hitSlop={8}>
            <FontAwesome5 name="redo" solid size={13} color="#fff" />
            <Text style={styles.retryTxt}>Retry</Text>
          </Pressable>
        </View>
      )}
      <View style={[styles.closeWrap, { top: insets.top }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.closeBtn}
        >
          <FontAwesome5 name="times" solid size={26} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  centerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', gap: 10 },
  errorTxt: { color: '#fff', fontSize: 14 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
  retryTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },
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
