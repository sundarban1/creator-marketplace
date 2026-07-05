import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Image,
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
import * as Facebook from 'expo-auth-session/providers/facebook';
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

// Decorative background icons scattered across the hero — purely visual, low-opacity texture
const BG_ICONS: { name: string; size: number; rotate: string; style: object }[] = [
  { name: 'camera',       size: 32, rotate: '-14deg', style: { top: 6,   left: '8%'  } },
  { name: 'dollar-sign',  size: 24, rotate: '12deg',  style: { top: 2,   right: '30%' } },
  { name: 'mobile-alt',   size: 28, rotate: '-8deg',  style: { top: 118, left: '4%'  } },
  { name: 'laptop',       size: 34, rotate: '9deg',   style: { top: 140, right: '6%' } },
  { name: 'hashtag',      size: 20, rotate: '-6deg',  style: { top: 54,  left: '44%' } },
  { name: 'video',        size: 22, rotate: '15deg',  style: { top: 190, left: '38%' } },
  { name: 'chart-line',   size: 20, rotate: '-10deg', style: { top: 30,  right: '4%' } },
  { name: 'heart',        size: 18, rotate: '10deg',  style: { top: 210, right: '22%' } },
];

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
const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com'];
function getPwErrorKey(p: string): string | undefined {
  if (p.length < 8)     return 'auth.signup.pwError8Chars';
  if (!/[A-Z]/.test(p)) return 'auth.signup.pwErrorUppercase';
  if (!/[0-9]/.test(p)) return 'auth.signup.pwErrorNumber';
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
          onBlur={()  => { setTimeout(() => { setFocused(false); Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start(); }, 150); }}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setHidden(h => !h)} hitSlop={10} style={s.eyeBtn}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={focused ? P2 : '#9CA3AF'} />
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
          <View style={s.domainSuggestBox}>
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
        <View style={s.fieldErrRow}>
          <Ionicons name="alert-circle-outline" size={12} color="#EF4444" />
          <Text style={s.fieldErrText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────

function LoginForm({ verified, onGooglePress, googleLoading, googleError, onFacebookPress, facebookLoading, facebookError }: {
  verified?: string;
  onGooglePress: () => void;
  googleLoading: boolean;
  googleError: string;
  onFacebookPress: () => void;
  facebookLoading: boolean;
  facebookError: string;
}) {
  const { login } = useAuth();
  const { t }     = useLanguage();

  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [apiError,  setApiError]  = useState('');

  const emErr = submitted && !isValidEmail(email) ? t('auth.login.emailInvalid') : undefined;
  const pwErr = submitted && !password ? t('auth.login.passwordRequired') : undefined;

  async function handleLogin() {
    setSubmitted(true);
    if (!isValidEmail(email) || !password) return;
    setApiError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : t('auth.login.requiredError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      {verified === '1' && (
        <View style={[s.banner, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <Ionicons name="checkmark-circle" size={15} color="#15803D" />
          <Text style={[s.bannerText, { color: '#15803D' }]}>{t('auth.login.verifiedBanner')}</Text>
        </View>
      )}
      {!!apiError && (
        <View style={[s.banner, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
          <Ionicons name="alert-circle" size={15} color="#EF4444" />
          <Text style={[s.bannerText, { color: '#EF4444' }]}>{apiError}</Text>
        </View>
      )}

      <View style={s.form}>
        <Field
          icon="mail-outline" label={t('auth.login.emailLabel')} value={email}
          onChangeText={(v) => { setEmail(v); setApiError(''); }}
          placeholder={t('auth.login.emailInputPlaceholder')} keyboardType="email-address" error={emErr}
        />
        <Field
          icon="lock-closed-outline" label={t('auth.login.password')} value={password}
          onChangeText={(v) => { setPassword(v); setApiError(''); }}
          placeholder={t('auth.login.passwordEnterPlaceholder')} secureTextEntry error={pwErr}
          rightSlot={
            <Pressable onPress={() => router.push('/forgot-password')}>
              <Text style={[s.forgotText, { color: P2 }]}>{t('auth.login.forgotPassword')}</Text>
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
                <Text style={s.primaryBtnText}>{t('auth.login.loginBtn')}</Text>
                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
              </>}
        </LinearGradient>
      </Pressable>

      <View style={s.divider}>
        <View style={[s.dividerLine, { backgroundColor: '#EDE9FE' }]} />
        <Text style={s.dividerText}>{t('auth.login.or')}</Text>
        <View style={[s.dividerLine, { backgroundColor: '#EDE9FE' }]} />
      </View>

      <Pressable style={[s.socialBtn, s.socialBtnFull, googleLoading && { opacity: 0.6 }]} onPress={onGooglePress} disabled={googleLoading}>
        {googleLoading
          ? <View style={s.spinner} />
          : <View style={s.googleBadge}><Text style={s.googleG}>G</Text></View>}
        <Text style={s.socialBtnText}>{googleLoading ? t('auth.login.signingIn') : t('auth.login.continueGoogle')}</Text>
      </Pressable>
      {/* Facebook login — commented out until FB app is configured
      <View style={s.socialRow}>
        <Pressable style={[s.socialBtn, googleLoading && { opacity: 0.6 }]} onPress={onGooglePress} disabled={googleLoading}>
          {googleLoading ? <View style={s.spinner} /> : <View style={s.googleBadge}><Text style={s.googleG}>G</Text></View>}
          <Text style={s.socialBtnText}>{googleLoading ? 'Signing in…' : 'Google'}</Text>
        </Pressable>
        <Pressable style={[s.socialBtnFb, facebookLoading && { opacity: 0.6 }]} onPress={onFacebookPress} disabled={facebookLoading}>
          {facebookLoading ? <View style={s.spinner} /> : <View style={s.fbBadge}><Text style={s.fbF}>f</Text></View>}
          <Text style={s.socialBtnFbText}>{facebookLoading ? 'Signing in…' : 'Facebook'}</Text>
        </Pressable>
      </View>
      */}

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

function SignupForm({ onGooglePress, googleLoading, googleError, onFacebookPress, facebookLoading, facebookError }: {
  onGooglePress: () => void;
  googleLoading: boolean;
  googleError: string;
  onFacebookPress: () => void;
  facebookLoading: boolean;
  facebookError: string;
}) {
  const C = useAppColors();
  const { t } = useLanguage();

  const [role,      setRole]      = useState<'CREATOR' | 'BUSINESS'>('CREATOR');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const emErr = submitted && !isValidEmail(email)      ? t('auth.signup.emailInvalid') : undefined;
  const pwErrKey = submitted ? getPwErrorKey(password) : undefined;
  const pwErr    = pwErrKey ? t(pwErrKey) : undefined;

  async function handleCreate() {
    setSubmitted(true);
    setError('');
    if (!isValidEmail(email) || getPwErrorKey(password)) return;
    setLoading(true);
    try {
      await authService.register({ email: email.trim().toLowerCase(), password, role });
      router.push({ pathname: '/verify', params: { email: email.trim().toLowerCase() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.signup.registrationFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      {/* Role cards */}
      <Text style={[s.sectionLabel, { color: C.text }]}>{t('auth.signup.joiningAs')}</Text>
      <View style={s.roleRow}>
        {ROLES.map((r) => {
          const active = role === r.key;
          const roleLabel = r.key === 'CREATOR' ? t('auth.signup.roleCreatorLabel') : t('auth.signup.roleBusinessLabel');
          const roleSub   = r.key === 'CREATOR' ? t('auth.signup.roleCreatorSub')   : t('auth.signup.roleBusinessSub');
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
              <Text style={[s.roleLabel, { color: active ? P1 : C.text }]}>{roleLabel}</Text>
              <Text style={[s.roleSub, { color: active ? P2 : '#9CA3AF' }]}>{roleSub}</Text>
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
          icon="mail-outline" label={t('auth.signup.emailLabel')} value={email}
          onChangeText={(v) => { setEmail(v); setError(''); }}
          placeholder={t('auth.signup.emailInputPlaceholder')} keyboardType="email-address" error={emErr}
        />
        <Field
          icon="lock-closed-outline" label={t('auth.signup.password')} value={password}
          onChangeText={(v) => { setPassword(v); setError(''); }}
          placeholder={t('auth.signup.passwordCreatePlaceholder')} secureTextEntry error={pwErr}
        />
        {password.length > 0 && (
          <View style={s.rulesRow}>
            {PW_RULES.map((rule, idx) => {
              const ok = rule.test(password);
              const ruleLabel = idx === 0 ? t('auth.signup.pwRule8Chars') : idx === 1 ? t('auth.signup.pwRuleUppercase') : t('auth.signup.pwRuleNumber');
              return (
                <View key={rule.label} style={[s.rulePill, { backgroundColor: ok ? '#F0FDF4' : '#F5F3FF', borderColor: ok ? '#86EFAC' : '#DDD6FE' }]}>
                  <Ionicons name={ok ? 'checkmark-circle' : 'ellipse-outline'} size={11} color={ok ? '#16A34A' : '#A78BFA'} />
                  <Text style={[s.ruleText, { color: ok ? '#16A34A' : '#8B5CF6' }]}>{ruleLabel}</Text>
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
                <Text style={s.primaryBtnText}>{t('auth.signup.createAccountBtn')}</Text>
                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
              </>}
        </LinearGradient>
      </Pressable>

      <View style={s.divider}>
        <View style={[s.dividerLine, { backgroundColor: '#EDE9FE' }]} />
        <Text style={s.dividerText}>{t('auth.signup.or')}</Text>
        <View style={[s.dividerLine, { backgroundColor: '#EDE9FE' }]} />
      </View>

      <Pressable style={[s.socialBtn, s.socialBtnFull, googleLoading && { opacity: 0.6 }]} onPress={onGooglePress} disabled={googleLoading}>
        {googleLoading
          ? <View style={s.spinner} />
          : <View style={s.googleBadge}><Text style={s.googleG}>G</Text></View>}
        <Text style={s.socialBtnText}>{googleLoading ? t('auth.login.signingIn') : t('auth.signup.continueGoogle')}</Text>
      </Pressable>
      {/* Facebook login — commented out until FB app is configured
      <View style={s.socialRow}>
        <Pressable style={[s.socialBtn, googleLoading && { opacity: 0.6 }]} onPress={onGooglePress} disabled={googleLoading}>
          {googleLoading ? <View style={s.spinner} /> : <View style={s.googleBadge}><Text style={s.googleG}>G</Text></View>}
          <Text style={s.socialBtnText}>{googleLoading ? 'Signing in…' : 'Google'}</Text>
        </Pressable>
        <Pressable style={[s.socialBtnFb, facebookLoading && { opacity: 0.6 }]} onPress={onFacebookPress} disabled={facebookLoading}>
          {facebookLoading ? <View style={s.spinner} /> : <View style={s.fbBadge}><Text style={s.fbF}>f</Text></View>}
          <Text style={s.socialBtnFbText}>{facebookLoading ? 'Signing in…' : 'Facebook'}</Text>
        </Pressable>
      </View>
      */}

      {!!googleError && (
        <View style={[s.banner, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }]}>
          <Ionicons name="alert-circle" size={15} color="#EF4444" />
          <Text style={[s.bannerText, { color: '#EF4444' }]}>{googleError}</Text>
        </View>
      )}

      <Text style={s.terms}>
        {t('auth.signup.termsPrefix')}{' '}
        <Text style={{ color: P2, fontFamily: F.semibold }} onPress={() => router.push('/legal?type=terms' as never)}>{t('auth.signup.termsLink')}</Text>
        {' '}{t('auth.signup.termsAnd')}{' '}
        <Text style={{ color: P2, fontFamily: F.semibold }} onPress={() => router.push('/legal?type=privacy-policy' as never)}>{t('auth.signup.privacyLink')}</Text>.
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { user, reloadUser }      = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const params                    = useLocalSearchParams<{ tab?: string; verified?: string }>();
  const insets                    = useSafeAreaInsets();
  const [tab, setTab]             = useState<'login' | 'signup'>(params.tab === 'signup' ? 'signup' : 'login');

  // Entrance animation — card slides up and fades in on mount
  const cardAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(cardAnim, { toValue: 1, duration: 480, useNativeDriver: true }).start();
  }, [cardAnim]);

  // Crossfade the form content whenever the Login/Signup tab changes
  const formAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    formAnim.setValue(0);
    Animated.timing(formAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [tab, formAnim]);

  const [googleLoading,   setGoogleLoading]   = useState(false);
  const [googleError,     setGoogleError]     = useState('');
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [facebookError,   setFacebookError]   = useState('');
  const [roleModal,       setRoleModal]       = useState(false);
  const [pendingToken,    setPendingToken]    = useState('');
  const [pendingProvider, setPendingProvider] = useState<'google' | 'facebook'>('google');

  // Fallback to 'unset' prevents the hook crashing with "undefined" — we guard in handleGooglePress/handleFacebookPress
  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId:        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? 'unset',
    webClientId:     process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? 'unset',
    iosClientId:     process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     ?? 'unset',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? 'unset',
  });

  const [, facebookResponse, facebookPromptAsync] = Facebook.useAuthRequest({
    clientId:        process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? 'unset',
    webClientId:     process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? 'unset',
    iosClientId:     process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? 'unset',
    androidClientId: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ?? 'unset',
  });

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === 'success' && googleResponse.authentication?.accessToken) {
      void handleGoogleToken(googleResponse.authentication.accessToken);
    } else if (googleResponse.type === 'error') {
      setGoogleError(t('auth.login.googleFailed'));
      setGoogleLoading(false);
    } else if (googleResponse.type === 'dismiss' || googleResponse.type === 'cancel') {
      setGoogleLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleResponse]);

  useEffect(() => {
    if (!facebookResponse) return;
    if (facebookResponse.type === 'success' && facebookResponse.authentication?.accessToken) {
      void handleFacebookToken(facebookResponse.authentication.accessToken);
    } else if (facebookResponse.type === 'error') {
      setFacebookError(t('auth.login.facebookFailed'));
      setFacebookLoading(false);
    } else if (facebookResponse.type === 'dismiss' || facebookResponse.type === 'cancel') {
      setFacebookLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facebookResponse]);

  async function handleFacebookToken(accessToken: string, role?: 'CREATOR' | 'BUSINESS') {
    setFacebookLoading(true);
    setFacebookError('');
    try {
      const result = await authService.facebookAuth({ accessToken, role });
      if (result.needsRole) {
        setPendingToken(accessToken);
        setPendingProvider('facebook');
        setRoleModal(true);
        setFacebookLoading(false);
        return;
      }
      await reloadUser();
    } catch (e) {
      setFacebookError(e instanceof Error ? e.message : 'Facebook sign-in failed. Please try again.');
      setFacebookLoading(false);
    }
  }

  function handleFacebookPress() {
    if (!process.env.EXPO_PUBLIC_FACEBOOK_APP_ID) {
      setFacebookError('Add EXPO_PUBLIC_FACEBOOK_APP_ID to .env to enable Facebook Sign-In.');
      return;
    }
    setFacebookLoading(true);
    setFacebookError('');
    void facebookPromptAsync();
  }

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
    if (pendingProvider === 'facebook') {
      await handleFacebookToken(pendingToken, selectedRole);
    } else {
      await handleGoogleToken(pendingToken, selectedRole);
    }
  }

  return (
    <View style={[s.root, { backgroundColor: P1 }]}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* ── Gradient hero ── */}
        <LinearGradient colors={[P3, P2, P1]} style={[s.hero, { paddingTop: insets.top + 12 }]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>
          {/* Decorative blobs */}
          <View style={s.blob1} />
          <View style={s.blob2} />
          <View style={s.blob3} />

          {/* Decorative background icons */}
          <View style={s.bgIconLayer} pointerEvents="none">
            {BG_ICONS.map((icon, i) => (
              <FontAwesome5
                key={i}
                name={icon.name as any}
                size={icon.size}
                color="#ffffff"
                style={[s.bgIcon, icon.style, { transform: [{ rotate: icon.rotate }] }]}
              />
            ))}
          </View>

          {/* Top row: logo centered, lang switcher pinned to the right */}
          <View style={s.heroTop}>
            <View style={s.logoBadgeCard}>
              <Image source={require('@/assets/images/logo.png')} style={s.logoImage} resizeMode="contain" />
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
              {tab === 'login' ? t('auth.login.heroTitleLogin') : t('auth.login.heroTitleSignup')}
            </Text>
            <Text style={s.heroSub}>
              {tab === 'login' ? t('auth.login.heroSubLogin') : t('auth.login.heroSubSignup')}
            </Text>
          </View>
        </LinearGradient>

        {/* ── White card ── */}
        <Animated.View
          style={[
            s.card,
            {
              opacity: cardAnim,
              transform: [{
                translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
              }],
            },
          ]}>
          <ScrollView
            contentContainerStyle={[s.cardScroll, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Tab bar */}
            <View style={s.tabBar}>
              {(['login', 'signup'] as const).map((tabKey) => (
                <Pressable
                  key={tabKey}
                  style={[s.tabBtn, tab === tabKey && s.tabBtnActive]}
                  onPress={() => setTab(tabKey)}>
                  {tab === tabKey && (
                    <LinearGradient colors={[P3, P1]} style={s.tabBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                  )}
                  <Text style={[s.tabBtnText, { color: tab === tabKey ? '#fff' : '#6B7280' }]}>
                    {tabKey === 'login' ? t('auth.login.tabLogin') : t('auth.login.tabSignup')}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Form */}
            <Animated.View
              style={{
                opacity: formAnim,
                transform: [{
                  translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
                }],
              }}>
              {tab === 'login'
                ? <LoginForm verified={params.verified} onGooglePress={handleGooglePress} googleLoading={googleLoading} googleError={googleError} onFacebookPress={handleFacebookPress} facebookLoading={facebookLoading} facebookError={facebookError} />
                : <SignupForm onGooglePress={handleGooglePress} googleLoading={googleLoading} googleError={googleError} onFacebookPress={handleFacebookPress} facebookLoading={facebookLoading} facebookError={facebookError} />}
            </Animated.View>

            {/* Footer */}
            <View style={s.footer}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#A78BFA" />
              <Text style={s.footerText}>{t('auth.login.footer')}</Text>
            </View>

          </ScrollView>
        </Animated.View>

      </KeyboardAvoidingView>

      {/* Role selection modal — shown for new Google users */}
      <Modal visible={roleModal} transparent animationType="slide" onRequestClose={() => setRoleModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>{t('auth.login.roleModalTitle')}</Text>
            <Text style={s.modalSub}>{t('auth.login.roleModalSub')}</Text>
            <View style={s.roleRow}>
              {ROLES.map((r) => {
                const roleLabel = r.key === 'CREATOR' ? t('auth.signup.roleCreatorLabel') : t('auth.signup.roleBusinessLabel');
                const roleSub   = r.key === 'CREATOR' ? t('auth.signup.roleCreatorSub')   : t('auth.signup.roleBusinessSub');
                return (
                  <Pressable
                    key={r.key}
                    style={s.roleCard}
                    onPress={() => void handleRoleSelect(r.key)}>
                    <LinearGradient colors={r.grad} style={s.roleIconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Ionicons name={r.icon} size={24} color="#fff" />
                    </LinearGradient>
                    <Text style={s.roleLabel}>{roleLabel}</Text>
                    <Text style={s.roleSub}>{roleSub}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable style={s.modalCancel} onPress={() => setRoleModal(false)}>
              <Text style={s.modalCancelText}>{t('auth.login.roleModalCancel')}</Text>
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
  blob1:   { position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.03)', top: -60, right: -60 },
  blob2:   { position: 'absolute', width: 160, height: 160, borderRadius: 80,  backgroundColor: 'rgba(255,255,255,0.03)', bottom: 20, left: -50 },
  blob3:   { position: 'absolute', width: 100, height: 100, borderRadius: 50,  backgroundColor: 'rgba(255,255,255,0.03)', top: 40, left: 80 },

  bgIconLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  bgIcon:      { position: 'absolute', opacity: 0.14 },

  heroTop:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 28, position: 'relative' },
  logoBadgeCard: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  logoImage: { width: 88, height: 88 / (2040 / 624) },
  langRow:  { flexDirection: 'row', gap: 6, position: 'absolute', right: 0, top: '50%', transform: [{ translateY: -17 }] },
  langBtn:  { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  langBtnActive: { backgroundColor: 'rgba(255,255,255,0.28)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)' },
  langFlag: { fontSize: 15 },

  heroBody:  { gap: 8 },
  heroTitle: { fontSize: 28, fontWeight: '700', color: '#fff', fontFamily: F.bold, lineHeight: 34 },
  heroSub:   { fontSize: 14, color: 'rgba(255,255,255,0.72)', fontFamily: F.regular, lineHeight: 20 },

  // Card
  card:       { flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: -28, overflow: 'hidden' },
  cardScroll: { paddingHorizontal: 24, paddingTop: 28 },

  // Tab bar
  tabBar:       { flexDirection: 'row', backgroundColor: '#F5F3FF', borderRadius: 12, padding: 4, marginBottom: 24, gap: 2 },
  tabBtn:       { flex: 1, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  tabBtnActive: { shadowColor: P1, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  tabBtnGrad:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10 },
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
  domainSuggestBox:      { borderWidth: 1, borderColor: '#E8E0F8', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  domainSuggestItem:     { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0EBFB' },
  domainSuggestText:     { fontSize: 14, fontFamily: F.regular, color: '#6B7280' },
  domainSuggestTextBold: { fontFamily: F.semibold, color: '#374151' },

  // Role cards
  sectionLabel:  { fontSize: 13, fontWeight: '600', fontFamily: F.semibold, color: '#374151', marginBottom: 12 },
  roleRow:       { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleCard:      { flex: 1, borderRadius: 14, borderWidth: 1.5, padding: 16, gap: 8, alignItems: 'center', position: 'relative' },
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
  primaryBtnWrap: { borderRadius: 14, marginBottom: 20, shadowColor: P1, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  primaryBtn:     { height: 54, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', fontFamily: F.bold, letterSpacing: 0.3 },

  // Divider
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, color: '#A78BFA', fontFamily: F.medium },

  // Social row (Google + Facebook side by side)
  socialRow:      { flexDirection: 'row', gap: 12, marginBottom: 12 },
  socialBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#DDD6FE', backgroundColor: '#FAFAFE' },
  socialBtnFull:  { flex: 0, marginBottom: 12 },
  socialBtnText:  { fontSize: 14, fontFamily: F.semibold, color: '#374151' },
  socialBtnFb:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
  socialBtnFbText:{ fontSize: 14, fontFamily: F.semibold, color: '#1D4ED8' },
  googleBadge:    { width: 22, height: 22, borderRadius: 11, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center' },
  googleG:        { color: '#fff', fontSize: 12, fontWeight: '900', fontFamily: F.bold },
  fbBadge:        { width: 22, height: 22, borderRadius: 11, backgroundColor: '#1877F2', justifyContent: 'center', alignItems: 'center' },
  fbF:            { color: '#fff', fontSize: 13, fontWeight: '900', fontFamily: F.bold },
  spinner:        { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#DDD6FE', borderTopColor: P2 },

  // Role modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36, gap: 4 },
  modalHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD6FE', alignSelf: 'center', marginBottom: 20 },
  modalTitle:      { fontSize: 20, fontWeight: '700', fontFamily: F.bold, color: P1, textAlign: 'center' },
  modalSub:        { fontSize: 14, fontFamily: F.regular, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  modalCancel:     { marginTop: 16, alignItems: 'center', padding: 12 },
  modalCancelText: { fontSize: 15, fontFamily: F.semibold, color: '#9CA3AF' },

  terms:  { fontSize: 12, color: '#9CA3AF', lineHeight: 18, textAlign: 'center', fontFamily: F.regular, marginBottom: 8 },

  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 12 },
  footerText: { fontSize: 11, color: '#A78BFA', fontFamily: F.regular },
});
