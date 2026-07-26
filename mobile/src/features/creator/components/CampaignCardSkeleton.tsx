import { StyleSheet, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { Skeleton } from '@/components/Skeleton';
import { RADIUS, SHADOW } from '@/utilities/constants';

// Mirrors CampaignCard's dimensions (CARD_W 264 / CARD_IMG_H 150) so the
// loading state doesn't jump when real cards swap in.
const CARD_W = 264;
const CARD_IMG_H = 150;

export function CampaignCardSkeleton() {
  const C = useAppColors();
  return (
    <View style={[styles.wrap, { ...SHADOW.raised, shadowColor: '#0F172A' }]}>
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Skeleton width={CARD_W} height={CARD_IMG_H} radius={0} />
        <View style={styles.body}>
          <Skeleton width="90%" height={16} />
          <Skeleton width="60%" height={16} style={{ marginTop: 6 }} />
          <Skeleton width={100} height={11} style={{ marginTop: 8 }} />
          <Skeleton width={60} height={20} radius={RADIUS.sm} style={{ marginTop: 10 }} />
          <View style={[styles.detailsSection, { borderTopColor: C.border, borderBottomColor: C.border }]}>
            <Skeleton width="70%" height={12} />
            <Skeleton width="50%" height={12} style={{ marginTop: 8 }} />
            <Skeleton width="65%" height={12} style={{ marginTop: 8 }} />
          </View>
          <View style={styles.platformsRow}>
            <Skeleton width={28} height={28} radius={RADIUS.sm} />
            <Skeleton width={28} height={28} radius={RADIUS.sm} />
          </View>
          <Skeleton width="100%" height={42} radius={RADIUS.sm} style={{ marginTop: 12 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: CARD_W },
  card: { width: CARD_W, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1 },
  body: { padding: 14 },
  detailsSection: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 10, marginTop: 10 },
  platformsRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
});
