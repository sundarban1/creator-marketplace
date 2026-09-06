import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';

type GalleryItem = { url: string; label: string };

type Props = {
  visible: boolean;
  url:     string | null;
  title:   string;
  onClose: () => void;
  // Optional gallery mode — when supplied the modal shows ‹ › arrows and a
  // "2 / 5" counter, and drives the image/title from items[index] (url/title
  // above are then only the fallback for the first frame). Single-image
  // callers omit these entirely and get the plain viewer unchanged.
  items?:        GalleryItem[];
  index?:        number;
  onIndexChange?: (i: number) => void;
};

// Full-screen preview for a deliverable image — same chrome as VideoPlayerModal
// (header + close + download-via-share-sheet footer) so images and videos feel
// like one consistent "tap to view" experience in the deliverables sheets.
export function ImagePreviewModal({ visible, url, title, onClose, items, index = 0, onIndexChange }: Props) {
  const [downloading, setDownloading] = useState(false);
  const insets = useSafeAreaInsets();

  const gallery = items && items.length > 0 ? items : null;
  const safeIndex = gallery ? Math.min(Math.max(index, 0), gallery.length - 1) : 0;
  const current = gallery ? gallery[safeIndex] : null;
  const shownUrl   = current?.url ?? url;
  const shownTitle = current?.label ?? title;
  const hasPrev = !!gallery && gallery.length > 1 && safeIndex > 0;
  const hasNext = !!gallery && gallery.length > 1 && safeIndex < gallery.length - 1;

  async function handleDownload() {
    if (!shownUrl) return;
    setDownloading(true);
    try {
      const ext = shownUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `${shownTitle.replace(/[^a-z0-9]+/gi, '_')}.${ext}`;
      const dest = `${FileSystem.cacheDirectory}${filename}`;
      const { uri } = await FileSystem.downloadAsync(shownUrl, dest);
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
            <Text style={s.title} numberOfLines={1}>{shownTitle}</Text>
            {gallery && gallery.length > 1 && (
              <Text style={s.counter}>{safeIndex + 1} / {gallery.length}</Text>
            )}
            <Pressable style={s.iconBtn} onPress={onClose} hitSlop={8}>
              <FontAwesome5 name="times" solid size={22} color="#fff" />
            </Pressable>
          </View>

          <View style={s.imageWrap}>
            {shownUrl && <Image source={{ uri: shownUrl }} style={s.image} contentFit="contain" />}

            {hasPrev && (
              <Pressable
                style={[s.navBtn, s.navPrev]}
                hitSlop={12}
                onPress={() => onIndexChange?.(safeIndex - 1)}
              >
                <FontAwesome5 name="chevron-left" solid size={20} color="#fff" />
              </Pressable>
            )}
            {hasNext && (
              <Pressable
                style={[s.navBtn, s.navNext]}
                hitSlop={12}
                onPress={() => onIndexChange?.(safeIndex + 1)}
              >
                <FontAwesome5 name="chevron-right" solid size={20} color="#fff" />
              </Pressable>
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
  counter:   { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: F.medium },
  iconBtn:   { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  imageWrap: { flex: 1, justifyContent: 'center' },
  image:     { flex: 1 },
  navBtn:    { position: 'absolute', top: '50%', marginTop: -22, width: 44, height: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  navPrev:   { left: SPACING.md },
  navNext:   { right: SPACING.md },
  footer:    { padding: SCREEN_GUTTER },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.12)' },
  downloadTxt: { color: '#fff', fontSize: 14, fontFamily: F.semibold },
});
