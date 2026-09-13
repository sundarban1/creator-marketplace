import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { useRefetchOnFocusIfStale } from '@/hooks/useRefetchOnFocusIfStale';
import { STALE } from '@/lib/queryClient';
import { Skeleton } from '@/components/Skeleton';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { pointsService, type ApiPointsLedgerRow, type PointsTransactionType } from '@/services/rewards';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const TYPE_META: Record<PointsTransactionType, { icon: keyof typeof FontAwesome5.glyphMap; labelKey: string }> = {
  PROMO_REDEMPTION_DEBIT: { icon: 'tag',       labelKey: 'rewards.txPromoRedemption' },
  ADJUSTMENT:             { icon: 'sliders-h', labelKey: 'rewards.txAdjustment' },
};

const EMPTY_HISTORY: ApiPointsLedgerRow[] = [];

export default function RewardsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();

  // Points balance gates whether a redemption can succeed server-side (see
  // redemption.service.ts's insufficientPoints guard) — same "cache renders
  // instantly, but always re-check" rule wallet.tsx uses for money.
  const balanceQuery = useQuery({
    queryKey: ['points', 'balance'],
    queryFn: () => pointsService.getBalance(),
    staleTime: STALE.realtime,
    refetchOnMount: 'always',
  });
  const historyQuery = useQuery({
    queryKey: ['points', 'history'],
    queryFn: () => pointsService.getHistory(),
    staleTime: STALE.realtime,
    refetchOnMount: 'always',
  });
  useRefetchOnFocusIfStale(balanceQuery, historyQuery);

  const balance = balanceQuery.data ?? null;
  const history = historyQuery.data ?? EMPTY_HISTORY;
  const loading = balanceQuery.isPending || historyQuery.isPending;

  useEffect(() => {
    if (balanceQuery.isError || historyQuery.isError) toast.error(t('rewards.loadError'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanceQuery.isError, historyQuery.isError]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
        <PageHeader title={t('rewards.headerTitle')} backFallback="/(creator)/(tabs)" />

        {loading || !balance ? (
          <View style={styles.content}>
            <Skeleton width="100%" height={150} radius={RADIUS.lg} />
            <Skeleton width="100%" height={48} radius={RADIUS.md} style={{ marginTop: 4 }} />
            <Skeleton width={100} height={11} style={{ marginTop: 12, marginBottom: 2 }} />
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.txRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                  <Skeleton width={36} height={36} radius={RADIUS.full} />
                  <View style={styles.txInfo}>
                    <Skeleton width="50%" height={13} />
                    <Skeleton width="35%" height={11} style={{ marginTop: 6 }} />
                  </View>
                  <Skeleton width={70} height={14} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Balance card */}
            <LinearGradient colors={['#F59E0B', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>{t('rewards.balanceLabel')}</Text>
              <Text style={styles.balanceValue}>{balance.balance.toLocaleString()}</Text>
              <Text style={styles.supportingText}>{t('rewards.supportingText')}</Text>
              {balance.earnedThisMonth > 0 && (
                <View style={styles.monthPill}>
                  <FontAwesome5 name="arrow-up" solid size={9} color="#fff" />
                  <Text style={styles.monthPillText}>{t('rewards.thisMonthValue', { n: balance.earnedThisMonth.toLocaleString() })}</Text>
                </View>
              )}
            </LinearGradient>

            {/* Actions */}
            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: C.surface, borderColor: C.brinjal1 }]}
                onPress={() => router.push('/(creator)/deals')}>
                <FontAwesome5 name="tags" solid size={16} color={C.brinjal1} />
                <Text style={[styles.actionBtnText, { color: C.brinjal1 }]}>{t('rewards.findDealsButton')}</Text>
              </Pressable>
            </View>

            {/* Recent Activity */}
            <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>{t('rewards.recentActivityTitle')}</Text>
            {history.length === 0 ? (
              <View style={[styles.emptyWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
                <FontAwesome5 name="star" solid size={32} color={C.textSecondary} />
                <Text style={[styles.emptyTitle, { color: C.text }]}>{t('rewards.noActivityYet')}</Text>
                <Text style={[styles.emptyHint, { color: C.textSecondary }]}>{t('rewards.noActivityHint')}</Text>
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                {history.map((tx, i) => (
                  <PointsRow key={tx.id} tx={tx} isFirst={i === 0} />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

function PointsRow({ tx, isFirst }: { tx: ApiPointsLedgerRow; isFirst: boolean }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const meta = TYPE_META[tx.type];
  const credit = tx.direction === 'CREDIT';
  const sign = credit ? '+' : '−';
  const amountColor = credit ? '#059669' : '#EF4444';

  return (
    <View style={[styles.txRow, !isFirst && { borderTopWidth: 1, borderTopColor: C.border }]}>
      <View style={[styles.txIcon, { backgroundColor: `${credit ? '#059669' : C.brinjal1}1A` }]}>
        <FontAwesome5 name={meta.icon} solid size={13} color={credit ? '#059669' : C.brinjal1} />
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txTitle, { color: C.text }]} numberOfLines={1}>{t(meta.labelKey)}</Text>
        <Text style={[styles.txDate, { color: C.textSecondary }]}>{formatDate(tx.createdAt)}</Text>
      </View>
      <Text style={[styles.txAmount, { color: amountColor }]}>{sign} {tx.amount.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },

  balanceCard: { borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 4, ...SHADOW.raised },
  balanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontFamily: F.medium },
  balanceValue: { fontSize: 36, color: '#fff', fontFamily: F.extrabold },
  supportingText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontFamily: F.regular, marginTop: 4 },
  monthPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5,
  },
  monthPillText: { fontSize: 11, color: '#fff', fontFamily: F.bold },

  actionsRow: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, borderWidth: 1.5, paddingVertical: 14 },
  actionBtnText: { fontSize: 14, fontFamily: F.bold },

  sectionHeader: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: F.bold, marginTop: 8 },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden', ...SHADOW.card },
  emptyWrap: { alignItems: 'center', borderRadius: RADIUS.lg, borderWidth: 1, paddingVertical: 32, paddingHorizontal: 16, gap: 8, ...SHADOW.card },
  emptyTitle: { fontSize: 14, fontFamily: F.bold },
  emptyHint: { fontSize: 12, textAlign: 'center', fontFamily: F.regular },

  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  txIcon: { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1, gap: 3 },
  txTitle: { fontSize: 13, fontFamily: F.semibold },
  txDate: { fontSize: 11, fontFamily: F.regular },
  txAmount: { fontSize: 14, fontFamily: F.bold, marginLeft: 'auto', flexShrink: 0, paddingLeft: 8 },
});
