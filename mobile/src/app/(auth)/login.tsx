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
import { COLORS, BUSINESS_COLORS, F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING, lineHeightFor } from '@/utilities/constants';
import { withAlpha } from '@/utilities/color';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { BackButton } from '@/components/BackButton';
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

// Same logo backs both the sign-in and create-account headers.
const HERO_IMAGE = require('@/assets/images/logo.png');

// The hero panel's artwork — Kolab's own collaboration illustration, matted to
// a transparent background (the wordmark is cropped out, since the header
// already carries the logo) so it can sit directly on the purple gradient
// instead of inside a white box.
const HERO_ART = require('@/assets/images/login/collaborate.png');

// Far end of the hero gradient — the same brand-purple diagonal the creator
// home feed's primary CTA card uses, so the first surface a signed-out user
// sees is the one they'll meet again once they're inside the app.
const HERO_GRADIENT_END = '#7C3AED';

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

// ── Field ────────────────────────────────────────────────────────────────────
// Filled, label-less field with a leading glyph — the same shape as the app's
// shared SearchInput (primaryLight fill, 1.5 hairline that lights up on focus,
// RADIUS.lg), so the auth form's inputs read as the same control the creator
// home screen puts at the top of its feed. Local to this screen only; the rest
// of the app keeps using the icon+label TextInputWithLabel.

function FlatInput({ value, onChangeText, placeholder, icon, secureToggle, secureTextEntry, error, onFocus, onBlur, ...rest }: TextInputProps & {
  icon?: keyof typeof FontAwesome5.glyphMap;
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
        {!!icon && (
          <FontAwesome5 name={icon} solid size={15} color={error ? C.error : focused ? C.brinjal1 : C.textSecondary} />
        )}
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

// ── Inline banner ────────────────────────────────────────────────────────────
// Same anatomy as the shared AttentionBanner the home feeds use (tinted
// rounded-square glyph + message on a soft tint), recoloured per tone instead
// of that component's fixed amber, since these carry success/error meaning.

function FormBanner({ tone, icon, text }: {
  tone: 'success' | 'error';
  icon: keyof typeof FontAwesome5.glyphMap;
  text: string;
}) {
  const C = useAppColors();
  const s = useMemo(() => makeStyles(C), [C]);
  const color = tone === 'error' ? C.error : C.active;

  return (
    <View style={[s.banner, { backgroundColor: withAlpha(color, 0.10), borderColor: withAlpha(color, 0.28) }]}>
      <View style={[s.bannerIconWrap, { backgroundColor: withAlpha(color, 0.16) }]}>
        <FontAwesome5 name={icon} solid size={14} color={color} />
      </View>
      <Text style={[s.bannerText, { color }]}>{text}</Text>
    </View>
  );
}

// ── Social auth section ──────────────────────────────────────────────────────
// Divider + provider cards, identical on the Log in and Create account tabs —
// one component instead of the two hand-kept-in-sync copies this screen used
// to carry. The cards use the app's standard resting-surface treatment
// (surface fill, hairline border, SHADOW.card), same as the list rows on the
// creator home feed.

function SocialAuthSection({ orLabel, googleLabel, facebookLabel, onGooglePress, googleLoading, googleError, onFacebookPress, facebookLoading, facebookError }: {
  orLabel: string;
  googleLabel: string;
  facebookLabel: string;
  onGooglePress: () => void;
  googleLoading: boolean;
  googleError: string;
  onFacebookPress: () => void;
  facebookLoading: boolean;
  facebookError: string;
}) {
  const C = useAppColors();
  const s = useMemo(() => makeStyles(C), [C]);

  return (
    <View style={s.socialGroup}>
      <View style={s.divider}>
        <View style={[s.dividerLine, { backgroundColor: C.border }]} />
        <Text style={s.dividerText}>{orLabel}</Text>
        <View style={[s.dividerLine, { backgroundColor: C.border }]} />
      </View>

      <View style={s.socialCardRow}>
        <Pressable
          style={({ pressed }) => [
            s.socialCardBtn, { borderColor: C.border, backgroundColor: C.surface }, SHADOW.card,
            googleLoading && { opacity: 0.6 },
            pressed && !googleLoading && { backgroundColor: C.primaryLight, transform: [{ scale: 0.98 }] },
          ]}
          onPress={onGooglePress} disabled={googleLoading}
          accessibilityRole="button"
          accessibilityLabel={googleLabel}>
          {googleLoading
            ? <View style={[s.spinner, { borderColor: C.border, borderTopColor: C.brinjal1 }]} />
            : <ExpoImage source={require('@/assets/images/google.png')} style={s.socialCardIcon} contentFit="contain" />}
          <Text style={[s.socialCardText, { color: C.text }]}>Google</Text>
        </Pressable>
        {FACEBOOK_LOGIN_ENABLED && (
          <Pressable
            style={({ pressed }) => [
              s.socialCardBtn, { borderColor: C.border, backgroundColor: C.surface }, SHADOW.card,
              facebookLoading && { opacity: 0.6 },
              pressed && !facebookLoading && { backgroundColor: C.primaryLight, transform: [{ scale: 0.98 }] },
            ]}
            onPress={onFacebookPress} disabled={facebookLoading}
            accessibilityRole="button"
            accessibilityLabel={facebookLabel}>
            {facebookLoading
              ? <View style={[s.spinner, { borderColor: C.border, borderTopColor: C.brinjal1 }]} />
              : <View style={s.fbBadgeSmall}><Text style={s.fbF}>f</Text></View>}
            <Text style={[s.socialCardText, { color: C.text }]}>Facebook</Text>
          </Pressable>
        )}
      </View>

      {!!googleError && <FormBanner tone="error" icon="exclamation-circle" text={googleError} />}
      {FACEBOOK_LOGIN_ENABLED && !!facebookError && <FormBanner tone="error" icon="exclamation-circle" text={facebookError} />}
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
        // Switches with what the user is actually typing — the field accepts
        // either an email or a phone number, so the glyph tracks the channel
        // rather than committing to one of them up front.
        icon={value.length === 0 ? 'user' : identifierChannel(value) === 'email' ? 'envelope' : 'phone-alt'}
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
    <View style={s.formGroup}>
      {/* Form card — surface fill, hairline border, raised lift: the same card
          treatment every row and section on the creator home feed uses, so the
          form reads as a piece of the app rather than a separate auth skin. */}
      <View style={[s.formCard, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.raised]}>
        <View style={s.formHeading}>
          <Text style={s.formHeadingTitle}>{t('auth.login.title')}</Text>
          <Text style={s.formHeadingSubtitle}>{t('auth.login.subtitle')}</Text>
        </View>

        {verified === '1' && <FormBanner tone="success" icon="check-circle" text={t('auth.login.verifiedBanner')} />}
        {!!apiError && <FormBanner tone="error" icon="exclamation-circle" text={apiError} />}

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
            icon="lock"
            secureTextEntry secureToggle error={pwErr}
          />
        </View>

        <Pressable
          style={s.checkRow}
          onPress={() => setRememberMe((v) => !v)}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: rememberMe }}
          accessibilityLabel={t('auth.login.rememberMe')}>
          <FontAwesome5 name={rememberMe ? 'check-square' : 'square'} solid={rememberMe} size={19} color={rememberMe ? C.brinjal1 : C.textSecondary} />
          <Text style={s.checkRowText}>{t('auth.login.rememberMe')}</Text>
        </Pressable>

        {/* Primary action — solid brand pill with a coloured glow, the same
            emphasis treatment the home feed gives its own primary buttons. */}
        <Pressable
          onPress={handleLogin} disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('auth.login.loginBtn')}
          style={({ pressed }) => [s.primaryBtnWrap, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <View style={[s.primaryBtn, { backgroundColor: C.brinjal1 }]}>
            {loading
              ? <FontAwesome5 name="sync" solid size={18} color="#fff" />
              : <>
                  <Text style={s.primaryBtnText}>{t('auth.login.loginBtn')}</Text>
                  <FontAwesome5 name="arrow-right" solid size={13} color="#fff" />
                </>}
          </View>
        </Pressable>

        <Pressable style={s.forgotWrap} onPress={() => router.push('/forgot-password')} hitSlop={8}>
          <Text style={s.forgotText}>{t('auth.login.forgotPassword')}</Text>
        </Pressable>
      </View>

      {biometricReady && (
        <Pressable
          style={({ pressed }) => [
            s.socialCardBtn, s.socialCardBtnFull, { borderColor: C.border, backgroundColor: C.surface }, SHADOW.card,
            biometricLoading && { opacity: 0.6 },
            pressed && !biometricLoading && { transform: [{ scale: 0.98 }], backgroundColor: C.primaryLight },
          ]}
          accessibilityRole="button"
          onPress={handleBiometricLogin} disabled={biometricLoading}>
          {biometricLoading
            ? <View style={[s.spinner, { borderColor: C.border, borderTopColor: C.brinjal1 }]} />
            : <FontAwesome5 name={biometricLabel === 'Face ID' ? 'smile' : 'fingerprint'} size={17} color={C.brinjal1} />}
          <Text style={[s.socialCardText, { color: C.text }]}>
            {biometricLoading ? t('auth.login.signingIn') : t('auth.login.biometricLoginBtn', { biometricLabel })}
          </Text>
        </Pressable>
      )}

      <SocialAuthSection
        orLabel={t('auth.login.or')}
        googleLabel={t('auth.login.continueGoogle')}
        facebookLabel={t('auth.login.continueFacebook')}
        onGooglePress={onGooglePress} googleLoading={googleLoading} googleError={googleError}
        onFacebookPress={onFacebookPress} facebookLoading={facebookLoading} facebookError={facebookError}
      />

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
    <View style={s.formGroup}>
      <View style={[s.formCard, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.raised]}>
        <View style={s.formHeading}>
          <Text style={s.formHeadingTitle}>{t('auth.signup.title')}</Text>
          <Text style={s.formHeadingSubtitle}>{t('auth.signup.subtitle')}</Text>
        </View>

        {/* Carries over the choice made on /account-type ("Offering services" /
            "Looking for services") so it isn't lost once the user lands here — with
            a way back to that screen (current choice pre-selected) if they want
            to change it. Shaped as a pill rather than a full-width row, matching
            the inline filter chips the home feed puts under its section titles. */}
        <Pressable
          style={[s.roleChip, { backgroundColor: C.primaryLight, borderColor: C.border }]}
          accessibilityRole="button"
          accessibilityLabel={`${t('auth.signup.signingUpAs')} ${roleLabel} — ${t('auth.signup.changeRole')}`}
          onPress={() => router.push({ pathname: '/account-type', params: { role } })}>
          <LinearGradient colors={activeRole.grad} style={s.roleChipIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <FontAwesome5 name={role === 'CREATOR' ? 'magic' : 'search'} size={11} color="#fff" solid />
          </LinearGradient>
          <Text style={s.roleChipText} numberOfLines={1}>
            {t('auth.signup.signingUpAs')} <Text style={[s.roleChipTextBold, { color: activeRole.grad[0] }]}>{roleLabel}</Text>
          </Text>
          <Text style={[s.roleChipChange, { color: C.brinjal1 }]}>{t('auth.signup.changeRole')}</Text>
        </Pressable>

        {!!error && <FormBanner tone="error" icon="exclamation-circle" text={error} />}

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
            icon="lock"
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

        <Pressable
          style={[s.checkRow, s.checkRowTop]}
          onPress={() => { setAgreed((v) => !v); setError(''); }}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}>
          <FontAwesome5 name={agreed ? 'check-square' : 'square'} solid={agreed} size={19} color={agreed ? C.brinjal1 : C.textSecondary} />
          <Text style={s.termsRowText}>
            {t('auth.signup.termsPrefix')}{' '}
            <Text style={{ color: C.brinjal1, fontFamily: F.semibold }} onPress={() => router.push('/legal?type=terms' as never)}>{t('auth.signup.termsLink')}</Text>
            {' '}{t('auth.signup.termsAnd')}{' '}
            <Text style={{ color: C.brinjal1, fontFamily: F.semibold }} onPress={() => router.push('/legal?type=privacy-policy' as never)}>{t('auth.signup.privacyLink')}</Text>
          </Text>
        </Pressable>

        <Pressable
          onPress={handleCreate} disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('auth.signup.createAccountBtn')}
          style={({ pressed }) => [s.primaryBtnWrap, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <View style={[s.primaryBtn, { backgroundColor: C.brinjal1 }]}>
            {loading
              ? <FontAwesome5 name="sync" solid size={18} color="#fff" />
              : <>
                  <Text style={s.primaryBtnText}>{t('auth.signup.createAccountBtn')}</Text>
                  <FontAwesome5 name="arrow-right" solid size={13} color="#fff" />
                </>}
          </View>
        </Pressable>
      </View>

      <SocialAuthSection
        orLabel={t('auth.signup.or')}
        googleLabel={t('auth.signup.continueGoogle')}
        facebookLabel={t('auth.signup.continueFacebook')}
        onGooglePress={onGooglePress} googleLoading={googleLoading} googleError={googleError}
        onFacebookPress={onFacebookPress} facebookLoading={facebookLoading} facebookError={facebookError}
      />
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

        {/* Header — pinned above the scroll rather than scrolling with it, the
            same anatomy as the creator home header: a circular surface button
            on the left, the identity in the middle, a pill control on the
            right. */}
        <View style={[s.headerRow, { backgroundColor: C.background, paddingTop: insets.top + SPACING.md }]}>
          {canGoBack && <BackButton fallback="/" />}
          <View style={s.headerBrand}>
            <ExpoImage source={HERO_IMAGE} style={s.headerLogo} contentFit="contain" />
          </View>

          {/* Lang toggle — shows the language you'd switch TO, not the current
              one; tapping applies that switch. */}
          <Pressable
            style={[s.langChip, { backgroundColor: C.primaryLight, borderColor: C.border }]}
            hitSlop={8}
            accessibilityRole="button"
            onPress={() => setLanguage(language === 'en' ? 'ne' : 'en')}>
            <FontAwesome5 name="globe" solid size={11} color={C.brinjal1} />
            <Text style={[s.langChipText, { color: C.brinjal1 }]}>{LANG_LABELS[language === 'en' ? 'ne' : 'en']}</Text>
          </Pressable>
        </View>

        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <Animated.View
            style={[
              s.heroGroup,
              {
                opacity: cardAnim,
                transform: [{
                  translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
                }],
              },
            ]}>

            {/* ── Hero ── the gradient panel that opens the creator home feed,
                reused here to carry the brand headline: diagonal brand
                gradient, hero-level padding, the collaboration artwork bled
                into the bottom-right corner and a floating lift. */}
            <LinearGradient
              colors={[C.brinjal1, HERO_GRADIENT_END]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.heroCard}>
              {/* Grouped so the card's own `gap` spaces the headline block as
                  a whole — the three lines themselves stay set solid. */}
              <View>
                <Text style={s.heroHeadlineLine}>{t('auth.login.heroHeadline1')}</Text>
                <Text style={s.heroHeadlineLine}>{t('auth.login.heroHeadline2')}</Text>
                <Text style={s.heroHeadlineLine}>{t('auth.login.heroHeadline3')}</Text>
              </View>
              <Text style={s.heroSubtext}>{t('auth.login.heroSubtext')}</Text>

              {/* Hero art — replaces the flat handshake glyph this panel used
                  to carry. It bleeds into the card's bottom-right corner, and
                  a second white-to-transparent gradient washes underneath so
                  the illustration lifts off the purple rather than looking
                  pasted onto it. Decorative: the headline above already says
                  everything the picture says. */}
              <View style={s.heroArtWrap} pointerEvents="none">
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0.20)']}
                  start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.heroArtWash}
                />
                <ExpoImage source={HERO_ART} style={s.heroArt} contentFit="contain" accessible={false} />
              </View>
            </LinearGradient>

            {/* Form — crossfades between the two tabs */}
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

            {/* Reassurance line — closes the page the way the home feed closes
                its own: a quiet, non-actionable row after the content. */}
            <View style={s.trustRow}>
              <FontAwesome5 name="shield-alt" solid size={11} color={C.textSecondary} />
              <Text style={s.trustText}>{t('auth.login.footer')}</Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* ── Fixed footer ── pinned below the scroll content instead of living
            inside it, so the "switch to the other tab" escape hatch is always
            reachable without scrolling past the form. */}
        <Pressable
          style={[s.footerBar, { backgroundColor: C.background, borderTopColor: C.border, paddingBottom: insets.bottom + SPACING.md }]}
          accessibilityRole="button"
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
                accessibilityRole="button"
                accessibilityLabel={roleLabel}
                style={({ pressed }) => [
                  s.roleCard, { borderColor: C.border, backgroundColor: C.surface }, SHADOW.card,
                  { transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
                onPress={() => void handleRoleSelect(r.key)}>
                <LinearGradient colors={r.grad} style={s.roleIconBox} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <FontAwesome5 name={r.icon} size={20} color="#fff" solid />
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
  // Same gutter and bottom breathing room the home feeds use, so a user who
  // signs in doesn't watch the content shift sideways underneath them.
  scrollContent: { flexGrow: 1, paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxl },

  // ── Header ── pinned above the ScrollView (not scrolled with it), matching
  // the creator home header row: circular surface button, identity, pill.
  headerRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.lg },
  headerBrand:   { flex: 1 },
  headerLogo:    { width: 84, height: 28 },
  // Lang toggle — a brand-tinted pill, the same chip shape the home feed uses
  // for its inline filters. Shows only the language you'd switch TO.
  langChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, minHeight: 36, justifyContent: 'center' },
  langChipText: { fontSize: FONT_SIZE.xs, fontFamily: F.bold },

  // ── Layout rhythm ── one step (lg) between the hero, the form and the
  // closing reassurance line, so the page reads as three stacked blocks.
  heroGroup: { gap: SPACING.lg },

  // ── Hero ── the creator home CTA card, reused as the brand statement:
  // diagonal brand gradient, hero-level padding, translucent glyph circle,
  // floating lift.
  heroCard:         { borderRadius: RADIUS.xl, padding: SPACING.xl, gap: SPACING.md, overflow: 'hidden', ...SHADOW.floating },
  heroHeadlineLine: { fontSize: FONT_SIZE.xl, fontFamily: F.extrabold, color: '#fff', lineHeight: lineHeightFor(FONT_SIZE.xl) },
  heroSubtext:      { fontSize: FONT_SIZE.sm, fontFamily: F.regular, color: 'rgba(255,255,255,0.85)', lineHeight: lineHeightFor(FONT_SIZE.sm) },
  // Bled into the card's bottom-right corner — the negative margins cancel the
  // card's own padding so the artwork meets the rounded edge.
  heroArtWrap:      { alignSelf: 'flex-end', width: 196, height: 104, marginRight: -SPACING.xl, marginBottom: -SPACING.xl },
  heroArtWash:      { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroArt:          { width: '100%', height: '100%' },

  // ── Form ── a standard content card (surface + hairline + raised lift), the
  // same object the home feed stacks its rows and sections out of. One flat
  // `gap` inside it instead of per-child margins.
  formGroup: { gap: SPACING.lg },
  formCard:  { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: SPACING.lg },

  formHeading:         { gap: 2, alignItems: 'center' },
  formHeadingTitle:    { fontSize: FONT_SIZE.xl, fontFamily: F.bold, color: C.text, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.xl) },
  formHeadingSubtitle: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, color: C.textSecondary, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.sm) },

  // Role chip — confirms the choice made on /account-type and links back to it.
  // Pulled up by sm so it sits with the heading it qualifies rather than
  // floating at an equal distance between heading and fields.
  roleChip:         { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', maxWidth: '100%', gap: SPACING.sm, borderWidth: 1, borderRadius: RADIUS.full, paddingLeft: 6, paddingRight: SPACING.md, minHeight: 40, marginTop: -SPACING.sm },
  roleChipIcon:     { width: 28, height: 28, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  roleChipText:     { flexShrink: 1, fontSize: FONT_SIZE.xs, fontFamily: F.medium, color: C.textSecondary },
  roleChipTextBold: { fontFamily: F.bold },
  roleChipChange:   { fontSize: FONT_SIZE.xs, fontFamily: F.bold },

  // Inline banners — AttentionBanner's anatomy (tinted rounded-square glyph +
  // message), recoloured per tone.
  banner:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1 },
  bannerIconWrap:{ width: 30, height: 30, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  bannerText:    { flex: 1, fontSize: FONT_SIZE.sm, fontFamily: F.medium, lineHeight: lineHeightFor(FONT_SIZE.sm) },

  form: { gap: SPACING.md },

  // Filled field — SearchInput's shape (primaryLight fill, RADIUS.lg, 1.5
  // hairline that lights up on focus) with a leading glyph.
  flatInputRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1.5, paddingHorizontal: SPACING.lg, minHeight: 52 },
  flatInput:      { flex: 1, fontSize: FONT_SIZE.md, paddingVertical: SPACING.md },
  flatInputEyeBtn:{ paddingLeft: SPACING.xs },
  feedbackRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 6, paddingHorizontal: 2 },
  errorText:      { fontSize: FONT_SIZE.xs, fontFamily: F.medium, lineHeight: lineHeightFor(FONT_SIZE.xs) },

  domainSuggestBoxOuter: { borderRadius: RADIUS.md, ...SHADOW.raised },
  domainSuggestBox:      { borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: C.surface },
  domainSuggestItem:     { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  domainSuggestText:     { fontSize: FONT_SIZE.sm, fontFamily: F.regular, color: C.textSecondary },
  domainSuggestTextBold: { fontFamily: F.semibold, color: C.text },

  // Checkbox rows — "Remember me" and the terms consent. minHeight 44 keeps
  // the whole row a valid touch target, not just the 19px glyph.
  checkRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 44 },
  checkRowTop:  { alignItems: 'flex-start', paddingTop: 2 },
  checkRowText: { fontSize: FONT_SIZE.sm, fontFamily: F.medium, color: C.text },
  termsRowText: { flex: 1, fontSize: FONT_SIZE.sm, fontFamily: F.regular, color: C.textSecondary, lineHeight: lineHeightFor(FONT_SIZE.sm) },

  // Password rules
  rulesRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginTop: -SPACING.xs },
  rulePill: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  ruleText: { fontSize: FONT_SIZE.xs, fontFamily: F.medium },

  // Primary action — solid brand pill under a coloured glow, the same emphasis
  // the home feed gives its own primary buttons.
  primaryBtnWrap: { borderRadius: RADIUS.full, shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  primaryBtn:     { minHeight: 52, borderRadius: RADIUS.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  primaryBtnText: { fontSize: FONT_SIZE.md, color: '#fff', fontFamily: F.bold, letterSpacing: 0.3, lineHeight: lineHeightFor(FONT_SIZE.md) },

  // "Forgot password?" — pulled up so it reads as a tail on the button above
  // rather than a third, equally-weighted action.
  forgotWrap: { alignItems: 'center', justifyContent: 'center', minHeight: 32, marginTop: -SPACING.sm },
  forgotText: { fontSize: FONT_SIZE.sm, fontFamily: F.semibold, color: C.brinjal1 },

  // ── Social auth ──
  socialGroup:       { gap: SPACING.md },
  divider:           { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  dividerLine:       { flex: 1, height: 1 },
  dividerText:       { fontSize: FONT_SIZE.xs, color: C.textSecondary, fontFamily: F.medium },
  socialCardRow:     { flexDirection: 'row', gap: SPACING.md },
  socialCardBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, minHeight: 52, borderRadius: RADIUS.md, borderWidth: 1 },
  socialCardBtnFull: { flex: 0 },
  socialCardIcon:    { width: 18, height: 18 },
  socialCardText:    { fontSize: FONT_SIZE.sm, fontFamily: F.semibold },

  // Facebook badge keeps Facebook's own brand blue regardless of theme — this is a
  // third-party brand mark, not part of the app's own color system.
  fbBadgeSmall: { width: 22, height: 22, borderRadius: RADIUS.full, backgroundColor: '#1877F2', justifyContent: 'center', alignItems: 'center' },
  fbF:          { color: '#fff', fontSize: FONT_SIZE.sm, fontFamily: F.bold },
  spinner:      { width: 18, height: 18, borderRadius: RADIUS.full, borderWidth: 2, borderColor: C.border, borderTopColor: C.brinjal1 },

  // Closing reassurance line
  trustRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: SPACING.xs },
  trustText: { fontSize: FONT_SIZE.xs, fontFamily: F.medium, color: C.textSecondary, textAlign: 'center' },

  // Switch-tab bar — pinned outside the scroll content at the bottom of the
  // screen (hairline divider + centered prompt) so the escape hatch to the
  // other tab is always reachable without scrolling past the form.
  footerBar:     { alignItems: 'center', justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: SPACING.md, paddingHorizontal: SCREEN_GUTTER },
  switchTabText: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, color: C.textSecondary, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.sm) },
  switchTabLink: { fontFamily: F.bold },

  // ── Role modal ── the two cards borrow the home feed's Quick Action tile:
  // a rounded-square coloured glyph over a short label.
  modalTitle:      { fontSize: FONT_SIZE.xl, fontFamily: F.bold, color: C.text, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.xl) },
  modalSub:        { fontSize: FONT_SIZE.sm, fontFamily: F.regular, color: C.textSecondary, textAlign: 'center', marginBottom: SPACING.lg, lineHeight: lineHeightFor(FONT_SIZE.sm) },
  modalCancel:     { marginTop: SPACING.lg, alignItems: 'center', justifyContent: 'center', padding: SPACING.md, minHeight: 44 },
  modalCancelText: { fontSize: FONT_SIZE.md, fontFamily: F.semibold, color: C.textSecondary },

  roleRow:     { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  roleCard:    { flex: 1, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: SPACING.sm, alignItems: 'center' },
  roleIconBox: { width: 52, height: 52, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center' },
  roleLabel:   { fontSize: FONT_SIZE.sm, fontFamily: F.bold, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.sm) },
  roleSub:     { fontSize: FONT_SIZE.xs, fontFamily: F.regular, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.xs) },

  // Suspended-account modal
  suspendedSheet:          { alignItems: 'center', paddingTop: SPACING.sm },
  suspendedIconWrap:       { width: 56, height: 56, borderRadius: RADIUS.full, backgroundColor: withAlpha(C.error, 0.12), justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  suspendedContactBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: C.brinjal1, borderRadius: RADIUS.full, minHeight: 52, paddingHorizontal: SPACING.lg, width: '100%', marginTop: SPACING.xs },
  suspendedContactBtnText: { fontSize: FONT_SIZE.md, fontFamily: F.semibold, color: '#fff' },
  });
}
