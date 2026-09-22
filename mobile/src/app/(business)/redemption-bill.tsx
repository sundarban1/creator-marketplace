import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { Button } from '@/components/Button';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { getSocket } from '@/lib/socket';
import { redemptionService, type ApiRedemptionSession } from '@/services/rewards';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

type Phase = 'entering' | 'waiting' | 'done';

export default function RedemptionBillScreen() {
  const { sessionId, promotionTitle, creatorName } = useLocalSearchParams<{
    sessionId: string; promotionTitle: string; creatorName: string;
  }>();
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>('entering');
  const [billAmount, setBillAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<ApiRedemptionSession | null>(null);

  // Live updates — the creator confirming is the only thing that advances
  // this screen out of "waiting"; there's no polling, the socket event does it.
  useEffect(() => {
    if (phase !== 'waiting' || !session) return;
    const socket = getSocket();
    if (!socket) return;
    const handler = (updated: ApiRedemptionSession) => {
      if (updated.id !== session.id) return;
      setSession(updated);
      if (updated.status === 'CONFIRMED') {
        setPhase('done');
        // Fire the refetch now, in flight before the Done button is even
        // tapped, so the home screen's credits card is already current by
        // the time dismissTo() lands on it.
        void queryClient.invalidateQueries({ queryKey: ['credits', 'balance'] });
      } else if (updated.status === 'CANCELLED' || updated.status === 'EXPIRED') {
        toast.error(t('redemptionBill.sessionEndedByCreator'));
        router.back();
      }
    };
    socket.on('redemption:updated', handler);
    return () => { socket.off('redemption:updated', handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, session?.id]);

  async function handleSubmitBill() {
    const amount = Number(billAmount);
    if (!amount || amount <= 0) return;
    setSubmitting(true);
    try {
      const updated = await redemptionService.enterBill(sessionId!, amount);
      setSession(updated);
      setPhase('waiting');
    } catch (err: any) {
      toast.error(err?.message || t('redemptionBill.submitError'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    try {
      if (sessionId) await redemptionService.cancel(sessionId);
    } catch {
      // best-effort
    } finally {
      router.back();
    }
  }

  const billNum = Number(billAmount) || 0;
  const discount = session?.discountAmount ?? 0;
  const creatorPays = Math.max(0, billNum - discount);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <MaxWidthContainer>
        <PageHeader title={promotionTitle ?? ''} onBack={phase === 'entering' ? handleCancel : undefined} backFallback="/(business)/(tabs)" />

        {phase === 'entering' && (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.body}>
              <View style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <InfoRow label={t('redemptionBill.creatorLabel')} value={creatorName ?? ''} />
                <InfoRow label={t('redemptionBill.promotionLabel')} value={promotionTitle ?? ''} />
              </View>

              <TextInputWithLabel
                label={t('redemptionBill.billAmountLabel')}
                placeholder={t('redemptionBill.billAmountPlaceholder')}
                value={billAmount}
                onChangeText={setBillAmount}
                keyboardType="number-pad"
                leftIcon="money-bill-wave"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />

              <View style={{ flex: 1 }} />
              <Button label={t('redemptionBill.continueButton')} onPress={handleSubmitBill} loading={submitting} disabled={!billNum || submitting} />
            </View>
          </TouchableWithoutFeedback>
        )}

        {phase === 'waiting' && (
          <View style={styles.centerWrap}>
            <View style={[styles.billCard, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.card]}>
              <InfoRow label={t('redemptionBill.billAmountLabel')} value={`Rs. ${billNum.toLocaleString()}`} />
              <InfoRow label={t('redemptionBill.discountLabel')} value={`− Rs. ${discount.toLocaleString()}`} valueColor="#059669" />
              <View style={[styles.divider, { backgroundColor: C.border }]} />
              <InfoRow label={t('redemptionBill.creatorPaysLabel')} value={`Rs. ${creatorPays.toLocaleString()}`} bold />
            </View>

            <ActivityIndicator size="large" color={C.brinjal1} />
            <Text style={[styles.waitingTitle, { color: C.text }]}>{t('redemptionBill.waitingForCreatorTitle')}</Text>
            <Text style={[styles.waitingHint, { color: C.textSecondary }]}>{t('redemptionBill.waitingForCreatorHint')}</Text>

            <View style={{ width: '100%', marginTop: SPACING.lg }}>
              <Button label={t('redemptionBill.cancelButton')} variant="secondary" onPress={handleCancel} />
            </View>
          </View>
        )}

        {phase === 'done' && (
          <View style={styles.centerWrap}>
            <View style={[styles.successIcon, { backgroundColor: '#059669' }]}>
              <FontAwesome5 name="check" solid size={36} color="#fff" />
            </View>
            <Text style={[styles.waitingTitle, { color: C.text }]}>{t('redemptionBill.successTitle')}</Text>

            <LinearGradient colors={['#F59E0B', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.successCard}>
              <Text style={styles.successLabel}>{t('redemptionBill.successCreditsLine', { n: (session?.creditsEarned ?? 0).toLocaleString() })}</Text>
            </LinearGradient>

            <View style={{ width: '100%', marginTop: SPACING.lg }}>
              <Button label={t('redemptionBill.doneButton')} onPress={() => router.dismissTo('/(business)/(tabs)')} />
            </View>
          </View>
        )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, bold, valueColor }: { label: string; value: string; bold?: boolean; valueColor?: string }) {
  const C = useAppColors();
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: C.textSecondary }, bold && { color: C.text, fontFamily: F.bold }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: valueColor ?? C.text }, bold && { fontSize: FONT_SIZE.lg, fontFamily: F.extrabold }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.xl, gap: SPACING.md },

  infoCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  infoLabel: { fontSize: FONT_SIZE.sm, fontFamily: F.regular },
  infoValue: { fontSize: FONT_SIZE.sm, fontFamily: F.bold, flexShrink: 1, textAlign: 'right' },

  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxxl },
  billCard: { width: '100%', borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: 10 },
  divider: { height: 1, marginVertical: 2 },
  waitingTitle: { fontSize: FONT_SIZE.lg, fontFamily: F.bold, textAlign: 'center' },
  waitingHint: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, textAlign: 'center' },

  successIcon: { width: 84, height: 84, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', ...SHADOW.raised },
  successCard: { width: '100%', borderRadius: RADIUS.lg, padding: SPACING.lg, alignItems: 'center', ...SHADOW.raised },
  successLabel: { fontSize: FONT_SIZE.md, color: '#fff', fontFamily: F.bold, textAlign: 'center' },
});
