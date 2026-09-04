import { useState } from 'react';
import { Image } from 'expo-image';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { pickImageFromLibrary } from '@/utilities/chatAttachments';
import { supportService } from '@/services/support';
import { useLanguage } from '@/context/LanguageContext';
import { RADIUS, SPACING, F } from '@/utilities/constants';

const MAX_ATTACHMENTS = 3;

type Item = { id: string; uri: string; url?: string; uploading: boolean; failed?: boolean };

// Mirrors the Upload Deliverables thumbnail-grid + add-tile design (see
// activity-timeline.tsx's `up` styles) — thumbnail, remove badge, add tile —
// but simplified to images-only, uploaded one at a time via
// POST /api/support/attachments as soon as they're picked.
export function SupportAttachmentPicker({
  colors: C,
  urls,
  onChange,
}: {
  colors: { border: string; surface: string; text: string; textSecondary: string; brinjal1: string };
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const { t } = useLanguage();
  const [items, setItems] = useState<Item[]>([]);

  function emitChange(next: Item[]) {
    onChange(next.filter((i) => i.url).map((i) => i.url!));
  }

  async function handleAdd() {
    if (items.length >= MAX_ATTACHMENTS) return;
    const picked = await pickImageFromLibrary();
    if (!picked) return;

    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const item: Item = { id, uri: picked.uri, uploading: true };
    setItems((prev) => {
      const next = [...prev, item];
      return next;
    });

    try {
      const url = await supportService.uploadAttachment(picked);
      setItems((prev) => {
        const next = prev.map((i) => (i.id === id ? { ...i, url, uploading: false } : i));
        emitChange(next);
        return next;
      });
    } catch {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, uploading: false, failed: true } : i)));
    }
  }

  function handleRemove(id: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      emitChange(next);
      return next;
    });
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {items.map((item) => (
          <View key={item.id} style={[styles.thumbWrap, { borderColor: C.border }]}>
            <Image source={{ uri: item.uri }} style={styles.thumb} contentFit="cover" />
            {item.uploading && (
              <View style={styles.overlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
            {item.failed && (
              <View style={styles.overlay}>
                <FontAwesome5 name="exclamation-circle" solid size={20} color="#fff" />
              </View>
            )}
            <Pressable style={styles.removeBadge} onPress={() => handleRemove(item.id)} hitSlop={6}>
              <FontAwesome5 name="times-circle" solid size={18} color="#EF4444" />
            </Pressable>
          </View>
        ))}
        {items.length < MAX_ATTACHMENTS && (
          <Pressable
            style={[styles.addTile, { borderColor: C.border, backgroundColor: C.surface }]}
            onPress={handleAdd}
            hitSlop={6}>
            <FontAwesome5 name="plus" solid size={22} color={C.brinjal1} />
          </Pressable>
        )}
      </View>
      <Text style={[styles.hint, { color: C.textSecondary }]}>
        {t('common.attachmentLabel')} · {t('common.attachmentMaxHint')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  row:  { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap' },
  thumbWrap: { width: 64, height: 64, borderRadius: RADIUS.sm, borderWidth: 1, overflow: 'visible' },
  thumb: { width: '100%', height: '100%', borderRadius: RADIUS.sm },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: RADIUS.sm, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  removeBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: RADIUS.full },
  addTile: {
    width: 64, height: 64, borderRadius: RADIUS.sm, borderWidth: 1, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  hint: { fontSize: 11, fontFamily: F.regular },
});
