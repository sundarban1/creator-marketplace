import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { Button } from '@/components/Button';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { authService } from '@/services/auth';
import { F } from '@/utilities/constants';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
function isValidPhone(v: string) {
  return /^\+?[\d\s\-().]{7,15}$/.test(v.trim());
}
function getPasswordError(pwd: string): string | undefined {
  if (pwd.length < 8)        return 'At least 8 characters required.';
  if (!/[A-Z]/.test(pwd))    return 'Add at least one uppercase letter.';
  if (!/[0-9]/.test(pwd))    return 'Add at least one number.';
  return undefined;
}

const ROLES = [
  { key: 'CREATOR',  label: 'Content Creator', sub: 'Earn by creating', icon: 'camera' as const,    grad: ['#4F46E5', '#7C3AED'] as const },
  { key: 'BUSINESS', label: 'Brand / Business', sub: 'Find creators',    icon: 'briefcase' as const, grad: ['#F97316', '#EF4444'] as const },
] as const;

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8,     label: '8+ characters'   },
  { test: (p: string) => /[A-Z]/.test(p),   label: 'One uppercase'   },
  { test: (p: string) => /[0-9]/.test(p),   label: 'One number'      },
];

export default function SignupScreen() {
  const { t } = useLanguage();
  const C = useAppColors();

  const [role,      setRole]      = useState<'CREATOR' | 'BUSINESS'>('CREATOR');
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [apiError,  setApiError]  = useState('');

  const isBusiness = role === 'BUSINESS';

  const nameError     = submitted && !name.trim()        ? (isBusiness ? 'Business name is required' : 'Full name is required') : undefined;
  const emailError    = submitted && !isValidEmail(email) ? 'Enter a valid email address'  : undefined;
  const phoneError    = submitted && !isValidPhone(phone) ? 'Enter a valid phone number (+977 98XXXXXXXX)' : undefined;
  const passwordError = submitted ? getPasswordError(password) : undefined;

  async function handleCreate() {
    setSubmitted(true);
    setApiError('');
    if (!name.trim() || !isValidEmail(email) || !isValidPhone(phone) || getPasswordError(password)) return;
    setLoading(true);
    try {
      await authService.register({
        email:        email.trim().toLowerCase(),
        phone:        phone.trim(),
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
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Back */}
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
            style={[s.back, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </Pressable>

          {/* Heading */}
          <Text style={[s.title, { color: C.text, fontFamily: F.extrabold }]}>
            {t('auth.signup.title')}
          </Text>
          <Text style={[s.subtitle, { color: C.textSecondary, fontFamily: F.regular }]}>
            {t('auth.signup.subtitle')}
          </Text>

          {/* Role selector */}
          <View style={s.roleRow}>
            {ROLES.map((r) => {
              const active = role === r.key;
              return (
                <Pressable
                  key={r.key}
                  style={[s.roleCard, { backgroundColor: C.surface, borderColor: active ? 'transparent' : C.border }]}
                  onPress={() => { setRole(r.key); setSubmitted(false); setApiError(''); }}>
                  {active && (
                    <LinearGradient
                      colors={r.grad}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <View style={[s.roleIcon, { backgroundColor: active ? 'rgba(255,255,255,0.22)' : C.primaryLight }]}>
                    <Ionicons name={r.icon} size={20} color={active ? '#fff' : C.brinjal1} />
                  </View>
                  <Text style={[s.roleLabel, { color: active ? '#fff' : C.text, fontFamily: F.bold }]}>{r.label}</Text>
                  <Text style={[s.roleSub,   { color: active ? 'rgba(255,255,255,0.8)' : C.textSecondary, fontFamily: F.regular }]}>{r.sub}</Text>
                  {active && (
                    <View style={s.roleCheck}>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Form */}
          <View style={s.form}>
            <TextInputWithLabel
              label={isBusiness ? 'Business Name' : 'Full Name'}
              value={name}
              onChangeText={(v) => { setName(v); setApiError(''); }}
              placeholder={isBusiness ? 'e.g. Himalayan Trekking Co.' : 'e.g. Aarav Sharma'}
              autoCapitalize="words"
              leftIcon={isBusiness ? 'business-outline' : 'person-outline'}
              error={nameError}
            />
            <TextInputWithLabel
              label="Email Address"
              value={email}
              onChangeText={(v) => { setEmail(v); setApiError(''); }}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon="mail-outline"
              error={emailError}
            />
            <TextInputWithLabel
              label="Phone Number"
              value={phone}
              onChangeText={(v) => { setPhone(v); setApiError(''); }}
              placeholder="+977 98XXXXXXXX"
              keyboardType="phone-pad"
              leftIcon="call-outline"
              hint="Nepal number: +977 98XXXXXXXX"
              error={phoneError}
            />
            <TextInputWithLabel
              label="Password"
              value={password}
              onChangeText={(v) => { setPassword(v); setApiError(''); }}
              placeholder="Create a strong password"
              secureTextEntry
              secureToggle
              leftIcon="lock-closed-outline"
              error={passwordError}
            />

            {/* Password strength rules */}
            {password.length > 0 && (
              <View style={s.rulesWrap}>
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(password);
                  return (
                    <View key={rule.label} style={s.ruleRow}>
                      <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={ok ? '#10B981' : C.textSecondary} />
                      <Text style={[s.ruleText, { color: ok ? '#10B981' : C.textSecondary, fontFamily: ok ? F.medium : F.regular }]}>
                        {rule.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* API error */}
            {apiError ? (
              <View style={[s.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                <Ionicons name="alert-circle" size={16} color={C.error} />
                <Text style={[s.errorBannerText, { color: C.error, fontFamily: F.medium }]}>{apiError}</Text>
              </View>
            ) : null}

            <Button
              label={loading ? 'Creating account…' : t('auth.signup.createAccount')}
              onPress={handleCreate}
              loading={loading}
              icon="arrow-forward"
            />

            <Text style={[s.terms, { color: C.textSecondary, fontFamily: F.regular }]}>
              By creating an account you agree to our{' '}
              <Text
                style={{ color: C.brinjal1, fontFamily: F.semibold }}
                onPress={() => router.push('/legal?type=terms' as never)}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text
                style={{ color: C.brinjal1, fontFamily: F.semibold }}
                onPress={() => router.push('/legal?type=privacy-policy' as never)}>
                Privacy Policy
              </Text>
              .
            </Text>
          </View>

          {/* Login link */}
          <View style={s.loginRow}>
            <Text style={[s.loginText, { color: C.textSecondary, fontFamily: F.regular }]}>Already have an account?</Text>
            <Pressable onPress={() => router.replace('/login')}>
              <Text style={[s.loginLink, { color: C.brinjal1, fontFamily: F.bold }]}>Sign In</Text>
            </Pressable>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1 },
  flex:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 16, paddingBottom: 40 },

  back: { width: 42, height: 42, borderRadius: 13, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', marginBottom: 28, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },

  title:    { fontSize: 28, marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 21, marginBottom: 28 },

  roleRow:   { flexDirection: 'row', gap: 12, marginBottom: 28 },
  roleCard:  { flex: 1, borderRadius: 18, borderWidth: 1.5, padding: 16, gap: 6, overflow: 'hidden' },
  roleIcon:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  roleLabel: { fontSize: 13 },
  roleSub:   { fontSize: 11 },
  roleCheck: { position: 'absolute', top: 12, right: 12 },

  form:  { gap: 16 },

  rulesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 2 },
  ruleRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ruleText:  { fontSize: 12 },

  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12 },
  errorBannerText: { fontSize: 13, flex: 1 },

  terms:    { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },

  loginRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 28 },
  loginText: { fontSize: 14 },
  loginLink: { fontSize: 14 },
});
