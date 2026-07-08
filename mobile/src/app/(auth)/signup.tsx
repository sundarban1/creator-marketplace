import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { authService } from '@/services/auth';
import { F } from '@/utilities/constants';

const PRIMARY = '#5B21B6';
const INDIGO  = '#4F46E5';

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com'];
function getPasswordError(pwd: string): string | undefined {
  if (pwd.length < 8)     return 'At least 8 characters required.';
  if (!/[A-Z]/.test(pwd)) return 'Add at least one uppercase letter.';
  if (!/[0-9]/.test(pwd)) return 'Add at least one number.';
  return undefined;
}

const ROLES = [
  {
    key: 'CREATOR',  label: 'Content Creator',  sub: 'I create content and want to collaborate with brands',
    icon: 'camera-outline' as const,
  },
  {
    key: 'BUSINESS', label: 'Brand / Business',  sub: 'I represent a brand and want to work with creators',
    icon: 'briefcase-outline' as const,
  },
] as const;

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8,   label: '8+ chars'  },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Uppercase' },
  { test: (p: string) => /[0-9]/.test(p), label: 'Number'    },
];

// ── Input field ───────────────────────────────────────────────────────────────

function Field({
  icon, label, value, onChangeText, placeholder,
  secureTextEntry = false, keyboardType = 'default', error,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  error?: string;
}) {
  const C = useAppColors();
  const [focused, setFocused] = useState(false);
  const [hidden,  setHidden]  = useState(secureTextEntry);
  const anim = useRef(new Animated.Value(0)).current;
  const border = anim.interpolate({ inputRange: [0, 1], outputRange: [error ? '#FECACA' : '#E5E7EB', error ? '#EF4444' : PRIMARY] });

  return (
    <View style={s.fieldWrap}>
      <Text style={[s.fieldLabel, { color: C.text }]}>{label}</Text>
      <Animated.View style={[s.field, { borderColor: border, backgroundColor: C.surface }]}>
        <Ionicons name={icon} size={17} color={focused ? PRIMARY : '#9CA3AF'} style={s.fieldIcon} />
        <TextInput
          style={[s.fieldInput, { color: C.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => { setFocused(true);  Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: false }).start(); }}
          onBlur={()  => { setTimeout(() => { setFocused(false); Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(); }, 150); }}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setHidden(h => !h)} hitSlop={8} style={s.eyeBtn}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={17} color="#9CA3AF" />
          </Pressable>
        )}
      </Animated.View>
      {keyboardType === 'email-address' && focused && (() => {
        const atIndex = value.indexOf('@');
        if (atIndex === -1) return null;
        const localPart  = value.slice(0, atIndex);
        const domainPart = value.slice(atIndex + 1);
        if (domainPart.includes('.')) return null;
        const suggestions = EMAIL_DOMAINS.filter((d) => d.startsWith(domainPart));
        if (suggestions.length === 0) return null;
        return (
          <View style={[s.domainSuggestBox, { backgroundColor: C.surface }]}>
            {suggestions.map((domain) => (
              <Pressable
                key={domain}
                style={s.domainSuggestItem}
                onPress={() => onChangeText(`${localPart}@${domain}`)}>
                <Text style={s.domainSuggestText}>{localPart}@<Text style={s.domainSuggestTextBold}>{domain}</Text></Text>
              </Pressable>
            ))}
          </View>
        );
      })()}
      {!!error && (
        <View style={s.fieldError}>
          <Ionicons name="alert-circle-outline" size={12} color="#EF4444" />
          <Text style={s.fieldErrorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SignupScreen() {
  const C = useAppColors();

  const [role,      setRole]      = useState<'CREATOR' | 'BUSINESS'>('CREATOR');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [apiError,  setApiError]  = useState('');

  const emailError    = submitted && !isValidEmail(email)     ? 'Enter a valid email address' : undefined;
  const passwordError = submitted ? getPasswordError(password) : undefined;

  async function handleCreate() {
    setSubmitted(true);
    setApiError('');
    if (!isValidEmail(email) || getPasswordError(password)) return;
    setLoading(true);
    try {
      await authService.register({ email: email.trim().toLowerCase(), password, role });
      router.push({ pathname: '/verify', params: { email: email.trim().toLowerCase() } });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* App header */}
          <View style={s.appHeader}>
            <View style={s.appHeaderLeft}>
              <Image source={require('@/assets/images/logo.png')} style={s.logoImage} resizeMode="contain" />
            </View>
            <Pressable
              style={[s.backBtn, { borderColor: '#E5E7EB', backgroundColor: C.surface }]}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}>
              <Ionicons name="chevron-back" size={18} color={C.text} />
            </Pressable>
          </View>

          {/* Heading */}
          <View style={s.headingWrap}>
            <Text style={[s.heading, { color: C.text }]}>Create your account</Text>
            <Text style={[s.headingSub, { color: '#6B7280' }]}>
              Join kolab and unlock endless collaboration opportunities.
            </Text>
          </View>

          {/* Tab bar */}
          <View style={[s.tabBar, { backgroundColor: '#F3F4F6' }]}>
            <Pressable style={s.tabBtn} onPress={() => router.replace('/login')}>
              <Text style={[s.tabBtnText, { color: '#6B7280' }]}>Log in</Text>
            </Pressable>
            <View style={[s.tabBtn, s.tabBtnActive]}>
              <Text style={[s.tabBtnText, { color: PRIMARY, fontFamily: F.bold }]}>Create Account</Text>
            </View>
          </View>

          {/* Role selector */}
          <Text style={[s.sectionLabel, { color: C.text }]}>I'm joining as</Text>
          <View style={s.roleRow}>
            {ROLES.map((r) => {
              const active = role === r.key;
              return (
                <Pressable
                  key={r.key}
                  style={[
                    s.roleCard,
                    { borderColor: active ? PRIMARY : '#E5E7EB', backgroundColor: C.surface },
                    active && { borderWidth: 2 },
                  ]}
                  onPress={() => { setRole(r.key); setSubmitted(false); setApiError(''); }}>
                  <View style={[s.roleIconBox, { backgroundColor: active ? `${PRIMARY}12` : '#F9FAFB' }]}>
                    <Ionicons name={r.icon} size={24} color={active ? PRIMARY : '#9CA3AF'} />
                    {active && (
                      <View style={s.roleIconBadge}>
                        <Ionicons name="sparkles" size={9} color={PRIMARY} />
                      </View>
                    )}
                  </View>
                  <Text style={[s.roleLabel, { color: active ? PRIMARY : C.text }]}>{r.label}</Text>
                  <Text style={[s.roleSub, { color: '#6B7280' }]} numberOfLines={2}>{r.sub}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Form */}
          <View style={s.form}>
            <Field
              icon="mail-outline"
              label="Email"
              value={email}
              onChangeText={(v) => { setEmail(v); setApiError(''); }}
              placeholder="you@email.com"
              keyboardType="email-address"
              error={emailError}
            />
            <Field
              icon="lock-closed-outline"
              label="Password"
              value={password}
              onChangeText={(v) => { setPassword(v); setApiError(''); }}
              placeholder="Create a password"
              secureTextEntry
              error={passwordError}
            />

            {/* Password strength */}
            {password.length > 0 && (
              <View style={s.rulesRow}>
                {PASSWORD_RULES.map((rule) => {
                  const ok = rule.test(password);
                  return (
                    <View key={rule.label} style={[s.rulePill, { backgroundColor: ok ? '#F0FDF4' : '#F9FAFB', borderColor: ok ? '#86EFAC' : '#E5E7EB' }]}>
                      <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={11} color={ok ? '#16A34A' : '#9CA3AF'} />
                      <Text style={[s.ruleText, { color: ok ? '#16A34A' : '#9CA3AF' }]}>{rule.label}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={s.passwordHint}>Min. 8 characters with uppercase letters and numbers</Text>

            {!!apiError && (
              <View style={s.errorBanner}>
                <Ionicons name="alert-circle" size={15} color="#EF4444" />
                <Text style={s.errorText}>{apiError}</Text>
              </View>
            )}
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleCreate}
            disabled={loading}
            style={({ pressed }) => [s.primaryBtn, { backgroundColor: PRIMARY, opacity: pressed ? 0.88 : 1 }]}>
            {loading
              ? <Ionicons name="sync" size={18} color="#fff" />
              : <Text style={s.primaryBtnText}>Sign up</Text>}
          </Pressable>

          {/* Divider */}
          <View style={s.divider}>
            <View style={[s.dividerLine, { backgroundColor: '#E5E7EB' }]} />
            <Text style={s.dividerText}>or continue with</Text>
            <View style={[s.dividerLine, { backgroundColor: '#E5E7EB' }]} />
          </View>

          {/* Google */}
          <Pressable
            style={[s.socialBtn, { borderColor: '#E5E7EB', backgroundColor: C.surface }]}
            onPress={() => setApiError('Google sign-in is not available yet.')}>
            <View style={s.googleBadge}><Text style={s.googleG}>G</Text></View>
            <Text style={[s.socialBtnText, { color: C.text }]}>Continue with Google</Text>
          </Pressable>

          {/* Terms */}
          <Text style={s.terms}>
            By signing up you agree to our{' '}
            <Text style={{ color: PRIMARY, fontFamily: F.semibold }} onPress={() => router.push('/legal?type=terms' as never)}>Terms</Text>
            {' '}and{' '}
            <Text style={{ color: PRIMARY, fontFamily: F.semibold }} onPress={() => router.push('/legal?type=privacy-policy' as never)}>Privacy Policy</Text>.
          </Text>

          {/* Login link */}
          <View style={s.switchRow}>
            <Text style={[s.switchText, { color: '#6B7280' }]}>Already have an account?</Text>
            <Pressable onPress={() => router.replace('/login')}>
              <Text style={[s.switchLink, { color: PRIMARY }]}>Log in</Text>
            </Pressable>
          </View>

          {/* Security footer */}
          <View style={s.secureRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#9CA3AF" />
            <Text style={s.secureText}>Secure sign up  •  Your data is safe with us</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1 },
  flex:   { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },

  appHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  appHeaderLeft:{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logoImage:    { width: 120, height: 120 / (2141 / 576) },
  backBtn:      { width: 34, height: 34, borderRadius: 10, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },

  tabBar:      { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 20, gap: 2 },
  tabBtn:      { flex: 1, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  tabBtnActive:{ backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  tabBtnText:  { fontSize: 14, fontFamily: F.medium },

  headingWrap: { marginBottom: 22, gap: 6 },
  heading:     { fontSize: 20, fontWeight: '700', fontFamily: F.bold },
  headingSub:  { fontSize: 13, color: '#6B7280', fontFamily: F.regular, lineHeight: 19 },

  sectionLabel: { fontSize: 13, fontWeight: '600', fontFamily: F.semibold, marginBottom: 10 },

  roleRow:     { flexDirection: 'row', gap: 12, marginBottom: 22 },
  roleCard:    { flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 8, alignItems: 'center' },
  roleIconBox: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  roleIconBadge:{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center' },
  roleLabel:   { fontSize: 13, fontWeight: '700', fontFamily: F.bold, textAlign: 'center' },
  roleSub:     { fontSize: 11, color: '#6B7280', fontFamily: F.regular, textAlign: 'center', lineHeight: 15 },

  form:     { gap: 14, marginBottom: 4 },
  fieldWrap:    { gap: 6 },
  fieldLabel:   { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  field:        { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 50, gap: 10 },
  fieldIcon:    { flexShrink: 0 },
  fieldInput:   { flex: 1, fontSize: 15, fontFamily: F.regular },
  eyeBtn:       { padding: 2 },
  fieldError:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldErrorText:{ fontSize: 12, color: '#EF4444', fontFamily: F.medium },
  domainSuggestBox:      { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden' },
  domainSuggestItem:     { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  domainSuggestText:     { fontSize: 14, fontFamily: F.regular, color: '#6B7280' },
  domainSuggestTextBold: { fontFamily: F.semibold, color: '#374151' },

  rulesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  rulePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  ruleText: { fontSize: 11, fontFamily: F.medium },

  passwordHint: { fontSize: 11, color: '#9CA3AF', fontFamily: F.regular, marginTop: -6 },

  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3' },
  errorText:   { fontSize: 13, color: '#EF4444', flex: 1, fontFamily: F.medium },

  primaryBtn:     { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 18, marginBottom: 20 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: F.bold },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 12, color: '#9CA3AF', fontFamily: F.regular },

  socialBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50, borderRadius: 12, borderWidth: 1.5, marginBottom: 16 },
  googleBadge:   { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center' },
  googleG:       { color: '#fff', fontSize: 12, fontWeight: '900', fontFamily: F.bold },
  socialBtnText: { fontSize: 15, fontFamily: F.semibold },

  terms: { fontSize: 12, color: '#9CA3AF', lineHeight: 18, textAlign: 'center', fontFamily: F.regular, marginBottom: 16 },

  switchRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginBottom: 16 },
  switchText: { fontSize: 14, fontFamily: F.regular },
  switchLink: { fontSize: 14, fontFamily: F.bold, fontWeight: '700' },

  secureRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  secureText: { fontSize: 11, color: '#9CA3AF', fontFamily: F.regular },
});
