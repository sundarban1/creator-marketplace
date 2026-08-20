import { StyleSheet, View } from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { Skeleton } from '@/components/Skeleton';
import { RADIUS, SHADOW } from '@/utilities/constants';

// Mirrors CampaignCard's dimensions (CARD_W 264 / CARD_IMG_H 112) so the
// loading state doesn't jump when real cards swap in.
const CARD_W = 264;
const CARD_IMG_H = 112;

export function CampaignCardSkeleton() {
  const C = useAppColors();
  return (
    <View style={[styles.wrap, { ...SHADOW.raised, shadowColor: '#0F172A' }]}>
      <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Skeleton width={CARD_W} height={CARD_IMG_H} radius={0} />
        <View style={styles.body}>
          <Skeleton width="80%" height={14} />
          <View style={styles.metaRow}>
            <Skeleton width={90} height={11} />
            <Skeleton width={44} height={17} radius={RADIUS.sm} />
          </View>
          <View style={[styles.detailsRow, { borderTopColor: C.border }]}>
            <Skeleton width="45%" height={11} />
            <Skeleton width={50} height={11} />
          </View>
          <Skeleton width="100%" height={38} radius={RADIUS.sm} style={{ marginTop: 10 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: CARD_W },
  card: { width: CARD_W, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1 },
  body: { padding: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 8, marginTop: 8 },
});
