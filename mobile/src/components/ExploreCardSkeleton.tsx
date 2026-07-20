import { StyleSheet, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { Skeleton } from '@/components/Skeleton';
import { RADIUS, SHADOW } from '@/utilities/constants';

// Mirrors the row-card shape used by explore-creators / explore-businesses
// (and their saved/favorite variants): ring avatar + name/location + bio +
// a stat tray + a full-width CTA pill.
export function ExploreCardSkeleton() {
  const C = useAppColors();
  return (
    <View style={[styles.card, { backgroundColor: C.surface, ...SHADOW.raised }]}>
      <View style={styles.header}>
        <Skeleton width={60} height={60} radius={RADIUS.md} />
        <View style={styles.meta}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="45%" height={12} style={{ marginTop: 8 }} />
        </View>
        <Skeleton width={36} height={36} radius={RADIUS.full} />
      </View>
      <Skeleton width="95%" height={13} style={{ marginTop: 12 }} />
      <Skeleton width="80%" height={13} style={{ marginTop: 6 }} />
      <Skeleton width="100%" height={38} radius={RADIUS.md} style={{ marginTop: 12 }} />
      <Skeleton width="100%" height={38} radius={RADIUS.full} style={{ marginTop: 10 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card:   { borderRadius: RADIUS.lg, padding: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  meta:   { flex: 1, justifyContent: 'center' },
});
