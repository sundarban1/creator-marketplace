import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native';
import { F, RADIUS } from '@/utilities/constants';

type Props = {
  visible: boolean;
  url:     string | null;
  title:   string;
  onClose: () => void;
};

// Full-screen preview for a deliverable image — same chrome as VideoPlayerModal
// (header + close + download-via-share-sheet footer) so images and videos feel
// like one consistent "tap to view" experience in the deliverables sheets.
export function ImagePreviewModal({ visible, url, title, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);
  const insets = useSafeAreaInsets();

  async function handleDownload() {
    if (!url) return;
    setDownloading(true);
    try {
      const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `${title.replace(/[^a-z0-9]+/gi, '_')}.${ext}`;
      const dest = `${FileSystem.cacheDirectory}${filename}`;
      const { uri } = await FileSystem.downloadAsync(url, dest);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Downloaded', `Saved to ${uri}`);
      }
    } catch {
      Alert.alert('Download failed', 'Could not download this image. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        <View style={[s.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={s.header}>
            <Text style={s.title} numberOfLines={1}>{title}</Text>
            <Pressable style={s.iconBtn} onPress={onClose} hitSlop={8}>
              <FontAwesome5 name="times" solid size={22} color="#fff" />
            </Pressable>
          </View>

          <View style={s.imageWrap}>
            {url && <Image source={{ uri: url }} style={s.image} contentFit="contain" />}
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
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  title:     { flex: 1, color: '#fff', fontSize: 15, fontFamily: F.semibold },
  iconBtn:   { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  imageWrap: { flex: 1, justifyContent: 'center' },
  image:     { flex: 1 },
  footer:    { padding: 16 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.12)' },
  downloadTxt: { color: '#fff', fontSize: 14, fontFamily: F.semibold },
});
