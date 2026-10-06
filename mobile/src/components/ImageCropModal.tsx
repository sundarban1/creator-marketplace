import { useEffect, useState } from 'react';
import { Image as RNImage, Modal, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { F, FONT_SIZE, MIN_TOUCH_TARGET, SCREEN_GUTTER, SPACING } from '@/utilities/constants';

// ── Fixed-aspect crop step for every aspect-bound upload ────────────────────
// expo-image-picker's built-in editor ignores `aspect` on iOS (it always crops
// square), so a 16:9 event image or 2:1 cover came out the wrong shape and got
// re-cropped unpredictably wherever it was shown. This screen replaces that
// editor on both platforms: the frame is locked to the target aspect, the
// photo is dragged/pinched underneath it, and the caller gets back the crop
// rect in the source image's pixel space (applied with expo-image-manipulator).
//
// It's driven imperatively — `requestImageCrop()` from uploadImage.ts — via a
// single <ImageCropHost /> mounted in the root layout, so no upload call site
// has to render anything.

export type CropRect = { originX: number; originY: number; width: number; height: number };

type CropRequest = {
  uri: string;
  width: number;
  height: number;
  aspect: number;
  resolve: (rect: CropRect | null) => void;
};

let present: ((req: CropRequest) => void) | null = null;

const MAX_ZOOM = 5;

/** Largest centred rect of the given aspect — used when no host is mounted. */
function centerCrop(width: number, height: number, aspect: number): CropRect {
  const w = Math.min(width, height * aspect);
  const h = w / aspect;
  return { originX: Math.round((width - w) / 2), originY: Math.round((height - h) / 2), width: Math.round(w), height: Math.round(h) };
}

function measure(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => RNImage.getSize(uri, (width, height) => resolve({ width, height }), reject));
}

/**
 * Lets the user frame `uri` at `aspect` (width / height). Resolves with the
 * crop rect in source pixels, or null if they cancelled.
 */
export async function requestImageCrop(args: { uri: string; width?: number; height?: number; aspect: number }): Promise<CropRect | null> {
  let { width = 0, height = 0 } = args;
  if (!width || !height) ({ width, height } = await measure(args.uri));
  if (!present) return centerCrop(width, height, args.aspect);
  // iOS can't present a new modal while the photo picker is still animating
  // closed — the presentation is silently dropped and the promise would hang.
  if (Platform.OS === 'ios') await new Promise((r) => setTimeout(r, 400));
  return new Promise((resolve) => present?.({ uri: args.uri, width, height, aspect: args.aspect, resolve }));
}

export function ImageCropHost() {
  const [req, setReq] = useState<CropRequest | null>(null);

  useEffect(() => {
    present = setReq;
    return () => { present = null; };
  }, []);

  const finish = (rect: CropRect | null) => {
    req?.resolve(rect);
    setReq(null);
  };

  return (
    <Modal
      visible={!!req}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => finish(null)}
    >
      {/* Gesture handlers inside a RN Modal need their own root on Android. */}
      <GestureHandlerRootView style={s.root}>
        {req && <CropEditor key={req.uri} req={req} onDone={finish} />}
      </GestureHandlerRootView>
    </Modal>
  );
}

function CropEditor({ req, onDone }: { req: CropRequest; onDone: (rect: CropRect | null) => void }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);

  // Frame: as wide as the screen allows, shrunk if the aspect makes it too tall.
  let frameW = 0;
  let frameH = 0;
  if (area) {
    frameW = area.w - SCREEN_GUTTER * 2;
    frameH = frameW / req.aspect;
    const maxH = area.h - SPACING.xl * 2;
    if (frameH > maxH) { frameH = maxH; frameW = frameH * req.aspect; }
  }
  // Scale at which the photo exactly covers the frame (zoom 1 = this).
  const baseScale = area ? Math.max(frameW / req.width, frameH / req.height) : 1;
  const dispW = req.width * baseScale;
  const dispH = req.height * baseScale;

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Keep the frame fully covered: at zoom z the photo overhangs the frame by
  // (disp*z - frame)/2 on each side, which is how far it may slide.
  const clampT = (v: number, disp: number, frame: number, z: number) => {
    'worklet';
    const max = Math.max(0, (disp * z - frame) / 2);
    return Math.min(max, Math.max(-max, v));
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.set(tx.get());
      startY.set(ty.get());
    })
    .onUpdate((e) => {
      tx.set(clampT(startX.get() + e.translationX, dispW, frameW, scale.get()));
      ty.set(clampT(startY.get() + e.translationY, dispH, frameH, scale.get()));
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.set(scale.get());
    })
    .onUpdate((e) => {
      const z = Math.min(MAX_ZOOM, Math.max(1, startScale.get() * e.scale));
      scale.set(z);
      tx.set(clampT(tx.get(), dispW, frameW, z));
      ty.set(clampT(ty.get(), dispH, frameH, z));
    });

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }],
  }));

  const confirm = () => {
    if (!area) return onDone(null);
    // Map the frame back into source pixels. The photo is centred on the
    // frame then offset by (tx, ty), at an on-screen scale of baseScale*zoom.
    const s = baseScale * scale.get();
    const left = (frameW - dispW * scale.get()) / 2 + tx.get();
    const top = (frameH - dispH * scale.get()) / 2 + ty.get();
    const width = Math.min(req.width, Math.round(frameW / s));
    const height = Math.min(req.height, Math.round(frameH / s));
    const originX = Math.min(req.width - width, Math.max(0, Math.round(-left / s)));
    const originY = Math.min(req.height - height, Math.max(0, Math.round(-top / s)));
    onDone({ originX, originY, width, height });
  };

  const onAreaLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ w: width, h: height });
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}>
        <Pressable onPress={() => onDone(null)} hitSlop={8} style={s.headerBtn} accessibilityRole="button">
          <Text style={s.cancelText}>{t('common.cancel')}</Text>
        </Pressable>
        <Text style={s.title}>{t('imageCrop.title')}</Text>
        <Pressable onPress={confirm} hitSlop={8} style={[s.headerBtn, s.headerBtnEnd]} accessibilityRole="button">
          <Text style={s.doneText}>{t('common.done')}</Text>
        </Pressable>
      </View>

      <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
        <View style={s.area} onLayout={onAreaLayout}>
          {area && (
            <>
              <View style={[s.frameSlot, { width: frameW, height: frameH }]}>
                <Animated.View style={[{ width: dispW, height: dispH }, photoStyle]}>
                  <Image source={{ uri: req.uri }} style={StyleSheet.absoluteFill} contentFit="fill" />
                </Animated.View>
              </View>

              {/* Dim everything outside the frame, then outline it with a
                  rule-of-thirds grid. pointerEvents none so gestures reach
                  the area behind. */}
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                <View style={[s.dim, { height: (area.h - frameH) / 2 }]} />
                <View style={{ flexDirection: 'row', height: frameH }}>
                  <View style={[s.dim, { flex: 1 }]} />
                  <View style={[s.frame, { width: frameW, height: frameH }]}>
                    <View style={[s.gridV, { left: '33.33%' }]} />
                    <View style={[s.gridV, { left: '66.66%' }]} />
                    <View style={[s.gridH, { top: '33.33%' }]} />
                    <View style={[s.gridH, { top: '66.66%' }]} />
                  </View>
                  <View style={[s.dim, { flex: 1 }]} />
                </View>
                <View style={[s.dim, { flex: 1 }]} />
              </View>
            </>
          )}
        </View>
      </GestureDetector>

      <Text style={s.hint}>{t('imageCrop.hint')}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#000' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md },
  headerBtn:   { minWidth: 72, minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  headerBtnEnd:{ alignItems: 'flex-end' },
  title:       { color: '#fff', fontFamily: F.bold, fontSize: FONT_SIZE.lg },
  cancelText:  { color: 'rgba(255,255,255,0.8)', fontFamily: F.medium, fontSize: FONT_SIZE.md },
  doneText:    { color: '#FDBA74', fontFamily: F.bold, fontSize: FONT_SIZE.md },
  area:        { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  frameSlot:   { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  dim:         { backgroundColor: 'rgba(0,0,0,0.6)' },
  frame:       { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)' },
  gridV:       { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.45)' },
  gridH:       { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.45)' },
  hint:        { color: 'rgba(255,255,255,0.7)', fontFamily: F.regular, fontSize: FONT_SIZE.sm, textAlign: 'center', paddingVertical: SPACING.lg },
});
