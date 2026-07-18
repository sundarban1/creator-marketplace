import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { exchangeCodeAsync } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { authService } from '@/services/auth';
import type { Lang } from '@/i18n';
import { COLORS, F, RADIUS, SHADOW } from '@/utilities/constants';
import { isValidNepaliPhone, normalizePhoneForSubmit } from '@/utilities/phone';
import {
  authenticate as authenticateBiometric,
  getBiometricLabel,
  isBiometricAvailable,
  isBiometricLoginEnabled,
  type BiometricLabel,
} from '@/services/biometric';

WebBrowser.maybeCompleteAuthSession();

const LANG_OPTIONS: { lang: Lang; flag: string }[] = [
  { lang: 'en', flag: '🇬🇧' },
  { lang: 'ne', flag: '🇳🇵' },
];

// Soft pastel wash + card-less, minimal-border layout (per the reference design) —
// brinjal/orange stay the brand accents (logo badge, active tab, button glow,
// highlight word) rather than covering the whole screen the way the old solid
// aurora did.
const BRINJAL      = '#4F46E5';
const BRINJAL_PALE = '#EDEBFC';
const ORANGE       = '#ED651C';
const TEXT_DARK     = '#221E3A';
const MUTED         = '#8B87A8';

// Content-creator/brand iconography scattered across the gradient background — random
// per-icon opacity (computed once at module load, so it's stable across re-renders
// rather than flickering) gives the scatter a less mechanical, hand-placed feel.
function scatterOpacity() { return Math.round((Math.random() * 0.07 + 0.05) * 100) / 100; }

const BG_ICONS: { name: string; size: number; rotate: string; style: object; opacity: number }[] = [
  { name: 'camera',           size: 30, rotate: '-14deg', style: { top: 10,  left: '6%'  }, opacity: scatterOpacity() },
  { name: 'dollar-sign',      size: 22, rotate: '12deg',  style: { top: 4,   right: '32%' }, opacity: scatterOpacity() },
  { name: 'laptop',           size: 32, rotate: '9deg',   style: { top: 130, right: '5%' }, opacity: scatterOpacity() },
  { name: 'bullhorn',         size: 24, rotate: '-10deg', style: { top: 60,  left: '42%' }, opacity: scatterOpacity() },
  { name: 'photo-video',      size: 22, rotate: '15deg',  style: { top: 195, left: '36%' }, opacity: scatterOpacity() },
  { name: 'chart-line',       size: 20, rotate: '-8deg',  style: { top: 26,  right: '6%' }, opacity: scatterOpacity() },
  { name: 'briefcase',        size: 24, rotate: '11deg',  style: { top: 150, left: '8%'  }, opacity: scatterOpacity() },
  { name: 'hashtag',          size: 18, rotate: '-6deg',  style: { top: 215, right: '20%' }, opacity: scatterOpacity() },
  { name: 'mobile-alt',       size: 26, rotate: '-9deg',  style: { top: 100, left: '2%'  }, opacity: scatterOpacity() },
];

const ROLES = [
  { key: 'CREATOR'  as const, label: 'Creator', sub: 'Influencer & creator', icon: 'camera'    as const, grad: [COLORS.brinjal1, COLORS.brinjal2] as const },
  { key: 'BUSINESS' as const, label: 'Brand', sub: 'Company & brand',     icon: 'briefcase' as const, grad: [COLORS.accent, '#EA580C'] as const },
];

const PW_RULES = [
  { test: (p: string) => p.length >= 8,   label: '8+ chars'  },
  { test: (p: string) => /[A-Z]/.test(p), label: 'Uppercase' },
  { test: (p: string) => /[0-9]/.test(p), label: 'Number'    },
];

function isValidEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
const EMAIL_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com'];

// ── Email / Phone identifier detection ───────────────────────────────────────

type IdentifierChannel = 'email' | 'phone';

function identifierChannel(value: string): IdentifierChannel {
  return value.includes('@') ? 'email' : 'phone';
}
function isValidIdentifier(value: string): boolean {
  return identifierChannel(value) === 'email' ? isValidEmail(value) : isValidNepaliPhone(value);
}

function getPwErrorKey(p: string): string | undefined {
  if (p.length < 8)     return 'auth.signup.pwError8Chars';
  if (!/[A-Z]/.test(p)) return 'auth.signup.pwErrorUppercase';
  if (!/[0-9]/.test(p)) return 'auth.signup.pwErrorNumber';
}

// ── Headline highlight word ───────────────────────────────────────────────────
// Solid fill in a given accent color — no background of its own, since the
// whole tagline now sits inside one shared white pill (see heroTaglinePill).
function GradientHighlight({ text, style, color }: { text: string; style: any; color: string }) {
  return <Text style={[style, { color }]}>{text}</Text>;
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
  const [focused, setFocused] = useState(false);
  const [hidden,  setHidden]  = useState(secureTextEntry);
  const anim   = useRef(new Animated.Value(0)).current;
  const shadow = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const border = anim.interpolate({
    inputRange:  [0, 1],
    outputRange: [error ? '#FECACA' : '#E8E0F8', error ? '#EF4444' : BRINJAL],
  });

  return (
    <View style={s.fieldWrap}>
      <View style={s.fieldLabelRow}>
        <Text style={s.fieldLabel}>{label}</Text>
        {rightSlot}
      </View>
      <Animated.View style={[
        s.field,
        { borderColor: border },
        focused && s.fieldFocused,
      ]}>
        <View style={[s.fieldIconWrap, { backgroundColor: focused ? `${BRINJAL}15` : '#F3F4F6' }]}>
          <Ionicons name={icon} size={16} color={focused ? BRINJAL : '#9CA3AF'} />
        </View>
        <TextInput
          style={s.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#C4B5FD"
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          // Android's EditText wraps long placeholder/value text to a second line by
          // default (unlike iOS, which always clips to one line) — numberOfLines pins it
          // to one line there; the explicit height in s.fieldInput keeps that line centered.
          numberOfLines={1}
          onFocus={() => { setFocused(true);  Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }).start(); }}
          onBlur={()  => { setTimeout(() => { setFocused(false); Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start(); }, 150); }}
        />
        {secureTextEntry && (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => setHidden(h => !h)} hitSlop={10} style={s.eyeBtn}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={focused ? BRINJAL : '#9CA3AF'} />
          </Pressable>
        )}
      </Animated.View>
      {!secureTextEntry && focused && (() => {
        const atIndex = value.indexOf('@');
        if (atIndex === -1) return null;
        const localPart  = value.slice(0, atIndex);
        const domainPart = value.slice(atIndex + 1);
        if (domainPart.includes('.')) return null;
        const suggestions = EMAIL_DOMAINS.filter((d) => d.startsWith(domainPart));
        if (suggestions.length === 0) return null;
        return (
          <View style={s.domainSuggestBoxOuter}>
            <View style={s.domainSuggestBox}>
              {suggestions.map((domain) => (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  key={domain}
                  style={s.domainSuggestItem}
                  onPress={() => onChangeText(`${localPart}@${domain}`)}>
                  <Text style={s.domainSuggestText}>{localPart}@<Text style={s.domainSuggestTextBold}>{domain}</Text></Text>
                </Pressable>
              ))}
            </View>
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
  const { login, reloadUser } = useAuth();
  const { t }     = useLanguage();

  const [identifierInput, setIdentifierInput] = useState('');
  const [password,   setPassword]   = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitted,  setSubmitted]  = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [apiError,   setApiError]   = useState('');
  const [suspendedModal, setSuspendedModal] = useState(false);

  // Face ID / Fingerprint quick login — only relevant if the user previously
  // enabled it (which requires a preserved, "locked" session on this device).
  const [biometricReady,   setBiometricReady]   = useState(false);
  const [biometricLabel,   setBiometricLabel]   = useState<BiometricLabel>('Biometrics');
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    if (!isBiometricLoginEnabled()) return;
    isBiometricAvailable().then((available) => { if (available) setBiometricReady(true); });
    getBiometricLabel().then(setBiometricLabel);
  }, []);

  async function handleBiometricLogin() {
    setApiError('');
    setBiometricLoading(true);
    try {
      const ok = await authenticateBiometric(t('auth.login.biometricLoginBtn', { biometricLabel }));
      if (ok) {
        const u = await reloadUser();
        if (!u) setApiError(t('auth.login.biometricNoSession'));
        // On success RootNavigator's redirect effect takes it from here.
      }
    } catch {
      setApiError(t('auth.login.biometricFailed'));
    } finally {
      setBiometricLoading(false);
    }
  }

  const trimmedIdentifier = identifierInput.trim();
  const channel = identifierChannel(trimmedIdentifier);
  const identifierValid = trimmedIdentifier.length > 0 && isValidIdentifier(trimmedIdentifier);
  const emErr = submitted && !identifierValid ? t('auth.login.identifierInvalid') : undefined;
  const pwErr = submitted && !password ? t('auth.login.passwordRequired') : undefined;

  async function handleLogin() {
    setSubmitted(true);
    if (!identifierValid || !password) return;
    setApiError('');
    setLoading(true);
    try {
      const identifier = channel === 'email' ? { email: trimmedIdentifier } : { phone: normalizePhoneForSubmit(trimmedIdentifier) };
      await login(identifier, password, rememberMe);
    } catch (e) {
      const message = e instanceof Error ? e.message : t('auth.login.requiredError');
      if (/suspended/i.test(message)) {
        setSuspendedModal(true);
      } else {
        setApiError(message);
      }
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
          icon={channel === 'email' ? 'mail-outline' : 'call-outline'}
          label={t('auth.login.identifierLabel')} value={identifierInput}
          onChangeText={(v) => { setIdentifierInput(v); setApiError(''); }}
          placeholder={t('auth.login.identifierPlaceholder')} autoCapitalize="none" error={emErr}
        />
        <Field
          icon="lock-closed-outline" label={t('auth.login.password')} value={password}
          onChangeText={(v) => { setPassword(v); setApiError(''); }}
          placeholder={t('auth.login.passwordEnterPlaceholder')} secureTextEntry error={pwErr}
          rightSlot={
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => router.push('/forgot-password')}>
              <Text style={s.forgotText}>{t('auth.login.forgotPassword')}</Text>
            </Pressable>
          }
        />
      </View>

      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={s.rememberRow} onPress={() => setRememberMe((v) => !v)} hitSlop={8}>
        <Ionicons name={rememberMe ? 'checkbox' : 'square-outline'} size={19} color={rememberMe ? BRINJAL : '#9CA3AF'} />
        <Text style={s.rememberText}>{t('auth.login.rememberMe')}</Text>
      </Pressable>

      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        onPress={handleLogin} disabled={loading}
        style={({ pressed }) => [s.primaryBtnWrap, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
        <View style={[s.primaryBtn, { backgroundColor: BRINJAL }]}>
          {loading
            ? <Ionicons name="sync" size={18} color="#fff" />
            : <>
                <Text style={s.primaryBtnText}>{t('auth.login.loginBtn')}</Text>
                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
              </>}
        </View>
      </Pressable>

      {biometricReady && (
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          style={({ pressed }) => [
            s.socialBtn, s.socialBtnFull,
            biometricLoading && { opacity: 0.6 },
            pressed && !biometricLoading && { transform: [{ scale: 0.98 }], backgroundColor: '#F3F0FC' },
          ]}
          onPress={handleBiometricLogin} disabled={biometricLoading}>
          {biometricLoading
            ? <View style={s.spinner} />
            : <FontAwesome5 name={biometricLabel === 'Face ID' ? 'smile' : 'fingerprint'} size={17} color={BRINJAL} />}
          <Text style={s.socialBtnText}>
            {biometricLoading ? t('auth.login.signingIn') : t('auth.login.biometricLoginBtn', { biometricLabel })}
          </Text>
        </Pressable>
      )}

      <View style={s.divider}>
        <View style={[s.dividerLine, { backgroundColor: '#EDE9FE' }]} />
        <Text style={s.dividerText}>{t('auth.login.or')}</Text>
        <View style={[s.dividerLine, { backgroundColor: '#EDE9FE' }]} />
      </View>

      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        style={({ pressed }) => [
          s.socialBtn, s.socialBtnFull,
          googleLoading && { opacity: 0.6 },
          pressed && !googleLoading && { transform: [{ scale: 0.98 }], backgroundColor: '#F3F0FC' },
        ]}
        onPress={onGooglePress} disabled={googleLoading}>
        {googleLoading
          ? <View style={s.spinner} />
          : <View style={s.googleBadge}><Text style={s.googleG}>G</Text></View>}
        <Text style={s.socialBtnText}>{googleLoading ? t('auth.login.signingIn') : t('auth.login.continueGoogle')}</Text>
      </Pressable>
      {/* Facebook login — commented out until FB app is configured
      <View style={s.socialRow}>
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[s.socialBtn, googleLoading && { opacity: 0.6 }]} onPress={onGooglePress} disabled={googleLoading}>
          {googleLoading ? <View style={s.spinner} /> : <View style={s.googleBadge}><Text style={s.googleG}>G</Text></View>}
          <Text style={s.socialBtnText}>{googleLoading ? 'Signing in…' : 'Google'}</Text>
        </Pressable>
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[s.socialBtnFb, facebookLoading && { opacity: 0.6 }]} onPress={onFacebookPress} disabled={facebookLoading}>
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

      {/* Suspended-account modal — shown instead of the inline banner when the
          backend blocks login because an admin suspended this account. */}
      <Modal visible={suspendedModal} transparent animationType="fade" onRequestClose={() => setSuspendedModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalSheet, s.suspendedSheet]}>
            <View style={s.suspendedIconWrap}>
              <FontAwesome5 name="lock" size={22} color="#EF4444" solid />
            </View>
            <Text style={s.modalTitle}>{t('auth.login.suspendedTitle')}</Text>
            <Text style={s.modalSub}>{t('auth.login.suspendedMessage')}</Text>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={s.suspendedContactBtn}
              onPress={() => Linking.openURL('mailto:support@creatormarket.com')}>
              <Ionicons name="mail-outline" size={16} color="#fff" />
              <Text style={s.suspendedContactBtnText}>{t('auth.login.suspendedContactBtn')}</Text>
            </Pressable>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={s.modalCancel} onPress={() => setSuspendedModal(false)}>
              <Text style={s.modalCancelText}>{t('auth.login.suspendedClose')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  const { t } = useLanguage();

  const [role,      setRole]      = useState<'CREATOR' | 'BUSINESS'>('CREATOR');
  const [identifierInput, setIdentifierInput] = useState('');
  const [password,  setPassword]  = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const trimmedIdentifier = identifierInput.trim();
  const channel = identifierChannel(trimmedIdentifier);
  const identifierValid = trimmedIdentifier.length > 0 && isValidIdentifier(trimmedIdentifier);
  const emErr = submitted && !identifierValid ? t('auth.signup.identifierInvalid') : undefined;
  const pwErrKey = submitted ? getPwErrorKey(password) : undefined;
  const pwErr    = pwErrKey ? t(pwErrKey) : undefined;

  async function handleCreate() {
    setSubmitted(true);
    setError('');
    if (!identifierValid || getPwErrorKey(password)) return;
    setLoading(true);
    try {
      if (channel === 'email') {
        const trimmedEmail = trimmedIdentifier.toLowerCase();
        await authService.register({ email: trimmedEmail, password, role });
        router.push({ pathname: '/verify', params: { email: trimmedEmail } });
      } else {
        const normalisedPhone = normalizePhoneForSubmit(trimmedIdentifier);
        await authService.register({ phone: normalisedPhone, password, role });
        router.push({ pathname: '/verify', params: { phone: normalisedPhone } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.signup.registrationFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      {/* Role cards */}
      <View style={s.roleRow}>
        {ROLES.map((r) => {
          const active = role === r.key;
          const tint = r.grad[0];
          const roleLabel = r.key === 'CREATOR' ? t('auth.signup.roleCreatorLabel') : t('auth.signup.roleBusinessLabel');
          const roleSub   = r.key === 'CREATOR' ? t('auth.signup.roleCreatorSub')   : t('auth.signup.roleBusinessSub');
          return (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={r.key}
              style={({ pressed }) => [
                s.roleCard,
                { borderColor: active ? tint : '#ECEAF5', backgroundColor: '#fff' },
                active && [s.roleCardActive, { shadowColor: tint }],
                { transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
              onPress={() => { setRole(r.key); setSubmitted(false); setError(''); }}>
              {/* Tint overlay on its own layer — Android's elevation shadow doesn't
                  composite correctly with a translucent backgroundColor on the same view. */}
              {active && <View pointerEvents="none" style={[s.roleTintOverlay, { backgroundColor: `${tint}0D` }]} />}
              <LinearGradient
                colors={active ? r.grad : ['#F5F3FF', '#EDE9FE']}
                style={[s.roleIconBox, active && { shadowColor: tint, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <FontAwesome5 name={r.icon} size={22} color={active ? '#fff' : '#8B5CF6'} solid />
              </LinearGradient>
              <Text style={s.roleLabel}>{roleLabel}</Text>
              <Text style={[s.roleSub, { color: active ? tint : '#9CA3AF' }]}>{roleSub}</Text>
              {active && (
                <View style={[s.roleCheck, { backgroundColor: tint }]}>
                  <Ionicons name="checkmark" size={13} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Fields */}
      <View style={s.form}>
        <Field
          icon={channel === 'email' ? 'mail-outline' : 'call-outline'}
          label={t('auth.signup.identifierLabel')} value={identifierInput}
          onChangeText={(v) => { setIdentifierInput(v); setError(''); }}
          placeholder={t('auth.signup.identifierPlaceholder')} autoCapitalize="none" error={emErr}
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

      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        onPress={handleCreate} disabled={loading}
        style={({ pressed }) => [s.primaryBtnWrap, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
        <View style={[s.primaryBtn, { backgroundColor: BRINJAL }]}>
          {loading
            ? <Ionicons name="sync" size={18} color="#fff" />
            : <>
                <Text style={s.primaryBtnText}>{t('auth.signup.createAccountBtn')}</Text>
                <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
              </>}
        </View>
      </Pressable>

      <View style={s.divider}>
        <View style={[s.dividerLine, { backgroundColor: '#EDE9FE' }]} />
        <Text style={s.dividerText}>{t('auth.signup.or')}</Text>
        <View style={[s.dividerLine, { backgroundColor: '#EDE9FE' }]} />
      </View>

      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        style={({ pressed }) => [
          s.socialBtn, s.socialBtnFull,
          googleLoading && { opacity: 0.6 },
          pressed && !googleLoading && { transform: [{ scale: 0.98 }], backgroundColor: '#F3F0FC' },
        ]}
        onPress={onGooglePress} disabled={googleLoading}>
        {googleLoading
          ? <View style={s.spinner} />
          : <View style={s.googleBadge}><Text style={s.googleG}>G</Text></View>}
        <Text style={s.socialBtnText}>{googleLoading ? t('auth.login.signingIn') : t('auth.signup.continueGoogle')}</Text>
      </Pressable>
      {/* Facebook login — commented out until FB app is configured
      <View style={s.socialRow}>
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[s.socialBtn, googleLoading && { opacity: 0.6 }]} onPress={onGooglePress} disabled={googleLoading}>
          {googleLoading ? <View style={s.spinner} /> : <View style={s.googleBadge}><Text style={s.googleG}>G</Text></View>}
          <Text style={s.socialBtnText}>{googleLoading ? 'Signing in…' : 'Google'}</Text>
        </Pressable>
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={[s.socialBtnFb, facebookLoading && { opacity: 0.6 }]} onPress={onFacebookPress} disabled={facebookLoading}>
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
        <Text style={{ color: BRINJAL, fontFamily: F.semibold }} onPress={() => router.push('/legal?type=terms' as never)}>{t('auth.signup.termsLink')}</Text>
        {' '}{t('auth.signup.termsAnd')}{' '}
        <Text style={{ color: BRINJAL, fontFamily: F.semibold }} onPress={() => router.push('/legal?type=privacy-policy' as never)}>{t('auth.signup.privacyLink')}</Text>.
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

  // Tagline auto-fit: measured against an invisible unwrapped copy of itself, then
  // scaled down (never reflowed/wrapped) so "Where Brands Meet Creators" always renders
  // on one line no matter the screen width or which language's word lengths are in play.
  const { width: windowWidth } = useWindowDimensions();
  const [taglineNaturalWidth, setTaglineNaturalWidth] = useState(0);
  const taglineAvailableWidth = windowWidth - 40; // matches scrollContent's paddingHorizontal (20 × 2)
  const taglineScale = taglineNaturalWidth > 0 ? Math.min(1, taglineAvailableWidth / taglineNaturalWidth) : 1;

  function renderTaglineWords() {
    return (
      <>
        <Text style={s.heroTagline}>{t('auth.login.heroTaglinePrefix')}</Text>
        <GradientHighlight text={t('auth.login.heroTaglineBrands')} style={s.heroTaglineHighlight} color={BRINJAL} />
        <Text style={s.heroTagline}>{t('auth.login.heroTaglineMiddle')}</Text>
        <GradientHighlight text={t('auth.login.heroTaglineCreators')} style={s.heroTaglineHighlight} color={ORANGE} />
        {!!t('auth.login.heroTaglineSuffix') && (
          <Text style={s.heroTagline}>{t('auth.login.heroTaglineSuffix')}</Text>
        )}
      </>
    );
  }

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

  // Google's iOS OAuth client validates the redirect URI against the *reversed client ID*
  // scheme (this is why native Google Sign-In SDKs require a REVERSED_CLIENT_ID URL type in
  // Info.plist) — expo-auth-session's default (bundle-ID scheme) doesn't match that and Google
  // rejects it with "redirect_uri_mismatch". Android's OAuth client type verifies the app via
  // package name instead, so the library's default there is correct and left alone.
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? 'unset';
  const googleIosRedirectUri = Platform.OS === 'ios'
    ? `com.googleusercontent.apps.${googleIosClientId.replace('.apps.googleusercontent.com', '')}:/oauthredirect`
    : undefined;

  // Fallback to 'unset' prevents the hook crashing with "undefined" — we guard in handleGooglePress/handleFacebookPress
  const [googleRequest, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    clientId:        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? 'unset',
    webClientId:     process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? 'unset',
    iosClientId:     googleIosClientId,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? 'unset',
    redirectUri:     googleIosRedirectUri,
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
      // Implicit flow (web) — token comes back directly.
      void handleGoogleToken(googleResponse.authentication.accessToken);
    } else if (googleResponse.type === 'success' && googleResponse.params?.code) {
      // Authorization Code flow (native default on iOS/Android) — exchange the code
      // for an access token ourselves; expo-auth-session doesn't do this automatically.
      const clientId = Platform.select({
        ios:     process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      }) ?? 'unset';
      exchangeCodeAsync(
        {
          clientId,
          code:         googleResponse.params.code,
          redirectUri:  googleRequest?.redirectUri ?? '',
          extraParams:  googleRequest?.codeVerifier ? { code_verifier: googleRequest.codeVerifier } : undefined,
        },
        Google.discovery,
      )
        .then((token) => {
          if (token.accessToken) void handleGoogleToken(token.accessToken);
          else { setGoogleError(t('auth.login.googleFailed')); setGoogleLoading(false); }
        })
        .catch(() => { setGoogleError(t('auth.login.googleFailed')); setGoogleLoading(false); });
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
      setGoogleError('iOS Google Sign-In needs EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID. Create an iOS OAuth client in Google Cloud Console (Bundle ID: com.sundarban.kolab).');
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
    <View style={s.root}>
      <StatusBar style="dark" />

      {/* Soft pastel wash (brinjal → white → warm peach) instead of a bold
          full-bleed color — the reference's light, airy feel. */}
      <LinearGradient colors={[BRINJAL_PALE, '#FAF9FF', '#FFF3E6']} style={StyleSheet.absoluteFill} start={{ x: 0.1, y: 0 }} end={{ x: 0.85, y: 1 }} pointerEvents="none" />
      <View style={s.auroraLayer} pointerEvents="none">
        <View style={[s.auroraBlob, s.auroraBlobA]} />
        <View style={[s.auroraBlob, s.auroraBlobB]} />
        <View style={[s.auroraBlob, s.auroraBlobC]} />
        {BG_ICONS.map((icon, i) => (
          <FontAwesome5
            key={i}
            name={icon.name as any}
            size={icon.size}
            color={BRINJAL}
            style={[s.bgIcon, icon.style, { opacity: icon.opacity, transform: [{ rotate: icon.rotate }] }]}
          />
        ))}
      </View>

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Lang switcher */}
          <View style={s.langRow}>
            {LANG_OPTIONS.map(({ lang, flag }) => (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                key={lang}
                style={[s.langBtn, language === lang && s.langBtnActive]}
                hitSlop={6}
                onPress={() => setLanguage(lang)}>
                <Text style={s.langFlag}>{flag}</Text>
              </Pressable>
            ))}
          </View>

          {/* Logo sits directly on the page background, tagline below. */}
          <View style={s.heroCenter}>
            <Image source={require('@/assets/images/logo.png')} style={s.logoImage} resizeMode="contain" />
            {/* Row of independent word chunks rather than one flowing <Text> paragraph —
                the highlighted words render in their own accent color, which can't sit
                inline inside a Text run the way nested <Text> can, so each word lays out
                as a flex item instead. An invisible unwrapped copy measures the row's
                natural width; the visible copy is scaled down (never reflowed) to
                guarantee it always fits one line. */}
            <View style={s.heroTaglineMeasure} pointerEvents="none" onLayout={(e) => setTaglineNaturalWidth(e.nativeEvent.layout.width)}>
              {renderTaglineWords()}
            </View>
            <View style={s.heroTaglineClip}>
              <View style={[s.heroTaglineRow, { transform: [{ scale: taglineScale }] }]}>
                {renderTaglineWords()}
              </View>
            </View>
          </View>

          {/* ── Floating card ──
              Shadow lives on this outer view (no overflow clipping) and the rounded-corner
              clip lives on the inner view — iOS silently drops a shadow on any view that
              also has overflow:hidden, so the two responsibilities can't share one view. */}
          <Animated.View
            style={[
              s.cardOuter,
              {
                opacity: cardAnim,
                transform: [{
                  translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }),
                }],
              },
            ]}>
            <View style={s.cardInner}>
              <View style={s.cardBody}>

                {/* Minimal segmented tab — a soft white pill lifts the active
                    label instead of a bold gradient fill, matching the
                    reference's clean, low-contrast tab treatment. */}
                <View style={s.tabBar}>
                  {(['login', 'signup'] as const).map((tabKey) => (
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                      key={tabKey}
                      style={[s.tabBtn, tab === tabKey && s.tabBtnActive]}
                      onPress={() => setTab(tabKey)}>
                      <Text style={[s.tabBtnText, { color: tab === tabKey ? BRINJAL : MUTED }]}>
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

              </View>
            </View>
          </Animated.View>

          {/* Footer */}
          <View style={s.footer}>
            <Ionicons name="shield-checkmark-outline" size={12} color={MUTED} />
            <Text style={s.footerText}>{t('auth.login.footer')}</Text>
          </View>

        </ScrollView>
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
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    key={r.key}
                    style={({ pressed }) => [s.roleCard, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
                    onPress={() => void handleRoleSelect(r.key)}>
                    <LinearGradient colors={r.grad} style={s.roleIconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <FontAwesome5 name={r.icon} size={22} color="#fff" solid />
                    </LinearGradient>
                    <Text style={[s.roleLabel, { color: '#111827' }]}>{roleLabel}</Text>
                    <Text style={[s.roleSub, { color: '#9CA3AF' }]}>{roleSub}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={s.modalCancel} onPress={() => setRoleModal(false)}>
              <Text style={s.modalCancelText}>{t('auth.login.roleModalCancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAF9FF' },
  flex: { flex: 1 },

  scrollContent: { flexGrow: 1, paddingHorizontal: 20 },

  // Aurora glow blobs — soft two-tone (purple + warm orange) light sources instead of
  // scattered decorative icons, echoing the app icon's own purple-triangle/orange-ring duo.
  auroraLayer:  { position: 'absolute', top: 0, left: 0, right: 0, height: 420, overflow: 'hidden' },
  auroraBlob:   { position: 'absolute', borderRadius: RADIUS.full },
  auroraBlobA:  { width: 280, height: 280, backgroundColor: 'rgba(79,70,229,0.06)', top: -90, right: -70 },
  auroraBlobB:  { width: 220, height: 220, backgroundColor: 'rgba(255,173,51,0.14)', top: 80, left: -90 },
  auroraBlobC:  { width: 160, height: 160, backgroundColor: 'rgba(79,70,229,0.05)', top: 250, right: 40 },
  bgIcon:       { position: 'absolute' },

  logoImage: { width: 152, height: 152 / (1740 / 620) },
  langRow:  { flexDirection: 'row', gap: 6, justifyContent: 'flex-end', marginBottom: 6 },
  langBtn:  { width: 34, height: 34, borderRadius: RADIUS.full, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: BRINJAL, shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  langBtnActive: { backgroundColor: BRINJAL_PALE, borderWidth: 1.5, borderColor: '#C7C3F2' },
  langFlag: { fontSize: 15 },

  heroCenter:  { alignItems: 'center', marginTop: 8, marginBottom: 28, gap: 16, position: 'relative' },
  // Invisible, unwrapped — exists only so onLayout can report the tagline's true
  // one-line width, which the visible copy below is then scaled down to fit.
  heroTaglineMeasure: { position: 'absolute', top: 0, opacity: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTaglineClip: { width: '100%', overflow: 'hidden', alignItems: 'center' },
  heroTaglineRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroTagline: { fontSize: 20, color: TEXT_DARK, fontFamily: F.semibold, letterSpacing: 0.3 },
  heroTaglineHighlight: { fontSize: 22, fontFamily: F.boldItalic, fontStyle: 'italic', letterSpacing: 0.1 },

  // Floating card — visible margin on every side (not an edge-to-edge sheet),
  // fully rounded corners on all four corners for a "card floating on the page"
  // feel. A hairline border pulls extra weight now that the page itself is
  // light too — the shadow alone doesn't read as strongly against a light wash
  // as it did against the old dark-purple background.
  // Much lighter touch than a boxed "card" — a soft, wide, low shadow so the
  // form reads as gently lifted off the page rather than sitting in a hard
  // container, closer to the reference's card-less "floating on gradient" feel.
  cardOuter:  { borderRadius: RADIUS.xl, shadowColor: BRINJAL, shadowOpacity: 0.08, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: 3 },
  cardInner:  { borderRadius: RADIUS.xl, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.92)' },
  cardBody:   { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 26 },

  // Pill-shaped segmented tab
  tabBar:       { flexDirection: 'row', backgroundColor: '#F5F3FA', borderRadius: RADIUS.full, padding: 4, marginBottom: 22, gap: 2 },
  tabBtn:       { flex: 1, height: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#fff', shadowColor: BRINJAL, shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  tabBtnText:   { fontSize: 14, fontFamily: F.semibold },

  // Banners
  banner:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: RADIUS.md, borderWidth: 1, marginBottom: 16 },
  bannerText: { fontSize: 13, flex: 1, fontFamily: F.medium },

  // Remember me
  rememberRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, marginTop: -4 },
  rememberText: { fontSize: 13, fontFamily: F.medium, color: '#374151' },

  // Form — filled/tonal fields (soft lavender fill, no border until focused) rather than
  // outlined boxes, with circular icon badges to match the pill language used throughout.
  form:          { gap: 16, marginBottom: 20 },
  fieldWrap:     { gap: 6 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel:    { fontSize: 13, fontFamily: F.semibold, color: '#374151' },
  forgotText:    { fontSize: 12, fontFamily: F.semibold, color: BRINJAL },
  field:         { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: RADIUS.lg, paddingHorizontal: 5, height: 54, gap: 4, borderColor: 'transparent', backgroundColor: '#F8F7FB' },
  fieldFocused:  { borderColor: BRINJAL, backgroundColor: '#fff', shadowColor: BRINJAL, shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  fieldIconWrap: { width: 38, height: 38, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  fieldInput:    { flex: 1, height: 50, fontSize: 15, fontFamily: F.regular, color: '#111827', textAlignVertical: 'center' },
  eyeBtn:        { paddingHorizontal: 12 },
  fieldErrRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldErrText:  { fontSize: 11, color: '#EF4444', fontFamily: F.medium },
  domainSuggestBoxOuter: { borderRadius: RADIUS.md, shadowColor: '#4C1D95', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  domainSuggestBox:      { borderWidth: 1, borderColor: '#E8E0F8', borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: '#fff' },
  domainSuggestItem:     { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0EBFB' },
  domainSuggestText:     { fontSize: 14, fontFamily: F.regular, color: '#6B7280' },
  domainSuggestTextBold: { fontFamily: F.semibold, color: '#374151' },

  // Role cards
  roleRow:       { flexDirection: 'row', gap: 14, marginBottom: 22 },
  roleCard:      { flex: 1, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: '#ECEAF5', padding: 18, gap: 10, alignItems: 'center', position: 'relative' },
  roleCardActive:{ shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  roleTintOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: RADIUS.lg },
  roleIconBox:   { width: 58, height: 58, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  roleLabel:     { fontSize: 14, fontFamily: F.bold, textAlign: 'center', color: '#111827' },
  roleSub:       { fontSize: 11.5, fontFamily: F.regular, textAlign: 'center', lineHeight: 16 },
  roleCheck:     { position: 'absolute', top: -8, right: -8, width: 26, height: 26, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },

  // Password rules
  rulesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: -8 },
  rulePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  ruleText: { fontSize: 11, fontFamily: F.medium },

  // Button — full pill shape, solid brinjal fill with a matching soft glow shadow
  primaryBtnWrap: { borderRadius: RADIUS.full, marginBottom: 20, shadowColor: BRINJAL, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 7 },
  primaryBtn:     { height: 54, borderRadius: RADIUS.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { fontSize: 16, color: '#fff', fontFamily: F.bold, letterSpacing: 0.3 },

  // Divider
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, color: '#A78BFA', fontFamily: F.medium },

  // Social row (Google + Facebook side by side) — same pill family as the primary button
  socialRow:      { flexDirection: 'row', gap: 12, marginBottom: 12 },
  socialBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: '#DDD6FE', backgroundColor: '#FAFAFE', shadowColor: '#4C1D95', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  socialBtnFull:  { flex: 0, marginBottom: 12 },
  socialBtnText:  { fontSize: 14, fontFamily: F.semibold, color: '#374151' },
  socialBtnFb:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' },
  socialBtnFbText:{ fontSize: 14, fontFamily: F.semibold, color: '#1D4ED8' },
  googleBadge:    { width: 22, height: 22, borderRadius: RADIUS.full, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center' },
  googleG:        { color: '#fff', fontSize: 12, fontFamily: F.bold },
  fbBadge:        { width: 22, height: 22, borderRadius: RADIUS.full, backgroundColor: '#1877F2', justifyContent: 'center', alignItems: 'center' },
  fbF:            { color: '#fff', fontSize: 13, fontFamily: F.bold },
  spinner:        { width: 18, height: 18, borderRadius: RADIUS.full, borderWidth: 2, borderColor: '#DDD6FE', borderTopColor: BRINJAL },

  // Role modal
  modalOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet:      { backgroundColor: '#fff', borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 24, paddingBottom: 36, gap: 4 },
  modalHandle:     { width: 40, height: 4, borderRadius: RADIUS.full, backgroundColor: '#DDD6FE', alignSelf: 'center', marginBottom: 20 },
  modalTitle:      { fontSize: 20, fontFamily: F.bold, color: TEXT_DARK, textAlign: 'center' },
  modalSub:        { fontSize: 14, fontFamily: F.regular, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  modalCancel:     { marginTop: 16, alignItems: 'center', padding: 12 },
  modalCancelText: { fontSize: 15, fontFamily: F.semibold, color: '#9CA3AF' },

  // Suspended-account modal
  suspendedSheet:          { alignItems: 'center', paddingTop: 8 },
  suspendedIconWrap:       { width: 56, height: 56, borderRadius: RADIUS.full, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  suspendedContactBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRINJAL, borderRadius: RADIUS.full, paddingVertical: 14, paddingHorizontal: 20, width: '100%', marginTop: 4 },
  suspendedContactBtnText: { fontSize: 15, fontFamily: F.semibold, color: '#fff' },

  terms:  { fontSize: 12, color: '#9CA3AF', lineHeight: 18, textAlign: 'center', fontFamily: F.regular, marginBottom: 8 },

  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 16 },
  footerText: { fontSize: 11, color: MUTED, fontFamily: F.regular },
});
