import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { Button } from '@/components/Button';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { getSocket } from '@/lib/socket';
import { pointsService, redemptionService, type ApiRedemptionSession } from '@/services/rewards';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const mm = Math.floor(total / 60).toString().padStart(2, '0');
  const ss = (total % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function RedeemScreen() {
  const { promotionId } = useLocalSearchParams<{ promotionId: string }>();
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();

  const [session, setSession] = useState<ApiRedemptionSession | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [issueError, setIssueError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const issuedOnceRef = useRef(false);

  // Kick off the QR handshake once. redemptionService.issue is idempotent
  // server-side (returns the same live session on a remount), so this is
  // safe even if the screen re-mounts.
  useEffect(() => {
    if (!promotionId || issuedOnceRef.current) return;
    issuedOnceRef.current = true;
    redemptionService.issue(promotionId)
      .then(({ session: s, qrCodeDataUrl: qr }) => {
        setSession(s);
        setQrCodeDataUrl(qr);
      })
      .catch((err) => {
        setIssueError(true);
        toast.error(err?.message || t('redeem.issueError'));
      });
  }, [promotionId, t, toast]);

  // Live updates from the business side (scan, bill entered) — the creator's
  // device otherwise has no way to know the handshake advanced.
  useEffect(() => {
    if (!session) return;
    const socket = getSocket();
    if (!socket) return;
    const handler = (updated: ApiRedemptionSession) => {
      if (updated.id === session.id) setSession(updated);
    };
    socket.on('redemption:updated', handler);
    return () => { socket.off('redemption:updated', handler); };
  }, [session]);

  // Countdown tick, 1/s — server stays authoritative (every transition
  // re-checks expiresAt); this is purely the on-screen "Expires in 04:32".
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const balanceQuery = useQuery({
    queryKey: ['points', 'balance'],
    queryFn: () => pointsService.getBalance(),
    enabled: session?.status === 'BILL_ENTERED',
    staleTime: 0,
  });

  const expiresAtMs = session ? new Date(session.expiresAt).getTime() : 0;
  const msLeft = expiresAtMs - nowMs;
  const expired = session != null && msLeft <= 0 && session.status !== 'CONFIRMED';

  async function handleConfirm() {
    if (!session) return;
    setConfirming(true);
    try {
      await redemptionService.confirm(session.id);
      router.replace({
        pathname: '/(creator)/redeem-success',
        params: {
          businessName:   session.businessName ?? '',
          discountAmount: String(session.discountAmount ?? 0),
          pointsCost:     String(session.pointsCost ?? 0),
          creditsEarned:  String(session.creditsEarned ?? 0),
        },
      });
    } catch (err: any) {
      toast.error(err?.message || t('redeem.confirmError'));
    } finally {
      setConfirming(false);
    }
  }

  function handleCancel() {
    if (!session) { router.back(); return; }
    Alert.alert(
      t('redeem.cancelConfirmTitle'),
      t('redeem.cancelConfirmBody'),
      [
        { text: t('redeem.keepButton'), style: 'cancel' },
        {
          text: t('redeem.cancelConfirmButton'),
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await redemptionService.cancel(session.id);
            } catch {
              // best-effort — the session will lazy-expire on the server regardless
            } finally {
              setCancelling(false);
              router.back();
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <MaxWidthContainer>
        <PageHeader title={session?.promotionSnapshot.title ?? t('deals.headerTitle')} onBack={handleCancel} />

        <View style={styles.body}>
          {issueError ? (
            <View style={styles.centerWrap}>
              <FontAwesome5 name="exclamation-circle" solid size={40} color="#EF4444" />
              <Text style={[styles.expiredTitle, { color: C.text }]}>{t('redeem.issueError')}</Text>
              <Button label={t('redeem.backButton')} onPress={() => router.back()} />
            </View>
          ) : !session ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator size="large" color={C.brinjal1} />
              <Text style={[styles.preparingText, { color: C.textSecondary }]}>{t('redeem.preparingTitle')}</Text>
            </View>
          ) : expired || session.status === 'EXPIRED' || session.status === 'CANCELLED' ? (
            <View style={styles.centerWrap}>
              <FontAwesome5 name="clock" solid size={40} color="#EF4444" />
              <Text style={[styles.expiredTitle, { color: C.text }]}>{t('redeem.expiredTitle')}</Text>
              <Text style={[styles.expiredHint, { color: C.textSecondary }]}>{t('redeem.expiredHint')}</Text>
              <Button label={t('redeem.backButton')} onPress={() => router.back()} />
            </View>
          ) : session.status === 'BILL_ENTERED' ? (
            <BillReview
              session={session}
              remainingPoints={Math.max(0, (balanceQuery.data?.balance ?? 0) - (session.pointsCost ?? 0))}
              confirming={confirming}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          ) : (
            <QrWaiting session={session} qrCodeDataUrl={qrCodeDataUrl} msLeft={msLeft} onCancel={handleCancel} cancelling={cancelling} />
          )}
        </View>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

function QrWaiting({
  session, qrCodeDataUrl, msLeft, onCancel, cancelling,
}: {
  session: ApiRedemptionSession;
  qrCodeDataUrl: string | null;
  msLeft: number;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const C = useAppColors();
  const { t } = useLanguage();

  return (
    <View style={styles.centerWrap}>
      <Text style={[styles.scanTitle, { color: C.text }]}>{t('redeem.scanTitle')}</Text>

      <View style={[styles.qrCard, { backgroundColor: '#fff', borderColor: C.border }, SHADOW.raised]}>
        {qrCodeDataUrl ? (
          <Image source={{ uri: qrCodeDataUrl }} style={styles.qrImage} contentFit="contain" />
        ) : (
          <ActivityIndicator size="large" color={C.brinjal1} />
        )}
      </View>

      <Text style={[styles.scanHint, { color: C.textSecondary }]}>{t('redeem.scanHint')}</Text>
      <Text style={[styles.countdown, { color: msLeft < 60_000 ? '#EF4444' : C.text }]}>
        {t('redeem.expiresIn', { time: formatCountdown(msLeft) })}
      </Text>

      <View style={[styles.waitingRow, { backgroundColor: C.surface, borderColor: C.border }]}>
        <ActivityIndicator size="small" color={C.brinjal1} />
        <Text style={[styles.waitingText, { color: C.textSecondary }]}>
          {session.status === 'ISSUED' ? t('redeem.waitingForScan') : t('redeem.waitingForBill')}
        </Text>
      </View>

      <View style={{ marginTop: SPACING.xl, width: '100%' }}>
        <Button label={t('redeem.cancelButton')} variant="secondary" onPress={onCancel} loading={cancelling} />
      </View>
    </View>
  );
}

function BillReview({
  session, remainingPoints, confirming, onConfirm, onCancel,
}: {
  session: ApiRedemptionSession;
  remainingPoints: number;
  confirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const bill = session.billAmount ?? 0;
  const discount = session.discountAmount ?? 0;
  const youPay = Math.max(0, bill - discount);

  return (
    <View style={styles.billWrap}>
      <View style={[styles.billCard, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.card]}>
        <BillRow label={t('redeem.billAmountLabel')} value={`Rs. ${bill.toLocaleString()}`} />
        <BillRow label={t('redeem.discountLabel')} value={`− Rs. ${discount.toLocaleString()}`} valueColor="#059669" />
        <BillRow label={t('redeem.pointsUsedLabel')} value={`${(session.pointsCost ?? 0).toLocaleString()}`} />
        <BillRow label={t('redeem.remainingLabel')} value={remainingPoints.toLocaleString()} />
        <View style={[styles.billDivider, { backgroundColor: C.border }]} />
        <BillRow label={t('redeem.youPayLabel')} value={`Rs. ${youPay.toLocaleString()}`} bold />
      </View>

      <View style={styles.billActions}>
        <Button
          label={confirming ? t('redeem.confirming') : t('redeem.confirmButton')}
          onPress={onConfirm}
          loading={confirming}
          disabled={confirming}
        />
        <Button label={t('redeem.cancelButton')} variant="secondary" onPress={onCancel} disabled={confirming} />
      </View>
    </View>
  );
}

function BillRow({ label, value, bold, valueColor }: { label: string; value: string; bold?: boolean; valueColor?: string }) {
  const C = useAppColors();
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, { color: C.textSecondary }, bold && { color: C.text, fontFamily: F.bold }]}>{label}</Text>
      <Text style={[styles.billValue, { color: valueColor ?? C.text }, bold && { fontSize: FONT_SIZE.lg, fontFamily: F.extrabold }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg },

  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, paddingBottom: SPACING.xxxl },
  preparingText: { fontSize: FONT_SIZE.md, fontFamily: F.medium },

  scanTitle: { fontSize: FONT_SIZE.lg, fontFamily: F.bold },
  qrCard: { width: 240, height: 240, borderRadius: RADIUS.lg, borderWidth: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.md },
  qrImage: { width: '100%', height: '100%' },
  scanHint: { fontSize: FONT_SIZE.sm, fontFamily: F.regular },
  countdown: { fontSize: FONT_SIZE.md, fontFamily: F.bold },
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: 10, marginTop: SPACING.sm },
  waitingText: { fontSize: FONT_SIZE.sm, fontFamily: F.medium },

  expiredTitle: { fontSize: FONT_SIZE.lg, fontFamily: F.bold, textAlign: 'center' },
  expiredHint: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, textAlign: 'center' },

  billWrap: { flex: 1, justifyContent: 'center', gap: SPACING.xl, paddingBottom: SPACING.xxxl },
  billCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: 10 },
  billRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  billLabel: { fontSize: FONT_SIZE.sm, fontFamily: F.regular },
  billValue: { fontSize: FONT_SIZE.md, fontFamily: F.bold },
  billDivider: { height: 1, marginVertical: 2 },
  billActions: { gap: SPACING.sm },
});
