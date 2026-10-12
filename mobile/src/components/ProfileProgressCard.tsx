import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { F, FONT_SIZE, RADIUS, SPACING } from '@/utilities/constants';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export type ProfileStep = {
  key: string;
  done: boolean;
  /** What to do and why, e.g. "Add a social link to get discovered". */
  label: string;
  /** Optional second line under the label. */
  hint?: string;
  /** Inline link that takes the user straight to where the step is done. */
  actionLabel: string;
  onAction: () => void;
};

// "Finish setting up your profile" nudge with a friendly progress bar —
// replaces the plain AttentionBanner for the profile case on both home
// screens. Leads with the user's own avatar (initials until one is uploaded);
// the encouragement line steps up as the profile fills in, and each step still
// to do is shown one at a time, with its own deep link. Mirrors web's ProfileProgressCard.
type Props = {
  title: string;
  name: string;
  avatarUrl: string | null | undefined;
  steps: ProfileStep[];
  onPress: () => void;
  onDismiss?: () => void;
};

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

export function ProfileProgressCard({ title, name, avatarUrl, steps, onPress, onDismiss }: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const total = steps.length;
  const done = steps.filter((s) => s.done).length;
  const remaining = steps.filter((s) => !s.done);
  // Only the next step is shown — one ask at a time instead of a checklist.
  const next = remaining[0];
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const message =
    remaining.length === 1
      ? t('profileProgress.msgLast')
      : done === 0
        ? t('profileProgress.msgStart')
        : pct > 50
          ? t('profileProgress.msgMost')
          : t('profileProgress.msgEarly');

  // Fill animates from empty on mount, then eases to each new value. A small
  // floor keeps a sliver visible at 0% so the bar reads as "started".
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fill, { toValue: Math.max(pct, 6), duration: 800, useNativeDriver: false }).start();
  }, [fill, pct]);
  const width = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${t('profileProgress.progressLabel', { pct })}`}
      style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={s.header}>
        <View style={[s.avatar, { backgroundColor: C.primaryLight }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={s.avatarImage} contentFit="cover" />
          ) : (
            <Text style={[s.initials, { color: C.brinjal1 }]}>{initialsOf(name)}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.title, { color: C.text }]}>{title}</Text>
          <Text style={[s.message, { color: C.textSecondary }]}>{message}</Text>
        </View>
        {onDismiss && (
          <Pressable hitSlop={12} onPress={(e) => { e.stopPropagation(); onDismiss(); }} accessibilityLabel="Dismiss">
            <FontAwesome5 name="times" solid size={14} color={C.textPlaceholder} />
          </Pressable>
        )}
      </View>

      <View style={s.barRow}>
        <View
          style={[s.track, { backgroundColor: C.border }]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: pct }}>
          <Animated.View style={[s.fillWrap, { width }]}>
            <LinearGradient colors={[C.brinjal1, C.active]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
        <Text style={[s.pct, { color: C.text }]}>{pct}%</Text>
      </View>
      <Text style={[s.steps, { color: C.textPlaceholder }]}>{t('profileProgress.stepsDone', { done, total })}</Text>

      {next && (
        <View style={[s.list, { borderTopColor: C.border }]}>
          {[next].map((step) => (
            <View key={step.key} style={s.row}>
              <View style={[s.dot, { borderColor: C.brinjal1 }]} />
              <View style={{ flex: 1 }}>
                <Text style={[s.rowLabel, { color: C.text }]}>{step.label}</Text>
                {step.hint ? <Text style={[s.rowHint, { color: C.textPlaceholder }]}>{step.hint}</Text> : null}
              </View>
              <Pressable
                hitSlop={10}
                accessibilityRole="link"
                onPress={(e) => { e.stopPropagation(); step.onAction(); }}
                style={s.action}>
                <Text style={[s.actionText, { color: C.brinjal1 }]}>{step.actionLabel}</Text>
                <FontAwesome5 name="chevron-right" solid size={9} color={C.brinjal1} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: RADIUS.md, borderWidth: 1, padding: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  avatar: { width: 40, height: 40, borderRadius: RADIUS.full, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  initials: { fontSize: FONT_SIZE.sm, fontFamily: F.bold },
  title: { fontSize: FONT_SIZE.sm, fontFamily: F.bold },
  message: { fontSize: FONT_SIZE.xs, fontFamily: F.regular, marginTop: 2, lineHeight: 18 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md },
  track: { flex: 1, height: 10, borderRadius: RADIUS.full, overflow: 'hidden' },
  fillWrap: { height: '100%', borderRadius: RADIUS.full, overflow: 'hidden' },
  pct: { fontSize: FONT_SIZE.sm, fontFamily: F.semibold, minWidth: 38, textAlign: 'right' },
  steps: { fontSize: FONT_SIZE.xs, fontFamily: F.medium, marginTop: SPACING.xs },
  list: { marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dot: { width: 8, height: 8, borderRadius: RADIUS.full, borderWidth: 1.5 },
  rowLabel: { fontSize: FONT_SIZE.xs, fontFamily: F.medium, lineHeight: 18 },
  rowHint: { fontSize: FONT_SIZE.xs, fontFamily: F.regular, lineHeight: 17, marginTop: 1 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '45%' },
  actionText: { fontSize: FONT_SIZE.xs, fontFamily: F.semibold, lineHeight: 18, textAlign: 'right' },
});
