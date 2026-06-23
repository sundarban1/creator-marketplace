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
function getPasswordError(pwd: string): string | undefined {
  if (pwd.length < 8)        return 'At least 8 characters required.';
  if (!/[A-Z]/.test(pwd))    return 'Add at least one uppercase letter.';
  if (!/[0-9]/.test(pwd))    return 'Add at least one number.';
  return undefined;
}

const ROLES = [
  { key: 'CREATOR',  label: 'Content Creator', sub: 'Earn by creating',  icon: 'camera'   as const, grad: ['#4F46E5', '#7C3AED'] as const },
  { key: 'BUSINESS', label: 'Brand / Business', sub: 'Find creators',     icon: 'briefcase' as const, grad: ['#F97316', '#EF4444'] as const },
] as const;

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8,     label: '8+ characters' },
  { test: (p: string) => /[A-Z]/.test(p),   label: 'One uppercase'  },
  { test: (p: string) => /[0-9]/.test(p),   label: 'One number'     },
];

export default function SignupScreen() {
  const { t } = useLanguage();
  const C = useAppColors();

  const [role,      setRole]      = useState<'CREATOR' | 'BUSINESS'>('CREATOR');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [apiError,  setApiError]  = useState('');

  const emailError    = submitted && !isValidEmail(email)  ? 'Enter a valid email address' : undefined;
  const passwordError = submitted ? getPasswordError(password) : undefined;

  async function handleCreate() {
    setSubmitted(true);
    setApiError('');
    if (!isValidEmail(email) || getPasswordError(password)) return;
    setLoading(true);
    try {
      await authService.register({
        email:    email.trim().toLowerCase(),
        password,
        role,
      });
      router.push({ pathname: '/verify', params: { email: email.trim().toLowerCase() } });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignIn() {
    setApiError('Google sign-in is not available yet.');
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Back button */}
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
            style={[s.back, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </Pressable>

          {/* Branding header */}
          <View style={s.headerContent}>
            <LinearGradient
              colors={['#4F46E5', '#7C3AED']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.logoCircle}>
              <Ionicons name="sparkles" size={22} color="#fff" />
            </LinearGradient>
            <Text style={[s.title, { color: C.text, fontFamily: F.extrabold }]}>Create Account</Text>
            <Text style={[s.subtitle, { color: C.textSecondary, fontFamily: F.regular }]}>
              Join thousands of creators and brands
            </Text>
          </View>

          {/* User type selector */}
          <View style={[s.sectionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={s.roleHeadingWrap}>
              <Text style={[s.sectionLabel, { color: C.text, fontFamily: F.extrabold }]}>I am a…</Text>
              <View style={[s.roleHeadingLine, { backgroundColor: C.brinjal1 }]} />
            </View>
            <View style={s.roleRow}>
              {ROLES.map((r) => {
                const active = role === r.key;
                return (
                  <Pressable
                    key={r.key}
                    style={[s.roleCard, { backgroundColor: active ? 'transparent' : C.background, borderColor: active ? 'transparent' : C.border }]}
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
                    <Text style={[s.roleSub, { color: active ? 'rgba(255,255,255,0.8)' : C.textSecondary, fontFamily: F.regular }]}>{r.sub}</Text>
                    {active && (
                      <View style={s.roleCheck}>
                        <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Account details form */}
          <View style={[s.sectionCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={s.roleHeadingWrap}>
              <Text style={[s.sectionLabel, { color: C.text, fontFamily: F.extrabold }]}>Account details</Text>
              <View style={[s.roleHeadingLine, { backgroundColor: C.brinjal1 }]} />
            </View>
            <View style={s.form}>
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
                label="Password"
                value={password}
                onChangeText={(v) => { setPassword(v); setApiError(''); }}
                placeholder="Create a strong password"
                secureTextEntry
                secureToggle
                leftIcon="lock-closed-outline"
                error={passwordError}
              />

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

              {apiError ? (
                <View style={[s.errorBanner, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                  <Ionicons name="alert-circle" size={16} color={C.error} />
                  <Text style={[s.errorBannerText, { color: C.error, fontFamily: F.medium }]}>{apiError}</Text>
                </View>
              ) : null}

              <Button
                label={loading ? 'Creating account…' : 'Create Account'}
                onPress={handleCreate}
                loading={loading}
                icon="arrow-forward"
              />

              {/* OR divider */}
              <View style={s.divider}>
                <View style={[s.dividerLine, { backgroundColor: C.border }]} />
                <Text style={[s.dividerText, { color: C.textSecondary, fontFamily: F.regular }]}>or continue with</Text>
                <View style={[s.dividerLine, { backgroundColor: C.border }]} />
              </View>

              {/* Google Sign In */}
              <Pressable
                style={[s.googleBtn, { backgroundColor: C.background, borderColor: C.border }]}
                onPress={handleGoogleSignIn}>
                <View style={s.googleBadge}>
                  <Text style={s.googleG}>G</Text>
                </View>
                <Text style={[s.googleBtnText, { color: C.text, fontFamily: F.semibold }]}>
                  Continue with Google
                </Text>
              </Pressable>

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
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 48 },

  back: {
    width: 42, height: 42, borderRadius: 13, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2, marginBottom: 12,
  },

  headerContent: { alignItems: 'center', gap: 6, marginBottom: 16 },
  logoCircle: { width: 56, height: 56, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  title:    { fontSize: 24, textAlign: 'center' },
  subtitle: { fontSize: 13, lineHeight: 19, textAlign: 'center' },

  sectionCard: { borderRadius: 20, borderWidth: 1.5, padding: 18, marginBottom: 16, gap: 14 },
  sectionLabel: { fontSize: 18, fontWeight: '800', textAlign: 'center', fontFamily: 'System' },

  roleHeadingWrap: { alignItems: 'center', gap: 6 },
  roleHeadingLine: { width: 36, height: 3, borderRadius: 2 },

  roleRow:   { flexDirection: 'row', gap: 12 },
  roleCard:  { flex: 1, borderRadius: 16, borderWidth: 1.5, padding: 14, gap: 6, overflow: 'hidden' },
  roleIcon:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  roleLabel: { fontSize: 13 },
  roleSub:   { fontSize: 11 },
  roleCheck: { position: 'absolute', top: 10, right: 10 },

  form: { gap: 14 },

  rulesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 2 },
  ruleRow:   { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ruleText:  { fontSize: 12 },

  errorBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 12 },
  errorBannerText: { fontSize: 13, flex: 1 },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12 },

  googleBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, borderWidth: 1.5, paddingVertical: 14 },
  googleBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center' },
  googleG:     { color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: 'System' },
  googleBtnText: { fontSize: 15 },

  terms: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },

  loginRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8 },
  loginText: { fontSize: 14 },
  loginLink: { fontSize: 14 },
});
