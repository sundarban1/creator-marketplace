import { router } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '@/components/BackButton';
import { PaymentMethodIcon } from '@/components/PaymentMethodIcon';
import { isPaymentMethodId } from '@/utilities/paymentMethods';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { walletService, type ApiWalletSummary, type ApiWithdrawal } from '@/services/wallet';
import { WithdrawModal } from '@/features/creator/components/WithdrawModal';
import { F } from '@/utilities/constants';

const METHOD_META: Record<string, { icon: string; color: string }> = {
  esewa:   { icon: 'wallet', color: '#60BB46' },
  khalti:  { icon: 'money-check-alt', color: '#5C2D91' },
  fonepay: { icon: 'mobile-alt', color: '#003087' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function WalletScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ApiWalletSummary | null>(null);
  const [transactions, setTransactions] = useState<ApiWithdrawal[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  function loadAll() {
    return Promise.all([walletService.getSummary(), walletService.getTransactions()])
      .then(([s, tx]) => { setSummary(s); setTransactions(tx); })
      .catch(() => toast.error('Could not load your wallet. Please try again.'));
  }

  useEffect(() => {
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, []);

  async function handleWithdraw(amount: number, method: string) {
    const updated = await walletService.withdraw(amount, method);
    setSummary(updated);
    const tx = await walletService.getTransactions();
    setTransactions(tx);
    toast.success(t('wallet.withdrawSuccess', { amount: amount.toLocaleString() }));
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={['#312e81', '#4f46e5', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientTopBar}>
        <View style={styles.topBar}>
          <BackButton fallback="/(creator)/" />
          <Text style={[styles.topTitle, { color: '#fff' }]}>{t('wallet.headerTitle')}</Text>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      {loading || !summary ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

          {/* Balance card */}
          <View style={[styles.balanceCard, { backgroundColor: C.brinjal1 }]}>
            <Text style={styles.balanceLabel}>{t('wallet.availableBalance')}</Text>
            <Text style={styles.balanceValue}>Rs. {summary.availableBalance.toLocaleString()}</Text>
            <View style={styles.balanceStatsRow}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>{t('wallet.totalEarned')}</Text>
                <Text style={styles.balanceStatValue}>Rs. {summary.totalEarned.toLocaleString()}</Text>
              </View>
              <View style={styles.balanceStatDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>{t('wallet.pending')}</Text>
                <Text style={styles.balanceStatValue}>Rs. {summary.pendingEarnings.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Withdraw button */}
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.withdrawBtn, { backgroundColor: C.surface, borderColor: C.brinjal1 }]}
            onPress={() => setModalVisible(true)}>
            <Ionicons name="arrow-down-circle-outline" size={20} color={C.brinjal1} />
            <Text style={[styles.withdrawBtnText, { color: C.brinjal1 }]}>{t('wallet.withdrawMoney')}</Text>
          </Pressable>

          {summary.paymentMethods.length === 0 && (
            <Text style={[styles.noMethodsHint, { color: C.textSecondary }]}>{t('wallet.noPaymentMethodsHint')}</Text>
          )}

          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.manageBtn, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => router.push('/(creator)/settings?section=earnings' as never)}>
            <Ionicons name="card-outline" size={18} color={C.text} />
            <Text style={[styles.manageBtnText, { color: C.text }]}>{t('wallet.managePaymentMethods')}</Text>
          </Pressable>

          {/* Statement */}
          <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>{t('wallet.statementTitle')}</Text>
          {transactions.length === 0 ? (
            <View style={[styles.emptyWrap, { backgroundColor: C.surface }]}>
              <Ionicons name="receipt-outline" size={32} color={C.textSecondary} />
              <Text style={[styles.emptyTitle, { color: C.text }]}>{t('wallet.noTransactionsYet')}</Text>
              <Text style={[styles.emptyHint, { color: C.textSecondary }]}>{t('wallet.noTransactionsHint')}</Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              {transactions.map((tx, i) => {
                const meta = METHOD_META[tx.method] ?? { icon: 'credit-card', color: C.brinjal1 };
                return (
                  <View key={tx.id} style={[styles.txRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                    {isPaymentMethodId(tx.method) ? (
                      <PaymentMethodIcon method={tx.method} size={36} />
                    ) : (
                      <View style={[styles.txIconWrap, { backgroundColor: `${meta.color}18` }]}>
                        <FontAwesome5 name={meta.icon} size={14} color={meta.color} />
                      </View>
                    )}
                    <View style={styles.txInfo}>
                      <Text style={[styles.txMethod, { color: C.text }]}>{tx.method.charAt(0).toUpperCase() + tx.method.slice(1)}</Text>
                      <Text style={[styles.txDate, { color: C.textSecondary }]}>{formatDate(tx.createdAt)}</Text>
                    </View>
                    <Text style={styles.txAmount}>− Rs. {tx.amount.toLocaleString()}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {summary && (
        <WithdrawModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          availableBalance={summary.availableBalance}
          paymentMethods={summary.paymentMethods}
          onWithdraw={handleWithdraw}
          onManageMethods={() => router.push('/(creator)/settings?section=earnings' as never)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gradientTopBar: { overflow: 'hidden', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  topTitle:  { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  content:   { padding: 16, paddingBottom: 32, gap: 12 },

  balanceCard: { borderRadius: 18, padding: 20, gap: 4 },
  balanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontFamily: F.medium },
  balanceValue: { fontSize: 32, color: '#fff', fontWeight: '800', fontFamily: F.bold, marginBottom: 12 },
  balanceStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  balanceStat: { flex: 1, gap: 2 },
  balanceStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  balanceStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: F.medium },
  balanceStatValue: { fontSize: 15, color: '#fff', fontWeight: '700', fontFamily: F.bold },

  withdrawBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, paddingVertical: 14 },
  withdrawBtnText: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  noMethodsHint: { fontSize: 12, textAlign: 'center', fontFamily: F.regular, marginTop: -4 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1.5, paddingVertical: 12 },
  manageBtnText: { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },

  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: F.bold, marginTop: 8 },
  card: { borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  emptyWrap: { alignItems: 'center', borderRadius: 14, paddingVertical: 32, paddingHorizontal: 16, gap: 8 },
  emptyTitle: { fontSize: 14, fontFamily: F.bold },
  emptyHint: { fontSize: 12, textAlign: 'center', fontFamily: F.regular },

  txRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  txIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  txInfo: { flex: 1, gap: 2 },
  txMethod: { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  txDate: { fontSize: 11, fontFamily: F.regular },
  txAmount: { fontSize: 14, fontWeight: '700', color: '#EF4444', fontFamily: F.bold },
});
