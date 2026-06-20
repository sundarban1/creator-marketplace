import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
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
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import type { Lang } from '@/i18n';
import { F } from '@/utilities/constants';

const LANG_OPTIONS: { lang: Lang; label: string; flag: string }[] = [
  { lang: 'en', label: 'EN', flag: '🇬🇧' },
  { lang: 'ne', label: 'नेप', flag: '🇳🇵' },
];

const INDIGO = '#4F46E5';
const VIOLET = '#7C3AED';
const PINK   = '#EC4899';

// ── Floating orb decorations ─────────────────────────────────────────────────

function HeroBackground() {
  return (
    <>
      {/* Big soft orb — top left */}
      <View style={[s.orb, { width: 260, height: 260, top: -60, left: -80, backgroundColor: `${VIOLET}22`, borderRadius: 130 }]} />
      {/* Smaller orb — top right */}
      <View style={[s.orb, { width: 180, height: 180, top: 20, right: -50, backgroundColor: `${PINK}18`, borderRadius: 90 }]} />
      {/* Tiny accent */}
      <View style={[s.orb, { width: 100, height: 100, top: 160, left: 30, backgroundColor: `${INDIGO}14`, borderRadius: 50 }]} />
    </>
  );
}

// ── Platform tags floating above card ────────────────────────────────────────

const PLATFORMS = [
  { name: 'Instagram', icon: 'camera',        color: '#E1306C' },
  { name: 'TikTok',    icon: 'musical-notes', color: '#000000' },
  { name: 'YouTube',   icon: 'logo-youtube',  color: '#FF0000' },
] as const;

function PlatformTags() {
  return (
    <View style={s.platformRow}>
      {PLATFORMS.map((p) => (
        <View key={p.name} style={[s.platformTag, { backgroundColor: `${p.color}15`, borderColor: `${p.color}30` }]}>
          <Ionicons name={p.icon as never} size={13} color={p.color} />
          <Text style={[s.platformTagText, { color: p.color }]}>{p.name}</Text>
        </View>
      ))}
    </View>
  );
}

// ── Custom input field with icon ──────────────────────────────────────────────

function Field({
  icon, value, onChangeText, placeholder, secureTextEntry = false, keyboardType = 'default', autoCapitalize = 'none',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
}) {
  const C = useAppColors();
  const [focused, setFocused] = useState(false);
  const [hidden,  setHidden]  = useState(secureTextEntry);
  const anim = useRef(new Animated.Value(0)).current;

  function handleFocus() {
    setFocused(true);
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  }
  function handleBlur() {
    setFocused(false);
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  }

  const borderColor = anim.interpolate({ inputRange: [0, 1], outputRange: [C.border, INDIGO] });
  const iconColor = focused ? INDIGO : C.textSecondary;

  return (
    <Animated.View style={[s.field, { borderColor, backgroundColor: focused ? `${INDIGO}06` : C.surface }]}>
      <Ionicons name={icon} size={18} color={iconColor} style={s.fieldIcon} />
      <TextInput
        style={[s.fieldInput, { color: C.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.textSecondary + '90'}
        secureTextEntry={hidden}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {secureTextEntry && (
        <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
          <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={C.textSecondary} />
        </Pressable>
      )}
    </Animated.View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { user, login }              = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const C                            = useAppColors();
  const params                       = useLocalSearchParams();
  const verified                     = typeof params.verified === 'string' ? params.verified : undefined;

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const cardSlide   = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const heroScale   = useRef(new Animated.Value(0.92)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(heroScale,    { toValue: 1, tension: 60, friction: 10, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(200),
        Animated.parallel([
          Animated.spring(cardSlide,   { toValue: 0, useNativeDriver: true, tension: 52, friction: 11 }),
          Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (user) router.replace((user.role === 'CREATOR' ? '/(creator)/' : '/(business)/') as never);
  }, [user]);

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
    <View style={s.root}>
      {/* Gradient hero bg */}
      <LinearGradient
        colors={['#EDE9FE', '#F5F3FF', '#F7F8FF']}
        locations={[0, 0.5, 1]}
        style={s.gradientBg}
      />
      <HeroBackground />

      {/* ── Hero ── */}
      <Animated.View style={[s.hero, { opacity: heroOpacity, transform: [{ scale: heroScale }] }]}>

        {/* Logo */}
        <View style={s.logoOuter}>
          <LinearGradient colors={[INDIGO, VIOLET]} style={s.logoGradient} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={s.logoText}>CM</Text>
          </LinearGradient>
          {/* Glow ring */}
          <View style={s.logoRing} />
        </View>

        <Text style={s.appName}>CreatorMarket</Text>
        <Text style={s.tagline}>Where creators meet brands</Text>

        <PlatformTags />
      </Animated.View>

      {/* ── Login card ── */}
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View style={[s.card, { backgroundColor: C.background, transform: [{ translateY: cardSlide }], opacity: cardOpacity }]}>
          {/* Drag handle */}
          <View style={[s.handle, { backgroundColor: C.border }]} />

          <ScrollView
            contentContainerStyle={s.cardContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Card header */}
            <View style={s.cardHeader}>
              <View>
                <Text style={[s.cardTitle, { color: C.text }]}>{t('auth.login.title')}</Text>
                <Text style={[s.cardSubtitle, { color: C.textSecondary }]}>{t('auth.login.subtitle')}</Text>
              </View>
              {/* Lang switcher */}
              <View style={s.langRow}>
                {LANG_OPTIONS.map(({ lang, flag }) => (
                  <Pressable
                    key={lang}
                    style={[s.langBtn, language === lang && { borderColor: INDIGO, backgroundColor: `${INDIGO}12` }]}
                    onPress={() => setLanguage(lang)}>
                    <Text style={s.langFlag}>{flag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Banners */}
            {verified === '1' && (
              <View style={s.successBanner}>
                <View style={s.bannerIcon}>
                  <Ionicons name="checkmark-circle" size={18} color="#15803D" />
                </View>
                <Text style={s.successText}>Account verified! Sign in to continue.</Text>
              </View>
            )}
            {!!error && (
              <View style={s.errorBanner}>
                <View style={[s.bannerIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                </View>
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}

            {/* Form */}
            <View style={s.form}>
              <Field
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.login.emailPlaceholder')}
                keyboardType="email-address"
              />
              <Field
                icon="lock-closed-outline"
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.login.passwordPlaceholder')}
                secureTextEntry
              />

              {/* Forgot password */}
              <Pressable onPress={() => router.push('/forgot-password')} style={s.forgotWrap}>
                <Text style={[s.forgotText, { color: INDIGO }]}>Forgot Password?</Text>
              </Pressable>

              {/* Sign in button */}
              <Pressable onPress={handleLogin} disabled={loading} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}>
                <LinearGradient
                  colors={loading ? ['#A5B4FC', '#C4B5FD'] : [INDIGO, VIOLET]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.signInBtn}>
                  {loading
                    ? <Ionicons name="sync" size={18} color="#fff" />
                    : <>
                        <Text style={s.signInBtnText}>{t('auth.login.signIn')}</Text>
                        <Ionicons name="arrow-forward" size={18} color="#fff" />
                      </>}
                </LinearGradient>
              </Pressable>
            </View>

            {/* Divider */}
            <View style={s.dividerRow}>
              <View style={[s.dividerLine, { backgroundColor: C.border }]} />
              <Text style={[s.dividerText, { color: C.textSecondary }]}>New here?</Text>
              <View style={[s.dividerLine, { backgroundColor: C.border }]} />
            </View>

            {/* Sign up */}
            <Pressable
              style={[s.signUpBtn, { borderColor: `${INDIGO}30`, backgroundColor: `${INDIGO}06` }]}
              onPress={() => router.push('/signup')}>
              <Ionicons name="person-add-outline" size={16} color={INDIGO} />
              <Text style={[s.signUpText, { color: INDIGO }]}>
                {t('auth.login.noAccount')}{' '}
                <Text style={{ fontWeight: '800' }}>{t('auth.login.signUpLink')}</Text>
              </Text>
            </Pressable>

            {/* Footer */}
            <View style={s.footer}>
              <Text style={[s.footerCopy, { color: C.textSecondary }]}>© 2026 CreatorMarket</Text>
              <View style={s.footerLinks}>
                <Pressable onPress={() => router.push('/legal?type=terms' as never)}>
                  <Text style={[s.footerLink, { color: INDIGO }]}>Terms</Text>
                </Pressable>
                <View style={[s.footerDot, { backgroundColor: C.border }]} />
                <Pressable onPress={() => router.push('/legal?type=privacy-policy' as never)}>
                  <Text style={[s.footerLink, { color: INDIGO }]}>Privacy</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#EDE9FE' },
  flex:       { flex: 1 },
  gradientBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  orb:        { position: 'absolute' },

  // Hero
  hero:       { alignItems: 'center', paddingTop: 68, paddingBottom: 30 },
  logoOuter:  { width: 86, height: 86, justifyContent: 'center', alignItems: 'center' },
  logoGradient:{ width: 76, height: 76, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: INDIGO, shadowOpacity: 0.42, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 14 },
  logoText:   { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 1, fontFamily: F.extrabold },
  logoRing:   { position: 'absolute', width: 86, height: 86, borderRadius: 25, borderWidth: 1.5, borderColor: `${INDIGO}30` },

  appName:    { fontSize: 30, fontWeight: '900', color: INDIGO, letterSpacing: 0.2, marginTop: 18, fontFamily: F.extrabold },
  tagline:    { fontSize: 13, color: '#9D8DF1', marginTop: 5, letterSpacing: 0.4, fontWeight: '500', fontFamily: F.medium },

  platformRow: { flexDirection: 'row', gap: 7, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 24 },
  platformTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  platformTagText: { fontSize: 11, fontWeight: '700', fontFamily: F.bold },

  // Card
  card:        { borderTopLeftRadius: 32, borderTopRightRadius: 32, flex: 1, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 20 },
  handle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  cardContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  cardHeader:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  cardTitle:   { fontSize: 24, fontWeight: '800', marginBottom: 3, fontFamily: F.extrabold },
  cardSubtitle:{ fontSize: 13, lineHeight: 19, fontFamily: F.regular },

  langRow:     { flexDirection: 'row', gap: 6 },
  langBtn:     { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.12)', backgroundColor: 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center' },
  langFlag:    { fontSize: 17 },

  // Banners
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', marginBottom: 16 },
  errorBanner:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: '#FFF1F2', borderWidth: 1, borderColor: '#FECDD3', marginBottom: 16 },
  bannerIcon:    { width: 30, height: 30, borderRadius: 15, backgroundColor: '#DCFCE7', justifyContent: 'center', alignItems: 'center' },
  successText:   { fontSize: 13, fontWeight: '600', color: '#15803D', flex: 1, fontFamily: F.semibold },
  errorText:     { fontSize: 13, fontWeight: '600', color: '#EF4444', flex: 1, fontFamily: F.semibold },

  // Form
  form:       { gap: 14 },
  field:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  fieldIcon:  { flexShrink: 0 },
  fieldInput: { flex: 1, fontSize: 15, paddingVertical: 0, fontFamily: F.regular },

  forgotWrap: { alignSelf: 'flex-end', paddingVertical: 2 },
  forgotText: { fontSize: 13, fontWeight: '700', fontFamily: F.bold },

  signInBtn:     { borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: INDIGO, shadowOpacity: 0.38, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  signInBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.3, fontFamily: F.extrabold },

  dividerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12, fontWeight: '600', fontFamily: F.semibold },

  signUpBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, borderWidth: 1.5, paddingVertical: 15 },
  signUpText: { fontSize: 14, fontFamily: F.regular },

  footer:      { marginTop: 32, alignItems: 'center', gap: 8 },
  footerCopy:  { fontSize: 11, fontFamily: F.regular },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerLink:  { fontSize: 11, fontWeight: '700', fontFamily: F.bold },
  footerDot:   { width: 3, height: 3, borderRadius: 1.5 },
});
