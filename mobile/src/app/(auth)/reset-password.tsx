import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { authService } from '@/services/auth';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

function getPasswordError(pwd: string, t: TFn): string | undefined {
  if (pwd.length < 8) return t('auth.resetPassword.pwErrorMinLength');
  if (!/[A-Z]/.test(pwd)) return t('auth.resetPassword.pwErrorUppercase');
  if (!/[0-9]/.test(pwd)) return t('auth.resetPassword.pwErrorNumber');
  return undefined;
}

// ── Simple Toast ────────────────────────────────────────────────────────────────
function Toast({ visible, message }: { visible: boolean; message: string }) {
  const C = useAppColors();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 250, useNativeDriver: true }).start();
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        { backgroundColor: '#166534', opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
      ]}>
      <Ionicons name="checkmark-circle" size={16} color="#fff" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function ResetPasswordScreen() {
  const { resetToken } = useLocalSearchParams<{ resetToken: string }>();
  const C = useAppColors();
  const { t } = useLanguage();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const confirmFocusedRef = useRef(false);

  // Confirm-password sits right above the submit button — Android's
  // adjustResize shrinks the window when the keyboard opens but never
  // auto-scrolls a mid-form field into the new viewport, so without this it
  // ends up hidden behind the keyboard. keyboardDidShow (rather than the
  // input's onFocus) fires after that resize has actually happened, so
  // scrollToEnd lands correctly against the shrunk viewport.
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      if (confirmFocusedRef.current) scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, []);

  const pwdError     = submitted ? getPasswordError(password, t) : undefined;
  const confirmError = submitted && confirm !== password ? t('auth.resetPassword.passwordsNoMatch') : undefined;
  const isValid      = !getPasswordError(password, t) && password === confirm;

  async function handleReset() {
    setSubmitted(true);
    if (!isValid) return;

    setError('');
    setLoading(true);
    try {
      await authService.resetPasswordWithToken(resetToken ?? '', password);
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setTimeout(() => router.replace('/login'), 200);
      }, 2000);
    } catch (e: any) {
      setError(e.message ?? t('auth.resetPassword.resetFailedError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.brinjal1 }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.hero}>
        <View style={styles.bubble1} />
        <View style={styles.bubble2} />
        <View style={styles.heroContent}>
          <View style={styles.iconWrap}>
            <FontAwesome5 name="key" size={22} color="#fff" solid />
          </View>
          <Text style={styles.heroTitle}>{t('auth.resetPassword.heroTitle')}</Text>
          <Text style={styles.heroSub}>{t('auth.resetPassword.heroSub')}</Text>
        </View>
      </View>

      {/* ── Card ── */}
      {/* No `behavior` prop — the ScrollView's `automaticallyAdjustKeyboardInsets` already
          handles iOS precisely on its own; stacking KeyboardAvoidingView's `padding` on top
          of that double-compensates for the same keyboard, pushing content up too far. */}
      <KeyboardAvoidingView style={styles.flex}>
        <ScrollView
          ref={scrollRef}
          style={[styles.card, { backgroundColor: C.background }]}
          contentContainerStyle={styles.cardContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets>

          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Text style={[styles.errorBannerText, { color: '#EF4444' }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            {/* New password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>{t('auth.resetPassword.newPasswordLabel')}</Text>
              <PasswordInput
                value={password}
                onChange={(v) => { setPassword(v); setError(''); }}
                placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
                hasError={!!pwdError}
                C={C}
              />
              {pwdError ? <Text style={[styles.fieldError, { color: C.error }]}>{pwdError}</Text> : null}
            </View>

            {/* Confirm password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>{t('auth.resetPassword.confirmPasswordLabel')}</Text>
              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                onFocus={() => { confirmFocusedRef.current = true; }}
                onBlur={() => { confirmFocusedRef.current = false; }}
                placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                hasError={!!confirmError}
                C={C}
              />
              {confirmError ? <Text style={[styles.fieldError, { color: C.error }]}>{confirmError}</Text> : null}
            </View>
          </View>

          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.btn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, loading && styles.btnDisabled]}
            onPress={handleReset}
            disabled={loading}>
            {loading ? (
              <View style={styles.loadingRow}>
                <View style={[styles.spinner, { borderTopColor: '#fff' }]} />
                <Text style={styles.btnText}>{t('auth.resetPassword.updating')}</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>{t('auth.resetPassword.resetBtn')}</Text>
            )}
          </Pressable>

          <View style={styles.rules}>
            <RuleRow met={password.length >= 8} text={t('auth.resetPassword.ruleMinLength')} />
            <RuleRow met={/[A-Z]/.test(password)} text={t('auth.resetPassword.ruleUppercase')} />
            <RuleRow met={/[0-9]/.test(password)} text={t('auth.resetPassword.ruleNumber')} />
            <RuleRow met={password.length > 0 && password === confirm} text={t('auth.resetPassword.rulePasswordsMatch')} />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Toast ── */}
      <Toast visible={showToast} message={t('auth.resetPassword.toastSuccess')} />
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PasswordInput({
  value, onChange, placeholder, hasError, C, onFocus, onBlur,
}: { value: string; onChange: (t: string) => void; placeholder: string; hasError: boolean; C: any; onFocus?: () => void; onBlur?: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <View style={[styles.pwdRow, { backgroundColor: C.surface, borderColor: hasError ? C.error : C.border }]}>
      <TextInput
        style={[styles.pwdInput, { color: C.text }]}
        value={value}
        onChangeText={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={C.textSecondary}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setShow((s) => !s)} style={styles.eyeBtn}>
        <Ionicons name={show ? 'eye-off' : 'eye'} size={18} color={C.textSecondary} />
      </Pressable>
    </View>
  );
}

function RuleRow({ met, text }: { met: boolean; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons name={met ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={met ? '#16a34a' : '#9ca3af'} />
      <Text style={[styles.ruleText, { color: met ? '#16a34a' : '#9ca3af' }]}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  hero: { paddingBottom: 36, overflow: 'hidden' },
  bubble1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -50 },
  bubble2: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)', bottom: 0, left: -30 },
  heroContent: { alignItems: 'center', paddingHorizontal: 24, gap: 10, paddingTop: 52 },
  iconWrap: { width: 68, height: 68, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  heroTitle: { fontSize: 20, color: '#fff', textAlign: 'center', fontFamily: F.bold },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.78)', textAlign: 'center', lineHeight: 22, fontFamily: F.regular },

  card: { flex: 1, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl },
  cardContent: { padding: 28, paddingBottom: 40 },
  errorBanner: { borderRadius: RADIUS.sm, borderWidth: 1, padding: 12, marginBottom: 16 },
  errorBannerText: { fontSize: 13, fontFamily: F.semibold },
  form: { gap: 16, marginBottom: 24 },
  fieldGroup: { gap: 6 },
  label: { fontSize: 13, fontFamily: F.bold },
  fieldError: { fontSize: 12, fontFamily: F.medium },
  pwdRow: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, paddingHorizontal: 14 },
  pwdInput: { flex: 1, fontSize: 15, paddingVertical: 14, fontFamily: F.regular },
  eyeBtn: { padding: 6 },
  btn: { borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center', ...SHADOW.raised, marginBottom: 24 },
  btnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spinner: { width: 18, height: 18, borderRadius: 9, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.35)' },
  rules: { gap: 8 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontSize: 13, fontFamily: F.regular },

  toast: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 8,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.floating,
    shadowColor: '#000',
  },
  toastText: { color: '#fff', fontSize: 14, fontFamily: F.bold },
});
