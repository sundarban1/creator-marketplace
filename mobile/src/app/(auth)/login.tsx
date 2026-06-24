import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, useEffect } from 'react';
import {
  Animated,
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
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { authService } from '@/services/auth';
import type { Lang } from '@/i18n';
import { F } from '@/utilities/constants';

const LANG_OPTIONS: { lang: Lang; flag: string }[] = [
  { lang: 'en', flag: '🇬🇧' },
  { lang: 'ne', flag: '🇳🇵' },
];

const P = '#5B21B6';

const ROLES = [
  { key: 'CREATOR' as const,  label: 'Content Creator',  sub: 'I create content',        icon: 'camera-outline'    as const },
  { key: 'BUSINESS' as const, label: 'Brand / Business',  sub: 'I represent a brand',     icon: 'briefcase-outline' as const },
];

const PW_RULES = [
  { test: (p: string) => p.length >= 8,   label: '8+ chars'  },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Uppercase' },
  { test: (p: string) => /[0-9]/.test(p), label: 'Number'    },
];

function isValidEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
function pwError(p: string): string | undefined {
  if (p.length < 8)     return 'At least 8 characters required.';
  if (!/[A-Z]/.test(p)) return 'Add at least one uppercase letter.';
  if (!/[0-9]/.test(p)) return 'Add at least one number.';
}

// ── Shared input field ────────────────────────────────────────────────────────

function Field({
  icon, label, value, onChangeText, placeholder,
  secureTextEntry = false, keyboardType = 'default',
  autoCapitalize = 'none', error, rightSlot,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  error?: string;
  rightSlot?: React.ReactNode;
}) {
  const C = useAppColors();
  const [focused, setFocused] = useState(false);
  const [hidden,  setHidden]  = useState(secureTextEntry);
  const anim   = useRef(new Animated.Value(0)).current;
  const border = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [error ? '#FECACA' : '#E5E7EB', error ? '#EF4444' : P],
  });

  return (
    <View style={s.fieldWrap}>
      <View style={s.fieldLabelRow}>
        <Text style={[s.fieldLabel, { color: C.text }]}>{label}</Text>
        {rightSlot}
      </View>
      <Animated.View style={[s.field, { borderColor: border, backgroundColor: C.surface }]}>
        <Ionicons name={icon} size={17} color={focused ? P : '#9CA3AF'} style={s.fieldIcon} />
        <TextInput
          style={[s.fieldInput, { color: C.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => { setFocused(true);  Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: false }).start(); }}
          onBlur={()  => { setFocused(false); Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: false }).start(); }}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setHidden(h => !h)} hitSlop={8} style={s.eyeBtn}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={17} color="#9CA3AF" />
          </Pressable>
        )}
      </Animated.View>
      {!!error && (
        <View style={s.fieldErrRow}>
          <Ionicons name="alert-circle-outline" size={12} color="#EF4444" />
          <Text style={s.fieldErrText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────

function LoginForm({ verified }: { verified?: string }) {
  const { login } = useAuth();
  const { t }     = useLanguage();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleLogin() {
    if (!email || !password) { setError(t('auth.login.requiredError')); return; }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('auth.login.requiredError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      {verified === '1' && (
        <View style={[s.banner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <Ionicons name="checkmark-circle" size={15} color="#15803D" />
          <Text style={[s.bannerText, { color: '#15803D' }]}>Account verified! You can sign in now.</Text>
        </View>
      )}
      {!!error && (
        <View style={[s.banner, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
          <Ionicons name="alert-circle" size={15} color="#EF4444" />
          <Text style={[s.bannerText, { color: '#EF4444' }]}>{error}</Text>
        </View>
      )}
      <View style={s.form}>
        <Field icon="mail-outline" label="Email address" value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" />
        <Field
          icon="lock-closed-outline" label="Password" value={password} onChangeText={setPassword}
          placeholder="Enter your password" secureTextEntry
          rightSlot={
            <Pressable onPress={() => router.push('/forgot-password')}>
              <Text style={[s.forgotText, { color: P }]}>Forgot password?</Text>
            </Pressable>
          }
        />
      </View>
      <Pressable
        onPress={handleLogin} disabled={loading}
        style={({ pressed }) => [s.primaryBtn, { backgroundColor: P, opacity: pressed ? 0.88 : 1 }]}>
        {loading ? <Ionicons name="sync" size={18} color="#fff" /> : <Text style={s.primaryBtnText}>Log in</Text>}
      </Pressable>
      <View style={s.divider}>
        <View style={[s.dividerLine, { backgroundColor: '#E5E7EB' }]} />
        <Text style={s.dividerText}>or continue with</Text>
        <View style={[s.dividerLine, { backgroundColor: '#E5E7EB' }]} />
      </View>
      <Pressable style={[s.socialBtn, { borderColor: '#E5E7EB' }]} onPress={() => setError('Google sign-in is not available yet.')}>
        <View style={s.googleBadge}><Text style={s.googleG}>G</Text></View>
        <Text style={s.socialBtnText}>Continue with Google</Text>
      </Pressable>
    </View>
  );
}

// ── Create Account form ───────────────────────────────────────────────────────

function SignupForm() {
  const C = useAppColors();

  const [role,      setRole]      = useState<'CREATOR' | 'BUSINESS'>('CREATOR');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const emErr = submitted && !isValidEmail(email)    ? 'Enter a valid email address' : undefined;
  const pwErr = submitted ? pwError(password)        : undefined;

  async function handleCreate() {
    setSubmitted(true);
    setError('');
    if (!isValidEmail(email) || pwError(password)) return;
    setLoading(true);
    try {
      await authService.register({ email: email.trim().toLowerCase(), password, role });
      router.push({ pathname: '/verify', params: { email: email.trim().toLowerCase() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      {/* Role selector */}
      <Text style={[s.sectionLabel, { color: C.text }]}>I'm joining as</Text>
      <View style={s.roleRow}>
        {ROLES.map((r) => {
          const active = role === r.key;
          return (
            <Pressable
              key={r.key}
              style={[s.roleCard, { borderColor: active ? P : '#E5E7EB', backgroundColor: C.surface }, active && { borderWidth: 2 }]}
              onPress={() => { setRole(r.key); setSubmitted(false); setError(''); }}>
              <View style={[s.roleIconBox, { backgroundColor: active ? `${P}12` : '#F9FAFB' }]}>
                <Ionicons name={r.icon} size={24} color={active ? P : '#9CA3AF'} />
              </View>
              <Text style={[s.roleLabel, { color: active ? P : C.text }]}>{r.label}</Text>
              <Text style={[s.roleSub, { color: '#6B7280' }]}>{r.sub}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Fields */}
      <View style={s.form}>
        <Field icon="mail-outline" label="Email address" value={email} onChangeText={(v) => { setEmail(v); setError(''); }} placeholder="you@email.com" keyboardType="email-address" error={emErr} />
        <Field icon="lock-closed-outline" label="Password" value={password} onChangeText={(v) => { setPassword(v); setError(''); }} placeholder="Create a password" secureTextEntry error={pwErr} />
        {password.length > 0 && (
          <View style={s.rulesRow}>
            {PW_RULES.map((rule) => {
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
      </View>

      {!!error && (
        <View style={[s.banner, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
          <Ionicons name="alert-circle" size={15} color="#EF4444" />
          <Text style={[s.bannerText, { color: '#EF4444' }]}>{error}</Text>
        </View>
      )}

      <Pressable
        onPress={handleCreate} disabled={loading}
        style={({ pressed }) => [s.primaryBtn, { backgroundColor: P, opacity: pressed ? 0.88 : 1 }]}>
        {loading ? <Ionicons name="sync" size={18} color="#fff" /> : <Text style={s.primaryBtnText}>Sign up</Text>}
      </Pressable>

      <View style={s.divider}>
        <View style={[s.dividerLine, { backgroundColor: '#E5E7EB' }]} />
        <Text style={s.dividerText}>or continue with</Text>
        <View style={[s.dividerLine, { backgroundColor: '#E5E7EB' }]} />
      </View>
      <Pressable style={[s.socialBtn, { borderColor: '#E5E7EB' }]} onPress={() => setError('Google sign-in is not available yet.')}>
        <View style={s.googleBadge}><Text style={s.googleG}>G</Text></View>
        <Text style={s.socialBtnText}>Continue with Google</Text>
      </Pressable>

      <Text style={s.terms}>
        By signing up you agree to our{' '}
        <Text style={{ color: P, fontFamily: F.semibold }} onPress={() => router.push('/legal?type=terms' as never)}>Terms</Text>
        {' '}and{' '}
        <Text style={{ color: P, fontFamily: F.semibold }} onPress={() => router.push('/legal?type=privacy-policy' as never)}>Privacy Policy</Text>.
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { user }                  = useAuth();
  const { language, setLanguage } = useLanguage();
  const C                         = useAppColors();
  const params                    = useLocalSearchParams<{ tab?: string; verified?: string }>();
  const [tab, setTab]             = useState<'login' | 'signup'>(params.tab === 'signup' ? 'signup' : 'login');

  useEffect(() => {
    if (user) router.replace((user.role === 'CREATOR' ? '/(creator)/' : '/(business)/') as never);
  }, [user]);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* App header */}
          <View style={s.appHeader}>
            <View style={s.appHeaderLeft}>
              <LinearGradient colors={['#7C3AED', P]} style={s.logoBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name="people" size={18} color="#fff" />
              </LinearGradient>
              <View>
                <Text style={[s.appName, { color: C.text }]}>CreatorMarket</Text>
                <Text style={[s.appTagline, { color: '#9CA3AF' }]}>Where creators and brands grow together</Text>
              </View>
            </View>
            <View style={s.langRow}>
              {LANG_OPTIONS.map(({ lang, flag }) => (
                <Pressable key={lang} style={[s.langBtn, { borderColor: '#E5E7EB' }, language === lang && { borderColor: P, backgroundColor: `${P}10` }]} onPress={() => setLanguage(lang)}>
                  <Text style={s.langFlag}>{flag}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Heading */}
          <View style={s.headingWrap}>
            <Text style={[s.heading, { color: C.text }]}>
              {tab === 'login' ? 'Welcome back 👋' : 'Create your account ✨'}
            </Text>
            <Text style={[s.headingSub, { color: '#6B7280' }]}>
              {tab === 'login'
                ? 'Log in and continue collaborating and growing.'
                : 'Join thousands of creators and brands.'}
            </Text>
          </View>

          {/* Tab bar */}
          <View style={[s.tabBar, { backgroundColor: '#F3F4F6' }]}>
            {(['login', 'signup'] as const).map((t) => (
              <Pressable key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
                <Text style={[s.tabBtnText, { color: tab === t ? P : '#6B7280' }, tab === t && { fontFamily: F.bold }]}>
                  {t === 'login' ? 'Log in' : 'Create Account'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Content */}
          {tab === 'login' ? <LoginForm verified={params.verified} /> : <SignupForm />}

          {/* Security footer */}
          <View style={s.secureRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color="#9CA3AF" />
            <Text style={s.secureText}>Secure  •  Your data is safe with us</Text>
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

  appHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  appHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox:       { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  appName:       { fontSize: 15, fontWeight: '700', fontFamily: F.bold },
  appTagline:    { fontSize: 10, fontFamily: F.regular, marginTop: 1 },
  langRow:       { flexDirection: 'row', gap: 6 },
  langBtn:       { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  langFlag:      { fontSize: 14 },

  headingWrap: { marginBottom: 20, gap: 4 },
  heading:     { fontSize: 24, fontWeight: '800', fontFamily: F.extrabold },
  headingSub:  { fontSize: 13, fontFamily: F.regular, lineHeight: 19 },

  tabBar:      { flexDirection: 'row', borderRadius: 14, padding: 4, marginBottom: 20, gap: 2 },
  tabBtn:      { flex: 1, height: 40, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  tabBtnActive:{ backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  tabBtnText:  { fontSize: 14, fontFamily: F.medium },

  banner:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 16 },
  bannerText: { fontSize: 13, flex: 1, fontFamily: F.medium },

  form:          { gap: 14, marginBottom: 16 },
  fieldWrap:     { gap: 5 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel:    { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  forgotText:    { fontSize: 13, fontFamily: F.semibold },
  field:         { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 50, gap: 10 },
  fieldIcon:     { flexShrink: 0 },
  fieldInput:    { flex: 1, fontSize: 15, fontFamily: F.regular },
  eyeBtn:        { padding: 2 },
  fieldErrRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldErrText:  { fontSize: 11, color: '#EF4444', fontFamily: F.medium },

  sectionLabel: { fontSize: 13, fontWeight: '600', fontFamily: F.semibold, marginBottom: 10 },
  roleRow:      { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleCard:     { flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 8, alignItems: 'center' },
  roleIconBox:  { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  roleLabel:    { fontSize: 13, fontWeight: '700', fontFamily: F.bold, textAlign: 'center' },
  roleSub:      { fontSize: 11, color: '#6B7280', fontFamily: F.regular, textAlign: 'center', lineHeight: 15 },

  rulesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: -4 },
  rulePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  ruleText: { fontSize: 11, fontFamily: F.medium },

  primaryBtn:     { height: 52, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: F.bold },

  divider:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 12, color: '#9CA3AF', fontFamily: F.regular },

  socialBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50, borderRadius: 12, borderWidth: 1.5, marginBottom: 8 },
  googleBadge:   { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center' },
  googleG:       { color: '#fff', fontSize: 12, fontWeight: '900', fontFamily: F.extrabold },
  socialBtnText: { fontSize: 15, fontFamily: F.semibold },

  terms:      { fontSize: 12, color: '#9CA3AF', lineHeight: 18, textAlign: 'center', fontFamily: F.regular, marginBottom: 8 },

  secureRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 16 },
  secureText: { fontSize: 11, color: '#9CA3AF', fontFamily: F.regular },
});
