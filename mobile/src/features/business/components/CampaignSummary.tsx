import { FontAwesome5 } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAppColors } from '@/context/ThemeContext';
import type { TFn } from '@/context/LanguageContext';
import { EVENT_LOADING_SVG } from '@/lib/eventLoadingSvg';
import { getTemplateImage, DEFAULT_TEMPLATE_IMAGE } from '@/features/creator/data/templateImages';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { sc } from '@/features/business/components/CampaignFormControls';

// Components used on the confirm/review recap screens of the create-campaign
// flow — extracted out of create-campaign.tsx so a later "Create Opportunity"
// flow can reuse the same recap UI without importing the whole monolith.

// ─── ListingHeroCard (Airbnb-style confirm screen header) ──────────────────────

export function ListingHeroCard({
  featureImageUrl, title, category, colors, onEditPress, onImagePress,
}: {
  featureImageUrl: string | null;
  title: string;
  category?: string;
  colors: ReturnType<typeof useAppColors>;
  // Optional — shows a small edit button over the card (used by the
  // "Create Opportunity" draft screen's tap-to-edit title). Every other
  // caller leaves this unset and gets the original, non-editable card.
  onEditPress?: () => void;
  // Optional — shows a small camera button over the image (Publish screen's
  // tap-to-change photo). Falls back to the category's template image the
  // same way the card already does when unset.
  onImagePress?: () => void;
}) {
  const C = colors;
  // Always show SOME image — the real upload, a category-matched template,
  // or a generic fallback — rather than a blank card, especially once
  // `onImagePress` makes the image area a tappable "change photo" affordance.
  const image = featureImageUrl ?? getTemplateImage(category, category) ?? (onImagePress ? DEFAULT_TEMPLATE_IMAGE : undefined);
  return (
    // Shadow (unclipped) and rounded-corner clip are split across two views —
    // same as the home feed's campaignCardWrap/campaignCard split, since
    // overflow:hidden on the same view as the shadow clips it off on Android.
    <View style={[lh.wrap, { backgroundColor: C.surface }]}>
      <View style={lh.card}>
        {image && (
          <View>
            <Image source={{ uri: image }} style={lh.image} resizeMode="cover" />
            {onImagePress && (
              <Pressable onPress={onImagePress} hitSlop={8} style={[lh.imageEditBtn, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                <FontAwesome5 name="camera" solid size={12} color="#fff" />
              </Pressable>
            )}
          </View>
        )}
        <View style={lh.body}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1, gap: 6 }}>
              {category && (
                <View style={[lh.categoryPill, { backgroundColor: C.primaryLight }]}>
                  <Text style={[lh.categoryPillText, { color: C.brinjal1 }]}>{category}</Text>
                </View>
              )}
              <Text style={[lh.title, { color: C.text }]} numberOfLines={2}>{title}</Text>
            </View>
            {onEditPress && (
              <Pressable onPress={onEditPress} hitSlop={8} style={[lh.editBtn, { backgroundColor: `${C.brinjal1}1A` }]}>
                <FontAwesome5 name="pen" solid size={12} color={C.brinjal1} />
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

const lh = StyleSheet.create({
  // Matches the home feed's campaign-card treatment — a raised shadow
  // instead of a flat border, so the finished listing looks like it'll
  // sit among the other cards on the home feed.
  wrap:            { borderRadius: RADIUS.lg, ...SHADOW.raised },
  card:            { borderRadius: RADIUS.lg, overflow: 'hidden' },
  image:           { width: '100%', height: 160 },
  body:            { padding: 14, gap: 6 },
  categoryPill:    { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  categoryPillText:{ fontSize: 11, fontFamily: F.bold },
  title:           { fontSize: 18, fontFamily: F.bold },
  editBtn:         { width: 30, height: 30, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
  imageEditBtn:    { position: 'absolute', right: 10, bottom: 10, width: 32, height: 32, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center' },
});

// ─── AiGeneratingOverlay (full-screen loader while AI drafts the event) ────────

const AI_OVERLAY_STEP_KEYS = ['aiOverlayStep1', 'aiOverlayStep2', 'aiOverlayStep3', 'aiOverlayStep4'] as const;

// SMIL <animate>/<animateTransform> elements in the SVG only play in a real
// browser engine — react-native-svg doesn't execute them — so the artwork is
// rendered through a WebView instead, which uses the platform's own engine.
const EVENT_LOADING_HTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" /><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;height:100%;width:100%;}svg{width:100%;height:100%;display:block;}</style></head><body>${EVENT_LOADING_SVG}</body></html>`;

export function AiGeneratingOverlay({ visible, t }: {
  visible: boolean;
  t: TFn;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const stepFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    setStepIndex(0);

    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(stepFade, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(stepFade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      setStepIndex((i) => (i + 1) % AI_OVERLAY_STEP_KEYS.length);
    }, 1800);

    return () => clearInterval(interval);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={ov.backdrop}>
        <View style={ov.artWrap}>
          {visible && (
            <WebView
              style={ov.art}
              containerStyle={{ backgroundColor: 'transparent' }}
              source={{ html: EVENT_LOADING_HTML }}
              originWhitelist={['*']}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              pointerEvents="none"
            />
          )}
        </View>
        <Text style={ov.title}>{t('createEvent.aiOverlayTitle')}</Text>
        <Animated.Text style={[ov.step, { opacity: stepFade }]}>
          {t(`createEvent.${AI_OVERLAY_STEP_KEYS[stepIndex]}`)}
        </Animated.Text>
      </View>
    </Modal>
  );
}

const ov = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  artWrap:  { width: 260, height: 260 },
  art:      { flex: 1, backgroundColor: 'transparent' },
  title:    { fontSize: 17, fontFamily: F.bold, textAlign: 'center', color: '#fff', marginTop: 8 },
  step:     { fontSize: 13, fontFamily: F.regular, textAlign: 'center', color: 'rgba(255,255,255,0.75)', minHeight: 18, marginTop: 6 },
});

// ─── PreviewRow (read-only recap line, confirm screen) ─────────────────────────

export function PreviewRow({
  icon, label, value, colors, last, onPress,
}: {
  icon: keyof typeof FontAwesome5.glyphMap;
  label: string;
  value: string;
  colors: ReturnType<typeof useAppColors>;
  last?: boolean;
  // Optional — when set, the row becomes tappable (a trailing chevron
  // appears) for the "Create Opportunity" draft screen's tap-to-edit
  // fields. Every other caller (legacy Confirm, etc.) leaves this unset and
  // gets the original plain, read-only row.
  onPress?: () => void;
}) {
  const C = colors;
  const content = (
    <View style={[s.summaryRow, !last && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: 150 }}>
        <View style={[sc.iconChip, { width: 24, height: 24, backgroundColor: `${C.brinjal1}1A`, shadowColor: C.brinjal1 }]}>
          <FontAwesome5 name={icon} size={12} color={C.brinjal1} />
        </View>
        <Text style={[s.summaryLabel, { width: undefined, color: C.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[s.summaryValue, { color: C.text, flex: onPress ? 1 : undefined }]} numberOfLines={3}>{value}</Text>
      {onPress && <FontAwesome5 name="chevron-right" solid size={12} color={C.textSecondary} />}
    </View>
  );
  return onPress ? <Pressable onPress={onPress} hitSlop={4}>{content}</Pressable> : content;
}

// summaryRow/summaryLabel/summaryValue are duplicated (not imported) from
// create-campaign.tsx's main `s` StyleSheet — they're also used by other,
// non-moved JSX in that file (the event-summary SectionCard), so the keys
// stay defined in both places rather than one importing from the other.
const s = StyleSheet.create({
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, gap: 12 },
  summaryLabel: { fontSize: 13, fontFamily: F.regular, width: 72 },
  summaryValue: { flex: 1, fontSize: 13, fontFamily: F.semibold, textAlign: 'right' },
});
