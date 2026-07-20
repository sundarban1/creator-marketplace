import { StyleSheet, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { Skeleton } from '@/components/Skeleton';
import { RADIUS, SHADOW } from '@/utilities/constants';

// Mirrors CampaignCard's dimensions (CARD_W 244 / CARD_IMG_H 188) so the
// loading state doesn't jump when real cards swap in.
const CARD_W = 244;
const CARD_IMG_H = 188;

export function CampaignCardSkeleton() {
  const C = useAppColors();
  return (
    <View style={[styles.wrap, { ...SHADOW.floating, shadowColor: '#000' }]}>
      <View style={[styles.card, { backgroundColor: C.surface }]}>
        <Skeleton width={CARD_W} height={CARD_IMG_H} radius={0} />
        <View style={styles.body}>
          <View style={styles.brandRow}>
            <Skeleton width={18} height={18} radius={RADIUS.full} />
            <Skeleton width={70} height={11} />
          </View>
          <Skeleton width="90%" height={16} style={{ marginTop: 2 }} />
          <Skeleton width="60%" height={16} style={{ marginTop: 6 }} />
          <Skeleton width={100} height={12} style={{ marginTop: 8 }} />
          <View style={styles.metaRow}>
            <Skeleton width={60} height={20} radius={RADIUS.sm} />
            <Skeleton width={44} height={18} radius={RADIUS.sm} />
          </View>
          <Skeleton width="100%" height={40} radius={RADIUS.full} style={{ marginTop: 10 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: CARD_W },
  card: { width: CARD_W, borderRadius: RADIUS.md, overflow: 'hidden' },
  body: { padding: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
});
