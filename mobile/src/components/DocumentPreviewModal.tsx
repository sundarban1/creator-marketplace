import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, RADIUS } from '@/utilities/constants';

type Props = {
  visible: boolean;
  url:     string | null;
  title:   string;
  onClose: () => void;
};

// PDF/DOCX preview — same header/close/download chrome as ImagePreviewModal
// and VideoPlayerModal. Neither PDF nor DOCX has a native renderer available
// here, so this renders via Google's public document viewer in a WebView
// (works for any publicly-reachable URL, which Cloudinary deliverable links
// always are) rather than kicking the user out to an external app.
export function DocumentPreviewModal({ visible, url, title, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const viewerUrl = url ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true` : null;

  async function handleDownload() {
    if (!url) return;
    setDownloading(true);
    try {
      const ext = url.split('.').pop()?.split('?')[0] || 'pdf';
      const filename = `${title.replace(/[^a-z0-9]+/gi, '_')}.${ext}`;
      const dest = `${FileSystem.cacheDirectory}${filename}`;
      const { uri } = await FileSystem.downloadAsync(url, dest);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Downloaded', `Saved to ${uri}`);
      }
    } catch {
      Alert.alert('Download failed', 'Could not download this file. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} onShow={() => setLoading(true)}>
      <View style={s.container}>
        <View style={[s.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={s.header}>
            <Text style={s.title} numberOfLines={1}>{title}</Text>
            <Pressable style={s.iconBtn} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
          </View>

          <View style={s.docWrap}>
            {viewerUrl && (
              <WebView
                source={{ uri: viewerUrl }}
                style={s.webview}
                onLoadEnd={() => setLoading(false)}
                startInLoadingState={false}
              />
            )}
            {loading && (
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
                : <Ionicons name="download-outline" size={18} color="#fff" />}
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
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  title:     { flex: 1, color: '#fff', fontSize: 15, fontFamily: F.semibold },
  iconBtn:   { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  docWrap:   { flex: 1, backgroundColor: '#fff' },
  webview:   { flex: 1 },
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  footer:    { padding: 16 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.12)' },
  downloadTxt: { color: '#fff', fontSize: 14, fontFamily: F.semibold },
});
