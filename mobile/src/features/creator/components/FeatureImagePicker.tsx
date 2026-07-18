import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { getTemplateImage, DEFAULT_TEMPLATE_IMAGE } from '@/features/creator/data/templateImages';
import { RADIUS, SHADOW } from '@/utilities/constants';

export function FeatureImagePicker({ imageUrl, category, uploading, onPick, onClear, colors }: {
  imageUrl: string | null; category: string; uploading: boolean; onPick: () => void; onClear: () => void;
  colors: ReturnType<typeof useAppColors>;
}) {
  const C = colors;
  const previewImage = imageUrl ?? getTemplateImage(category, category) ?? DEFAULT_TEMPLATE_IMAGE;

  return (
    <View style={fi.wrap}>
      <View style={fi.preview}>
        <Image source={{ uri: previewImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        {imageUrl && (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} hitSlop={8} style={[fi.clearBtn, { opacity: uploading ? 0.5 : 1 }]} onPress={onClear} disabled={uploading}>
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        )}
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          hitSlop={8}
          style={[fi.cameraBtn, { backgroundColor: C.brinjal1, opacity: uploading ? 0.7 : 1 }]}
          onPress={onPick}
          disabled={uploading}>
          {uploading
            ? <ActivityIndicator size="small" color="#fff" />
            : <FontAwesome5 name="camera" size={14} color="#fff" solid />}
        </Pressable>
      </View>
    </View>
  );
}

const fi = StyleSheet.create({
  wrap:    { alignItems: 'center' },
  preview: { width: '100%', aspectRatio: 16 / 9, borderRadius: RADIUS.md, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  cameraBtn: {
    position: 'absolute', bottom: 10, right: 10,
    width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center',
    ...SHADOW.raised,
  },
  clearBtn: {
    position: 'absolute', top: 10, right: 10,
    width: 28, height: 28, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.65)',
  },
});
