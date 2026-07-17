import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Full-screen modal (not the app's usual 'modal' presentation, used by
// submit-proposal/create-campaign) — edge-to-edge black background suits
// video playback; those two are forms, this is media.
export default function VideoPlayerScreen() {
  const { url } = useLocalSearchParams<{ url: string; thumbnail?: string }>();
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
      <SafeAreaView style={styles.closeWrap} edges={['top']}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
      </SafeAreaView>
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
