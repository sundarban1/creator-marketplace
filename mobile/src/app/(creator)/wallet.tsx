import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import {
  walletService,
  type ApiWalletSummary,
  type ApiWalletTransaction,
  type ApiPayoutMethod,
  type TransactionKind,
} from '@/services/wallet';
import { WithdrawModal } from '@/features/creator/components/WithdrawModal';
import { Skeleton } from '@/components/Skeleton';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const KIND_META: Record<TransactionKind, { icon: keyof typeof FontAwesome5.glyphMap; labelKey: string }> = {
  CAMPAIGN_PAYOUT: { icon: 'briefcase',       labelKey: 'wallet.txCampaignPayout' },
  REFERRAL_REWARD: { icon: 'gift',            labelKey: 'wallet.txReferralReward' },
  REFERRAL_BONUS:  { icon: 'gift',            labelKey: 'wallet.txReferralBonus' },
  WITHDRAWAL:      { icon: 'arrow-up',        labelKey: 'wallet.txWithdrawal' },
  ADJUSTMENT:      { icon: 'sliders-h',       labelKey: 'wallet.txAdjustment' },
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:    '#D97706',
  PROCESSING: '#2563EB',
  REJECTED:   '#DC2626',
  CANCELLED:  '#6B7280',
  COMPLETED:  '#059669',
  PAID:       '#059669',
};

export default function WalletScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ApiWalletSummary | null>(null);
  const [transactions, setTransactions] = useState<ApiWalletTransaction[]>([]);
  const [payoutMethods, setPayoutMethods] = useState<ApiPayoutMethod[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  function loadAll() {
    return Promise.all([
      walletService.getSummary(),
      walletService.getTransactions(),
      walletService.listPayoutMethods(),
    ])
      .then(([s, tx, pm]) => { setSummary(s); setTransactions(tx); setPayoutMethods(pm); })
      .catch(() => toast.error(t('wallet.loadError')));
  }

  const hasFocusedOnceRef = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!hasFocusedOnceRef.current) {
      hasFocusedOnceRef.current = true;
      setLoading(true);
      void loadAll().finally(() => setLoading(false));
      return;
    }
    void loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  async function handleWithdraw(amount: number, payoutMethodId: string) {
    const res = await walletService.createWithdrawal(amount, payoutMethodId);
    setSummary((prev) => ({
      totalEarned:         res.totalEarned,
      pendingEarnings:     res.pendingEarnings,
      availableBalance:    res.availableBalance,
      pendingWithdrawals:  res.pendingWithdrawals,
      withdrawableBalance: res.withdrawableBalance,
      minWithdrawal:       res.minWithdrawal ?? prev?.minWithdrawal ?? 0,
    }));
    setTransactions(await walletService.getTransactions());
    toast.success(t('wallet.withdrawSubmitted', {
      amount: amount.toLocaleString(),
      ref: res.withdrawal.referenceCode,
    }));
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
        <PageHeader title={t('wallet.headerTitle')} backFallback="/(creator)/" />

        {loading || !summary ? (
          <View style={styles.content}>
            <Skeleton width="100%" height={170} radius={RADIUS.lg} />
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
            <View style={[styles.balanceCard, { backgroundColor: C.brinjal1 }]}>
              <Text style={styles.balanceLabel}>{t('wallet.availableBalance')}</Text>
              <Text style={styles.balanceValue}>Rs. {summary.availableBalance.toLocaleString()}</Text>
              <View style={styles.balanceStatsRow}>
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>{t('wallet.pendingWithdrawals')}</Text>
                  <Text style={styles.balanceStatValue}>Rs. {summary.pendingWithdrawals.toLocaleString()}</Text>
                </View>
                <View style={styles.balanceStatDivider} />
                <View style={styles.balanceStat}>
                  <Text style={styles.balanceStatLabel}>{t('wallet.withdrawableBalance')}</Text>
                  <Text style={styles.balanceStatValue}>Rs. {summary.withdrawableBalance.toLocaleString()}</Text>
                </View>
              </View>
            </View>

            {/* Withdraw button */}
            <Pressable
              style={[styles.withdrawBtn, { backgroundColor: C.surface, borderColor: C.brinjal1 }]}
              onPress={() => setModalVisible(true)}>
              <FontAwesome5 name="arrow-alt-circle-down" size={20} color={C.brinjal1} />
              <Text style={[styles.withdrawBtnText, { color: C.brinjal1 }]}>{t('wallet.withdrawMoney')}</Text>
            </Pressable>

            {payoutMethods.length === 0 && (
              <Text style={[styles.noMethodsHint, { color: C.textSecondary }]}>{t('wallet.noPayoutMethodsHint')}</Text>
            )}

            <Pressable
              style={[styles.manageBtn, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => router.push('/(creator)/payout-methods')}>
              <FontAwesome5 name="credit-card" size={18} color={C.text} />
              <Text style={[styles.manageBtnText, { color: C.text }]}>{t('payoutMethods.addFromWallet')}</Text>
            </Pressable>

            {/* Statement */}
            <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>{t('wallet.statementTitle')}</Text>
            {transactions.length === 0 ? (
              <View style={[styles.emptyWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
                <FontAwesome5 name="receipt" solid size={32} color={C.textSecondary} />
                <Text style={[styles.emptyTitle, { color: C.text }]}>{t('wallet.noTransactionsYet')}</Text>
                <Text style={[styles.emptyHint, { color: C.textSecondary }]}>{t('wallet.noTransactionsHint')}</Text>
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                {transactions.map((tx, i) => (
                  <TransactionRow key={tx.id} tx={tx} isFirst={i === 0} />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </MaxWidthContainer>

      {summary && (
        <WithdrawModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          withdrawableBalance={summary.withdrawableBalance}
          minWithdrawal={summary.minWithdrawal}
          payoutMethods={payoutMethods}
          onWithdraw={handleWithdraw}
          onManageMethods={() => router.push('/(creator)/payout-methods')}
        />
      )}
    </SafeAreaView>
  );
}

function TransactionRow({ tx, isFirst }: { tx: ApiWalletTransaction; isFirst: boolean }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const meta = KIND_META[tx.kind];
  const credit = tx.direction === 'CREDIT';
  const sign = credit ? '+' : '−';
  const amountColor = credit ? '#059669' : (tx.status === 'REJECTED' || tx.status === 'CANCELLED' ? C.textSecondary : '#EF4444');
  const showStatus = tx.status !== 'COMPLETED';
  const statusColor = STATUS_COLOR[tx.status] ?? C.textSecondary;

  return (
    <View style={[styles.txRow, !isFirst && { borderTopWidth: 1, borderTopColor: C.border }]}>
      <View style={[styles.txIcon, { backgroundColor: `${credit ? '#059669' : C.brinjal1}1A` }]}>
        <FontAwesome5 name={meta.icon} solid size={13} color={credit ? '#059669' : C.brinjal1} />
      </View>
      <View style={styles.txInfo}>
        <Text style={[styles.txTitle, { color: C.text }]} numberOfLines={1}>
          {t(meta.labelKey)}{tx.method ? ` · ${tx.method}` : ''}
        </Text>
        <View style={styles.txMetaRow}>
          <Text style={[styles.txDate, { color: C.textSecondary }]}>{formatDate(tx.createdAt)}</Text>
          {showStatus && (
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1A` }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{t(`wallet.status_${tx.status}`)}</Text>
            </View>
          )}
        </View>
        {tx.kind === 'WITHDRAWAL' && !!tx.reference && (
          <Text style={[styles.txRef, { color: C.textSecondary }]} numberOfLines={1}>{tx.reference}</Text>
        )}
      </View>
      <Text style={[styles.txAmount, { color: amountColor }]}>{sign} Rs. {tx.amount.toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },

  balanceCard: { borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 4, ...SHADOW.raised },
  balanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: F.medium },
  balanceValue: { fontSize: 32, color: '#fff', fontFamily: F.bold, marginBottom: 12 },
  balanceStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  balanceStat: { flex: 1, gap: 2 },
  balanceStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  balanceStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: F.medium },
  balanceStatValue: { fontSize: 15, color: '#fff', fontFamily: F.bold },

  withdrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, borderWidth: 1.5, paddingVertical: 14 },
  withdrawBtnText: { fontSize: 14, fontFamily: F.bold },
  noMethodsHint: { fontSize: 12, textAlign: 'center', fontFamily: F.regular, marginTop: -4 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: RADIUS.md, borderWidth: 1.5, paddingVertical: 12 },
  manageBtnText: { fontSize: 13, fontFamily: F.semibold },

  sectionHeader: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: F.bold, marginTop: 8 },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden', ...SHADOW.card },
  emptyWrap: { alignItems: 'center', borderRadius: RADIUS.lg, borderWidth: 1, paddingVertical: 32, paddingHorizontal: 16, gap: 8, ...SHADOW.card },
  emptyTitle: { fontSize: 14, fontFamily: F.bold },
  emptyHint: { fontSize: 12, textAlign: 'center', fontFamily: F.regular },

  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  txIcon: { width: 36, height: 36, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1, gap: 3 },
  txTitle: { fontSize: 13, fontFamily: F.semibold },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  txDate: { fontSize: 11, fontFamily: F.regular },
  txRef: { fontSize: 10, fontFamily: F.medium, letterSpacing: 0.4, marginTop: 2 },
  statusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  statusBadgeText: { fontSize: 9, fontFamily: F.bold, textTransform: 'uppercase', letterSpacing: 0.3 },
  txAmount: { fontSize: 14, fontFamily: F.bold },
});
