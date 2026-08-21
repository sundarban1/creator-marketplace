import { FontAwesome5 } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors, useIsDark } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, FONT_SIZE, RADIUS, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { BackButton } from '@/components/BackButton';
import { buildRoles } from './login';

type Role = 'CREATOR' | 'BUSINESS';

// Placeholder stock photos standing in for each role until Kolab has its own
// commissioned illustrations/photography — swap these out when that's ready.
const CARD_IMAGE: Record<Role, number> = {
  CREATOR: require('@/assets/images/account-type/offer-services.jpg'),
  BUSINESS: require('@/assets/images/account-type/find-services.jpg'),
};

// The most important screen in the signup flow — it's what determines whether
// the user lands in the Creator or Business experience, so the two choices get
// full-width, fully-tappable cards rather than a compact side-by-side picker
// (that denser variant already exists inline in login.tsx's SignupForm and in
// its OAuth needsRole bottom sheet, both of which stay as-is — this screen is
// the primary Welcome → Get Started path, not a replacement for those).
//
// Copy deliberately avoids "Creator"/"Business" terminology in favor of "Offering
// services" / "Looking for services" — this keeps the choice legible as Kolab
// expands beyond creator-brand collaborations into a wider service marketplace,
// without requiring a data-model rename. The underlying role stays CREATOR/BUSINESS
// (matching the rest of the backend/mobile code, where "Provider" is already
// established as a UI label only, never a stored value) — nothing downstream needs
// to know how this screen phrases itself.
export default function AccountTypeScreen() {
  const C = useAppColors();
  const { isDark } = useIsDark();
  const { t } = useLanguage();
  const s = useStyles(C);
  const roles = buildRoles(C, isDark);
  const params = useLocalSearchParams<{ role?: string }>();
  const initialRole: Role | null = params.role === 'CREATOR' || params.role === 'BUSINESS' ? params.role : null;
  const [selected, setSelected] = useState<Role | null>(initialRole);

  function handleSelect(role: Role) {
    setSelected(role);
    router.replace({ pathname: '/login', params: { tab: 'signup', role } });
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <MaxWidthContainer>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <BackButton fallback="/" />
        </View>

        <View style={s.titleBlock}>
          <Text style={[s.title, { color: C.text }]}>{t('accountType.title')}</Text>
          <Text style={[s.subtitle, { color: C.textSecondary }]}>{t('accountType.subtitle')}</Text>
        </View>

        <View style={s.cards}>
          {roles.map((r) => {
            const active = selected === r.key;
            const tint = r.grad[0];
            const cardBg = active ? `${tint}12` : C.surface;
            const cardTitle   = r.key === 'CREATOR' ? t('accountType.offerTitle')   : t('accountType.seekTitle');
            const cardDesc    = r.key === 'CREATOR' ? t('accountType.offerDesc')    : t('accountType.seekDesc');
            const cardExample = r.key === 'CREATOR' ? t('accountType.offerExample') : t('accountType.seekExample');
            const benefits = r.key === 'CREATOR'
              ? [t('accountType.offerBenefit1'), t('accountType.offerBenefit2'), t('accountType.offerBenefit3')]
              : [t('accountType.seekBenefit1'), t('accountType.seekBenefit2'), t('accountType.seekBenefit3')];
            return (
              <Pressable
                key={r.key}
                onPress={() => handleSelect(r.key)}
                style={({ pressed }) => [
                  s.card,
                  { borderColor: active ? tint : C.border, backgroundColor: cardBg },
                  active && { shadowColor: tint, shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
                  { transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={cardTitle}>

                <View style={s.chevronWrap}>
                  <FontAwesome5 name="chevron-right" solid size={14} color={active ? tint : C.textSecondary} />
                </View>

                <View style={s.imageWrap}>
                  <ExpoImage source={CARD_IMAGE[r.key]} style={s.cardArt} contentFit="cover" />
                  <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} style={s.imageScrim} />

                  {active && (
                    <View style={[s.checkBadge, { backgroundColor: tint }]}>
                      <FontAwesome5 name="check" solid size={11} color="#fff" />
                    </View>
                  )}
                </View>

                <View style={s.cardBody}>
                  <Text style={[s.cardTitle, { color: C.text }]}>{cardTitle}</Text>
                  <Text style={[s.cardDesc, { color: C.textSecondary }]} numberOfLines={2}>{cardDesc}</Text>

                  <View style={s.benefitList}>
                    {benefits.map((b) => (
                      <View key={b} style={s.benefitRow}>
                        <FontAwesome5 name="check-circle" solid size={12} color={tint} />
                        <Text style={[s.benefitText, { color: C.text }]} numberOfLines={1}>{b}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={[s.exampleTag, { backgroundColor: active ? `${tint}1A` : C.primaryLight }]}>
                    <Text style={[s.exampleText, { color: active ? tint : C.textSecondary }]} numberOfLines={2}>
                      {cardExample}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
        </ScrollView>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

function useStyles(C: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    safe: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: SPACING.lg },
    header: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.sm },
    titleBlock: { paddingHorizontal: SPACING.xl, marginTop: SPACING.xl, marginBottom: SPACING.xxl, gap: SPACING.xs },
    title: { fontSize: FONT_SIZE.xxl, fontFamily: F.bold },
    subtitle: { fontSize: FONT_SIZE.md, fontFamily: F.regular, lineHeight: 23 },

    cards: { paddingHorizontal: SPACING.xl, gap: SPACING.lg },
    card: {
      borderRadius: RADIUS.xl, borderWidth: 1.5, overflow: 'hidden',
      position: 'relative',
    },
    chevronWrap: {
      position: 'absolute', top: '50%', right: SPACING.lg, marginTop: -10,
      zIndex: 2,
    },

    imageWrap: { height: 108, position: 'relative' },
    cardArt: { width: '100%', height: '100%' },
    imageScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 56 },
    checkBadge: {
      position: 'absolute', top: SPACING.sm, right: SPACING.sm, zIndex: 1,
      width: 26, height: 26, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center',
    },

    cardBody: { padding: SPACING.lg, paddingRight: SPACING.xxl, gap: 6 },
    cardTitle: { fontSize: FONT_SIZE.md, fontFamily: F.bold, letterSpacing: 0.1 },
    cardDesc: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, lineHeight: 20 },

    benefitList: { gap: 6, marginTop: 4, marginBottom: 2 },
    benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    benefitText: { flex: 1, fontSize: FONT_SIZE.xs, fontFamily: F.medium },

    exampleTag: { marginTop: 4, alignSelf: 'flex-start', borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs },
    exampleText: { fontSize: FONT_SIZE.xs, fontFamily: F.medium },
  });
}
