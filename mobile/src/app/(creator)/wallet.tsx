import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRefetchOnFocusIfStale } from '@/hooks/useRefetchOnFocusIfStale';
import { STALE } from '@/lib/queryClient';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import {
  walletService,
  type ApiWalletTransaction,
  type ApiPayoutMethod,
  type TransactionKind,
} from '@/services/wallet';
import { WithdrawModal } from '@/features/creator/components/WithdrawModal';
import { ImagePreviewModal } from '@/components/ImagePreviewModal';
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

const EMPTY_TRANSACTIONS: ApiWalletTransaction[] = [];
const EMPTY_PAYOUT_METHODS: ApiPayoutMethod[] = [];

export default function WalletScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [detailTx, setDetailTx] = useState<ApiWalletTransaction | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);

  // ── Wallet is financial data: cached only to render instantly and dedupe
  // requests, never trusted stale. staleTime 0 + refetchOnMount 'always' means
  // a cached balance still paints immediately (no blank screen), but a fresh
  // check always runs right behind it before the number is treated as
  // authoritative — see requirement §28.
  const summaryQuery = useQuery({
    queryKey: ['wallet', 'summary'],
    queryFn: () => walletService.getSummary(),
    staleTime: STALE.realtime,
    refetchOnMount: 'always',
  });
  const transactionsQuery = useQuery({
    queryKey: ['wallet', 'transactions'],
    queryFn: () => walletService.getTransactions(),
    staleTime: STALE.realtime,
    refetchOnMount: 'always',
  });
  // Payout methods aren't financial state — they're the creator's own saved
  // bank/wallet destinations, which change rarely.
  const payoutMethodsQuery = useQuery({
    queryKey: ['payoutMethods'],
    queryFn: () => walletService.listPayoutMethods(),
    staleTime: STALE.profile,
  });
  useRefetchOnFocusIfStale(summaryQuery, transactionsQuery, payoutMethodsQuery);

  const summary = summaryQuery.data ?? null;
  const transactions = transactionsQuery.data ?? EMPTY_TRANSACTIONS;
  const payoutMethods = payoutMethodsQuery.data ?? EMPTY_PAYOUT_METHODS;
  const loading = summaryQuery.isPending || transactionsQuery.isPending || payoutMethodsQuery.isPending;

  useEffect(() => {
    if (summaryQuery.isError || transactionsQuery.isError || payoutMethodsQuery.isError) {
      toast.error(t('wallet.loadError'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryQuery.isError, transactionsQuery.isError, payoutMethodsQuery.isError]);

  async function handleWithdraw(amount: number, payoutMethodId: string) {
    const { withdrawal, ...nextSummary } = await walletService.createWithdrawal(amount, payoutMethodId);
    // The server's own post-mutation summary, not a client guess — this is
    // writing authoritative state into the cache, not an optimistic update.
    queryClient.setQueryData(['wallet', 'summary'], nextSummary);
    await queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
    toast.success(t('wallet.withdrawSubmitted', {
      amount: amount.toLocaleString(),
      ref: withdrawal.referenceCode,
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
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    isFirst={i === 0}
                    onViewDetails={() => setDetailTx(tx)}
                  />
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
          maxWithdrawal={summary.maxWithdrawal}
          dailyLimit={summary.dailyLimit}
          dailyWithdrawalLeft={summary.dailyWithdrawalLeft}
          dailyLimitReached={summary.dailyLimitReached}
          hasPendingWithdrawal={summary.hasPendingWithdrawal}
          payoutMethods={payoutMethods}
          onWithdraw={handleWithdraw}
          onManageMethods={() => router.push('/(creator)/payout-methods')}
        />
      )}

      <TransactionDetailsModal
        tx={detailTx}
        onClose={() => setDetailTx(null)}
        onPreviewProof={setProofPreviewUrl}
      />

      <ImagePreviewModal
        visible={!!proofPreviewUrl}
        url={proofPreviewUrl}
        title={t('wallet.txDetailProof')}
        onClose={() => setProofPreviewUrl(null)}
      />
    </SafeAreaView>
  );
}

function TransactionRow({
  tx,
  isFirst,
  onViewDetails,
}: {
  tx: ApiWalletTransaction;
  isFirst: boolean;
  onViewDetails: () => void;
}) {
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
          {tx.campaignTitle ?? t(meta.labelKey)}{tx.method ? ` · ${tx.method}` : ''}
        </Text>
        <View style={styles.txMetaRow}>
          <Text style={[styles.txDate, { color: C.textSecondary }]}>{formatDate(tx.createdAt)}</Text>
          {showStatus && (
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1A` }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{t(`wallet.status_${tx.status}`)}</Text>
            </View>
          )}
          <Text style={[styles.txAmount, { color: amountColor }]}>{sign} Rs. {tx.amount.toLocaleString()}</Text>
        </View>
        {tx.kind === 'WITHDRAWAL' && !!tx.reference && (
          <Text style={[styles.txRef, { color: C.textSecondary }]} numberOfLines={1}>{tx.reference}</Text>
        )}
        {!!tx.proofUrl && (
          <Pressable
            onPress={onViewDetails}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel={t('wallet.viewTxDetails')}
            style={styles.detailsLinkRow}>
            <FontAwesome5 name="receipt" solid size={10} color={C.brinjal1} />
            <Text style={[styles.detailsLinkText, { color: C.brinjal1 }]}>{t('wallet.viewTxDetails')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const C = useAppColors();
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: C.text }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function TransactionDetailsModal({
  tx,
  onClose,
  onPreviewProof,
}: {
  tx: ApiWalletTransaction | null;
  onClose: () => void;
  onPreviewProof: (url: string) => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();

  return (
    <Modal
      visible={!!tx}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.detailBackdrop}>
        <View style={[styles.detailSheet, { backgroundColor: C.surface }]}>
          <View style={styles.detailHeader}>
            <Text style={[styles.detailTitle, { color: C.text }]}>{t('wallet.txDetailsTitle')}</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('wallet.close')}>
              <FontAwesome5 name="times" solid size={18} color={C.textSecondary} />
            </Pressable>
          </View>

          {tx && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailBody}>
              <DetailRow label={t('wallet.txDetailAmount')} value={`Rs. ${tx.amount.toLocaleString()}`} />
              {!!tx.method && <DetailRow label={t('wallet.txDetailMethod')} value={tx.method} />}
              {/* Date + txn number share one row; when there's no reference
                  (payouts/referrals) the date stands alone. */}
              {tx.reference ? (
                <View style={styles.detailRow}>
                  <View style={styles.detailPairItem}>
                    <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{t('wallet.txDetailDate')}</Text>
                    <Text style={[styles.detailPairValue, { color: C.text }]}>{formatDate(tx.createdAt)}</Text>
                  </View>
                  <View style={[styles.detailPairItem, styles.detailPairItemEnd]}>
                    <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{t('wallet.txDetailReference')}</Text>
                    <Text style={[styles.detailPairValue, { color: C.text }]} numberOfLines={1}>{tx.reference}</Text>
                  </View>
                </View>
              ) : (
                <DetailRow label={t('wallet.txDetailDate')} value={formatDate(tx.createdAt)} />
              )}

              <Text style={[styles.detailProofLabel, { color: C.textSecondary }]}>{t('wallet.txDetailProof')}</Text>
              {!!tx.proofUrl && (
                <Pressable
                  onPress={() => onPreviewProof(tx.proofUrl!)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={t('wallet.txDetailProof')}>
                  <Image
                    source={{ uri: tx.proofUrl }}
                    style={[styles.detailProofImage, { borderColor: C.border, backgroundColor: C.background }]}
                    contentFit="contain"
                  />
                </Pressable>
              )}
              <Text style={[styles.detailProofHint, { color: C.textSecondary }]}>{t('wallet.txDetailProofHint')}</Text>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
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
  txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  txDate: { fontSize: 11, fontFamily: F.regular },
  txRef: { fontSize: 10, fontFamily: F.medium, letterSpacing: 0.4, marginTop: 2 },
  statusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  statusBadgeText: { fontSize: 9, fontFamily: F.bold, textTransform: 'uppercase', letterSpacing: 0.3 },
  txAmount: { fontSize: 14, fontFamily: F.bold, marginLeft: 'auto', flexShrink: 0, paddingLeft: 8 },
  detailsLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, paddingVertical: 2 },
  detailsLinkText: { fontSize: 11, fontFamily: F.semibold },

  detailBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 28 },
  detailSheet: { width: '100%', maxHeight: '82%', borderRadius: RADIUS.xl, padding: SPACING.lg, ...SHADOW.floating },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  detailTitle: { fontSize: 16, fontFamily: F.extrabold },
  detailBody: { gap: SPACING.sm, paddingBottom: SPACING.xs },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  detailLabel: { fontSize: 12, fontFamily: F.regular },
  detailValue: { flex: 1, fontSize: 12, fontFamily: F.semibold, textAlign: 'right' },
  detailPairItem: { flex: 1, gap: 2 },
  detailPairItemEnd: { alignItems: 'flex-end' },
  detailPairValue: { fontSize: 12, fontFamily: F.semibold },
  detailProofLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: F.bold, marginTop: SPACING.sm },
  detailProofImage: { width: '100%', height: 260, borderRadius: RADIUS.md, borderWidth: 1 },
  detailProofHint: { fontSize: 11, fontFamily: F.regular, lineHeight: 16 },
});
