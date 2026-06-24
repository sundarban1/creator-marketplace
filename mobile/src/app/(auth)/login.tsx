import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, useEffect } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { authService } from '@/services/auth';
import type { Lang } from '@/i18n';
import { F } from '@/utilities/constants';

WebBrowser.maybeCompleteAuthSession();

const LANG_OPTIONS: { lang: Lang; flag: string }[] = [
  { lang: 'en', flag: '🇬🇧' },
  { lang: 'ne', flag: '🇳🇵' },
];

const P1 = '#4C1D95';
const P2 = '#6D28D9';
const P3 = '#7C3AED';

const ROLES = [
  { key: 'CREATOR'  as const, label: 'Content Creator', sub: 'Influencer & creator', icon: 'camera-outline'    as const, grad: ['#8B5CF6', '#6D28D9'] as const },
  { key: 'BUSINESS' as const, label: 'Brand / Business', sub: 'Company & brand',     icon: 'briefcase-outline' as const, grad: ['#2563EB', '#1D4ED8'] as const },
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

// ── Input field ───────────────────────────────────────────────────────────────

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
  const shadow = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const border = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [error ? '#FECACA' : '#E8E0F8', error ? '#EF4444' : P2],
  });

  return (
    <View style={s.fieldWrap}>
      <View style={s.fieldLabelRow}>
        <Text style={[s.fieldLabel, { color: C.text }]}>{label}</Text>
        {rightSlot}
      </View>
      <Animated.View style={[
        s.field,
        { borderColor: border, backgroundColor: focused ? '#FAFAFE' : C.surface },
        focused && s.fieldFocused,
      ]}>
        <View style={[s.fieldIconWrap, { backgroundColor: focused ? `${P2}15` : '#F3F4F6' }]}>
          <Ionicons name={icon} size={16} color={focused ? P2 : '#9CA3AF'} />
        </View>
        <TextInput
          style={[s.fieldInput, { color: C.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#C4B5FD"
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          onFocus={() => { setFocused(true);  Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }).start(); }}
          onBlur={()  => { setFocused(false); Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start(); }}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setHidden(h => !h)} hitSlop={10} style={s.eyeBtn}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={focused ? P2 : '#9CA3AF'} />
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

function LoginForm({ verified, onGooglePress, googleLoading, googleError }: {
  verified?: string;
  onGooglePress: () => void;
  googleLoading: boolean;
  googleError: string;
}) {
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
        <Field
          icon="mail-outline" label="Email address" value={email} onChangeText={setEmail}
          placeholder="you@email.com" keyboardType="email-address"
        />
        <Field
          icon="lock-closed-outline" label="Password" value={password} onChangeText={setPassword}
          placeholder="Enter your password" secureTextEntry
          rightSlot={
            <Pressable onPress={() => router.push('/forgot-password')}>
              <Text style={[s.forgotText, { color: P2 }]}>Forgot password?</Text>
            </Pressable>
          }
        />
      </View>

      <Pressable
        onPress={handleLogin} disabled={loading}
        style={({ pressed }) => [s.primaryBtnWrap, { opacity: pressed ? 0.9 : 1 }]}>
        <LinearGradient colors={[P3, P1]} style={s.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {loading
            ? <Ionicons name="sync" size={18} color="#fff" />
            : <>
                <Text style={s.primaryBtnText}>Log in</Text>
                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
              </>}
        </LinearGradient>
      </Pressable>

      <View style={s.divider}>
        <View style={[s.dividerLine, { backgroundColor: '#EDE9FE' }]} />
        <Text style={s.dividerText}>or</Text>
        <View style={[s.dividerLine, { backgroundColor: '#EDE9FE' }]} />
      </View>

      <Pressable
        style={[s.googleBtn, googleLoading && { opacity: 0.6 }]}
        onPress={onGooglePress}
        disabled={googleLoading}>
        {googleLoading
          ? <><View style={s.spinner} /><Text style={s.googleBtnText}>Signing in…</Text></>
          : <><View style={s.googleBadge}><Text style={s.googleG}>G</Text></View><Text style={s.googleBtnText}>Continue with Google</Text></>}
      </Pressable>
      {!!googleError && (
        <View style={[s.banner, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
          <Ionicons name="alert-circle" size={15} color="#EF4444" />
          <Text style={[s.bannerText, { color: '#EF4444' }]}>{googleError}</Text>
        </View>
      )}
    </View>
  );
}

// ── Create Account form ───────────────────────────────────────────────────────

function SignupForm({ onGooglePress, googleLoading, googleError }: {
  onGooglePress: () => void;
  googleLoading: boolean;
  googleError: string;
}) {
  const C = useAppColors();

  const [role,      setRole]      = useState<'CREATOR' | 'BUSINESS'>('CREATOR');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const emErr = submitted && !isValidEmail(email)  ? 'Enter a valid email address' : undefined;
  const pwErr = submitted ? pwError(password)      : undefined;

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
      {/* Role cards */}
      <Text style={[s.sectionLabel, { color: C.text }]}>I'm joining as</Text>
      <View style={s.roleRow}>
        {ROLES.map((r) => {
          const active = role === r.key;
          return (
            <Pressable
              key={r.key}
              style={[s.roleCard, { borderColor: active ? P2 : '#EDE9FE', backgroundColor: active ? `${P2}08` : C.surface }, active && s.roleCardActive]}
              onPress={() => { setRole(r.key); setSubmitted(false); setError(''); }}>
              <LinearGradient
                colors={active ? r.grad : ['#F5F3FF', '#EDE9FE']}
                style={s.roleIconBox}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Ionicons name={r.icon} size={22} color={active ? '#fff' : '#8B5CF6'} />
              </LinearGradient>
              <Text style={[s.roleLabel, { color: active ? P1 : C.text }]}>{r.label}</Text>
              <Text style={[s.roleSub, { color: active ? P2 : '#9CA3AF' }]}>{r.sub}</Text>
              {active && (
                <View style={s.roleCheck}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Fields */}
      <View style={s.form}>
        <Field
          icon="mail-outline" label="Email address" value={email}
          onChangeText={(v) => { setEmail(v); setError(''); }}
          placeholder="you@email.com" keyboardType="email-address" error={emErr}
        />
        <Field
          icon="lock-closed-outline" label="Password" value={password}
          onChangeText={(v) => { setPassword(v); setError(''); }}
          placeholder="Create a strong password" secureTextEntry error={pwErr}
        />
        {password.length > 0 && (
          <View style={s.rulesRow}>
            {PW_RULES.map((rule) => {
              const ok = rule.test(password);
              return (
                <View key={rule.label} style={[s.rulePill, { backgroundColor: ok ? '#F0FDF4' : '#F5F3FF', borderColor: ok ? '#86EFAC' : '#DDD6FE' }]}>
                  <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={11} color={ok ? '#16A34A' : '#A78BFA'} />
                  <Text style={[s.ruleText, { color: ok ? '#16A34A' : '#8B5CF6' }]}>{rule.label}</Text>
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
        style={({ pressed }) => [s.primaryBtnWrap, { opacity: pressed ? 0.9 : 1 }]}>
        <LinearGradient colors={[P3, P1]} style={s.primaryBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {loading
            ? <Ionicons name="sync" size={18} color="#fff" />
            : <>
                <Text style={s.primaryBtnText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
              </>}
        </LinearGradient>
      </Pressable>

      <View style={s.divider}>
        <View style={[s.dividerLine, { backgroundColor: '#EDE9FE' }]} />
        <Text style={s.dividerText}>or</Text>
        <View style={[s.dividerLine, { backgroundColor: '#EDE9FE' }]} />
      </View>

      <Pressable
        style={[s.googleBtn, googleLoading && { opacity: 0.6 }]}
        onPress={onGooglePress}
        disabled={googleLoading}>
        {googleLoading
          ? <><View style={s.spinner} /><Text style={s.googleBtnText}>Signing in…</Text></>
          : <><View style={s.googleBadge}><Text style={s.googleG}>G</Text></View><Text style={s.googleBtnText}>Continue with Google</Text></>}
      </Pressable>
      {!!googleError && (
        <View style={[s.banner, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
          <Ionicons name="alert-circle" size={15} color="#EF4444" />
          <Text style={[s.bannerText, { color: '#EF4444' }]}>{googleError}</Text>
        </View>
      )}

      <Text style={s.terms}>
        By creating an account you agree to our{' '}
        <Text style={{ color: P2, fontFamily: F.semibold }} onPress={() => router.push('/legal?type=terms' as never)}>Terms</Text>
        {' '}and{' '}
        <Text style={{ color: P2, fontFamily: F.semibold }} onPress={() => router.push('/legal?type=privacy-policy' as never)}>Privacy Policy</Text>.
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { user, reloadUser }      = useAuth();
  const { language, setLanguage } = useLanguage();
  const params                    = useLocalSearchParams<{ tab?: string; verified?: string }>();
  const insets                    = useSafeAreaInsets();
  const [tab, setTab]             = useState<'login' | 'signup'>(params.tab === 'signup' ? 'signup' : 'login');

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError,   setGoogleError]   = useState('');
  const [roleModal,     setRoleModal]     = useState(false);
  const [pendingToken,  setPendingToken]  = useState('');

  // Fallback to 'unset' prevents the hook crashing with "undefined" — we guard in handleGooglePress
  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId:        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? 'unset',
    webClientId:     process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? 'unset',
    iosClientId:     process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     ?? 'unset',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? 'unset',
  });

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === 'success' && googleResponse.authentication?.accessToken) {
      void handleGoogleToken(googleResponse.authentication.accessToken);
    } else if (googleResponse.type === 'error') {
      setGoogleError('Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    } else if (googleResponse.type === 'dismiss' || googleResponse.type === 'cancel') {
      setGoogleLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleResponse]);

  async function handleGoogleToken(accessToken: string, role?: 'CREATOR' | 'BUSINESS') {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const result = await authService.googleAuth({ accessToken, role });
      if (result.needsRole) {
        setPendingToken(accessToken);
        setRoleModal(true);
        setGoogleLoading(false);
        return;
      }
      await reloadUser();
    } catch (e) {
      setGoogleError(e instanceof Error ? e.message : 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  }

  function handleGooglePress() {
    const iosId     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    const androidId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    const webId     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    if (Platform.OS === 'ios' && !iosId) {
      setGoogleError('iOS Google Sign-In needs EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID. Create an iOS OAuth client in Google Cloud Console (Bundle ID: com.sundarban.content).');
      return;
    }
    if (Platform.OS === 'android' && !androidId) {
      setGoogleError('Android Google Sign-In needs EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID. Create an Android OAuth client in Google Cloud Console.');
      return;
    }
    if (!webId) {
      setGoogleError('Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to .env.');
      return;
    }
    setGoogleLoading(true);
    setGoogleError('');
    void googlePromptAsync();
  }

  async function handleRoleSelect(selectedRole: 'CREATOR' | 'BUSINESS') {
    setRoleModal(false);
    await handleGoogleToken(pendingToken, selectedRole);
  }

  useEffect(() => {
    if (user) router.replace((user.role === 'CREATOR' ? '/(creator)/' : '/(business)/') as never);
  }, [user]);

  return (
    <View style={[s.root, { backgroundColor: P1 }]}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Gradient hero ── */}
        <LinearGradient colors={[P3, P2, P1]} style={[s.hero, { paddingTop: insets.top + 12 }]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>
          {/* Decorative blobs */}
          <View style={s.blob1} />
          <View style={s.blob2} />
          <View style={s.blob3} />

          {/* Top row: logo + lang */}
          <View style={s.heroTop}>
            <View style={s.logoRow}>
              <View style={s.logoBadge}>
                <Ionicons name="people" size={16} color="#fff" />
              </View>
              <Text style={s.logoText}>CreatorMarket</Text>
            </View>
            <View style={s.langRow}>
              {LANG_OPTIONS.map(({ lang, flag }) => (
                <Pressable
                  key={lang}
                  style={[s.langBtn, language === lang && s.langBtnActive]}
                  onPress={() => setLanguage(lang)}>
                  <Text style={s.langFlag}>{flag}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Hero heading */}
          <View style={s.heroBody}>
            <Text style={s.heroTitle}>
              {tab === 'login' ? 'Welcome back 👋' : 'Join CreatorMarket ✨'}
            </Text>
            <Text style={s.heroSub}>
              {tab === 'login'
                ? 'Sign in and continue growing with creators and brands.'
                : 'Connect with brands, grow your audience, get paid.'}
            </Text>
          </View>
        </LinearGradient>

        {/* ── White card ── */}
        <View style={s.card}>
          <ScrollView
            contentContainerStyle={[s.cardScroll, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Tab bar */}
            <View style={s.tabBar}>
              {(['login', 'signup'] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[s.tabBtn, tab === t && s.tabBtnActive]}
                  onPress={() => setTab(t)}>
                  {tab === t && (
                    <LinearGradient colors={[P3, P1]} style={s.tabBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                  )}
                  <Text style={[s.tabBtnText, { color: tab === t ? '#fff' : '#6B7280' }]}>
                    {t === 'login' ? 'Log in' : 'Create Account'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Form */}
            {tab === 'login'
              ? <LoginForm verified={params.verified} onGooglePress={handleGooglePress} googleLoading={googleLoading} googleError={googleError} />
              : <SignupForm onGooglePress={handleGooglePress} googleLoading={googleLoading} googleError={googleError} />}

            {/* Footer */}
            <View style={s.footer}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#A78BFA" />
              <Text style={s.footerText}>Secure & encrypted  •  We never share your data</Text>
            </View>

          </ScrollView>
        </View>

      </KeyboardAvoidingView>

      {/* Role selection modal — shown for new Google users */}
      <Modal visible={roleModal} transparent animationType="slide" onRequestClose={() => setRoleModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>One quick step ✨</Text>
            <Text style={s.modalSub}>How will you use CreatorMarket?</Text>
            <View style={s.roleRow}>
              {ROLES.map((r) => (
                <Pressable
                  key={r.key}
                  style={s.roleCard}
                  onPress={() => void handleRoleSelect(r.key)}>
                  <LinearGradient colors={r.grad} style={s.roleIconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name={r.icon} size={24} color="#fff" />
                  </LinearGradient>
                  <Text style={s.roleLabel}>{r.label}</Text>
                  <Text style={s.roleSub}>{r.sub}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable style={s.modalCancel} onPress={() => setRoleModal(false)}>
              <Text style={s.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },

  // Hero
  hero:    { paddingHorizontal: 24, paddingBottom: 52, overflow: 'hidden' },
  blob1:   { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -60 },
  blob2:   { position: 'absolute', width: 160, height: 160, borderRadius: 80,  backgroundColor: 'rgba(255,255,255,0.05)', bottom: 20, left: -50 },
  blob3:   { position: 'absolute', width: 100, height: 100, borderRadius: 50,  backgroundColor: 'rgba(255,255,255,0.04)', top: 40, left: 80 },

  heroTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  logoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge:{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  logoText: { fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: F.bold },
  langRow:  { flexDirection: 'row', gap: 6 },
  langBtn:  { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  langBtnActive: { backgroundColor: 'rgba(255,255,255,0.28)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  langFlag: { fontSize: 15 },

  heroBody:  { gap: 8 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', fontFamily: F.extrabold, lineHeight: 34 },
  heroSub:   { fontSize: 14, color: 'rgba(255,255,255,0.72)', fontFamily: F.regular, lineHeight: 20 },

  // Card
  card:       { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, marginTop: -28, overflow: 'hidden' },
  cardScroll: { paddingHorizontal: 24, paddingTop: 28 },

  // Tab bar
  tabBar:       { flexDirection: 'row', backgroundColor: '#F5F3FF', borderRadius: 14, padding: 4, marginBottom: 24, gap: 2 },
  tabBtn:       { flex: 1, height: 42, borderRadius: 11, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  tabBtnActive: { shadowColor: P1, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  tabBtnGrad:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 11 },
  tabBtnText:   { fontSize: 14, fontFamily: F.semibold, zIndex: 1 },

  // Banners
  banner:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  bannerText: { fontSize: 13, flex: 1, fontFamily: F.medium },

  // Form
  form:          { gap: 16, marginBottom: 20 },
  fieldWrap:     { gap: 6 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel:    { fontSize: 13, fontWeight: '600', fontFamily: F.semibold, color: '#374151' },
  forgotText:    { fontSize: 12, fontFamily: F.semibold, color: P2 },
  field:         { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 4, height: 52, gap: 4, borderColor: '#E8E0F8' },
  fieldFocused:  { shadowColor: P2, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  fieldIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  fieldInput:    { flex: 1, fontSize: 15, fontFamily: F.regular, color: '#111827' },
  eyeBtn:        { paddingHorizontal: 12 },
  fieldErrRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldErrText:  { fontSize: 11, color: '#EF4444', fontFamily: F.medium },

  // Role cards
  sectionLabel:  { fontSize: 13, fontWeight: '600', fontFamily: F.semibold, color: '#374151', marginBottom: 12 },
  roleRow:       { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleCard:      { flex: 1, borderRadius: 18, borderWidth: 1.5, padding: 16, gap: 8, alignItems: 'center', position: 'relative' },
  roleCardActive:{ shadowColor: P2, shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  roleIconBox:   { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  roleLabel:     { fontSize: 13, fontWeight: '700', fontFamily: F.bold, textAlign: 'center' },
  roleSub:       { fontSize: 11, fontFamily: F.regular, textAlign: 'center', lineHeight: 15 },
  roleCheck:     { position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: 10, backgroundColor: P2, justifyContent: 'center', alignItems: 'center' },

  // Password rules
  rulesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: -8 },
  rulePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  ruleText: { fontSize: 11, fontFamily: F.medium },

  // Button
  primaryBtnWrap: { borderRadius: 14, marginBottom: 20, shadowColor: P1, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  primaryBtn:     { height: 54, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: F.bold, letterSpacing: 0.3 },

  // Divider
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, color: '#A78BFA', fontFamily: F.medium },

  // Google
  googleBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: '#DDD6FE', backgroundColor: '#FAFAFE', marginBottom: 12 },
  googleBadge:   { width: 24, height: 24, borderRadius: 12, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center' },
  googleG:       { color: '#fff', fontSize: 13, fontWeight: '900', fontFamily: F.extrabold },
  googleBtnText: { fontSize: 15, fontFamily: F.semibold, color: '#374151' },
  spinner:       { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#DDD6FE', borderTopColor: P2 },

  // Role modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:      { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36, gap: 4 },
  modalHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD6FE', alignSelf: 'center', marginBottom: 20 },
  modalTitle:      { fontSize: 22, fontWeight: '800', fontFamily: F.extrabold, color: P1, textAlign: 'center' },
  modalSub:        { fontSize: 14, fontFamily: F.regular, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  modalCancel:     { marginTop: 16, alignItems: 'center', padding: 12 },
  modalCancelText: { fontSize: 15, fontFamily: F.semibold, color: '#9CA3AF' },

  terms:  { fontSize: 12, color: '#9CA3AF', lineHeight: 18, textAlign: 'center', fontFamily: F.regular, marginBottom: 8 },

  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 12 },
  footerText: { fontSize: 11, color: '#A78BFA', fontFamily: F.regular },
});
