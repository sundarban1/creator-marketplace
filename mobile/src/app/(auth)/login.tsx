import { router, useLocalSearchParams } from 'expo-router';
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
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import type { Lang } from '@/i18n';

const LANG_OPTIONS: { lang: Lang; label: string; flag: string }[] = [
  { lang: 'en', label: 'EN', flag: '🇬🇧' },
  { lang: 'ne', label: 'नेप', flag: '🇳🇵' },
];

const PINK    = '#E8527A';
const TEAL    = '#2EC4C4';
const BRINJAL = '#4F46E5';

// ─── Doodle helpers ───────────────────────────────────────────────────────────

type FIconProps = {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  top?: number; left?: number; right?: number; bottom?: number;
  rotate?: string; color?: string; opacity?: number;
};
function FIcon({ icon, size = 30, top, left, right, bottom, rotate = '0deg', color = TEAL, opacity = 0.68 }: FIconProps) {
  return (
    <View style={{ position: 'absolute', top, left, right, bottom, opacity, transform: [{ rotate }] }}>
      <Ionicons name={icon} size={size} color={color} />
    </View>
  );
}

type FLabelProps = {
  text: string;
  top?: number; left?: number; right?: number; bottom?: number;
  rotate?: string; color?: string; fontSize?: number; opacity?: number; weight?: '600' | '700' | '900';
};
function FLabel({ text, top, left, right, bottom, rotate = '0deg', color = PINK, fontSize = 14, opacity = 0.82, weight = '700' }: FLabelProps) {
  return (
    <View style={{ position: 'absolute', top, left, right, bottom, opacity, transform: [{ rotate }] }}>
      <Text style={{ color, fontSize, fontWeight: weight, fontStyle: 'italic' }}>{text}</Text>
    </View>
  );
}

// ─── Background — light with doodle icons in hero zone ────────────────────────

function Background() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F7F8FC' }]} pointerEvents="none">
      {/* Top-left cluster */}
      <FIcon  icon="camera"            size={46} top={54}  left={18}  rotate="-10deg" color={TEAL} />
      <FLabel text="like"                        top={48}  left={84}  rotate="4deg"   color={PINK} fontSize={14} />
      <FIcon  icon="star"              size={18} top={118} left={22}  rotate="12deg"  color={PINK} opacity={0.6} />
      <FLabel text="online"                      top={152} left={14}  rotate="5deg"   color={TEAL} fontSize={12} opacity={0.65} />
      <FIcon  icon="wifi"              size={26} top={200} left={50}  rotate="-5deg"  color={TEAL} opacity={0.55} />
      <FLabel text="FOLLOW"                      top={248} left={10}  rotate="-6deg"  color={PINK} fontSize={13} weight="900" opacity={0.7} />

      {/* Top-right cluster */}
      <FIcon  icon="briefcase-outline" size={42} top={60}  right={18} rotate="8deg"   color={PINK} opacity={0.62} />
      <FLabel text="wow"                         top={50}  right={74} rotate="-5deg"  color={TEAL} fontSize={14} />
      <FIcon  icon="heart"             size={20} top={124} right={52} rotate="14deg"  color={PINK} opacity={0.7} />
      <FLabel text="HELLO"                       top={172} right={14} rotate="-4deg"  color={TEAL} fontSize={14} weight="900" />
      <FIcon  icon="megaphone-outline" size={32} top={222} right={16} rotate="10deg"  color={PINK} opacity={0.58} />
      <FLabel text="create"                      top={268} right={18} rotate="-3deg"  color={BRINJAL} fontSize={12} opacity={0.55} />

      {/* Center accents */}
      <FIcon  icon="at"                size={22} top={310} left={22}  rotate="-8deg"  color={PINK} opacity={0.5} />
      <FIcon  icon="bar-chart-outline" size={26} top={308} right={48} rotate="6deg"   color={TEAL} opacity={0.5} />
    </View>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <View style={styles.logoBox}>
      <View style={styles.logoAccentLg} />
      <View style={styles.logoAccentSm} />
      <View style={styles.logoLetters}>
        <Text style={styles.logoC}>C</Text>
        <Text style={styles.logoM}>M</Text>
      </View>
    </View>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { user, login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const C = useAppColors();
  const { verified } = useLocalSearchParams<{ verified?: string }>();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const cardSlide   = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(180),
        Animated.parallel([
          Animated.spring(cardSlide,   { toValue: 0, useNativeDriver: true, tension: 58, friction: 11 }),
          Animated.timing(cardOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('auth.login.requiredError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <Background />


      {/* Hero */}
      <Animated.View style={[styles.hero, { opacity: heroOpacity }]}>
        <Logo />
        <Text style={styles.appName}>CreatorMarket</Text>
        <Text style={styles.tagline}>Where creators meet brands</Text>

        {/* Role chips */}
        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: `${PINK}18`, borderColor: `${PINK}40` }]}>
            <Ionicons name="camera-outline" size={12} color={PINK} />
            <Text style={[styles.chipText, { color: PINK }]}>Creators</Text>
          </View>
          <View style={styles.chipDivider} />
          <View style={[styles.chip, { backgroundColor: `${TEAL}18`, borderColor: `${TEAL}40` }]}>
            <Ionicons name="briefcase-outline" size={12} color={TEAL} />
            <Text style={[styles.chipText, { color: TEAL }]}>Businesses</Text>
          </View>
        </View>
      </Animated.View>

      {/* Login card */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.View
          style={[styles.card, { backgroundColor: C.background, transform: [{ translateY: cardSlide }], opacity: cardOpacity }]}>
          <View style={[styles.cardHandle, { backgroundColor: C.border }]} />

          <ScrollView
            contentContainerStyle={styles.cardContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: C.text }]}>{t('auth.login.title')}</Text>
                <Text style={[styles.cardSubtitle, { color: C.textSecondary }]}>{t('auth.login.subtitle')}</Text>
              </View>
              <View style={styles.langRow}>
                {LANG_OPTIONS.map(({ lang, flag }) => (
                  <Pressable
                    key={lang}
                    style={[styles.langBtn, language === lang && styles.langBtnActive]}
                    onPress={() => setLanguage(lang)}>
                    <Text style={styles.langFlag}>{flag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {verified === '1' && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#15803D" />
                <Text style={styles.successText}>Account verified! Sign in to continue.</Text>
              </View>
            )}
            {!!error && (
              <View style={[styles.errorBanner, { backgroundColor: '#FFF1F2' }]}>
                <Ionicons name="alert-circle-outline" size={15} color={C.error} />
                <Text style={[styles.errorText, { color: C.error }]}>{error}</Text>
              </View>
            )}

            <View style={styles.form}>
              <TextInputWithLabel
                label={t('auth.login.email')}
                value={email}
                onChangeText={setEmail}
                placeholder={t('auth.login.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInputWithLabel
                label={t('auth.login.password')}
                value={password}
                onChangeText={setPassword}
                placeholder={t('auth.login.passwordPlaceholder')}
                secureTextEntry
                secureToggle
              />
              <Button label={t('auth.login.signIn')} onPress={handleLogin} loading={loading} />
            </View>

            <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgotLink}>
              <Text style={[styles.forgotLinkText, { color: C.brinjal1 }]}>Forgot Password?</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: C.border }]} />
              <Text style={[styles.dividerText, { color: C.textSecondary }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: C.border }]} />
            </View>

            <Pressable
              style={[styles.signUpBtn, { borderColor: C.border, backgroundColor: C.surface }]}
              onPress={() => router.push('/signup')}>
              <Text style={[styles.signUpBtnText, { color: C.text }]}>
                {t('auth.login.noAccount')}{' '}
                <Text style={{ fontWeight: '800', color: C.brinjal1 }}>{t('auth.login.signUpLink')}</Text>
              </Text>
            </Pressable>

            <View style={styles.footer}>
              <Text style={[styles.footerCopy, { color: C.textSecondary }]}>© 2026 CreatorMarket</Text>
              <View style={styles.footerLinks}>
                <Pressable onPress={() => router.push('/legal?type=terms' as never)}>
                  <Text style={[styles.footerLink, { color: C.brinjal1 }]}>Terms</Text>
                </Pressable>
                <View style={[styles.footerDot, { backgroundColor: C.border }]} />
                <Pressable onPress={() => router.push('/legal?type=privacy-policy' as never)}>
                  <Text style={[styles.footerLink, { color: C.brinjal1 }]}>Privacy</Text>
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

const styles = StyleSheet.create({
  root:           { flex: 1 },
  flex:           { flex: 1 },

  titleRow:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 22 },
  langRow:        { flexDirection: 'row', gap: 6, paddingTop: 2 },
  langBtn:        { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.15)', backgroundColor: 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center' },
  langBtnActive:  { borderColor: BRINJAL, backgroundColor: `${BRINJAL}12` },
  langFlag:       { fontSize: 17, lineHeight: 21 },

  hero:           { alignItems: 'center', paddingTop: 72, paddingBottom: 28 },
  logoBox:        { width: 92, height: 92, borderRadius: 24, backgroundColor: '#fff', overflow: 'hidden', shadowColor: '#4F46E5', shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12, borderWidth: 1, borderColor: 'rgba(79,70,229,0.10)' },
  logoAccentLg:   { position: 'absolute', width: 76, height: 76, borderRadius: 38, backgroundColor: '#EDE9FE', bottom: -18, left: -18 },
  logoAccentSm:   { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#DDD6FE', top: -10, right: -8 },
  logoLetters:    { position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 1 },
  logoC:          { fontSize: 32, fontWeight: '900', color: '#4F46E5', lineHeight: 38 },
  logoM:          { fontSize: 22, fontWeight: '700', color: '#7C3AED', lineHeight: 38, marginTop: 6 },
  appName:        { fontSize: 28, fontWeight: '900', color: BRINJAL, letterSpacing: 0.3, marginTop: 20 },
  tagline:        { fontSize: 13, color: '#888', marginTop: 6, letterSpacing: 0.3 },

  chipRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  chipText:       { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  chipDivider:    { width: 1, height: 14, backgroundColor: 'rgba(0,0,0,0.12)' },

  card:           { borderTopLeftRadius: 30, borderTopRightRadius: 30, flex: 1, shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 16, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(0,0,0,0.07)' },
  cardHandle:     { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 6 },
  cardContent:    { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
  cardTitle:      { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  cardSubtitle:   { fontSize: 13 },

  successBanner:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, marginBottom: 16, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  successText:    { fontSize: 13, fontWeight: '600', color: '#15803D', flex: 1 },
  errorBanner:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText:      { fontSize: 13, fontWeight: '600', flex: 1 },

  form:           { gap: 14, marginBottom: 4 },
  forgotLink:     { alignItems: 'flex-end', paddingVertical: 10 },
  forgotLinkText: { fontSize: 13, fontWeight: '600' },

  dividerRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
  dividerLine:    { flex: 1, height: 1 },
  dividerText:    { fontSize: 12 },

  signUpBtn:      { borderRadius: 14, borderWidth: 1.5, paddingVertical: 14, alignItems: 'center' },
  signUpBtnText:  { fontSize: 14 },

  footer:         { marginTop: 32, alignItems: 'center', gap: 8 },
  footerCopy:     { fontSize: 11 },
  footerLinks:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerLink:     { fontSize: 11, fontWeight: '600' },
  footerDot:      { width: 3, height: 3, borderRadius: 1.5 },
});
