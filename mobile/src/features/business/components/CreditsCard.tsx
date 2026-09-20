import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@/context/LanguageContext';
import { STALE } from '@/lib/queryClient';
import { creditsService } from '@/services/rewards';
import { F, FONT_SIZE, RADIUS, SHADOW, SPACING } from '@/utilities/constants';

// Compact Home-screen teaser for the business side of Kolab Rewards (§13) —
// same "Kolab" sub-brand gradient as the creator RewardsCard (deliberately
// role-agnostic — it's one product, not two), with the two actions a
// business actually needs fast: scanning a creator's QR, and managing promotions.
export function CreditsCard() {
  const { t } = useLanguage();

  const balanceQuery = useQuery({
    queryKey: ['credits', 'balance'],
    queryFn: () => creditsService.getBalance(),
    staleTime: STALE.realtime,
    refetchOnMount: 'always',
  });
  const balance = balanceQuery.data;

  return (
    <LinearGradient colors={['#F59E0B', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <Pressable onPress={() => router.push('/(business)/credits')}>
        <View style={styles.headerRow}>
          <FontAwesome5 name="gift" solid size={14} color="#fff" />
          <Text style={styles.headerText}>{t('credits.cardTitle')}</Text>
        </View>
        <Text style={styles.value}>{(balance?.balance ?? 0).toLocaleString()} Points</Text>
      </Pressable>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionBtn} onPress={() => router.push('/(business)/scan-redemption')}>
          <FontAwesome5 name="qrcode" solid size={13} color="#EC4899" />
          <Text style={styles.actionBtnText}>{t('credits.scanButton')}</Text>
        </Pressable>
        <Pressable style={styles.actionBtnOutline} onPress={() => router.push('/(business)/promotions')}>
          <FontAwesome5 name="tags" solid size={13} color="#fff" />
          <Text style={styles.actionBtnOutlineText}>{t('credits.promotionsButton')}</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.md, ...SHADOW.raised },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerText: { fontSize: FONT_SIZE.sm, color: '#fff', fontFamily: F.bold },
  value: { fontSize: 28, color: '#fff', fontFamily: F.extrabold, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: '#fff', borderRadius: RADIUS.full, paddingVertical: 11,
  },
  actionBtnText: { fontSize: FONT_SIZE.sm, color: '#EC4899', fontFamily: F.bold },
  actionBtnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.7)', borderRadius: RADIUS.full, paddingVertical: 11,
  },
  actionBtnOutlineText: { fontSize: FONT_SIZE.sm, color: '#fff', fontFamily: F.bold },
});
