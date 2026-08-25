import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';

type Props = {
  visible: boolean;
  url:     string | null;
  title:   string;
  onClose: () => void;
};

// Full-screen player for a deliverable video — reuses the same expo-video
// primitives chat's message screens already use for inline playback, plus a
// download button (expo-file-system -> expo-sharing's OS share sheet, which
// handles the Android FileProvider/content:// URI wiring that RN's core
// Share module doesn't) and a loading spinner shown until the player reports
// readyToPlay, since a large deliverable can take a moment to start buffering.
export function VideoPlayerModal({ visible, url, title, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);
  // Read insets via the hook, not <SafeAreaView>, and apply them as explicit
  // padding below — this RN <Modal> renders into its own native window, so
  // <SafeAreaView>'s own on-mount remeasurement doesn't land in time on the
  // very first open (only catches up on later ones), which is exactly why
  // the close button overlapped the status bar clock only the first time.
  // Same fix as LocationSearchModal.
  const insets = useSafeAreaInsets();

  // Autoplay as soon as a source is set — useVideoPlayer (see its
  // useReleasingSharedObject dep on JSON.stringify(source)) tears down and
  // recreates the native player whenever `url` changes, so this setup runs
  // again for every video without needing a separate effect. `play()` before
  // the asset is ready just queues playback for the moment it buffers, which
  // is also what kicks off loading immediately rather than waiting for the
  // viewer to press the native play button.
  const player = useVideoPlayer(url ?? null, (p) => {
    p.loop = false;
    p.play();
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  function handleRetry() {
    if (!url) return;
    player.replace(url);
    player.play();
  }

  async function handleDownload() {
    if (!url) return;
    setDownloading(true);
    try {
      const filename = `${title.replace(/[^a-z0-9]+/gi, '_')}.mp4`;
      const dest = `${FileSystem.cacheDirectory}${filename}`;
      const { uri } = await FileSystem.downloadAsync(url, dest);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'video/mp4' });
      } else {
        Alert.alert('Downloaded', `Saved to ${uri}`);
      }
    } catch {
      Alert.alert('Download failed', 'Could not download this video. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  function handleClose() {
    player.pause();
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={s.container}>
        <View style={[s.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={s.header}>
            <Text style={s.title} numberOfLines={1}>{title}</Text>
            <Pressable style={s.iconBtn} onPress={handleClose} hitSlop={8}>
              <FontAwesome5 name="times" solid size={22} color="#fff" />
            </Pressable>
          </View>

          <View style={s.playerWrap}>
            {url && <VideoView player={player} style={s.player} nativeControls contentFit="contain" />}
            {status === 'error' ? (
              <View style={s.loadingOverlay}>
                <FontAwesome5 name="exclamation-triangle" solid size={26} color="#fff" />
                <Text style={s.errorTxt}>Couldn&apos;t play this video</Text>
                <Pressable onPress={handleRetry} style={s.retryBtn} hitSlop={8}>
                  <FontAwesome5 name="redo" solid size={13} color="#fff" />
                  <Text style={s.downloadTxt}>Retry</Text>
                </Pressable>
              </View>
            ) : status !== 'readyToPlay' && (
              <View style={s.loadingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </View>

          <View style={s.footer}>
            <Pressable
              style={[s.downloadBtn, downloading && { opacity: 0.6 }]}
              onPress={handleDownload}
              disabled={downloading}
            >
              {downloading
                ? <ActivityIndicator size="small" color="#fff" />
                : <FontAwesome5 name="download" solid size={18} color="#fff" />}
              <Text style={s.downloadTxt}>{downloading ? 'Downloading…' : 'Download'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safe:      { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md, gap: 10 },
  title:     { flex: 1, color: '#fff', fontSize: 15, fontFamily: F.semibold },
  iconBtn:   { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  playerWrap: { flex: 1, justifyContent: 'center' },
  player:     { flex: 1 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', gap: 10 },
  errorTxt:  { color: '#fff', fontSize: 14, fontFamily: F.semibold },
  retryBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.15)' },
  footer:    { padding: SCREEN_GUTTER },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.12)' },
  downloadTxt: { color: '#fff', fontSize: 14, fontFamily: F.semibold },
});
