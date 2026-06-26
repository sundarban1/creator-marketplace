import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { authService } from '@/services/auth';
import { F } from '@/utilities/constants';

export default function ForgotPasswordScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = phone.trim().length >= 7;

  async function handleSendOtp() {
    if (!isValid) { setError(t('auth.forgotPassword.phoneError')); return; }
    setError('');
    setLoading(true);
    try {
      await authService.forgotPasswordByPhone(phone.trim());
      router.push({ pathname: '/reset-otp', params: { phone: phone.trim() } });
    } catch (e: any) {
      setError(e.message ?? 'Failed to send OTP. Please try again.');
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
        <Pressable style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/login')}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <View style={styles.heroContent}>
          <View style={styles.iconWrap}>
            <Text style={styles.icon}>🔐</Text>
          </View>
          <Text style={styles.heroTitle}>{t('auth.forgotPassword.title')}</Text>
          <Text style={styles.heroSub}>{t('auth.forgotPassword.subtitle')}</Text>
        </View>
      </View>

      {/* ── Card ── */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={[styles.card, { backgroundColor: C.background }]}
          contentContainerStyle={styles.cardContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <Text style={[styles.label, { color: C.text }]}>{t('auth.forgotPassword.phoneLabel')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: C.surface, borderColor: error ? C.error : C.border, color: C.text }]}
            value={phone}
            onChangeText={(v) => { setPhone(v); setError(''); }}
            placeholder={t('auth.forgotPassword.phonePlaceholder')}
            placeholderTextColor={C.textSecondary}
            keyboardType="phone-pad"
            autoFocus
          />
          {error ? <Text style={[styles.errorText, { color: C.error }]}>{error}</Text> : null}

          <Text style={[styles.hint, { color: C.textSecondary }]}>
            {t('auth.forgotPassword.phoneHint')}
          </Text>

          <Pressable
            style={[styles.btn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, (!isValid || loading) && styles.btnDisabled]}
            onPress={handleSendOtp}
            disabled={!isValid || loading}>
            {loading ? (
              <View style={styles.loadingRow}>
                <View style={[styles.spinner, { borderTopColor: '#fff' }]} />
                <Text style={styles.btnText}>{t('auth.forgotPassword.sending')}</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>{t('auth.forgotPassword.sendBtn')}</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.replace('/login')} style={styles.backToLogin}>
            <Text style={[styles.backToLoginText, { color: C.textSecondary }]}>
              {t('auth.forgotPassword.backTo')} <Text style={{ color: C.brinjal1, fontWeight: '700' }}>{t('auth.forgotPassword.signIn')}</Text>
            </Text>
          </Pressable>

        </ScrollView>
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
  icon: { fontSize: 30 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', fontFamily: F.extrabold },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.78)', textAlign: 'center', lineHeight: 22, fontFamily: F.regular },
  card: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  cardContent: { padding: 28, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8, fontFamily: F.bold },
  input: { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 6, fontFamily: F.regular },
  errorText: { fontSize: 12, fontWeight: '500', marginBottom: 4, fontFamily: F.medium },
  hint: { fontSize: 12, marginBottom: 24, lineHeight: 18, fontFamily: F.regular },
  btn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5, marginBottom: 16 },
  btnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spinner: { width: 18, height: 18, borderRadius: 9, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.35)' },
  backToLogin: { alignItems: 'center', paddingVertical: 8 },
  backToLoginText: { fontSize: 14, fontFamily: F.regular },
});
