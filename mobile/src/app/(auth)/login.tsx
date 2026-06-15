import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { AppLogo } from '@/features/auth/components/AppLogo';
import type { Lang } from '@/i18n';

const LANG_OPTIONS: { lang: Lang; label: string; flag: string }[] = [
  { lang: 'en', label: 'EN', flag: '🇬🇧' },
  { lang: 'ne', label: 'नेप', flag: '🇳🇵' },
];

export default function LoginScreen() {
  const { user, login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const C = useAppColors();
  const { verified } = useLocalSearchParams<{ verified?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      router.replace(user.role === 'CREATOR' ? '/(creator)' : '/(business)');
    }
  }, [user]);

  async function handleLogin() {
    if (!email || !password) { setError(t('auth.login.requiredError')); return; }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      setError(e.message ?? t('auth.login.requiredError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: C.brinjal1 }]}>

      <View style={styles.hero}>
        <View style={styles.heroBubble1} />
        <View style={styles.heroBubble2} />
        <View style={styles.heroBubble3} />

        <SafeAreaView style={styles.langWrap} edges={['top']}>
          <View style={styles.langBtns}>
            {LANG_OPTIONS.map(({ lang, flag }) => (
              <Pressable
                key={lang}
                style={[styles.langBtn, language === lang && styles.langBtnActive]}
                onPress={() => setLanguage(lang)}>
                <Text style={styles.langBtnFlag}>{flag}</Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>

        <View style={styles.heroContent}>
          <AppLogo />
          <Text style={styles.appName}>CreatorMarket</Text>
          <Text style={styles.appTagline}>Where creators meet brands</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={[styles.card, { backgroundColor: C.background }]}
          contentContainerStyle={styles.cardContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <Text style={[styles.cardTitle, { color: C.text }]}>{t('auth.login.title')}</Text>
          <Text style={[styles.cardSubtitle, { color: C.textSecondary }]}>{t('auth.login.subtitle')}</Text>

          {verified === '1' ? (
            <View style={styles.successBanner}>
              <Text style={styles.successBannerText}>✅  Account verified! Sign in to continue.</Text>
            </View>
          ) : null}

          {error ? (
            <Text style={[styles.errorBanner, { backgroundColor: '#FFEAEA', color: C.error }]}>{error}</Text>
          ) : null}

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

            <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgotLink}>
              <Text style={[styles.forgotLinkText, { color: C.brinjal1 }]}>Forgot Password?</Text>
            </Pressable>

            <Pressable onPress={() => router.push('/signup')} style={styles.link}>
              <Text style={[styles.linkText, { color: C.textSecondary }]}>
                {t('auth.login.noAccount')}{' '}
                <Text style={[styles.linkBold, { color: C.brinjal1 }]}>{t('auth.login.signUpLink')}</Text>
              </Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerCopy, { color: C.textSecondary }]}>
              © 2026 CreatorMarket. All rights reserved.
            </Text>
            <View style={styles.footerLinks}>
              <Pressable><Text style={[styles.footerLink, { color: C.brinjal1 }]}>Terms of Service</Text></Pressable>
              <Text style={[styles.footerDot, { color: C.border }]}>·</Text>
              <Pressable><Text style={[styles.footerLink, { color: C.brinjal1 }]}>Privacy Policy</Text></Pressable>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  hero: { paddingBottom: 32, overflow: 'hidden' },
  heroBubble1: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,255,255,0.07)', top: -80, right: -60 },
  heroBubble2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.06)', bottom: -20, left: -40 },
  heroBubble3: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', top: 60, left: 30 },
  langWrap: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  langBtns: { flexDirection: 'row', gap: 6 },
  langBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  langBtnActive: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.28)' },
  langBtnFlag: { fontSize: 20, lineHeight: 24 },
  heroContent: { alignItems: 'center', paddingTop: 20, paddingBottom: 8 },
  appName: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 18, letterSpacing: 0.5 },
  appTagline: { fontSize: 14, color: 'rgba(255,255,255,0.72)', marginTop: 6, letterSpacing: 0.2 },
  card: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  cardContent: { padding: 28, paddingBottom: 40 },
  cardTitle: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, marginBottom: 24 },
  errorBanner: { borderRadius: 10, padding: 12, fontSize: 13, marginBottom: 4 },
  form: { gap: 14 },
  link: { alignItems: 'center', paddingVertical: 10 },
  linkText: { fontSize: 14 },
  linkBold: { fontWeight: '700' },
  footer: { marginTop: 36, alignItems: 'center', gap: 8 },
  footerCopy: { fontSize: 11, textAlign: 'center' },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLink: { fontSize: 11, fontWeight: '600' },
  footerDot: { fontSize: 14 },
  forgotLink: { alignItems: 'center', paddingVertical: 6 },
  forgotLinkText: { fontSize: 13, fontWeight: '600' },
  successBanner: { borderRadius: 10, padding: 12, marginBottom: 12, backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  successBannerText: { fontSize: 13, fontWeight: '600', color: '#15803D', textAlign: 'center' },
});
