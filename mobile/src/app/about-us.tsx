import { FontAwesome5 } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '@/components/BackButton';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

export default function AboutUsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();

  const version = Application.nativeApplicationVersion ?? '1.0.0';
  const year = new Date().getFullYear();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <MaxWidthContainer>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <BackButton />
          <View style={styles.headerCenter}>
            <FontAwesome5 name="info-circle" size={18} color={C.brinjal1} />
            <Text style={[styles.headerTitle, { color: C.text }]}>{t('aboutUsScreen.title')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Brand */}
          <View style={styles.brand}>
            <Image
              source={require('@/assets/images/app-icon.png')}
              style={[styles.logo, { borderColor: C.border }]}
            />
            <Text style={[styles.brandName, { color: C.text }]}>{t('aboutUsScreen.title')}</Text>
            <Text style={[styles.tagline, { color: C.textSecondary }]}>{t('aboutUsScreen.tagline')}</Text>
          </View>

          <Text style={[styles.intro, { color: C.textSecondary }]}>{t('aboutUsScreen.intro')}</Text>

          <Section C={C} icon="user-friends" title={t('aboutUsScreen.creatorsHeading')}>
            <Text style={[styles.body, { color: C.textSecondary }]}>{t('aboutUsScreen.creatorsBody')}</Text>
          </Section>

          <Section C={C} icon="briefcase" title={t('aboutUsScreen.businessesHeading')}>
            <Text style={[styles.body, { color: C.textSecondary }]}>{t('aboutUsScreen.businessesBody')}</Text>
          </Section>

          <Section C={C} icon="bullseye" title={t('aboutUsScreen.missionHeading')}>
            <Text style={[styles.body, { color: C.textSecondary }]}>{t('aboutUsScreen.missionBody')}</Text>
          </Section>

          <Section C={C} icon="mountain" title={t('aboutUsScreen.nepalHeading')}>
            <Text style={[styles.body, { color: C.textSecondary }]}>{t('aboutUsScreen.nepalBody')}</Text>
          </Section>

          {/* Closing tagline */}
          <View style={[styles.taglineCard, { backgroundColor: `${C.brinjal1}12`, borderColor: `${C.brinjal1}30` }]}>
            <Text style={[styles.tagline2, { color: C.brinjal1 }]}>{t('aboutUsScreen.tagline2')}</Text>
          </View>

          {/* Meta */}
          <View style={styles.meta}>
            <Text style={[styles.company, { color: C.text }]}>{t('aboutUsScreen.company')}</Text>
            <Text style={[styles.metaText, { color: C.textSecondary }]}>
              {t('aboutUsScreen.versionLabel', { version })}
            </Text>

            <View style={styles.links}>
              <Pressable hitSlop={8} onPress={() => router.push('/legal?type=terms' as never)}>
                <Text style={[styles.link, { color: C.brinjal1 }]}>{t('aboutUsScreen.terms')}</Text>
              </Pressable>
              <Text style={[styles.metaText, { color: C.border }]}>•</Text>
              <Pressable hitSlop={8} onPress={() => router.push('/legal?type=privacy-policy' as never)}>
                <Text style={[styles.link, { color: C.brinjal1 }]}>{t('aboutUsScreen.privacy')}</Text>
              </Pressable>
            </View>

            <Text style={[styles.metaText, { color: C.textSecondary, marginTop: 8 }]}>
              {t('aboutUsScreen.copyright', { year })}
            </Text>
          </View>
        </ScrollView>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

function Section({
  C,
  icon,
  title,
  children,
}: {
  C: ReturnType<typeof useAppColors>;
  icon: keyof typeof FontAwesome5.glyphMap;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, { backgroundColor: `${C.brinjal1}18` }]}>
          <FontAwesome5 name={icon} size={14} color={C.brinjal1} />
        </View>
        <Text style={[styles.cardTitle, { color: C.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontFamily: F.bold },

  scroll: { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.lg, paddingBottom: SPACING.xxxl, gap: 12 },

  brand: { alignItems: 'center', gap: 6, paddingVertical: SPACING.md },
  logo: { width: 84, height: 84, borderRadius: RADIUS.xl, borderWidth: 1 },
  brandName: { fontSize: 22, fontFamily: F.extrabold, marginTop: 6 },
  tagline: { fontSize: 14, fontFamily: F.semibold, textAlign: 'center', lineHeight: 21 },

  intro: { fontSize: 14, lineHeight: 22, fontFamily: F.regular, textAlign: 'center', paddingHorizontal: SPACING.sm, marginBottom: 4 },

  card: { borderRadius: RADIUS.md, borderWidth: 1, padding: SPACING.lg, ...SHADOW.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconWrap: { width: 28, height: 28, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 15, fontFamily: F.bold },

  body: { fontSize: 14, lineHeight: 22, fontFamily: F.regular },

  taglineCard: { borderRadius: RADIUS.md, borderWidth: 1, padding: SPACING.lg, alignItems: 'center', marginTop: 4 },
  tagline2: { fontSize: 15, lineHeight: 24, fontFamily: F.bold, textAlign: 'center' },

  meta: { alignItems: 'center', gap: 4, paddingTop: 20 },
  company: { fontSize: 13, fontFamily: F.bold },
  metaText: { fontSize: 12, fontFamily: F.regular, textAlign: 'center' },
  links: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  link: { fontSize: 13, fontFamily: F.semibold },
});
