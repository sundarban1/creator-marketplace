import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BackButton } from '@/components/BackButton';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { referralService, type ApiReferralOverview } from '@/services/referral';
import { F } from '@/utilities/constants';

const STATUS_META: Record<string, { bg: string; text: string }> = {
  PENDING:   { bg: '#FEF3C7', text: '#92400E' },
  COMPLETED: { bg: '#DCFCE7', text: '#166534' },
  EXPIRED:   { bg: '#F3F4F6', text: '#6B7280' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ReferralScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();

  const [loading, setLoading]   = useState(true);
  const [overview, setOverview] = useState<ApiReferralOverview | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [applying, setApplying] = useState(false);

  function loadOverview() {
    return referralService.getOverview()
      .then(setOverview)
      .catch(() => toast.error(t('referral.loadError')));
  }

  useEffect(() => {
    setLoading(true);
    loadOverview().finally(() => setLoading(false));
  }, []);

  async function handleShareCode() {
    if (!overview) return;
    try {
      await Share.share({ message: t('referral.shareMessage', { code: overview.code }) });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  }

  async function handleApplyCode() {
    if (!codeInput.trim()) return;
    setApplying(true);
    try {
      await referralService.applyCode(codeInput.trim());
      toast.success(t('referral.haveCodeSuccess'));
      setCodeInput('');
      await loadOverview();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('referral.haveCodeError'));
    } finally {
      setApplying(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={['#312e81', '#4f46e5', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientTopBar}>
        <View style={styles.topBar}>
          <BackButton fallback="/(creator)/" />
          <Text style={[styles.topTitle, { color: '#fff' }]}>{t('referral.headerTitle')}</Text>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      {loading || !overview ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          {/* How it works */}
          <View style={[styles.card, { backgroundColor: C.surface }]}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{t('referral.howItWorksTitle')}</Text>
            {(['step1', 'step2', 'step3', 'step4', 'step5'] as const).map((key) => (
              <Text key={key} style={[styles.stepText, { color: C.textSecondary }]}>{t(`referral.${key}`)}</Text>
            ))}
            <Text style={[styles.conditionNote, { color: C.brinjal1 }]}>
              {t('referral.conditionNote', { amount: overview.rewardAmount })}
            </Text>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={styles.verifiedLinkRow}
              onPress={() => router.push('/(creator)/settings?section=security')}>
              <Ionicons name="ribbon-outline" size={16} color={C.brinjal1} />
              <Text style={[styles.verifiedLinkText, { color: C.brinjal1 }]}>{t('referral.howToGetVerifiedLink')}</Text>
              <Ionicons name="chevron-forward" size={14} color={C.brinjal1} />
            </Pressable>
          </View>

          {/* Referral code */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: C.textSecondary }]}>{t('referral.yourCodeLabel')}</Text>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[styles.codeCard, { backgroundColor: C.brinjal1 }]} onPress={handleShareCode}>
              <Text style={styles.codeText}>{overview.code}</Text>
              <Ionicons name="share-social-outline" size={20} color="#fff" />
            </Pressable>
            <Text style={[styles.shareHint, { color: C.textSecondary }]}>{t('referral.shareHint')}</Text>
          </View>

          {/* Referred by */}
          {overview.referredBy ? (
            <View style={[styles.referredByRow, { backgroundColor: C.surface }]}>
              <Ionicons name="person-circle-outline" size={18} color={C.brinjal1} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.referredByText, { color: C.text }]}>
                  {t('referral.referredByLabel')}: <Text style={{ fontFamily: F.bold }}>{overview.referredBy.name}</Text>
                </Text>
                <Text style={[styles.referredByHint, { color: C.textSecondary }]}>{t('referral.referredBonusHint')}</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: C.surface }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>{t('referral.haveCodeTitle')}</Text>
              <View style={styles.applyCodeRow}>
                <TextInput
                  style={[styles.applyCodeInput, { backgroundColor: C.background, borderColor: C.border, color: C.text }]}
                  value={codeInput}
                  onChangeText={(v) => setCodeInput(v.toUpperCase())}
                  placeholder={t('referral.haveCodePlaceholder')}
                  placeholderTextColor={C.textSecondary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  style={[styles.applyCodeBtn, { backgroundColor: C.brinjal1, opacity: applying || !codeInput.trim() ? 0.6 : 1 }]}
                  disabled={applying || !codeInput.trim()}
                  onPress={handleApplyCode}>
                  {applying ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.applyCodeBtnText}>{t('referral.haveCodeSubmit')}</Text>}
                </Pressable>
              </View>
            </View>
          )}

          {/* Your referrals list */}
          <Text style={[styles.sectionHeader, { color: C.textSecondary }]}>{t('referral.yourReferralsTitle')}</Text>
          {overview.referrals.length === 0 ? (
            <View style={[styles.emptyWrap, { backgroundColor: C.surface }]}>
              <Ionicons name="people-outline" size={32} color={C.textSecondary} />
              <Text style={[styles.emptyTitle, { color: C.text }]}>{t('referral.noReferralsYet')}</Text>
              <Text style={[styles.emptyHint, { color: C.textSecondary }]}>{t('referral.noReferralsHint')}</Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: C.surface, paddingVertical: 4 }]}>
              {overview.referrals.map((r, i) => (
                <View key={r.id} style={[styles.referralRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
                  {r.referredAvatarUrl ? (
                    <Image source={{ uri: r.referredAvatarUrl }} style={styles.referralAvatar} />
                  ) : (
                    <View style={[styles.referralAvatar, styles.referralAvatarFallback, { backgroundColor: C.background }]}>
                      <Ionicons name="person" size={16} color={C.textSecondary} />
                    </View>
                  )}
                  <View style={styles.referralInfo}>
                    <Text style={[styles.referralName, { color: C.text }]}>{r.referredName}</Text>
                    <Text style={[styles.referralDate, { color: C.textSecondary }]}>{t('referral.joinedOn', { date: formatDate(r.linkedAt) })}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: STATUS_META[r.status]!.bg }]}>
                    <Text style={[styles.statusPillText, { color: STATUS_META[r.status]!.text }]}>
                      {t(`referral.status${r.status.charAt(0)}${r.status.slice(1).toLowerCase()}`)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gradientTopBar: { overflow: 'hidden', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  topTitle:  { fontSize: 16, fontFamily: F.bold },
  content:   { padding: 16, paddingBottom: 32, gap: 16 },

  card: { borderRadius: 14, padding: 16, gap: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardTitle: { fontSize: 15, fontFamily: F.bold, marginBottom: 4 },
  stepText: { fontSize: 13, lineHeight: 20, fontFamily: F.regular },
  conditionNote: { fontSize: 12, fontFamily: F.medium, marginTop: 6, lineHeight: 18 },
  verifiedLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  verifiedLinkText: { fontSize: 12, fontFamily: F.semibold },

  field: { gap: 6 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: F.bold },
  codeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 18 },
  codeText: { fontSize: 24, color: '#fff', letterSpacing: 4, fontFamily: F.bold },
  shareHint: { fontSize: 11, textAlign: 'center', fontFamily: F.regular },

  referredByRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12 },
  referredByText: { fontSize: 13, fontFamily: F.regular },
  referredByHint: { fontSize: 11, fontFamily: F.regular, marginTop: 2 },

  applyCodeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  applyCodeInput: { flex: 1, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, letterSpacing: 1, fontFamily: F.regular },
  applyCodeBtn: { borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  applyCodeBtnText: { color: '#fff', fontSize: 13, fontFamily: F.bold },

  sectionHeader: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: F.bold },
  emptyWrap: { alignItems: 'center', borderRadius: 14, paddingVertical: 32, paddingHorizontal: 16, gap: 8 },
  emptyTitle: { fontSize: 14, fontFamily: F.bold },
  emptyHint: { fontSize: 12, textAlign: 'center', fontFamily: F.regular },

  referralRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 4 },
  referralAvatar: { width: 36, height: 36, borderRadius: 18 },
  referralAvatarFallback: { justifyContent: 'center', alignItems: 'center' },
  referralInfo: { flex: 1, gap: 2 },
  referralName: { fontSize: 13, fontFamily: F.semibold },
  referralDate: { fontSize: 11, fontFamily: F.regular },
  statusPill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontFamily: F.bold },
});
