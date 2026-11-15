import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { termsService, type AcceptanceStatus, type LegalVersions } from '@/services/safety';
import { termsPending } from './termsPending';
import { F, FONT_SIZE, MIN_TOUCH_TARGET, RADIUS, SCREEN_GUTTER, SPACING, lineHeightFor } from '@/utilities/constants';

/**
 * "Welcome to Kolab" agreement — Terms of Use + Community Guidelines (+ the
 * Privacy Policy to read). Date of birth is no longer collected.
 *
 *   mode="preAuth"  — shown before any login / sign-up screen. Stores the
 *                     acceptance on the device; RootNavigator sends it to the
 *                     server as soon as the account is signed in.
 *   mode="signedIn" — shown full-screen to a signed-in user who hasn't
 *                     accepted the CURRENT versions (new account via social
 *                     sign-in, existing user, or a policy update). Posts the
 *                     acceptance directly.
 *
 * The checkbox starts unchecked; opening a document never counts as accepting.
 */
export function AgreementScreen({
  mode,
  status,
  onDone,
  onLogout,
}: {
  mode: 'preAuth' | 'signedIn';
  status?: AcceptanceStatus;
  onDone: (next?: 'login') => void;
  onLogout?: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  // Signed-in mode already has the versions from the status call.
  const versionsQuery = useQuery({ queryKey: ['legalVersions'], queryFn: () => termsService.versions(), enabled: !status });
  const versions: LegalVersions | null = status?.versions ?? versionsQuery.data ?? null;
  const loadError = versionsQuery.isError;
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const firstTime = mode === 'preAuth' || !status?.acceptedAt;


  function openDoc(type: 'terms' | 'guidelines' | 'privacy-policy') {
    router.push({ pathname: '/legal', params: { type } });
  }

  async function submit(next?: 'login') {
    if (!agreed || saving || !versions) return;
    setError('');
    setSaving(true);
    try {
      if (mode === 'preAuth') {
        await termsPending.set({ versions, agreedAt: new Date().toISOString() });
      } else {
        await termsService.accept(versions, undefined, Platform.OS === 'ios' ? 'ios' : 'android');
      }
      onDone(next);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t('termsGate.failed'));
    } finally {
      setSaving(false);
    }
  }

  const disabled = !agreed || saving || !versions;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <MaxWidthContainer>
            <View style={[s.badge, { backgroundColor: C.brinjal1 + '14' }]}>
              <FontAwesome5 name="handshake" size={22} color={C.brinjal1} />
            </View>
            <Text style={[s.title, { color: C.text }]} accessibilityRole="header">{t('termsGate.welcome')}</Text>
            <Text style={[s.tagline, { color: C.brinjal1 }]}>{t('termsGate.tagline')}</Text>
            <Text style={[s.intro, { color: C.textSecondary }]}>{firstTime ? t('termsGate.intro') : t('termsGate.updated')}</Text>

            <View style={[s.docs, { borderColor: C.border, backgroundColor: C.surface }]}>
              {([
                ['terms', 'file-alt', t('termsGate.readTerms')],
                ['guidelines', 'users', t('termsGate.readGuidelines')],
                ['privacy-policy', 'shield-alt', t('termsGate.readPrivacy')],
              ] as const).map(([type, icon, label], i) => (
                <Pressable
                  key={type}
                  onPress={() => openDoc(type)}
                  style={({ pressed }) => [s.docRow, i < 2 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }, pressed && { opacity: 0.7 }]}
                  accessibilityRole="link">
                  <FontAwesome5 name={icon} size={15} color={C.brinjal1} style={{ width: 20 }} />
                  <Text style={[s.docTxt, { color: C.text }]}>{label}</Text>
                  <FontAwesome5 name="chevron-right" size={12} color={C.textPlaceholder} />
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => setAgreed((v) => !v)}
              style={[s.checkRow, { borderColor: agreed ? C.brinjal1 : C.border, backgroundColor: C.surface }]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agreed }}>
              <FontAwesome5 name={agreed ? 'check-square' : 'square'} solid={agreed} size={20} color={agreed ? C.brinjal1 : C.textSecondary} />
              <Text style={[s.checkTxt, { color: C.text }]}>{t('termsGate.checkbox')}</Text>
            </Pressable>

            {loadError && (
              <Pressable onPress={() => void versionsQuery.refetch()} style={s.retry} accessibilityRole="button">
                <Text style={[s.error, { textAlign: 'center' }]}>{t('termsGate.failed')} ↻</Text>
              </Pressable>
            )}
            {!!error && <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text>}

            <Pressable
              onPress={() => submit()}
              disabled={disabled}
              style={[s.primary, { backgroundColor: disabled ? C.border : C.brinjal1 }]}
              accessibilityRole="button"
              accessibilityState={{ disabled, busy: saving }}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryTxt}>{t('termsGate.continue')}</Text>}
            </Pressable>

            {mode === 'preAuth' ? (
              <Pressable
                onPress={() => submit('login')}
                disabled={disabled}
                style={[s.secondary, { borderColor: C.border, opacity: disabled ? 0.5 : 1 }]}
                accessibilityRole="button">
                <Text style={[s.secondaryTxt, { color: C.text }]}>{t('termsGate.logIn')}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={onLogout} style={s.linkBtn} accessibilityRole="button">
                <Text style={[s.secondaryTxt, { color: C.textSecondary }]}>{t('termsGate.logout')}</Text>
              </Pressable>
            )}
          </MaxWidthContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.xl, paddingBottom: SPACING.xxxl },
  badge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  title: { fontSize: 28, fontFamily: F.bold, lineHeight: lineHeightFor(28) },
  tagline: { fontSize: FONT_SIZE.md, fontFamily: F.semibold, marginTop: 2 },
  intro: { fontSize: FONT_SIZE.md, fontFamily: F.regular, lineHeight: lineHeightFor(FONT_SIZE.md), marginTop: SPACING.md },
  docs: { marginTop: SPACING.xl, borderRadius: RADIUS.lg, borderWidth: 1, paddingHorizontal: SPACING.lg },
  docRow: { minHeight: MIN_TOUCH_TARGET + 8, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  docTxt: { flex: 1, fontSize: 15, fontFamily: F.semibold },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, borderWidth: 1.5, borderRadius: RADIUS.lg, padding: SPACING.lg, marginTop: SPACING.xl, minHeight: MIN_TOUCH_TARGET },
  checkTxt: { flex: 1, fontSize: 14, fontFamily: F.medium, lineHeight: lineHeightFor(14) },
  error: { color: '#DC2626', fontSize: 13, fontFamily: F.medium, marginTop: SPACING.md },
  retry: { minHeight: MIN_TOUCH_TARGET, justifyContent: 'center' },
  primary: { height: 54, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.xl },
  primaryTxt: { color: '#fff', fontSize: 16, fontFamily: F.bold },
  secondary: { height: 52, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md },
  secondaryTxt: { fontSize: 15, fontFamily: F.semibold },
  linkBtn: { minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md },
});
