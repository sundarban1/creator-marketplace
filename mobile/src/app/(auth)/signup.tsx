import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { authService } from '@/services/auth';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string) {
  return /^\+?[\d\s\-().]{7,15}$/.test(value.trim());
}

function getPasswordError(pwd: string): string | undefined {
  if (pwd.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(pwd)) return 'Must contain at least one uppercase letter.';
  if (!/[0-9]/.test(pwd)) return 'Must contain at least one number.';
  return undefined;
}

export default function SignupScreen() {
  const { t } = useLanguage();
  const C = useAppColors();

  const [role, setRole] = useState<'CREATOR' | 'BUSINESS'>('CREATOR');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const isBusiness = role === 'BUSINESS';

  const nameError     = submitted && !name.trim() ? (isBusiness ? t('auth.signup.errorBusinessName') : t('auth.signup.errorName')) : undefined;
  const emailError    = submitted && !isValidEmail(email) ? t('auth.signup.errorEmailInvalid') : undefined;
  const phoneError    = submitted && !isValidPhone(phone) ? 'Enter a valid phone number' : undefined;
  const passwordError = submitted ? getPasswordError(password) : undefined;

  async function handleCreate() {
    setSubmitted(true);
    setApiError('');
    if (!name.trim() || !isValidEmail(email) || !isValidPhone(phone) || getPasswordError(password)) return;

    setLoading(true);
    try {
      await authService.register({
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        role,
        fullName:     role === 'CREATOR'  ? name.trim() : undefined,
        businessName: role === 'BUSINESS' ? name.trim() : undefined,
      });
      router.push({ pathname: '/verify', params: { email: email.trim().toLowerCase() } });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
            style={[styles.back, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.backArrow, { color: C.brinjal1 }]}>‹</Text>
          </Pressable>

          <Text style={[styles.title, { color: C.text }]}>{t('auth.signup.title')}</Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>{t('auth.signup.subtitle')}</Text>

          <View style={styles.roleRow}>
            {(['CREATOR', 'BUSINESS'] as const).map((r) => (
              <Pressable
                key={r}
                style={[styles.roleChip, { borderColor: C.border, backgroundColor: C.surface }, role === r && { borderColor: C.brinjal1, backgroundColor: C.primaryLight }]}
                onPress={() => { setRole(r); setSubmitted(false); setApiError(''); }}>
                <Text style={[styles.roleText, { color: C.textSecondary }, role === r && { color: C.brinjal1, fontWeight: '700' }]}>
                  {r === 'CREATOR' ? t('auth.signup.creatorRole') : t('auth.signup.businessRole')}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.form}>
            <TextInputWithLabel
              label={isBusiness ? t('auth.signup.businessName') : t('auth.signup.fullName')}
              value={name}
              onChangeText={(v) => { setName(v); setApiError(''); }}
              placeholder={isBusiness ? t('auth.signup.businessNamePlaceholder') : t('auth.signup.fullNamePlaceholder')}
              autoCapitalize="words"
              error={nameError}
            />
            <TextInputWithLabel
              label={t('auth.signup.email')}
              value={email}
              onChangeText={(v) => { setEmail(v); setApiError(''); }}
              placeholder={t('auth.signup.emailPlaceholder')}
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
            />
            <TextInputWithLabel
              label="Phone Number"
              value={phone}
              onChangeText={(v) => { setPhone(v); setApiError(''); }}
              placeholder="+977 98XXXXXXXX"
              keyboardType="phone-pad"
              error={phoneError}
            />
            <TextInputWithLabel
              label={t('auth.signup.password')}
              value={password}
              onChangeText={(v) => { setPassword(v); setApiError(''); }}
              placeholder={t('auth.signup.passwordPlaceholder')}
              secureTextEntry
              secureToggle
              error={passwordError}
            />

            {apiError ? (
              <View style={[styles.errorBanner, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                <Text style={[styles.errorBannerText, { color: C.error }]}>{apiError}</Text>
              </View>
            ) : null}

            <Button label={loading ? 'Creating account…' : t('auth.signup.createAccount')} onPress={handleCreate} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24 },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  backArrow: { fontSize: 26, lineHeight: 30 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 15, marginBottom: 28 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  roleChip: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  roleText: { fontSize: 14, fontWeight: '500' },
  form: { gap: 16 },
  errorBanner: { borderWidth: 1, borderRadius: 10, padding: 12 },
  errorBannerText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
});
