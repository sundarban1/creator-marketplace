import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { authService } from '@/services/auth';
import { F } from '@/utilities/constants';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(3, local.length));
  const stars = '*'.repeat(Math.max(0, local.length - visible.length));
  return `${visible}${stars}@${domain}`;
}

function maskPhone(phone: string) {
  if (phone.length <= 4) return phone;
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

export default function VerifyScreen() {
  const { email, phone } = useLocalSearchParams<{ email?: string; phone?: string }>();
  const channel: 'email' | 'phone' = phone ? 'phone' : 'email';
  const identifier = channel === 'email' ? { email: email ?? '' } : { phone: phone ?? '' };
  const maskedContact = channel === 'email' ? maskEmail(email ?? '') : maskPhone(phone ?? '');
  const { reloadUser } = useAuth();
  const C = useAppColors();
  const { t } = useLanguage();

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);
  const [verified, setVerified] = useState(false);

  const inputs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  // Prevents double-submit from rapid state updates
  const submitting = useRef(false);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  useEffect(() => {
    if (!verified) return;
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [verified]);

  async function submitCode(fullCode: string) {
    if (submitting.current || verified) return;
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      await authService.verifyOtp(identifier, fullCode);
      if (channel === 'email') void authService.sendWelcomeEmail(email ?? '');
      setVerified(true);
      // Hydrate AuthContext then navigate directly to the dashboard
      const u = await reloadUser();
      const dest = (u?.role === 'CREATOR' ? '/(creator)/' : '/(business)/') as never;
      setTimeout(() => router.replace(dest), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      setCode(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  }

  function handleChange(text: string, index: number) {
    // Strip non-digits
    const digits = text.replace(/\D/g, '');

    // Paste or iOS/Android autofill delivers multiple digits at once
    if (digits.length > 1) {
      const next: string[] = Array(OTP_LENGTH).fill('');
      for (let i = 0; i < OTP_LENGTH; i++) {
        next[i] = digits[i] ?? '';
      }
      setCode(next);
      setError('');
      const lastIdx = Math.min(digits.length - 1, OTP_LENGTH - 1);
      inputs.current[lastIdx]?.focus();
      // Auto-submit if all 6 digits arrived
      if (digits.length >= OTP_LENGTH) {
        void submitCode(next.join(''));
      }
      return;
    }

    // Single digit typed
    const digit = digits;
    const next = [...code];
    next[index] = digit;
    setCode(next);
    setError('');

    if (digit) {
      if (index < OTP_LENGTH - 1) {
        inputs.current[index + 1]?.focus();
      } else {
        // Last box filled — auto-submit
        void submitCode(next.join(''));
      }
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !code[index] && index > 0) {
      const next = [...code];
      next[index - 1] = '';
      setCode(next);
      inputs.current[index - 1]?.focus();
    }
  }

  function handleManualVerify() {
    const fullCode = code.join('');
    if (fullCode.length < OTP_LENGTH) {
      setError(t('auth.verify.incompleteError', { length: OTP_LENGTH }));
      return;
    }
    void submitCode(fullCode);
  }

  async function handleResend() {
    setResending(true);
    setError('');
    try {
      await authService.resendOtp(identifier);
      setCode(Array(OTP_LENGTH).fill(''));
      setResendTimer(RESEND_SECONDS);
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.verify.resendError'));
    } finally {
      setResending(false);
    }
  }

  const isFilled = code.every((d) => d !== '');

  if (verified) {
    return (
      <SafeAreaView style={[styles.successContainer, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <Animated.View style={[styles.successContent, { opacity: opacityAnim }]}>
          <Animated.View
            style={[
              styles.checkCircle,
              { backgroundColor: C.active, shadowColor: C.active, transform: [{ scale: scaleAnim }] },
            ]}>
            <Text style={styles.checkMark}>✓</Text>
          </Animated.View>
          <Text style={[styles.successTitle, { color: C.text }]}>{t('auth.verify.successTitle')}</Text>
          <Text style={[styles.successSub, { color: C.textSecondary }]}>
            {t('auth.verify.successBody')}
          </Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.brinjal1 }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <View style={styles.heroBubble1} />
          <View style={styles.heroBubble2} />
          <Pressable
            style={styles.back}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/signup'))}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <View style={styles.heroContent}>
            <View style={styles.emailIconWrap}>
              <Text style={styles.emailIcon}>{channel === 'email' ? '✉️' : '📱'}</Text>
            </View>
            <Text style={styles.heroTitle}>{t('auth.verify.title')}</Text>
            <Text style={styles.heroSub}>
              {t('auth.verify.subtitle', { length: OTP_LENGTH, email: maskedContact })}
            </Text>
          </View>
        </View>

        {/* ── Card ───────────────────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: C.background }]}>

          {/* OTP boxes */}
          <View style={styles.otpRow}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                style={[
                  styles.otpBox,
                  { borderColor: C.border, backgroundColor: C.surface, color: C.text },
                  digit && !error
                    ? { borderColor: C.brinjal1, backgroundColor: C.primaryLight, color: C.brinjal1 }
                    : null,
                  error ? { borderColor: C.error, backgroundColor: '#FEF2F2' } : null,
                ]}
                value={digit}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={i === 0 ? OTP_LENGTH : 1}
                selectTextOnFocus
                autoFocus={i === 0}
                // iOS autofill from email/clipboard
                textContentType="oneTimeCode"
                // Android SMS autofill
                autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                editable={!loading}
              />
            ))}
          </View>

          {/* Error banner */}
          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
              <Text style={[styles.errorText, { color: C.error }]}>⚠️  {error}</Text>
            </View>
          ) : null}

          {/* Verify button — shown while idle; shows loading indicator while verifying */}
          <Pressable
            style={[
              styles.verifyBtn,
              { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 },
              (!isFilled || loading) && styles.verifyBtnDisabled,
            ]}
            onPress={handleManualVerify}
            disabled={!isFilled || loading}>
            {loading ? (
              <View style={styles.loadingRow}>
                <View style={[styles.spinner, { borderTopColor: '#fff' }]} />
                <Text style={styles.verifyBtnText}>{t('auth.verify.verifying')}</Text>
              </View>
            ) : (
              <Text style={styles.verifyBtnText}>{t('auth.verify.verifyBtn')}</Text>
            )}
          </Pressable>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={[styles.resendLabel, { color: C.textSecondary }]}>{t('auth.verify.resendPrompt')}</Text>
            {resendTimer > 0 ? (
              <Text style={[styles.resendTimer, { color: C.textSecondary }]}>{t('auth.verify.resendCountdown', { n: resendTimer })}</Text>
            ) : (
              <Pressable onPress={handleResend} disabled={resending}>
                <Text style={[styles.resendLink, { color: resending ? C.textSecondary : C.brinjal1 }]}>
                  {resending ? t('auth.verify.resending') : t('auth.verify.resendBtn')}
                </Text>
              </Pressable>
            )}
          </View>

          <Text style={[styles.hint, { color: C.textSecondary }]}>
            {t('auth.verify.hint')}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },

  hero: { paddingBottom: 36, overflow: 'hidden' },
  heroBubble1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -50 },
  heroBubble2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)', bottom: 0, left: -30 },
  back: { margin: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 26, color: '#fff', lineHeight: 30 },
  heroContent: { alignItems: 'center', paddingHorizontal: 24, gap: 10 },
  emailIconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emailIcon: { fontSize: 30 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', fontFamily: F.bold },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.78)', textAlign: 'center', lineHeight: 22, fontFamily: F.regular },
  heroEmail: { fontWeight: '700', color: '#fff', fontFamily: F.bold },

  card: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 36, alignItems: 'center' },

  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  otpBox: {
    width: 46,
    height: 58,
    borderRadius: 12,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    fontFamily: F.bold,
  },

  errorBanner: { width: '100%', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText: { fontSize: 13, fontWeight: '600', textAlign: 'center', fontFamily: F.semibold },

  verifyBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  verifyBtnDisabled: { opacity: 0.45 },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.35)',
    borderTopColor: '#fff',
  },

  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  resendLabel: { fontSize: 14, fontFamily: F.regular },
  resendTimer: { fontSize: 14, fontWeight: '600', fontFamily: F.semibold },
  resendLink: { fontSize: 14, fontWeight: '700', fontFamily: F.bold },

  hint: { fontSize: 12, textAlign: 'center', opacity: 0.7, fontFamily: F.regular },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successContent: { alignItems: 'center', gap: 16 },
  checkCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginBottom: 8,
  },
  checkMark: { fontSize: 48, color: '#fff', fontWeight: '700', lineHeight: 56, fontFamily: F.bold },
  successTitle: { fontSize: 26, fontWeight: '700', fontFamily: F.bold },
  successSub: { fontSize: 15, textAlign: 'center', lineHeight: 24, fontFamily: F.regular },
});
