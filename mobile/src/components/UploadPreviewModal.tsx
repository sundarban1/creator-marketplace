import { useEffect, useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { F, FONT_SIZE, MIN_TOUCH_TARGET, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';

// ── Confirm-before-upload preview for every picked photo ────────────────────
// Picking a photo used to upload/send it immediately, so a wrong pick went
// straight to the server (or into a chat). The picker helpers in
// utilities/uploadImage.ts, chatAttachments.ts and eventAttachments.ts now
// call `requestImagePreview()` right after the system picker returns; the user
// sees the photo(s) full-screen and either confirms or cancels.
//
// Driven imperatively like <ImageCropHost /> — a single <UploadPreviewHost />
// is mounted in the root layout, so no call site has to render anything.

type PreviewRequest = {
  uris: string[];
  confirmLabel?: string;
  resolve: (ok: boolean) => void;
};

let present: ((req: PreviewRequest) => void) | null = null;

/**
 * Shows `uris` full-screen with Cancel / Upload. Resolves true when the user
 * confirms, false when they cancel. With no host mounted it resolves true so
 * uploads never dead-end.
 */
export async function requestImagePreview(args: { uris: string[]; confirmLabel?: string }): Promise<boolean> {
  if (!args.uris.length) return true;
  if (!present) return true;
  // iOS can't present a new modal while the photo picker (or crop modal) is
  // still animating closed — the presentation is silently dropped and the
  // promise would hang.
  if (Platform.OS === 'ios') await new Promise((r) => setTimeout(r, 400));
  return new Promise((resolve) => present?.({ uris: args.uris, confirmLabel: args.confirmLabel, resolve }));
}

export function UploadPreviewHost() {
  const [req, setReq] = useState<PreviewRequest | null>(null);

  useEffect(() => {
    present = setReq;
    return () => { present = null; };
  }, []);

  const finish = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
  };

  return (
    <Modal
      visible={!!req}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => finish(false)}
    >
      {req && <PreviewScreen key={req.uris.join('|')} req={req} onDone={finish} />}
    </Modal>
  );
}

function PreviewScreen({ req, onDone }: { req: PreviewRequest; onDone: (ok: boolean) => void }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const count = req.uris.length;

  const label = req.confirmLabel
    ?? (count > 1 ? t('imagePreview.uploadCount', { count }) : t('imagePreview.upload'));

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom + SPACING.md }]}>
      <View style={s.header}>
        <Pressable onPress={() => onDone(false)} hitSlop={8} style={s.headerBtn} accessibilityRole="button">
          <Text style={s.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
        <Text style={s.title}>{t('imagePreview.title')}</Text>
        <View style={[s.headerBtn, s.headerBtnEnd]}>
          {count > 1 && <Text style={s.counter}>{index + 1} / {count}</Text>}
        </View>
      </View>

      <FlatList
        data={req.uris}
        keyExtractor={(uri, i) => `${i}_${uri}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={s.list}
        renderItem={({ item }) => (
          <View style={[s.page, { width }]}>
            <Image source={{ uri: item }} style={StyleSheet.absoluteFill} contentFit="contain" />
          </View>
        )}
      />

      <Text style={s.hint}>{t('imagePreview.hint')}</Text>
      <View style={s.footer}>
        <Pressable
          onPress={() => onDone(false)}
          style={({ pressed }) => [s.btn, s.btnSecondary, pressed && s.pressed]}
          accessibilityRole="button"
        >
          <Text style={s.btnSecondaryText}>{t('common.cancel')}</Text>
        </Pressable>
        <Pressable
          onPress={() => onDone(true)}
          style={({ pressed }) => [s.btn, s.btnPrimary, pressed && s.pressed]}
          accessibilityRole="button"
        >
          <Text style={s.btnPrimaryText}>{label}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: '#000' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md },
  headerBtn:        { minWidth: 72, minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  headerBtnEnd:     { alignItems: 'flex-end' },
  title:            { color: '#fff', fontFamily: F.bold, fontSize: FONT_SIZE.lg },
  cancelText:       { color: 'rgba(255,255,255,0.8)', fontFamily: F.medium, fontSize: FONT_SIZE.md },
  counter:          { color: 'rgba(255,255,255,0.8)', fontFamily: F.medium, fontSize: FONT_SIZE.sm },
  list:             { flex: 1 },
  page:             { flex: 1 },
  hint:             { color: 'rgba(255,255,255,0.7)', fontFamily: F.regular, fontSize: FONT_SIZE.sm, textAlign: 'center', paddingTop: SPACING.lg, paddingHorizontal: SCREEN_GUTTER },
  footer:           { flexDirection: 'row', gap: SPACING.md, paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg },
  btn:              { flex: 1, minHeight: MIN_TOUCH_TARGET + 4, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg },
  btnSecondary:     { borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  btnSecondaryText: { color: '#fff', fontFamily: F.medium, fontSize: FONT_SIZE.md },
  btnPrimary:       { backgroundColor: '#fff' },
  btnPrimaryText:   { color: '#000', fontFamily: F.bold, fontSize: FONT_SIZE.md },
  pressed:          { opacity: 0.75 },
});
