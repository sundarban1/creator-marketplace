import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors, useIsDark } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { authService } from '@/services/auth';
import { withAlpha } from '@/utilities/color';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { BackButton } from '@/components/BackButton';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { isValidNepaliPhone, normalizePhoneForSubmit } from '@/utilities/phone';

type Channel = 'email' | 'phone';

function isValidEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }

export default function ForgotPasswordScreen() {
  const C = useAppColors();
  const { isDark } = useIsDark();
  const { t } = useLanguage();
  const toast = useToast();
  // reset-otp sends users here with channel=phone when an email reset turned up
  // nothing — a phone-only signup can never be reached by email.
  const { channel: initialChannel } = useLocalSearchParams<{ channel?: string }>();
  const [channel, setChannel] = useState<Channel>(initialChannel === 'phone' ? 'phone' : 'email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = channel === 'email' ? isValidEmail(email) : isValidNepaliPhone(phone);

  async function handleSendOtp() {
    if (!isValid) {
      setError(channel === 'email' ? t('auth.forgotPassword.emailError') : t('auth.forgotPassword.phoneError'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (channel === 'email') {
        const trimmedEmail = email.trim().toLowerCase();
        await authService.forgotPassword({ email: trimmedEmail });
        toast.info(t('auth.forgotPassword.codeSentInfoEmail'));
        router.push({ pathname: '/reset-otp', params: { email: trimmedEmail } });
      } else {
        const normalisedPhone = normalizePhoneForSubmit(phone);
        await authService.forgotPassword({ phone: normalisedPhone });
        toast.info(t('auth.forgotPassword.codeSentInfoPhone'));
        router.push({ pathname: '/reset-otp', params: { phone: normalisedPhone } });
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <MaxWidthContainer>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <BackButton fallback="/login" />
          </View>

          {/* ── Illustration ── */}
          <View style={styles.illustrationWrap}>
            <View style={[styles.blob, { backgroundColor: withAlpha(C.brinjal1, 0.1) }]} />
            <View style={[styles.sparkle, styles.sparkleTL, { backgroundColor: withAlpha(C.accent, 0.5) }]} />
            <View style={[styles.sparkle, styles.sparkleBR, { backgroundColor: withAlpha(C.brinjal1, 0.4) }]} />
            <View style={[styles.lockCircle, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }]}>
              <FontAwesome5 name="lock" size={30} color="#fff" solid />
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text style={[styles.heroTitle, { color: C.text }]}>{t('auth.forgotPassword.title')}</Text>
            <Text style={[styles.heroSub, { color: C.textSecondary }]}>{t('auth.forgotPassword.subtitle')}</Text>
          </View>

          {/* Email / Phone toggle */}
          <View style={[styles.channelToggle, { backgroundColor: C.primaryLight }]}>
            {(['email', 'phone'] as const).map((c) => {
              const active = channel === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => { setChannel(c); setError(''); }}
                  style={[styles.channelTab, active && { backgroundColor: C.brinjal1 }]}>
                  <FontAwesome5 name={c === 'email' ? 'envelope' : 'phone'} size={13} color={active ? '#fff' : C.brinjal1} />
                  <Text style={[styles.channelTabText, { color: active ? '#fff' : C.brinjal1 }]}>
                    {c === 'email' ? t('auth.login.emailLabel') : t('creatorSettings.phoneNumberLabel')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {channel === 'email' ? (
            <TextInputWithLabel
              label={t('auth.forgotPassword.emailLabel')}
              leftIcon="envelope"
              error={error || undefined}
              value={email}
              onChangeText={(v) => { setEmail(v); setError(''); }}
              placeholder={t('auth.forgotPassword.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
          ) : (
            <TextInputWithLabel
              label={t('auth.forgotPassword.phoneLabel')}
              leftIcon="phone"
              error={error || undefined}
              value={phone}
              onChangeText={(v) => { setPhone(v.replace(/[^0-9+]/g, '')); setError(''); }}
              placeholder={t('auth.forgotPassword.phonePlaceholder')}
              keyboardType="phone-pad"
              autoFocus
            />
          )}

          <Text style={[styles.hint, { color: C.textSecondary }]}>
            {channel === 'email' ? t('auth.forgotPassword.emailHint') : t('auth.forgotPassword.phoneHint')}
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
            <FontAwesome5 name="arrow-left" size={12} color={C.brinjal1} />
            <Text style={[styles.backToLoginText, { color: C.textSecondary }]}>
              {t('auth.forgotPassword.backTo')} <Text style={{ color: C.brinjal1, fontFamily: F.bold }}>{t('auth.forgotPassword.signIn')}</Text>
            </Text>
          </Pressable>

        </ScrollView>
        </MaxWidthContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  header: { paddingTop: 8, marginBottom: 8 },

  illustrationWrap: { alignSelf: 'center', width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  blob: { position: 'absolute', width: 140, height: 140, borderRadius: 40, transform: [{ rotate: '18deg' }] },
  sparkle: { position: 'absolute', borderRadius: RADIUS.full },
  sparkleTL: { width: 14, height: 14, top: 6, left: 10 },
  sparkleBR: { width: 10, height: 10, bottom: 10, right: 8 },
  lockCircle: {
    width: 76, height: 76, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center',
    shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8,
  },

  heroContent: { alignItems: 'center', paddingHorizontal: 8, gap: 8, marginBottom: 28 },
  heroTitle: { fontSize: 22, textAlign: 'center', fontFamily: F.bold },
  heroSub: { fontSize: 14, textAlign: 'center', lineHeight: 21, fontFamily: F.regular },

  channelToggle: { flexDirection: 'row', gap: 6, borderRadius: RADIUS.md, padding: 4, marginBottom: 20 },
  channelTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: RADIUS.sm },
  channelTabText: { fontSize: 13, fontFamily: F.bold },
  hint: { fontSize: 12, marginTop: 8, marginBottom: 24, lineHeight: 18, fontFamily: F.regular },
  btn: { borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center', ...SHADOW.raised, marginBottom: 20 },
  btnDisabled: { opacity: 0.45, shadowOpacity: 0, elevation: 0 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spinner: { width: 18, height: 18, borderRadius: 9, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.35)' },
  backToLogin: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  backToLoginText: { fontSize: 14, fontFamily: F.regular },
});
