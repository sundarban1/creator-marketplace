import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { authService } from '@/services/auth';
import { F } from '@/utilities/constants';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function maskPhone(phone: string) {
  if (phone.length <= 4) return phone;
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
}

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(3, local.length));
  const stars = '*'.repeat(Math.max(0, local.length - visible.length));
  return `${visible}${stars}@${domain}`;
}

export default function ResetOtpScreen() {
  const { email, phone } = useLocalSearchParams<{ email?: string; phone?: string }>();
  const channel: 'email' | 'phone' = phone ? 'phone' : 'email';
  const identifier = channel === 'email' ? { email: email ?? '' } : { phone: phone ?? '' };
  const maskedContact = channel === 'email' ? maskEmail(email ?? '') : maskPhone(phone ?? '');
  const C = useAppColors();

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);

  const inputs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));
  const submitting = useRef(false);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  async function submitCode(fullCode: string) {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError('');
    try {
      const resetToken = await authService.verifyResetOtp(identifier, fullCode);
      router.replace({ pathname: '/reset-password', params: { resetToken } });
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
    const digits = text.replace(/\D/g, '');
    if (digits.length > 1) {
      const next: string[] = Array(OTP_LENGTH).fill('');
      for (let i = 0; i < OTP_LENGTH; i++) next[i] = digits[i] ?? '';
      setCode(next);
      setError('');
      const lastIdx = Math.min(digits.length - 1, OTP_LENGTH - 1);
      inputs.current[lastIdx]?.focus();
      if (digits.length >= OTP_LENGTH) void submitCode(next.join(''));
      return;
    }
    const next = [...code];
    next[index] = digits;
    setCode(next);
    setError('');
    if (digits) {
      if (index < OTP_LENGTH - 1) {
        inputs.current[index + 1]?.focus();
      } else {
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
    if (fullCode.length < OTP_LENGTH) { setError(`Please enter all ${OTP_LENGTH} digits.`); return; }
    void submitCode(fullCode);
  }

  async function handleResend() {
    setResending(true);
    setError('');
    try {
      await authService.forgotPassword(identifier);
      setCode(Array(OTP_LENGTH).fill(''));
      setResendTimer(RESEND_SECONDS);
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  }

  const isFilled = code.every((d) => d !== '');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.brinjal1 }]} edges={['top']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Header ── */}
        <View style={styles.hero}>
          <View style={styles.bubble1} />
          <View style={styles.bubble2} />
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/forgot-password')}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <View style={styles.heroContent}>
            <View style={styles.iconWrap}>
              <Ionicons name={channel === 'email' ? 'mail' : 'phone-portrait'} size={26} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>{channel === 'email' ? 'Check your email' : 'Check your phone'}</Text>
            <Text style={styles.heroSub}>
              We sent a {OTP_LENGTH}-digit code to{'\n'}
              <Text style={styles.heroPhone}>{maskedContact}</Text>
            </Text>
          </View>
        </View>

        {/* ── Card ── */}
        <View style={[styles.card, { backgroundColor: C.background }]}>

          <View style={styles.otpRow}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                style={[
                  styles.otpBox,
                  { borderColor: C.border, backgroundColor: C.surface, color: C.text },
                  digit && !error ? { borderColor: C.brinjal1, backgroundColor: C.primaryLight, color: C.brinjal1 } : null,
                  error ? { borderColor: C.error, backgroundColor: '#FEF2F2', color: '#DC2626' } : null,
                ]}
                value={digit}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={i === 0 ? OTP_LENGTH : 1}
                selectTextOnFocus
                autoFocus={i === 0}
                textContentType="oneTimeCode"
                autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                editable={!loading}
              />
            ))}
          </View>

          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
              <Ionicons name="warning" size={14} color="#EF4444" />
              <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
            </View>
          ) : null}

          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.verifyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, (!isFilled || loading) && styles.verifyBtnDisabled]}
            onPress={handleManualVerify}
            disabled={!isFilled || loading}>
            {loading ? (
              <View style={styles.loadingRow}>
                <View style={[styles.spinner, { borderTopColor: '#fff' }]} />
                <Text style={styles.verifyBtnText}>Verifying…</Text>
              </View>
            ) : (
              <Text style={styles.verifyBtnText}>Verify Code</Text>
            )}
          </Pressable>

          <View style={styles.resendRow}>
            <Text style={[styles.resendLabel, { color: C.textSecondary }]}>Didn't receive the code? </Text>
            {resendTimer > 0 ? (
              <Text style={[styles.resendTimer, { color: C.textSecondary }]}>Resend in {resendTimer}s</Text>
            ) : (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={handleResend} disabled={resending}>
                <Text style={[styles.resendLink, { color: resending ? C.textSecondary : C.brinjal1 }]}>
                  {resending ? 'Sending…' : 'Resend Code'}
                </Text>
              </Pressable>
            )}
          </View>

          <Text style={[styles.hint, { color: C.textSecondary }]}>
            Code expires in 10 minutes{channel === 'email' ? ' · Check your spam folder' : ''}
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  hero: { paddingBottom: 36, overflow: 'hidden' },
  bubble1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -50 },
  bubble2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)', bottom: 0, left: -30 },
  back: { margin: 16, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 26, color: '#fff', lineHeight: 30 },
  heroContent: { alignItems: 'center', paddingHorizontal: 24, gap: 10 },
  iconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 22, color: '#fff', textAlign: 'center', fontFamily: F.bold },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.78)', textAlign: 'center', lineHeight: 22, fontFamily: F.regular },
  heroPhone: { color: '#fff', fontFamily: F.bold },
  card: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingTop: 36, alignItems: 'center' },
  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  otpBox: { width: 46, height: 58, borderRadius: 12, borderWidth: 2, textAlign: 'center', fontSize: 22, fontFamily: F.bold },
  errorBanner: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText: { fontSize: 13, textAlign: 'center', fontFamily: F.semibold },
  verifyBtn: { width: '100%', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 20, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  verifyBtnDisabled: { opacity: 0.45 },
  verifyBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spinner: { width: 18, height: 18, borderRadius: 9, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.35)' },
  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  resendLabel: { fontSize: 14, fontFamily: F.regular },
  resendTimer: { fontSize: 14, fontFamily: F.semibold },
  resendLink: { fontSize: 14, fontFamily: F.bold },
  hint: { fontSize: 12, textAlign: 'center', opacity: 0.7, fontFamily: F.regular },
});
