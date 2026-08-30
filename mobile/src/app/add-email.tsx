import { FontAwesome5 } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { authService } from '@/services/auth';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function maskEmail(email: string) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, Math.min(3, local.length));
  return `${visible}${'*'.repeat(Math.max(0, local.length - visible.length))}@${domain}`;
}

// Mandatory interstitial shown when Sign in with Apple created the account without
// disclosing an email (every authorization after the first). The account holds a
// non-routable placeholder address (backend: emailIsPlaceholder) and can't reach
// onboarding until a real, verified email is on file. RootNavigator (_layout.tsx)
// routes here and blocks every other destination while the flag is set; clearing
// it via updateUser() lets that effect send the user on to onboarding.
export default function AddEmailScreen() {
  const { updateUser, logout } = useAuth();
  const C = useAppColors();
  const { t } = useLanguage();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sending, setSending] = useState(false);

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  const inputs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));
  const submitting = useRef(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (step !== 'otp' || resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [step, resendTimer]);

  useEffect(() => {
    if (!done) return;
    // Let the success screen show briefly, then clear the placeholder flag —
    // RootNavigator routes on to onboarding / home on its own.
    const id = setTimeout(() => {
      updateUser({ email: email.trim(), isEmailVerified: true, emailIsPlaceholder: false });
    }, 1200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  async function handleSendCode() {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setEmailError(t('auth.addEmail.invalidEmail'));
      return;
    }
    setSending(true);
    setEmailError('');
    try {
      await authService.requestEmailOtp(value);
      setEmail(value);
      setCode(Array(OTP_LENGTH).fill(''));
      setResendTimer(RESEND_SECONDS);
      setStep('otp');
      setTimeout(() => inputs.current[0]?.focus(), 100);
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : t('auth.addEmail.sendFailed'));
    } finally {
      setSending(false);
    }
  }

  async function submitCode(fullCode: string) {
    if (submitting.current || done) return;
    submitting.current = true;
    setVerifying(true);
    setOtpError('');
    try {
      await authService.verifyEmailOtp(email.trim(), fullCode);
      setDone(true);
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : t('auth.addEmail.verifyFailed'));
      setCode(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } finally {
      setVerifying(false);
      submitting.current = false;
    }
  }

  function handleChange(text: string, index: number) {
    const digits = text.replace(/\D/g, '');
    if (digits.length > 1) {
      const next = Array(OTP_LENGTH).fill('').map((_, i) => digits[i] ?? '');
      setCode(next);
      setOtpError('');
      inputs.current[Math.min(digits.length - 1, OTP_LENGTH - 1)]?.focus();
      if (digits.length >= OTP_LENGTH) void submitCode(next.join(''));
      return;
    }
    const next = [...code];
    next[index] = digits;
    setCode(next);
    setOtpError('');
    if (digits) {
      if (index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();
      else void submitCode(next.join(''));
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

  async function handleResend() {
    setResending(true);
    setOtpError('');
    try {
      await authService.requestEmailOtp(email.trim());
      setCode(Array(OTP_LENGTH).fill(''));
      setResendTimer(RESEND_SECONDS);
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } catch (e) {
      setOtpError(e instanceof Error ? e.message : t('auth.addEmail.sendFailed'));
    } finally {
      setResending(false);
    }
  }

  const isFilled = code.every((d) => d !== '');

  if (done) {
    return (
      <SafeAreaView style={[styles.successContainer, { backgroundColor: C.preLoginBackground }]} edges={['top', 'bottom']}>
        <View style={[styles.checkCircle, { backgroundColor: C.active, shadowColor: C.active }]}>
          <FontAwesome5 name="check" solid size={40} color="#fff" />
        </View>
        <Text style={[styles.successTitle, { color: C.text }]}>{t('auth.verify.successTitle')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.brinjal1 }]} edges={['top']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.hero}>
          <View style={styles.heroBubble1} />
          <View style={styles.heroContent}>
            <View style={styles.iconWrap}>
              <FontAwesome5 name="envelope" size={22} color="#fff" solid />
            </View>
            <Text style={styles.heroTitle}>
              {step === 'email' ? t('auth.addEmail.heroTitle') : t('auth.addEmail.otpTitle')}
            </Text>
            <Text style={styles.heroSub}>
              {step === 'email'
                ? t('auth.addEmail.heroSub')
                : t('auth.addEmail.otpSub', { email: maskEmail(email) })}
            </Text>
          </View>
        </View>

        <MaxWidthContainer>
          <ScrollView
            style={[styles.card, { backgroundColor: C.preLoginBackground }]}
            contentContainerStyle={styles.cardContent}
            keyboardShouldPersistTaps="handled">
            {step === 'email' ? (
              <>
                <TextInputWithLabel
                  label={t('auth.addEmail.emailLabel')}
                  placeholder={t('auth.addEmail.emailPlaceholder')}
                  leftIcon="envelope"
                  value={email}
                  onChangeText={(v) => { setEmail(v); setEmailError(''); }}
                  error={emailError}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  editable={!sending}
                  onSubmitEditing={handleSendCode}
                  returnKeyType="go"
                />
                <Pressable
                  style={[styles.primaryBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, sending && styles.btnDisabled]}
                  onPress={handleSendCode}
                  disabled={sending}>
                  <Text style={styles.primaryBtnText}>
                    {sending ? t('auth.addEmail.sending') : t('auth.addEmail.sendCodeBtn')}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.otpRow}>
                  {code.map((digit, i) => (
                    <TextInput
                      key={i}
                      ref={(el) => { inputs.current[i] = el; }}
                      style={[
                        styles.otpBox,
                        { borderColor: C.border, backgroundColor: C.surface, color: C.text },
                        digit && !otpError ? { borderColor: C.brinjal1, backgroundColor: C.primaryLight, color: C.brinjal1 } : null,
                        otpError ? { borderColor: C.error } : null,
                      ]}
                      value={digit}
                      onChangeText={(txt) => handleChange(txt, i)}
                      onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                      keyboardType="number-pad"
                      maxLength={i === 0 ? OTP_LENGTH : 1}
                      selectTextOnFocus
                      autoFocus={i === 0}
                      textContentType="oneTimeCode"
                      autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                      editable={!verifying}
                    />
                  ))}
                </View>

                {otpError ? (
                  <View style={[styles.errorBanner, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                    <FontAwesome5 name="exclamation-triangle" solid size={13} color="#EF4444" />
                    <Text style={styles.errorText}>{otpError}</Text>
                  </View>
                ) : null}

                <Pressable
                  style={[styles.primaryBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, (!isFilled || verifying) && styles.btnDisabled]}
                  onPress={() => {
                    if (code.join('').length < OTP_LENGTH) { setOtpError(t('auth.addEmail.incompleteError')); return; }
                    void submitCode(code.join(''));
                  }}
                  disabled={!isFilled || verifying}>
                  <Text style={styles.primaryBtnText}>
                    {verifying ? t('auth.addEmail.verifying') : t('auth.addEmail.verifyBtn')}
                  </Text>
                </Pressable>

                <View style={styles.resendRow}>
                  <Text style={[styles.muted, { color: C.textSecondary }]}>{t('auth.addEmail.resendPrompt')}</Text>
                  {resendTimer > 0 ? (
                    <Text style={[styles.mutedBold, { color: C.textSecondary }]}>{t('auth.addEmail.resendCountdown', { n: resendTimer })}</Text>
                  ) : (
                    <Pressable onPress={handleResend} disabled={resending}>
                      <Text style={[styles.link, { color: C.brinjal1 }]}>{t('auth.addEmail.resendBtn')}</Text>
                    </Pressable>
                  )}
                </View>

                <Pressable onPress={() => { setStep('email'); setOtpError(''); }} disabled={verifying}>
                  <Text style={[styles.link, { color: C.brinjal1, textAlign: 'center' }]}>{t('auth.addEmail.changeEmail')}</Text>
                </Pressable>
              </>
            )}

            <Pressable style={styles.signOut} onPress={() => { void logout(); }}>
              <Text style={[styles.muted, { color: C.textSecondary }]}>{t('auth.addEmail.signOut')}</Text>
            </Pressable>
          </ScrollView>
        </MaxWidthContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },

  hero: { paddingBottom: 32, overflow: 'hidden' },
  heroBubble1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -50 },
  heroContent: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, gap: 10 },
  iconWrap: { width: 64, height: 64, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 20, color: '#fff', textAlign: 'center', fontFamily: F.bold },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 22, fontFamily: F.regular },

  card: { flex: 1, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl },
  cardContent: { padding: 24, paddingTop: 32, gap: 18 },

  primaryBtn: { width: '100%', borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center', ...SHADOW.raised },
  primaryBtnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  btnDisabled: { opacity: 0.45 },

  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  otpBox: { width: 46, height: 58, borderRadius: RADIUS.sm, borderWidth: 2, textAlign: 'center', fontSize: 22, fontFamily: F.bold },

  errorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.sm, padding: 12 },
  errorText: { fontSize: 13, textAlign: 'center', fontFamily: F.semibold, color: '#EF4444' },

  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  muted: { fontSize: 14, fontFamily: F.regular },
  mutedBold: { fontSize: 14, fontFamily: F.semibold },
  link: { fontSize: 14, fontFamily: F.bold },

  signOut: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  checkCircle: { width: 96, height: 96, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', ...SHADOW.raised },
  successTitle: { fontSize: 24, fontFamily: F.bold, textAlign: 'center' },
});
