import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { F, FONT_SIZE, RADIUS, SPACING } from '@/utilities/constants';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

type IconName = keyof typeof FontAwesome5.glyphMap;

// "Complete your profile" nudge with a friendly progress bar — replaces the
// plain AttentionBanner for the profile case on both home screens. The
// encouragement line steps up as the profile fills in, and each missing field
// shows as a "+ Field" chip. Mirrors web's ProfileProgressCard.
type Props = {
  icon: IconName;
  title: string;
  missing: string[];
  total: number;
  onPress: () => void;
  onDismiss?: () => void;
};

export function ProfileProgressCard({ icon, title, missing, total, onPress, onDismiss }: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const done = Math.max(0, total - missing.length);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const message =
    missing.length === 1
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
        <View style={[s.iconWrap, { backgroundColor: C.primaryLight }]}>
          <FontAwesome5 name={icon} solid size={16} color={C.brinjal1} />
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

      {missing.length > 0 && (
        <View style={s.chips}>
          {missing.map((label) => (
            <View key={label} style={[s.chip, { backgroundColor: C.primaryLight }]}>
              <FontAwesome5 name="plus" solid size={9} color={C.brinjal1} />
              <Text style={[s.chipText, { color: C.brinjal1 }]}>{label}</Text>
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
  iconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: FONT_SIZE.sm, fontFamily: F.bold },
  message: { fontSize: FONT_SIZE.xs, fontFamily: F.regular, marginTop: 2, lineHeight: 18 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md },
  track: { flex: 1, height: 10, borderRadius: RADIUS.full, overflow: 'hidden' },
  fillWrap: { height: '100%', borderRadius: RADIUS.full, overflow: 'hidden' },
  pct: { fontSize: FONT_SIZE.sm, fontFamily: F.semibold, minWidth: 38, textAlign: 'right' },
  steps: { fontSize: FONT_SIZE.xs, fontFamily: F.medium, marginTop: SPACING.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: SPACING.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full },
  chipText: { fontSize: FONT_SIZE.xs, fontFamily: F.medium, lineHeight: 17 },
});
