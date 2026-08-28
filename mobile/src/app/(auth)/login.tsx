import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Image as ExpoImage } from 'expo-image';
import { FontAwesome5 } from '@expo/vector-icons';
import { useMemo, useRef, useState, useEffect, type ReactNode } from 'react';
import {
  Animated,
  Keyboard,
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
import * as AppleAuthentication from 'expo-apple-authentication';
import { exchangeCodeAsync } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { usePlatformFlags } from '@/context/PlatformSettingsContext';
import { useAppColors, useIsDark, BUSINESS_DARK_COLORS } from '@/context/ThemeContext';
import { authService } from '@/services/auth';
import { ApiError } from '@/lib/api';

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

// Full-bleed backdrop behind the brand block — a hazy Himalayan skyline that
// fades up into the page's warm paper ground through the wash layered over it
// (see the hero JSX). CC0 (StockSnap, "Himalayas Poonhill").
const HERO_PHOTO = require('@/assets/images/login/himalaya.jpg');

// Line-art temple frieze that sits faintly behind the "switch tab" prompt in
// the fixed footer (see TempleSkyline), reading as texture over the page wash.
const TEMPLE_FRIEZE = require('@/assets/images/login/bottom_temple.png');

// ── Local brand palette ──────────────────────────────────────────────────────
// The signed-out screen now carries the app's own indigo `brinjal` identity —
// the same deep-brinjal photo wash and solid-brinjal primary button the Get
// Started screen (src/app/index.tsx) uses — so the brand reads consistently
// from the very first screen through the rest of the app. The lower form area
// keeps a soft cream ground for the white card to sit on.
const ACCENT           = COLORS.brinjal1; // indigo — Log In, links, active checkbox
const ACCENT_2         = COLORS.brinjal2; // far end of the Log In gradient
// The hero photo is a pale, hazy Himalayan sky, so it carries a brinjal wash
// deep enough for white brand text to sit on it cleanly.
const ON_HERO          = '#FFFFFF'; // brand text / hairlines over the hero photo
const FIELD_BORDER     = '#E7DAC0';       // soft hairline on the white input fields

// Traditional lung-ta order for the prayer-flag garland strung over the hero.
// Kept for when PrayerFlagGarland (currently hidden) is restored.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FLAG_COLORS = ['#2E6FB7', '#F4F4F2', '#E0392E', '#3FA24B', '#F2C230'] as const;

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

function FlatInput({ value, onChangeText, placeholder, icon, trailing, secureToggle, secureTextEntry, error, onFocus, onBlur, ...rest }: TextInputProps & {
  icon?: keyof typeof FontAwesome5.glyphMap;
  trailing?: ReactNode;
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
        { backgroundColor: '#FFFFFF', borderColor: focused ? ACCENT : FIELD_BORDER },
        !!error && { borderColor: C.error },
      ]}>
        {!!icon && (
          <FontAwesome5 name={icon} solid size={15} color={error ? C.error : focused ? ACCENT : C.textSecondary} />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textPlaceholder}
          style={[s.flatInput, { color: C.text, fontFamily: F.regular }]}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...rest}
        />
        {trailing}
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

function SocialAuthSection({ orLabel, googleLabel, facebookLabel, onGooglePress, googleLoading, googleError, onFacebookPress, facebookLoading, facebookError, appleAvailable, appleLabel, onApplePress, appleLoading, appleError }: {
  orLabel: string;
  googleLabel: string;
  facebookLabel: string;
  onGooglePress: () => void;
  googleLoading: boolean;
  googleError: string;
  onFacebookPress: () => void;
  facebookLoading: boolean;
  facebookError: string;
  appleAvailable: boolean;
  appleLabel: string;
  onApplePress: () => void;
  appleLoading: boolean;
  appleError: string;
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
          <Text style={[s.socialCardText, { color: C.text }]}>{googleLabel}</Text>
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
            <Text style={[s.socialCardText, { color: C.text }]}>{facebookLabel}</Text>
          </Pressable>
        )}
      </View>

      {/* Sign in with Apple — iOS 13+ only (hidden everywhere else). Full-width
          card directly under the Google/Facebook row, same neutral surface
          treatment as those buttons. */}
      {appleAvailable && (
        <Pressable
          style={({ pressed }) => [
            s.appleBtn, s.appleBtnRow,
            { borderColor: C.border, backgroundColor: C.surface },
            SHADOW.card,
            appleLoading && { opacity: 0.6 },
            pressed && !appleLoading && { backgroundColor: C.primaryLight, transform: [{ scale: 0.98 }] },
          ]}
          onPress={onApplePress} disabled={appleLoading}
          accessibilityRole="button"
          accessibilityLabel={appleLabel}>
          {appleLoading
            ? <View style={[s.spinner, { borderColor: C.border, borderTopColor: C.brinjal1 }]} />
            : <ExpoImage source={require('@/assets/images/login/apple.svg')} style={s.socialCardIcon} contentFit="contain" />}
          <Text style={[s.socialCardText, { color: C.text }]}>{appleLabel}</Text>
        </Pressable>
      )}

      {!!googleError && <FormBanner tone="error" icon="exclamation-circle" text={googleError} />}
      {FACEBOOK_LOGIN_ENABLED && !!facebookError && <FormBanner tone="error" icon="exclamation-circle" text={facebookError} />}
      {!!appleError && <FormBanner tone="error" icon="exclamation-circle" text={appleError} />}
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
        icon={value.length === 0 ? 'phone-alt' : identifierChannel(value) === 'email' ? 'envelope' : 'phone-alt'}
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

// ── Brand mark ───────────────────────────────────────────────────────────────
// The KOLAB logo lockup (monogram + wordmark), shipped as the shared brand SVG
// so it stays identical to the rest of the app rather than being redrawn here.

const BRAND_LOGO = require('@/assets/images/logo.svg');

function BrandMark() {
  const s = useMemo(() => makeStyles(COLORS), []);
  return (
    <ExpoImage
      source={BRAND_LOGO}
      style={s.brandLogo}
      contentFit="contain"
      accessible
      accessibilityLabel="KOLAB"
    />
  );
}

// ── Prayer-flag garland ──────────────────────────────────────────────────────
// A lung-ta line strung from the top-left corner down across the hero, the way
// the mock drapes one over its skyline. Each flag is a soft rounded panel in
// the traditional five-colour order, tilted a touch so the string reads as
// slack rather than taut.
//
// Hidden for now — the hero shows just the logo over the photo wash. Uncomment
// this component and its <PrayerFlagGarland /> in the hero to bring it back
// (FLAG_COLORS and the garland/flag* styles are kept for that).
//
// function PrayerFlagGarland() {
//   const s = useMemo(() => makeStyles(COLORS), []);
//   const flags = [...FLAG_COLORS, ...FLAG_COLORS, ...FLAG_COLORS.slice(0, 3)];
//   return (
//     <View style={s.garland} pointerEvents="none">
//       <View style={s.garlandString} />
//       <View style={s.garlandRow}>
//         {flags.map((c, i) => (
//           <View key={i} style={[s.flag, { backgroundColor: c }, i % 2 ? s.flagTiltA : s.flagTiltB]} />
//         ))}
//       </View>
//     </View>
//   );
// }

// ── Temple skyline ───────────────────────────────────────────────────────────
// A faint line-art frieze of tiered pagodas along the very bottom edge, echoing
// the border in the mock. Sits behind the footer prompt at low opacity so it
// registers as texture, not content.

function TempleSkyline() {
  const s = useMemo(() => makeStyles(COLORS), []);
  return (
    <View style={s.temple} pointerEvents="none">
      <ExpoImage
        source={TEMPLE_FRIEZE}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="bottom"
        accessible={false}
      />
    </View>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────

function LoginForm({ verified, onGooglePress, googleLoading, googleError, onFacebookPress, facebookLoading, facebookError, appleAvailable, onApplePress, appleLoading, appleError, onLoginSuccess }: {
  verified?: string;
  onGooglePress: () => void;
  googleLoading: boolean;
  googleError: string;
  onFacebookPress: () => void;
  facebookLoading: boolean;
  facebookError: string;
  appleAvailable: boolean;
  onApplePress: () => void;
  appleLoading: boolean;
  appleError: string;
  // Runs right after a successful password login — used to finish an in-progress
  // "link Apple to my existing account" flow before the screen navigates away.
  onLoginSuccess?: () => Promise<void> | void;
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
      // Session token is now stored — finish any pending "connect Apple" step
      // before RootNavigator redirects this screen away.
      await onLoginSuccess?.();
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
          <Text style={[s.formHeadingSubtitle, { color: COLORS.accent }]}>{t('auth.login.subtitle')}</Text>
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

        {/* Remember me + Forgot password share a row, as in the mock. */}
        <View style={s.optionRow}>
          <Pressable
            style={s.checkRow}
            onPress={() => setRememberMe((v) => !v)}
            hitSlop={8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rememberMe }}
            accessibilityLabel={t('auth.login.rememberMe')}>
            <FontAwesome5 name={rememberMe ? 'check-square' : 'square'} solid={rememberMe} size={18} color={rememberMe ? ACCENT : C.textSecondary} />
            <Text style={s.checkRowText}>{t('auth.login.rememberMe')}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/forgot-password')} hitSlop={8}>
            <Text style={s.forgotText}>{t('auth.login.forgotPassword')}</Text>
          </Pressable>
        </View>

        {/* Primary action — solid brand pill with a coloured glow, the same
            emphasis treatment the home feed gives its own primary buttons. */}
        <Pressable
          onPress={handleLogin} disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={t('auth.login.loginBtn')}
          style={({ pressed }) => [s.primaryBtnWrap, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <LinearGradient colors={[ACCENT, ACCENT_2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtn}>
            {loading
              ? <FontAwesome5 name="sync" solid size={18} color="#fff" />
              : <Text style={s.primaryBtnText}>{t('auth.login.loginBtn')}</Text>}
          </LinearGradient>
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
        appleAvailable={appleAvailable}
        appleLabel={t('auth.login.continueApple')}
        onApplePress={onApplePress} appleLoading={appleLoading} appleError={appleError}
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

function SignupForm({ initialRole, onGooglePress, googleLoading, googleError, onFacebookPress, facebookLoading, facebookError, appleAvailable, onApplePress, appleLoading, appleError }: {
  initialRole?: 'CREATOR' | 'BUSINESS';
  onGooglePress: () => void;
  googleLoading: boolean;
  googleError: string;
  onFacebookPress: () => void;
  facebookLoading: boolean;
  facebookError: string;
  appleAvailable: boolean;
  onApplePress: () => void;
  appleLoading: boolean;
  appleError: string;
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
  // The chip names the role inline, so it takes the short one-word form of
  // the /account-type choice rather than that screen's full card sentence.
  const roleLabel = role === 'CREATOR' ? t('accountType.offerShort') : t('accountType.seekShort');

  return (
    <View style={s.formGroup}>
      <View style={[s.formCard, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.raised]}>
        <View style={s.formHeading}>
          <Text style={s.formHeadingTitle}>{t('auth.signup.title')}</Text>
          <Text style={[s.formHeadingSubtitle, { color: COLORS.accent }]}>{t('auth.signup.subtitle')}</Text>
        </View>

        {/* Carries over the choice made on /account-type (Professional /
            Business) so it isn't lost once the user lands here — with
            a way back to that screen (current choice pre-selected) if they want
            to change it. Shaped as a pill rather than a full-width row, matching
            the inline filter chips the home feed puts under its section titles. */}
        <Pressable
          style={[s.roleChip, { backgroundColor: C.primaryLight, borderColor: C.border }]}
          accessibilityRole="button"
          accessibilityLabel={`${t('auth.signup.signingUpAs')} ${roleLabel} — ${t('auth.signup.changeRole')}`}
          onPress={() => router.push({ pathname: '/account-type', params: { role } })}>
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
          <LinearGradient colors={[ACCENT, ACCENT_2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.primaryBtn}>
            {loading
              ? <FontAwesome5 name="sync" solid size={18} color="#fff" />
              : <Text style={s.primaryBtnText}>{t('auth.signup.createAccountBtn')}</Text>}
          </LinearGradient>
        </Pressable>
      </View>

      <SocialAuthSection
        orLabel={t('auth.signup.or')}
        googleLabel={t('auth.signup.continueGoogle')}
        facebookLabel={t('auth.signup.continueFacebook')}
        onGooglePress={onGooglePress} googleLoading={googleLoading} googleError={googleError}
        onFacebookPress={onFacebookPress} facebookLoading={facebookLoading} facebookError={facebookError}
        appleAvailable={appleAvailable}
        appleLabel={t('auth.signup.continueApple')}
        onApplePress={onApplePress} appleLoading={appleLoading} appleError={appleError}
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

  // The footer's bottom padding normally reserves room for the home-indicator
  // safe area — but once the keyboard is up, KeyboardAvoidingView has already
  // pushed the footer above it, so that inset is dead space that shows as a
  // gap between the footer text and the keyboard. Drop it while typing.
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
  const [appleLoading,    setAppleLoading]    = useState(false);
  const [appleError,      setAppleError]      = useState('');
  const [appleAvailable,  setAppleAvailable]  = useState(false);
  // Set when the backend returns ACCOUNT_LINKING_REQUIRED — holds the short-lived
  // link token; while it's set the "sign in to connect Apple" sheet shows and a
  // successful password login finishes the link.
  const [applePending,     setApplePending]     = useState('');
  const [applePendingCode, setApplePendingCode] = useState('');
  const [applePendingUser, setApplePendingUser] = useState('');
  const [appleLinkSheet,  setAppleLinkSheet]  = useState(false);
  const [roleModal,       setRoleModal]       = useState(false);
  const [pendingToken,    setPendingToken]    = useState('');
  const [pendingProvider, setPendingProvider] = useState<'google' | 'facebook' | 'apple'>('google');
  // Apple hands back the name/email only on the first response, so a role-select
  // re-submit has to resend the whole credential, not just a token.
  const [pendingAppleCred, setPendingAppleCred] = useState<AppleAuthentication.AppleAuthenticationCredential | null>(null);

  // Sign in with Apple is iOS 13+ only — the button stays hidden everywhere else.
  useEffect(() => {
    let active = true;
    AppleAuthentication.isAvailableAsync()
      .then((ok) => { if (active) setAppleAvailable(ok); })
      .catch(() => { if (active) setAppleAvailable(false); });
    return () => { active = false; };
  }, []);

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

  async function handleAppleToken(
    cred: AppleAuthentication.AppleAuthenticationCredential,
    role?: 'CREATOR' | 'BUSINESS',
  ) {
    if (!cred.identityToken) {
      setAppleError(t('auth.login.appleFailed'));
      setAppleLoading(false);
      return;
    }
    setAppleLoading(true);
    setAppleError('');
    try {
      const result = await authService.appleAuth({
        identityToken:     cred.identityToken,
        authorizationCode: cred.authorizationCode ?? undefined,
        fullName:          cred.fullName
          ? { givenName: cred.fullName.givenName, familyName: cred.fullName.familyName }
          : undefined,
        email:             cred.email,
        role,
        appleUserId:       cred.user,
      });
      if (result.needsRole) {
        setPendingAppleCred(cred);
        setPendingProvider('apple');
        setRoleModal(true);
        setAppleLoading(false);
        return;
      }
      await reloadUser();
    } catch (e) {
      // The Apple email already belongs to a Kolab account — never merge on
      // email. Route the user through "sign in with your existing method, then
      // connect Apple" instead.
      if (e instanceof ApiError && e.code === 'ACCOUNT_LINKING_REQUIRED') {
        const token = typeof e.details?.appleLinkToken === 'string' ? e.details.appleLinkToken : '';
        if (token) {
          setApplePending(token);
          // Keep the (still-unused) auth code so the eventual link can capture a
          // refresh token for later Apple-side revocation, plus the Apple user id
          // for the credential watcher.
          setApplePendingCode(cred.authorizationCode ?? '');
          setApplePendingUser(cred.user ?? '');
          setAppleLinkSheet(true);
          setTab('login');
          setAppleLoading(false);
          return;
        }
      }
      setAppleError(e instanceof Error ? e.message : t('auth.login.appleFailed'));
      setAppleLoading(false);
    }
  }

  async function handleApplePress() {
    setAppleError('');
    setAppleLoading(true);
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      await handleAppleToken(cred);
    } catch (e) {
      // Tapping "Cancel" in Apple's sheet is a normal outcome, not a failure.
      if (e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'ERR_REQUEST_CANCELED') {
        setAppleLoading(false);
        return;
      }
      setAppleError(t('auth.login.appleFailed'));
      setAppleLoading(false);
    }
  }

  // Finishes an in-progress "connect Apple to my existing account" flow right
  // after the user signs in with their existing method (see LoginForm).
  async function finishAppleLinkIfPending() {
    if (!applePending) return;
    try {
      await authService.appleLink({
        appleLinkToken: applePending,
        authorizationCode: applePendingCode || undefined,
        appleUserId: applePendingUser || undefined,
      });
    } catch {
      // Non-fatal: the next Apple sign-in just re-triggers the same linking flow.
    } finally {
      setApplePending('');
      setApplePendingCode('');
      setApplePendingUser('');
      setAppleLinkSheet(false);
    }
  }

  async function handleRoleSelect(selectedRole: 'CREATOR' | 'BUSINESS') {
    setRoleModal(false);
    if (pendingProvider === 'facebook') {
      await handleFacebookToken(pendingToken, selectedRole);
    } else if (pendingProvider === 'apple') {
      if (pendingAppleCred) await handleAppleToken(pendingAppleCred, selectedRole);
    } else {
      await handleGoogleToken(pendingToken, selectedRole);
    }
  }

  const canGoBack    = router.canGoBack();

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Light-brinjal wash behind the entire screen — held at the same low
          opacity top to bottom so the whole page reads as one even tint. */}
      <LinearGradient
        colors={[withAlpha(COLORS.brinjal1, 0.08), withAlpha(COLORS.brinjal2, 0.08)]}
        style={s.pageWash}
        pointerEvents="none"
      />

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <MaxWidthContainer>
        <View style={s.flex}>

        <ScrollView
          style={s.flex}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* ── Hero ── a full-bleed Himalayan skyline, a prayer-flag garland
              strung across it, and the brand block resting on top. Only a light
              brinjal wash sits over the photo — it deepens near the bottom so
              the image dissolves into the page ground under the white card. */}
          <View style={[s.hero, { paddingTop: insets.top + SPACING.lg }]}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <ExpoImage source={HERO_PHOTO} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
              <LinearGradient
                colors={[withAlpha(COLORS.brinjal2, 0.35), withAlpha(COLORS.brinjal2, 0.62), withAlpha(COLORS.brinjal2, 0.78), withAlpha(COLORS.brinjal2, 0.14)]}
                locations={[0, 0.5, 0.88, 1]}
                style={StyleSheet.absoluteFill}
              />
            </View>

            {/* Controls — back + language toggle, sitting above the garland */}
            <View style={s.floatBar} pointerEvents="box-none">
              {canGoBack ? <BackButton fallback="/" variant="overlay" /> : <View style={s.floatSpacer} />}
              <Pressable
                style={s.langChip}
                hitSlop={8}
                accessibilityRole="button"
                onPress={() => setLanguage(language === 'en' ? 'ne' : 'en')}>
                <Text style={s.langChipText}>{LANG_LABELS[language === 'en' ? 'ne' : 'en']}</Text>
              </Pressable>
            </View>

            <Animated.View
              style={[s.brandLogoWrap, {
                opacity: cardAnim,
                transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
              }]}>
              <BrandMark />
            </Animated.View>

            {/* Prayer-flag garland hidden for now — restore <PrayerFlagGarland /> here to bring it back */}
            {/* <PrayerFlagGarland /> */}

            <Animated.View
              style={[s.brandBlock, {
                opacity: cardAnim,
                transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
              }]}>
              <View style={s.headlineWrap}>
                <Text style={s.headline}>{t('auth.login.brandHeadline1')}</Text>
                <View style={s.headline2Wrap}>
                  <Text style={[s.headline, s.headline2]}>{t('auth.login.brandHeadline2')}</Text>
                  <View style={s.headlineUnderline} />
                </View>
              </View>
              <Text style={s.brandSub}>{t('auth.login.brandSubtitle')}</Text>
            </Animated.View>
          </View>

          {/* Form — crossfades between the two tabs, pulled up over the hero */}
          <Animated.View
            style={[s.formShell, {
              opacity: formAnim,
              transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            }]}>
            {tab === 'login'
              ? <LoginForm verified={params.verified} onGooglePress={handleGooglePress} googleLoading={googleLoading} googleError={googleError} onFacebookPress={handleFacebookPress} facebookLoading={facebookLoading} facebookError={facebookError} appleAvailable={appleAvailable} onApplePress={handleApplePress} appleLoading={appleLoading} appleError={appleError} onLoginSuccess={finishAppleLinkIfPending} />
              : <SignupForm key={params.role} initialRole={params.role === 'BUSINESS' ? 'BUSINESS' : params.role === 'CREATOR' ? 'CREATOR' : undefined} onGooglePress={handleGooglePress} googleLoading={googleLoading} googleError={googleError} onFacebookPress={handleFacebookPress} facebookLoading={facebookLoading} facebookError={facebookError} appleAvailable={appleAvailable} onApplePress={handleApplePress} appleLoading={appleLoading} appleError={appleError} />}

            {/* Reassurance line — quiet, non-actionable, closes the page. */}
            <View style={s.trustRow}>
              <FontAwesome5 name="shield-alt" solid size={12} color={COLORS.accent} />
              <Text style={s.trustText}>{t('auth.login.footer')}</Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* ── Fixed footer ── pinned below the scroll, the temple frieze from
            the mock running faintly behind the "switch tab" prompt. */}
        <View style={[s.footerBar, { paddingBottom: keyboardVisible ? SPACING.md : insets.bottom + SPACING.md }]}>
          {/* Bar is transparent so the page's light-brinjal wash carries through;
              the temple frieze sits over it and the prompt rides in a white pill. */}
          <TempleSkyline />
          <Pressable
            style={s.switchTabPill}
            accessibilityRole="button"
            onPress={() => tab === 'login' ? router.push('/account-type') : setTab('login')}>
            <Text style={s.switchTabText}>
              {tab === 'login' ? t('auth.login.noAccount') : t('welcome.alreadyHaveAccount')}{' '}
              <Text style={s.switchTabLink}>
                {tab === 'login' ? t('auth.login.signUpLink') : t('auth.login.signIn')}
              </Text>
            </Text>
          </Pressable>
        </View>
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

      {/* Shown when Apple returns an identity whose email already belongs to a
          Kolab account — the user signs in with their existing method and the
          Apple identity is linked automatically (see finishAppleLinkIfPending). */}
      <BottomSheet visible={appleLinkSheet} onClose={() => setAppleLinkSheet(false)} contentContainerStyle={{ gap: 4 }}>
        <View style={s.suspendedSheet}>
          <View style={[s.suspendedIconWrap, { backgroundColor: withAlpha(C.brinjal1, 0.12) }]}>
            <FontAwesome5 name="link" size={20} color={C.brinjal1} solid />
          </View>
          <Text style={s.modalTitle}>{t('auth.login.appleLinkTitle')}</Text>
          <Text style={s.modalSub}>{t('auth.login.appleLinkBody')}</Text>
          <Pressable style={s.modalCancel} onPress={() => setAppleLinkSheet(false)}>
            <Text style={[s.modalCancelText, { color: C.brinjal1 }]}>{t('auth.login.appleLinkCta')}</Text>
          </Pressable>
        </View>
      </BottomSheet>

    </View>
  );
}

function makeStyles(C: typeof COLORS) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  // Light-brinjal wash carried behind the whole screen (not just the hero) —
  // sits on the white root, deepening slightly toward the bottom. Every layer
  // above it (scroll body, form shell, footer) is transparent so it shows
  // through; only the hero photo-wash and the white form card paint over it.
  pageWash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  flex: { flex: 1 },
  // The hero is full-bleed, so the screen carries no horizontal padding — each
  // block below the hero re-applies the gutter itself.
  scrollContent: { flexGrow: 1, paddingBottom: SPACING.xxl },

  // ── Hero ── a full-bleed Himalayan skyline that fades up into the paper
  // ground; the brand block rests on top and defines the height.
  hero:        { overflow: 'hidden', alignItems: 'center', backgroundColor: COLORS.brinjal2 },

  // Floating controls over the scene — back button + language toggle. The
  // toggle shows the language you'd switch TO.
  floatBar:    { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, marginBottom: SPACING.xs, zIndex: 6 },
  floatSpacer: { width: 36, height: 36 },
  langChip:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, minHeight: 36, justifyContent: 'center', backgroundColor: withAlpha('#FFFFFF', 0.72), borderWidth: 1, borderColor: withAlpha('#FFFFFF', 0.9) },
  langChipText:{ fontSize: FONT_SIZE.xs, fontFamily: F.bold, color: ACCENT_2 },

  // Prayer-flag garland strung across the top of the hero.
  garland:       { height: 72, alignSelf: 'stretch', marginTop: SPACING.sm, marginBottom: SPACING.sm },
  garlandString: { position: 'absolute', top: 28, left: 0, right: 0, height: 2, backgroundColor: withAlpha(ON_HERO, 0.45) },
  garlandRow:    { flexDirection: 'row', justifyContent: 'center', paddingTop: 27 },
  flag:          { width: 19, height: 25, marginHorizontal: 2, borderTopLeftRadius: 2, borderTopRightRadius: 2, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, opacity: 0.92 },
  flagTiltA:     { transform: [{ rotate: '4deg' }, { translateY: 1 }] },
  flagTiltB:     { transform: [{ rotate: '-4deg' }, { translateY: 3 }] },

  // ── Brand block ──
  brandBlock:   { alignItems: 'center', gap: SPACING.md, paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxxl },
  // Pulled up level with the back/language controls so the mark reads first.
  brandLogoWrap: {
    marginTop: -SPACING.xxl,
    marginBottom: SPACING.xxl,
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.xl,
    ...SHADOW.floating,
  },
  brandLogo:    { width: 208, height: 74 },

  headlineWrap:      { alignItems: 'center' },
  headline:          { fontSize: FONT_SIZE.xl, fontFamily: F.bold, color: ON_HERO, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.xl) },
  headline2Wrap:     { alignItems: 'center' },
  headline2:         { color: ON_HERO },
  // Amazon-style swoosh — a shallow smile arc under the headline. Built from a
  // rounded box showing only its bottom edge, so the coloured stroke curves up
  // at both ends instead of sitting flat.
  headlineUnderline: {
    marginTop: 3,
    width: 96,
    height: 18,
    borderWidth: 3,
    borderRadius: 48,
    borderColor: 'transparent',
    borderBottomColor: COLORS.accent,
  },
  brandSub:          { fontSize: FONT_SIZE.sm, fontFamily: F.semibold, color: ON_HERO, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.sm), maxWidth: 320, marginTop: 2 },

  // ── Form ── a white card pulled up over the lower edge of the hero.
  formShell: { paddingHorizontal: SCREEN_GUTTER, marginTop: -SPACING.xl, gap: SPACING.lg },
  formGroup: { gap: SPACING.lg },
  formCard:  { borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACING.xl, gap: SPACING.lg },

  formHeading:         { gap: 2, alignItems: 'center' },
  formHeadingTitle:    { fontSize: FONT_SIZE.xl, fontFamily: F.bold, color: ACCENT, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.xl) },
  formHeadingSubtitle: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, color: C.textSecondary, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.sm) },

  // Role chip — confirms the choice made on /account-type and links back to it.
  // Pulled up by sm so it sits with the heading it qualifies rather than
  // floating at an equal distance between heading and fields.
  roleChip:         { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', maxWidth: '100%', gap: SPACING.sm, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, minHeight: 40, marginTop: -SPACING.sm },
  roleChipText:     { flexShrink: 1, fontSize: FONT_SIZE.xs, fontFamily: F.medium, color: C.textSecondary },
  roleChipTextBold: { fontFamily: F.bold },
  roleChipChange:   { fontSize: FONT_SIZE.xs, fontFamily: F.bold },

  // Inline banners — AttentionBanner's anatomy (tinted rounded-square glyph +
  // message), recoloured per tone.
  banner:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1 },
  bannerIconWrap:{ width: 30, height: 30, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  bannerText:    { flex: 1, fontSize: FONT_SIZE.sm, fontFamily: F.medium, lineHeight: lineHeightFor(FONT_SIZE.sm) },

  form: { gap: SPACING.md },

  // Filled field — white on the paper card, RADIUS.lg, a 1.5 hairline that
  // warms to saffron on focus, with a leading glyph.
  flatInputRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1.5, paddingHorizontal: SPACING.lg, minHeight: 54 },
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
  optionRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkRow:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 44 },
  checkRowTop:  { alignItems: 'flex-start', paddingTop: 2 },
  checkRowText: { fontSize: FONT_SIZE.sm, fontFamily: F.medium, color: C.text },
  termsRowText: { flex: 1, fontSize: FONT_SIZE.sm, fontFamily: F.regular, color: C.textSecondary, lineHeight: lineHeightFor(FONT_SIZE.sm) },

  // Password rules
  rulesRow: { flexDirection: 'row', gap: SPACING.sm, flexWrap: 'wrap', marginTop: -SPACING.xs },
  rulePill: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs },
  ruleText: { fontSize: FONT_SIZE.xs, fontFamily: F.medium },

  // Primary action — saffron gradient pill under a warm glow.
  primaryBtnWrap: { borderRadius: RADIUS.full, shadowColor: ACCENT, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 6 },
  primaryBtn:     { minHeight: 54, borderRadius: RADIUS.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, overflow: 'hidden' },
  primaryBtnText: { fontSize: FONT_SIZE.md, color: '#fff', fontFamily: F.bold, letterSpacing: 0.3, lineHeight: lineHeightFor(FONT_SIZE.md) },

  forgotText: { fontSize: FONT_SIZE.sm, fontFamily: F.semibold, color: ACCENT },

  // ── Social auth ── full-width stacked cards, as in the mock.
  socialGroup:       { gap: SPACING.md },
  divider:           { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  dividerLine:       { flex: 1, height: 1 },
  dividerText:       { fontSize: FONT_SIZE.xs, color: C.textSecondary, fontFamily: F.semibold, letterSpacing: 1, textTransform: 'uppercase' },
  socialCardRow:     { flexDirection: 'column', gap: SPACING.md },
  socialCardBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, minHeight: 54, borderRadius: RADIUS.lg, borderWidth: 1 },
  socialCardBtnFull: { flex: 0 },
  // Sign in with Apple button — full width, same height as the primary CTA.
  appleBtn:          { width: '100%', height: 54 },
  appleBtnRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderRadius: RADIUS.lg, borderWidth: 1 },
  socialCardIcon:    { width: 18, height: 18 },
  socialCardText:    { fontSize: FONT_SIZE.sm, fontFamily: F.semibold },

  // Facebook badge keeps Facebook's own brand blue regardless of theme — this is a
  // third-party brand mark, not part of the app's own color system.
  fbBadgeSmall: { width: 22, height: 22, borderRadius: RADIUS.full, backgroundColor: '#1877F2', justifyContent: 'center', alignItems: 'center' },
  fbF:          { color: '#fff', fontSize: FONT_SIZE.sm, fontFamily: F.bold },
  spinner:      { width: 18, height: 18, borderRadius: RADIUS.full, borderWidth: 2, borderColor: C.border, borderTopColor: ACCENT },

  // Closing reassurance line — "Secure & trusted login" under a green shield.
  trustRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: SPACING.xs },
  trustText: { fontSize: FONT_SIZE.xs, fontFamily: F.medium, color: COLORS.accent, textAlign: 'center' },

  // Switch-tab bar — pinned below the scroll, the temple frieze running faintly
  // behind the "Create an account" prompt.
  footerBar:     { position: 'relative', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: withAlpha(COLORS.brinjal2, 0.14), paddingTop: SPACING.lg, paddingHorizontal: SCREEN_GUTTER, minHeight: 56 },
  // The prompt sits in a white pill so it stays legible over the temple frieze.
  switchTabPill: { backgroundColor: '#FFFFFF', borderRadius: RADIUS.full, borderWidth: 1, borderColor: withAlpha(COLORS.brinjal2, 0.14), paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  switchTabText: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, color: COLORS.accent, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.sm) },
  switchTabLink: { fontFamily: F.bold, color: COLORS.brinjal1 },

  // Temple frieze — a faint line-art pagoda skyline along the bottom edge.
  temple:     { position: 'absolute', left: 0, right: 0, bottom: 0, height: 88, opacity: 0.5 },

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
