import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { FontAwesome5 } from '@expo/vector-icons';
import { useMemo, useRef, useState, useEffect } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { exchangeCodeAsync } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { usePlatformFlags } from '@/context/PlatformSettingsContext';
import { useAppColors, useIsDark, BUSINESS_DARK_COLORS } from '@/context/ThemeContext';
import { authService } from '@/services/auth';

const DEFAULT_SUPPORT_EMAIL = 'info@ourkolab.com';
import type { Lang } from '@/i18n';
import { COLORS, BUSINESS_COLORS, F, RADIUS, SHADOW } from '@/utilities/constants';
import { withAlpha } from '@/utilities/color';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { BottomSheet } from '@/components/BottomSheet';
import { isValidNepaliPhone, normalizePhoneForSubmit } from '@/utilities/phone';
import {
  authenticate as authenticateBiometric,
  getBiometricLabel,
  isBiometricAvailable,
  isBiometricLoginEnabled,
  type BiometricLabel,
} from '@/services/biometric';

WebBrowser.maybeCompleteAuthSession();

const LANG_LABELS: Record<Lang, string> = { en: 'Eng', ne: 'ने' };

// Facebook Login is wired up but hidden for now (Meta app config isn't ready
// yet) — flip this back on once that's sorted, no other code changes needed.
const FACEBOOK_LOGIN_ENABLED = false;

// Same logo backs both the sign-in and create-account hero banners.
const HERO_IMAGE = require('@/assets/images/logo.png');

// Role card accents pull straight from the active theme's own primary/accent tokens
// (light or dark) instead of a hardcoded palette, so the cards stay in sync with
// whatever the rest of the app is using. BUSINESS pulls the same green used
// app-wide for authenticated business users (BUSINESS_COLORS/BUSINESS_DARK_COLORS)
// rather than C.accent, since pre-login `C` is never role-swapped — this keeps the
// "Looking for services" identity green from signup through the rest of the app.
export function buildRoles(C: typeof COLORS, isDark: boolean) {
  const businessC = isDark ? BUSINESS_DARK_COLORS : BUSINESS_COLORS;
  return [
    { key: 'CREATOR'  as const, label: 'Creator', sub: 'Influencer & creator', icon: 'camera'    as const, grad: [C.brinjal1, C.brinjal2] as const },
    { key: 'BUSINESS' as const, label: 'Business', sub: 'Company & business', icon: 'briefcase' as const, grad: [businessC.brinjal1, businessC.brinjal2] as const },
  ];
}

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

// ── Flat input (Instagram-style) ─────────────────────────────────────────────
// Filled, label-less field — the placeholder doubles as the label, matching the
// minimal look of Instagram's own login form. Local to this screen only; the
// rest of the app keeps using the icon+label TextInputWithLabel.

function FlatInput({ value, onChangeText, placeholder, secureToggle, secureTextEntry, error, onFocus, onBlur, ...rest }: TextInputProps & {
  secureToggle?: boolean;
  error?: string;
}) {
  const C = useAppColors();
  const s = useMemo(() => makeStyles(C), [C]);
  const [hidden, setHidden] = useState(secureTextEntry ?? false);
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <View style={[
        s.flatInputRow,
        { backgroundColor: C.primaryLight, borderColor: focused ? C.brinjal1 : 'transparent' },
        !!error && { borderColor: C.error },
      ]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textSecondary}
          style={[s.flatInput, { color: C.text, fontFamily: F.regular }]}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...rest}
        />
        {secureToggle && (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={10} style={s.flatInputEyeBtn}>
            <FontAwesome5 name={hidden ? 'eye' : 'eye-slash'} size={16} color={C.textSecondary} />
          </Pressable>
        )}
      </View>
      {!!error && (
        <View style={s.feedbackRow}>
          <FontAwesome5 name="exclamation-circle" solid size={12} color={C.error} />
          <Text style={[s.errorText, { color: C.error }]}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ── Identifier field (email/phone) ──────────────────────────────────────────────
// Thin wrapper around FlatInput that adds the email-domain autocomplete dropdown —
// specific enough to this screen's identifier field that it doesn't belong in the
// shared component itself.

function IdentifierField({ value, onChangeText, placeholder, accessibilityLabel, error }: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  error?: string;
}) {
  const C = useAppColors();
  const s = useMemo(() => makeStyles(C), [C]);
  const [focused, setFocused] = useState(false);

  const atIndex     = value.indexOf('@');
  const localPart    = value.slice(0, atIndex);
  const domainPart   = value.slice(atIndex + 1);
  const suggestions = focused && atIndex !== -1 && !domainPart.includes('.')
    ? EMAIL_DOMAINS.filter((d) => d.startsWith(domainPart))
    : [];

  return (
    <View>
      <FlatInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        error={error}
        onFocus={() => setFocused(true)}
        // Delayed so a tap on a suggestion below registers before the dropdown unmounts.
        onBlur={() => setTimeout(() => setFocused(false), 150)}
      />
      {suggestions.length > 0 && (
        <View style={s.domainSuggestBoxOuter}>
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
  const C = useAppColors();
  const s = useMemo(() => makeStyles(C), [C]);
  const { login, reloadUser } = useAuth();
  const { t }     = useLanguage();
  const { flags } = usePlatformFlags();

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
      } else if (/verify your (email|phone number)/i.test(message)) {
        // Account exists but was never verified after signup — the backend
        // already sent a fresh OTP as part of this same login attempt (see
        // AuthService.login), so just take the user back to the OTP screen
        // instead of dead-ending on a plain error banner.
        router.push({
          pathname: '/verify',
          params: channel === 'email' ? { email: trimmedIdentifier } : { phone: normalizePhoneForSubmit(trimmedIdentifier) },
        });
      } else {
        setApiError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <View style={s.formHeading}>
        <Text style={s.formHeadingTitle}>{t('auth.login.title')}</Text>
        <Text style={s.formHeadingSubtitle}>{t('auth.login.subtitle')}</Text>
      </View>

      {verified === '1' && (
        <View style={[s.banner, { backgroundColor: withAlpha(C.active, 0.12), borderColor: withAlpha(C.active, 0.35) }]}>
          <FontAwesome5 name="check-circle" solid size={15} color={C.active} />
          <Text style={[s.bannerText, { color: C.active }]}>{t('auth.login.verifiedBanner')}</Text>
        </View>
      )}
      {!!apiError && (
        <View style={[s.banner, { backgroundColor: withAlpha(C.error, 0.12), borderColor: withAlpha(C.error, 0.35) }]}>
          <FontAwesome5 name="exclamation-circle" solid size={15} color={C.error} />
          <Text style={[s.bannerText, { color: C.error }]}>{apiError}</Text>
        </View>
      )}

      <View style={s.form}>
        <IdentifierField
          value={identifierInput}
          onChangeText={(v) => { setIdentifierInput(v); setApiError(''); }}
          placeholder={t('auth.login.identifierPlaceholder')}
          accessibilityLabel={t('auth.login.identifierLabel')}
          error={emErr}
        />
        <FlatInput
          value={password}
          onChangeText={(v) => { setPassword(v); setApiError(''); }}
          placeholder={t('auth.login.passwordEnterPlaceholder')}
          accessibilityLabel={t('auth.login.password')}
          secureTextEntry secureToggle error={pwErr}
        />
      </View>

      <Pressable style={s.rememberRow} onPress={() => setRememberMe((v) => !v)} hitSlop={8}>
        <FontAwesome5 name={rememberMe ? 'check-square' : 'square'} solid={rememberMe} size={19} color={rememberMe ? C.brinjal1 : C.textSecondary} />
        <Text style={s.rememberText}>{t('auth.login.rememberMe')}</Text>
      </Pressable>

      <Pressable
        onPress={handleLogin} disabled={loading}
        style={({ pressed }) => [s.primaryBtnWrap, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
        <View style={[s.primaryBtn, { backgroundColor: C.brinjal1 }]}>
          {loading
            ? <FontAwesome5 name="sync" solid size={18} color="#fff" />
            : <Text style={s.primaryBtnText}>{t('auth.login.loginBtn')}</Text>}
        </View>
      </Pressable>

      <Pressable style={s.forgotWrap} onPress={() => router.push('/forgot-password')} hitSlop={8}>
        <Text style={s.forgotText}>{t('auth.login.forgotPassword')}</Text>
      </Pressable>

      {biometricReady && (
        <Pressable
          style={({ pressed }) => [
            s.socialBtn, s.socialBtnFull,
            biometricLoading && { opacity: 0.6 },
            pressed && !biometricLoading && { transform: [{ scale: 0.98 }], backgroundColor: C.primaryLight },
          ]}
          onPress={handleBiometricLogin} disabled={biometricLoading}>
          {biometricLoading
            ? <View style={[s.spinner, { borderColor: C.border, borderTopColor: C.brinjal1 }]} />
            : <FontAwesome5 name={biometricLabel === 'Face ID' ? 'smile' : 'fingerprint'} size={17} color={C.brinjal1} />}
          <Text style={s.socialBtnText}>
            {biometricLoading ? t('auth.login.signingIn') : t('auth.login.biometricLoginBtn', { biometricLabel })}
          </Text>
        </Pressable>
      )}

      <View style={s.divider}>
        <View style={[s.dividerLine, { backgroundColor: C.border }]} />
        <Text style={s.dividerText}>{t('auth.login.or')}</Text>
        <View style={[s.dividerLine, { backgroundColor: C.border }]} />
      </View>

      <View style={s.socialCardRow}>
        <Pressable
          style={({ pressed }) => [s.socialCardBtn, { borderColor: C.border, backgroundColor: C.surface }, googleLoading && { opacity: 0.6 }, pressed && !googleLoading && { backgroundColor: C.primaryLight }]}
          onPress={onGooglePress} disabled={googleLoading}
          accessibilityLabel={t('auth.login.continueGoogle')}>
          {googleLoading
            ? <View style={[s.spinner, { borderColor: C.border, borderTopColor: C.brinjal1 }]} />
            : <ExpoImage source={require('@/assets/images/google.png')} style={s.socialCardIcon} contentFit="contain" />}
          <Text style={[s.socialCardText, { color: C.text }]}>Google</Text>
        </Pressable>
        {FACEBOOK_LOGIN_ENABLED && (
          <Pressable
            style={({ pressed }) => [s.socialCardBtn, { borderColor: C.border, backgroundColor: C.surface }, facebookLoading && { opacity: 0.6 }, pressed && !facebookLoading && { backgroundColor: C.primaryLight }]}
            onPress={onFacebookPress} disabled={facebookLoading}
            accessibilityLabel={t('auth.login.continueFacebook')}>
            {facebookLoading
              ? <View style={[s.spinner, { borderColor: C.border, borderTopColor: C.brinjal1 }]} />
              : <View style={s.fbBadgeSmall}><Text style={s.fbF}>f</Text></View>}
            <Text style={[s.socialCardText, { color: C.text }]}>Facebook</Text>
          </Pressable>
        )}
      </View>

      {!!googleError && (
        <View style={[s.banner, { backgroundColor: withAlpha(C.error, 0.12), borderColor: withAlpha(C.error, 0.35) }]}>
          <FontAwesome5 name="exclamation-circle" solid size={15} color={C.error} />
          <Text style={[s.bannerText, { color: C.error }]}>{googleError}</Text>
        </View>
      )}
      {FACEBOOK_LOGIN_ENABLED && !!facebookError && (
        <View style={[s.banner, { backgroundColor: withAlpha(C.error, 0.12), borderColor: withAlpha(C.error, 0.35) }]}>
          <FontAwesome5 name="exclamation-circle" solid size={15} color={C.error} />
          <Text style={[s.bannerText, { color: C.error }]}>{facebookError}</Text>
        </View>
      )}

      {/* Suspended-account modal — shown instead of the inline banner when the
          backend blocks login because an admin suspended this account. */}
      <BottomSheet visible={suspendedModal} onClose={() => setSuspendedModal(false)} contentContainerStyle={{ gap: 4 }}>
        <View style={s.suspendedSheet}>
          <View style={s.suspendedIconWrap}>
            <FontAwesome5 name="lock" size={22} color={C.error} solid />
          </View>
          <Text style={s.modalTitle}>{t('auth.login.suspendedTitle')}</Text>
          <Text style={s.modalSub}>{t('auth.login.suspendedMessage')}</Text>
          <Pressable
            style={s.suspendedContactBtn}
            onPress={() => Linking.openURL(`mailto:${flags.supportEmail ?? DEFAULT_SUPPORT_EMAIL}`)}>
            <FontAwesome5 name="envelope" size={16} color="#fff" />
            <Text style={s.suspendedContactBtnText}>{t('auth.login.suspendedContactBtn')}</Text>
          </Pressable>
          <Pressable style={s.modalCancel} onPress={() => setSuspendedModal(false)}>
            <Text style={s.modalCancelText}>{t('auth.login.suspendedClose')}</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}

// ── Create Account form ───────────────────────────────────────────────────────

function SignupForm({ initialRole, onGooglePress, googleLoading, googleError, onFacebookPress, facebookLoading, facebookError }: {
  initialRole?: 'CREATOR' | 'BUSINESS';
  onGooglePress: () => void;
  googleLoading: boolean;
  googleError: string;
  onFacebookPress: () => void;
  facebookLoading: boolean;
  facebookError: string;
}) {
  const C = useAppColors();
  const { isDark } = useIsDark();
  const s = useMemo(() => makeStyles(C), [C]);
  const { t } = useLanguage();

  // Account type is chosen up front on /account-type (the primary Welcome →
  // Get Started path) and carried in via initialRole; immutable for the
  // lifetime of this mount.
  const [role] = useState<'CREATOR' | 'BUSINESS'>(initialRole ?? 'CREATOR');
  const [identifierInput, setIdentifierInput] = useState('');
  const [password,  setPassword]  = useState('');
  const [agreed,    setAgreed]    = useState(false);
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
    if (!agreed) { setError(t('auth.signup.termsRequired')); return; }
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

  const roles = buildRoles(C, isDark);
  const activeRole = roles.find((r) => r.key === role)!;
  const roleLabel = role === 'CREATOR' ? t('accountType.offerTitle') : t('accountType.seekTitle');

  return (
    <View>
      {/* Carries over the choice made on /account-type ("Offering services" /
          "Looking for services") so it isn't lost once the user lands here — with
          a way back to that screen (current choice pre-selected) if they want
          to change it. */}
      <Pressable
        style={[s.roleSummaryRow, { borderColor: C.border, backgroundColor: C.surface }]}
        onPress={() => router.push({ pathname: '/account-type', params: { role } })}>
        <LinearGradient colors={activeRole.grad} style={s.roleSummaryIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <FontAwesome5 name={role === 'CREATOR' ? 'magic' : 'search'} size={14} color="#fff" solid />
        </LinearGradient>
        <Text style={s.roleSummaryText}>
          {t('auth.signup.signingUpAs')} <Text style={[s.roleSummaryTextBold, { color: activeRole.grad[0] }]}>{roleLabel}</Text>
        </Text>
        <Text style={[s.roleSummaryChange, { color: C.brinjal1 }]}>{t('auth.signup.changeRole')}</Text>
      </Pressable>

      <View style={s.formHeading}>
        <Text style={s.formHeadingTitle}>{t('auth.signup.title')}</Text>
        <Text style={s.formHeadingSubtitle}>{t('auth.signup.subtitle')}</Text>
      </View>

      {/* Fields */}
      <View style={s.form}>
        <IdentifierField
          value={identifierInput}
          onChangeText={(v) => { setIdentifierInput(v); setError(''); }}
          placeholder={t('auth.signup.identifierPlaceholder')}
          accessibilityLabel={t('auth.signup.identifierLabel')}
          error={emErr}
        />
        <FlatInput
          value={password}
          onChangeText={(v) => { setPassword(v); setError(''); }}
          placeholder={t('auth.signup.passwordCreatePlaceholder')}
          accessibilityLabel={t('auth.signup.password')}
          secureTextEntry secureToggle error={pwErr}
        />
        {password.length > 0 && (
          <View style={s.rulesRow}>
            {PW_RULES.map((rule, idx) => {
              const ok = rule.test(password);
              const ruleLabel = idx === 0 ? t('auth.signup.pwRule8Chars') : idx === 1 ? t('auth.signup.pwRuleUppercase') : t('auth.signup.pwRuleNumber');
              return (
                <View key={rule.label} style={[s.rulePill, { backgroundColor: ok ? withAlpha(C.active, 0.12) : C.primaryLight, borderColor: ok ? withAlpha(C.active, 0.4) : C.border }]}>
                  <FontAwesome5 name={ok ? 'check-circle' : 'circle'} solid={ok} size={11} color={ok ? C.active : C.brinjal1} />
                  <Text style={[s.ruleText, { color: ok ? C.active : C.brinjal1 }]}>{ruleLabel}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <Pressable style={s.termsRow} onPress={() => { setAgreed((v) => !v); setError(''); }} hitSlop={8}>
        <FontAwesome5 name={agreed ? 'check-square' : 'square'} solid={agreed} size={19} color={agreed ? C.brinjal1 : C.textSecondary} />
        <Text style={s.termsRowText}>
          {t('auth.signup.termsPrefix')}{' '}
          <Text style={{ color: C.brinjal1, fontFamily: F.semibold }} onPress={() => router.push('/legal?type=terms' as never)}>{t('auth.signup.termsLink')}</Text>
          {' '}{t('auth.signup.termsAnd')}{' '}
          <Text style={{ color: C.brinjal1, fontFamily: F.semibold }} onPress={() => router.push('/legal?type=privacy-policy' as never)}>{t('auth.signup.privacyLink')}</Text>
        </Text>
      </Pressable>

      {!!error && (
        <View style={[s.banner, { backgroundColor: withAlpha(C.error, 0.12), borderColor: withAlpha(C.error, 0.35) }]}>
          <FontAwesome5 name="exclamation-circle" solid size={15} color={C.error} />
          <Text style={[s.bannerText, { color: C.error }]}>{error}</Text>
        </View>
      )}

      <Pressable
        onPress={handleCreate} disabled={loading}
        style={({ pressed }) => [s.primaryBtnWrap, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
        <View style={[s.primaryBtn, { backgroundColor: C.brinjal1 }]}>
          {loading
            ? <FontAwesome5 name="sync" solid size={18} color="#fff" />
            : <Text style={s.primaryBtnText}>{t('auth.signup.createAccountBtn')}</Text>}
        </View>
      </Pressable>

      <View style={s.divider}>
        <View style={[s.dividerLine, { backgroundColor: C.border }]} />
        <Text style={s.dividerText}>{t('auth.signup.or')}</Text>
        <View style={[s.dividerLine, { backgroundColor: C.border }]} />
      </View>

      <View style={s.socialCardRow}>
        <Pressable
          style={({ pressed }) => [s.socialCardBtn, { borderColor: C.border, backgroundColor: C.surface }, googleLoading && { opacity: 0.6 }, pressed && !googleLoading && { backgroundColor: C.primaryLight }]}
          onPress={onGooglePress} disabled={googleLoading}
          accessibilityLabel={t('auth.signup.continueGoogle')}>
          {googleLoading
            ? <View style={[s.spinner, { borderColor: C.border, borderTopColor: C.brinjal1 }]} />
            : <ExpoImage source={require('@/assets/images/google.png')} style={s.socialCardIcon} contentFit="contain" />}
          <Text style={[s.socialCardText, { color: C.text }]}>Google</Text>
        </Pressable>
        {FACEBOOK_LOGIN_ENABLED && (
          <Pressable
            style={({ pressed }) => [s.socialCardBtn, { borderColor: C.border, backgroundColor: C.surface }, facebookLoading && { opacity: 0.6 }, pressed && !facebookLoading && { backgroundColor: C.primaryLight }]}
            onPress={onFacebookPress} disabled={facebookLoading}
            accessibilityLabel={t('auth.signup.continueFacebook')}>
            {facebookLoading
              ? <View style={[s.spinner, { borderColor: C.border, borderTopColor: C.brinjal1 }]} />
              : <View style={s.fbBadgeSmall}><Text style={s.fbF}>f</Text></View>}
            <Text style={[s.socialCardText, { color: C.text }]}>Facebook</Text>
          </Pressable>
        )}
      </View>

      {!!googleError && (
        <View style={[s.banner, { backgroundColor: withAlpha(C.error, 0.12), borderColor: withAlpha(C.error, 0.35) }]}>
          <FontAwesome5 name="exclamation-circle" solid size={15} color={C.error} />
          <Text style={[s.bannerText, { color: C.error }]}>{googleError}</Text>
        </View>
      )}
      {FACEBOOK_LOGIN_ENABLED && !!facebookError && (
        <View style={[s.banner, { backgroundColor: withAlpha(C.error, 0.12), borderColor: withAlpha(C.error, 0.35) }]}>
          <FontAwesome5 name="exclamation-circle" solid size={15} color={C.error} />
          <Text style={[s.bannerText, { color: C.error }]}>{facebookError}</Text>
        </View>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { user, reloadUser }      = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const C                         = useAppColors();
  const { isDark }                = useIsDark();
  const s                         = useMemo(() => makeStyles(C), [C]);
  const ROLES                     = useMemo(() => buildRoles(C, isDark), [C, isDark]);
  const params                    = useLocalSearchParams<{ tab?: string; verified?: string; role?: string }>();
  const insets                    = useSafeAreaInsets();
  const [tab, setTab]             = useState<'login' | 'signup'>(params.tab === 'signup' ? 'signup' : 'login');

  // account-type.tsx sends the user back here via router.replace('/login', { tab: 'signup', role })
  // after they pick a role — but replace commonly reuses this screen's already-mounted instance
  // (it was pushed underneath when "Sign up" was tapped), so the useState initializer above never
  // re-runs. Syncing here on every params.tab change is what actually flips the tab in that case.
  useEffect(() => {
    if (params.tab === 'signup' || params.tab === 'login') setTab(params.tab);
  }, [params.tab]);

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
    // Facebook's OAuth dialog rejects the request with "This app needs at
    // least one supported permission" if no scope is sent at all.
    scopes: ['public_profile', 'email'],
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

  const canGoBack    = router.canGoBack();

  return (
    <View style={s.root}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <MaxWidthContainer>
        <View style={s.flex}>
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Hero ── soft-tinted banner: logo, 3-line headline, subtext. */}
          <LinearGradient
            colors={[C.background, C.primaryLight]}
            start={{ x: 0, y: 0 }} end={{ x: 0.3, y: 1 }}
            style={s.heroBanner}>

            <View style={[s.heroTopRow, { paddingTop: insets.top + 12 }]}>
              {canGoBack
                ? (
                  <Pressable onPress={() => router.back()} hitSlop={8} style={s.heroBackBtn}>
                    <FontAwesome5 name="arrow-left" size={16} color={C.text} />
                  </Pressable>
                )
                : <View />}

              {/* Lang toggle — shows the language you'd switch TO, not the current
                  one; tapping applies that switch. */}
              <Pressable
                style={s.langBtn}
                hitSlop={6}
                onPress={() => setLanguage(language === 'en' ? 'ne' : 'en')}>
                <Text style={[s.langText, { color: C.textSecondary }]}>{LANG_LABELS[language === 'en' ? 'ne' : 'en']}</Text>
              </Pressable>
            </View>

            <View style={s.heroTopSpacer} />

            <ExpoImage source={HERO_IMAGE} style={s.heroLogo} contentFit="contain" />

            <View style={s.heroHeadingBlock}>
              <Text style={[s.heroHeadlineLine, { color: C.text }]}>{t('auth.login.heroHeadline1')}</Text>
              <Text style={[s.heroHeadlineLine, { color: C.accent }]}>{t('auth.login.heroHeadline2')}</Text>
              <Text style={[s.heroHeadlineLine, { color: C.brinjal1 }]}>{t('auth.login.heroHeadline3')}</Text>
              <Text style={[s.heroSubtext, { color: C.textSecondary }]}>{t('auth.login.heroSubtext')}</Text>
            </View>
          </LinearGradient>

          {/* ── Form section — a rounded sheet overlapping the hero's bottom
              edge, so the hero and form read as one layered composition. ── */}
          <Animated.View
            style={[
              s.card,
              {
                opacity: cardAnim,
                transform: [{
                  translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
                }],
              },
            ]}>

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
                : <SignupForm key={params.role} initialRole={params.role === 'BUSINESS' ? 'BUSINESS' : params.role === 'CREATOR' ? 'CREATOR' : undefined} onGooglePress={handleGooglePress} googleLoading={googleLoading} googleError={googleError} onFacebookPress={handleFacebookPress} facebookLoading={facebookLoading} facebookError={facebookError} />}
            </Animated.View>
          </Animated.View>

        </ScrollView>

        {/* ── Fixed footer ── pinned below the scroll content instead of living
            inside it, matching Instagram's own hairline-divided switch-account
            bar that always sits at the bottom of the screen. */}
        <Pressable
          style={[s.footerBar, { borderTopColor: C.border, paddingBottom: insets.bottom + 14 }]}
          onPress={() => tab === 'login' ? router.push('/account-type') : setTab('login')}>
          <Text style={s.switchTabText}>
            {tab === 'login' ? t('auth.login.noAccount') : t('welcome.alreadyHaveAccount')}{' '}
            <Text style={[s.switchTabLink, { color: C.brinjal1 }]}>
              {tab === 'login' ? t('auth.login.signUpLink') : t('auth.login.signIn')}
            </Text>
          </Text>
        </Pressable>
        </View>
        </MaxWidthContainer>
      </KeyboardAvoidingView>

      {/* Role selection modal — shown for new Google users */}
      <BottomSheet visible={roleModal} onClose={() => setRoleModal(false)} contentContainerStyle={{ gap: 4 }}>
        <Text style={s.modalTitle}>{t('auth.login.roleModalTitle')}</Text>
        <Text style={s.modalSub}>{t('auth.login.roleModalSub')}</Text>
        <View style={s.roleRow}>
          {ROLES.map((r) => {
            const roleLabel = r.key === 'CREATOR' ? t('auth.signup.roleCreatorLabel') : t('auth.signup.roleBusinessLabel');
            const roleSub   = r.key === 'CREATOR' ? t('auth.signup.roleCreatorSub')   : t('auth.signup.roleBusinessSub');
            return (
              <Pressable
                key={r.key}
                style={({ pressed }) => [s.roleCard, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
                onPress={() => void handleRoleSelect(r.key)}>
                <LinearGradient colors={r.grad} style={s.roleIconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <FontAwesome5 name={r.icon} size={22} color="#fff" solid />
                </LinearGradient>
                <Text style={[s.roleLabel, { color: C.text }]}>{roleLabel}</Text>
                <Text style={[s.roleSub, { color: C.textSecondary }]}>{roleSub}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable style={s.modalCancel} onPress={() => setRoleModal(false)}>
          <Text style={s.modalCancelText}>{t('auth.login.roleModalCancel')}</Text>
        </Pressable>
      </BottomSheet>

    </View>
  );
}

function makeStyles(C: typeof COLORS) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: C.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // ── Gradient hero — brand-color banner (brinjal1 → brinjal2), logo badge
  // + collaboration illustration, rounded bottom edge the form card overlaps.
  heroBanner:  { width: '100%', overflow: 'hidden', borderBottomLeftRadius: RADIUS.xl, borderBottomRightRadius: RADIUS.xl, paddingBottom: 20 },
  heroTopRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 16 },
  heroBackBtn: { width: 38, height: 38, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  heroTopSpacer: { height: 10 },

  // Lang toggle — sits over the hero as a flat pill showing only the
  // language you'd switch TO; tapping applies that switch.
  langBtn:  { minWidth: 44, height: 34, paddingHorizontal: 12, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
  langText: { fontSize: 13, fontFamily: F.bold },

  heroLogo: { width: 84, height: 30, alignSelf: 'center', marginBottom: 14 },

  heroHeadingBlock:  { alignItems: 'center', paddingHorizontal: 28, marginBottom: 22 },
  heroHeadlineLine:  { fontSize: 21, fontFamily: F.extrabold, lineHeight: 27, textAlign: 'center' },
  heroSubtext:       { fontSize: 13, fontFamily: F.regular, lineHeight: 19, textAlign: 'center', marginTop: 8 },

  // ── Form section ──
  // Rounded-top sheet that overlaps the gradient's bottom edge slightly, so
  // the hero and the form read as one layered composition rather than two
  // stacked blocks.
  card: {
    backgroundColor: C.background, paddingHorizontal: 22, paddingTop: 26, paddingBottom: 28,
    marginTop: -RADIUS.xl, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
  },

  // Form heading — sits above the Login/Signup fields now that the hero banner above
  // (logo + tagline) no longer carries a "Welcome back" / "Create account" title itself.
  formHeading:         { marginBottom: 22, gap: 4, alignItems: 'center' },
  formHeadingTitle:    { fontSize: 24, fontFamily: F.bold, color: C.text, letterSpacing: 0.2, textAlign: 'center' },
  formHeadingSubtitle: { fontSize: 14, fontFamily: F.regular, color: C.textSecondary, lineHeight: 20, textAlign: 'center' },

  // Role summary — confirms the choice made on /account-type ("Offering services" /
  // "Looking for services") and links back to it to change.
  roleSummaryRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: RADIUS.md, borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 20 },
  roleSummaryIcon:      { width: 30, height: 30, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  roleSummaryText:      { flex: 1, fontSize: 13, fontFamily: F.regular, color: C.textSecondary },
  roleSummaryTextBold:  { fontFamily: F.bold },
  roleSummaryChange:    { fontSize: 12.5, fontFamily: F.bold },

  // Switch-tab bar — pinned outside the scroll content at the bottom of the
  // screen (hairline divider + centered prompt), matching Instagram's own
  // fixed "Don't have an account? Sign up." footer.
  footerBar:     { alignItems: 'center', justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14 },
  switchTabText: { fontSize: 13, fontFamily: F.regular, color: C.textSecondary },
  switchTabLink: { fontFamily: F.bold },

  // Banners
  banner:     { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: RADIUS.md, borderWidth: 1, marginBottom: 16 },
  bannerText: { fontSize: 13, flex: 1, fontFamily: F.medium },

  // Remember me
  rememberRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, marginTop: -4 },
  rememberText: { fontSize: 13, fontFamily: F.medium, color: C.text },

  // Form
  form: { gap: 12, marginBottom: 20 },

  // Flat, label-less input — Instagram-style filled field, placeholder doubles
  // as the label. Local to this screen only (see FlatInput above).
  flatInputRow:   { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.sm, borderWidth: 1.5, paddingHorizontal: 14, minHeight: 50 },
  flatInput:      { flex: 1, fontSize: 15, paddingVertical: 12 },
  flatInputEyeBtn:{ paddingLeft: 8 },
  feedbackRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 2 },
  errorText:      { fontSize: 11, fontFamily: F.medium },

  // "Forgot password?" — centered link below the primary button, Instagram-style.
  forgotWrap:  { alignItems: 'center', marginBottom: 20 },
  forgotText:  { fontSize: 13, fontFamily: F.semibold, color: C.brinjal1 },

  domainSuggestBoxOuter: { borderRadius: RADIUS.md, shadowColor: C.brinjal2, shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  domainSuggestBox:      { borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: C.surface },
  domainSuggestItem:     { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  domainSuggestText:     { fontSize: 14, fontFamily: F.regular, color: C.textSecondary },
  domainSuggestTextBold: { fontFamily: F.semibold, color: C.text },

  // Role cards
  roleRow:       { flexDirection: 'row', gap: 14, marginBottom: 22 },
  roleCard:      { flex: 1, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: C.border, padding: 18, gap: 10, alignItems: 'center', position: 'relative' },
  roleIconBox:   { width: 58, height: 58, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  roleLabel:     { fontSize: 14, fontFamily: F.bold, textAlign: 'center', color: C.text },
  roleSub:       { fontSize: 11.5, fontFamily: F.regular, textAlign: 'center', lineHeight: 16 },

  // Password rules
  rulesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: -8 },
  rulePill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  ruleText: { fontSize: 11, fontFamily: F.medium },

  // Button — Instagram-style rounded-rect (not a full pill), solid brinjal
  // fill with a light, close-in shadow rather than a heavy glow.
  primaryBtnWrap: { borderRadius: RADIUS.sm, marginBottom: 12, shadowColor: C.brinjal1, shadowOpacity: 0.16, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  primaryBtn:     { height: 50, borderRadius: RADIUS.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryBtnText: { fontSize: 16, color: '#fff', fontFamily: F.bold, letterSpacing: 0.3 },

  // Divider
  divider:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, color: C.textSecondary, fontFamily: F.medium },

  // Biometric quick-login keeps the full-width labeled pill.
  socialBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface, shadowColor: C.brinjal2, shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  socialBtnFull:  { flex: 0, marginBottom: 12 },
  socialBtnText:  { fontSize: 14, fontFamily: F.semibold, color: C.text },

  // Google/Facebook — bordered card buttons in a row, shared by both LoginForm and SignupForm.
  socialCardRow:  { flexDirection: 'row', gap: 10, marginBottom: 4 },
  socialCardBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: RADIUS.sm, borderWidth: 1.5 },
  socialCardIcon: { width: 18, height: 18 },
  socialCardText: { fontSize: 13.5, fontFamily: F.semibold },

  // Facebook badge keeps Facebook's own brand blue regardless of theme — this is a
  // third-party brand mark, not part of the app's own color system.
  fbBadgeSmall:   { width: 22, height: 22, borderRadius: RADIUS.full, backgroundColor: '#1877F2', justifyContent: 'center', alignItems: 'center' },
  fbF:            { color: '#fff', fontSize: 13, fontFamily: F.bold },
  spinner:        { width: 18, height: 18, borderRadius: RADIUS.full, borderWidth: 2, borderColor: C.border, borderTopColor: C.brinjal1 },

  // Role modal
  modalTitle:      { fontSize: 20, fontFamily: F.bold, color: C.text, textAlign: 'center' },
  modalSub:        { fontSize: 14, fontFamily: F.regular, color: C.textSecondary, textAlign: 'center', marginBottom: 20 },
  modalCancel:     { marginTop: 16, alignItems: 'center', padding: 12 },
  modalCancelText: { fontSize: 15, fontFamily: F.semibold, color: C.textSecondary },

  // Suspended-account modal
  suspendedSheet:          { alignItems: 'center', paddingTop: 8 },
  suspendedIconWrap:       { width: 56, height: 56, borderRadius: RADIUS.full, backgroundColor: withAlpha(C.error, 0.12), justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  suspendedContactBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.brinjal1, borderRadius: RADIUS.full, paddingVertical: 14, paddingHorizontal: 20, width: '100%', marginTop: 4 },
  suspendedContactBtnText: { fontSize: 15, fontFamily: F.semibold, color: '#fff' },

  // Terms checkbox — sits above the Create Account button (SignupForm only).
  termsRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
  termsRowText: { flex: 1, fontSize: 12.5, fontFamily: F.regular, color: C.textSecondary, lineHeight: 18 },
  });
}
