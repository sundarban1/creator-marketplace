import { StyleSheet, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { Skeleton } from '@/components/Skeleton';
import { RADIUS, SHADOW } from '@/utilities/constants';

// Generic compact row skeleton — avatar/thumbnail + two text lines, optionally
// a small trailing badge line. Covers the many list screens (messages,
// notifications, proposals, campaigns, saved/favorite lists) whose rows are
// "avatar + name/title + subtitle" even though the real cards differ in detail.
export function ListRowSkeleton({
  avatarSize = 52,
  avatarRadius,
  withBadge = false,
}: {
  avatarSize?: number;
  avatarRadius?: number;
  withBadge?: boolean;
}) {
  const C = useAppColors();
  const radius = avatarRadius ?? avatarSize / 2;

  return (
    <View style={[styles.card, { backgroundColor: C.surface, ...SHADOW.raised }]}>
      <Skeleton width={avatarSize} height={avatarSize} radius={radius} />
      <View style={styles.info}>
        <Skeleton width="65%" height={15} />
        <Skeleton width="45%" height={12} style={{ marginTop: 8 }} />
        {withBadge && <Skeleton width={70} height={20} radius={RADIUS.sm} style={{ marginTop: 8 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: RADIUS.lg, padding: 16 },
  info: { flex: 1, justifyContent: 'center' },
});
