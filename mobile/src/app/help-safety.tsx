import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { SUPPORT_EMAIL, SUPPORT_WEBSITE } from '@/services/safety';
import { F, FONT_SIZE, MIN_TOUCH_TARGET, RADIUS, SCREEN_GUTTER, SPACING, lineHeightFor } from '@/utilities/constants';

// Help & Safety — Kolab's published contact details, the policies, how
// report / block / review / appeal work, and the Blocked Users list. One tap
// from the side drawer and from Settings → Support. Also reachable signed
// out (contact + policies only).
export default function HelpSafetyScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const { user } = useAuth();

  const how: [string, string][] = [
    ['flag', t('safety.howReport')],
    ['ban', t('safety.howBlock')],
    ['user-shield', t('safety.howReview')],
    ['undo', t('safety.howAppeal')],
  ];

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={t('safety.helpTitle')} backFallback="/" />
      <ScrollView contentContainerStyle={s.scroll}>
        <MaxWidthContainer>
          <Text style={[s.intro, { color: C.textSecondary }]}>{t('safety.helpSubtitle')}</Text>

          <Text style={[s.section, { color: C.textSecondary }]}>{t('safety.contactTitle')}</Text>
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[s.cardBody, { color: C.textSecondary }]}>{t('safety.contactBody')}</Text>
            <Row icon="envelope" color="#2563EB" label={t('safety.email')} sub={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})} />
            <Row icon="globe" color="#16A34A" label={t('safety.website')} sub="kolab.com.np" onPress={() => Linking.openURL(SUPPORT_WEBSITE).catch(() => {})} isLast />
          </View>

          {!!user && (
            <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Row icon="ban" color="#DC2626" label={t('safety.blockedUsers')} sub={t('safety.blockedUsersSub')} onPress={() => router.push('/blocked-users')} isLast />
            </View>
          )}

          <Text style={[s.section, { color: C.textSecondary }]}>{t('safety.howTitle')}</Text>
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border, gap: SPACING.md }]}>
            {how.map(([icon, text]) => (
              <View key={icon} style={s.howRow}>
                <FontAwesome5 name={icon} size={14} color={C.text} style={{ marginTop: 3, width: 18 }} />
                <Text style={[s.howTxt, { color: C.textSecondary }]}>{text}</Text>
              </View>
            ))}
          </View>

          <Text style={[s.section, { color: C.textSecondary }]}>{t('safety.policiesTitle')}</Text>
          <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Row icon="users" color="#16A34A" label={t('safety.guidelines')} onPress={() => router.push({ pathname: '/legal', params: { type: 'guidelines' } })} />
            <Row icon="file-alt" color="#6366F1" label={t('safety.terms')} onPress={() => router.push({ pathname: '/legal', params: { type: 'terms' } })} />
            <Row icon="shield-alt" color="#3B82F6" label={t('safety.privacy')} onPress={() => router.push({ pathname: '/legal', params: { type: 'privacy-policy' } })} isLast />
          </View>
        </MaxWidthContainer>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, color, label, sub, onPress, isLast }: { icon: string; color: string; label: string; sub?: string; onPress: () => void; isLast?: boolean }) {
const C = useAppColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.row, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border }, pressed && { opacity: 0.7 }]}
      accessibilityRole="button">
      <View style={[s.rowIcon, { backgroundColor: color + '1A' }]}><FontAwesome5 name={icon} size={15} color={color} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, { color: C.text }]}>{label}</Text>
        {!!sub && <Text style={[s.rowSub, { color: C.textSecondary }]} numberOfLines={1}>{sub}</Text>}
      </View>
      <FontAwesome5 name="chevron-right" size={12} color={C.textPlaceholder} />
    </Pressable>
  );
}


const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxxl },
  intro: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, lineHeight: lineHeightFor(FONT_SIZE.sm), marginTop: SPACING.md, marginBottom: SPACING.sm },
  section: { fontSize: 12, fontFamily: F.semibold, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, marginBottom: SPACING.md },
  cardBody: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, lineHeight: lineHeightFor(FONT_SIZE.sm), marginBottom: SPACING.sm },
  row: { minHeight: MIN_TOUCH_TARGET + 8, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontFamily: F.semibold },
  rowSub: { fontSize: 13, fontFamily: F.regular, marginTop: 1 },
  howRow: { flexDirection: 'row', gap: SPACING.md },
  howTxt: { flex: 1, fontSize: FONT_SIZE.sm, fontFamily: F.regular, lineHeight: lineHeightFor(FONT_SIZE.sm) },
});
