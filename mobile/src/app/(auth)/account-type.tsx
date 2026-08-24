import { FontAwesome5 } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors, useIsDark } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING, lineHeightFor } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { BackButton } from '@/components/BackButton';
import { buildRoles } from './login';

type Role = 'CREATOR' | 'BUSINESS';

const LANG_LABELS = { en: 'Eng', ne: 'ने' } as const;

// Same logo mark the login header carries.
const LOGO = require('@/assets/images/logo.png');

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
// Laid out from the same pieces as the creator home feed and login.tsx: a
// pinned header row, a heading that states the question, then content cards
// (surface fill, hairline border, raised lift) each fronted by a photo band.
//
// Copy deliberately avoids "Creator"/"Business" terminology in favor of plain
// outcome sentences ("Earn money by offering your services and skills" / "As a
// business, find skilled people…") — this keeps the choice legible as Kolab
// expands beyond creator-brand collaborations into a wider service marketplace,
// without requiring a data-model rename. The underlying role stays CREATOR/BUSINESS
// (matching the rest of the backend/mobile code, where "Provider" is already
// established as a UI label only, never a stored value) — nothing downstream needs
// to know how this screen phrases itself.
export default function AccountTypeScreen() {
  const C = useAppColors();
  const { isDark } = useIsDark();
  const { language, setLanguage, t } = useLanguage();
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
        {/* Header — pinned above the scroll, the same row login.tsx opens with:
            circular back button, wordmark, brand-tinted language pill. */}
        <View style={[s.headerRow, { backgroundColor: C.background }]}>
          <BackButton fallback="/" />
          <View style={s.headerBrand}>
            <ExpoImage source={LOGO} style={s.headerLogo} contentFit="contain" />
          </View>
          <Pressable
            style={[s.langChip, { backgroundColor: C.primaryLight, borderColor: C.border }]}
            hitSlop={8}
            accessibilityRole="button"
            onPress={() => setLanguage(language === 'en' ? 'ne' : 'en')}>
            <Text style={[s.langChipText, { color: C.brinjal1 }]}>{LANG_LABELS[language === 'en' ? 'ne' : 'en']}</Text>
          </Pressable>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Names the decision before the cards do — without it the two cards
              read as a list of features rather than a choice the user has to
              make. accessibilityRole="header" also gives screen readers a
              landmark to jump to at the top of the scroll. */}
          <View style={s.intro}>
            <Text style={[s.pageTitle, { color: C.text }]} accessibilityRole="header">{t('accountType.pageTitle')}</Text>
          </View>

          <View style={s.cards}>
            {roles.map((r) => {
              const active = selected === r.key;
              const tint = r.grad[0];
              const cardTitle   = r.key === 'CREATOR' ? t('accountType.offerTitle')   : t('accountType.seekTitle');
              const cardExample = r.key === 'CREATOR' ? t('accountType.offerExample') : t('accountType.seekExample');
              const benefits = r.key === 'CREATOR'
                ? [t('accountType.offerBenefit1'), t('accountType.offerBenefit2'), t('accountType.offerBenefit3')]
                : [t('accountType.seekBenefit1'), t('accountType.seekBenefit2'), t('accountType.seekBenefit3')];
              return (
                <Fragment key={r.key}>
                {/* Each card now leads with the full sentence that used to sit
                    above it as a lead-in, so the choice reads straight off the
                    card title. Only the "or" rule remains between the two. */}
                {r.key === 'BUSINESS' && (
                  <View style={s.orRow}>
                    <View style={[s.orRule, { backgroundColor: C.border }]} />
                    <Text style={[s.orText, { color: C.textSecondary }]}>{t('accountType.dividerOr')}</Text>
                    <View style={[s.orRule, { backgroundColor: C.border }]} />
                  </View>
                )}
                <Pressable
                  onPress={() => handleSelect(r.key)}
                  style={({ pressed }) => [
                    s.card,
                    { backgroundColor: C.surface, borderColor: active ? tint : C.border },
                    // Resting cards get the shared raised lift; the selected one
                    // trades it for a glow in its own role colour, the same way
                    // the home feed's primary buttons carry a brand-tinted shadow.
                    active
                      ? { borderWidth: 1.5, shadowColor: tint, shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 }
                      : SHADOW.raised,
                    { transform: [{ scale: pressed ? 0.98 : 1 }] },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={cardTitle}>

                  <View style={s.imageWrap}>
                    <ExpoImage source={CARD_IMAGE[r.key]} style={s.cardArt} contentFit="cover" />
                    <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent']} style={s.imageScrim} />

                    {active && (
                      <View style={[s.checkBadge, { backgroundColor: tint }]}>
                        <FontAwesome5 name="check" solid size={11} color="#fff" />
                      </View>
                    )}
                  </View>

                  <View style={s.cardBody}>
                    <View style={s.cardTitleRow}>
                      <Text style={[s.cardTitle, { color: C.text }]}>{cardTitle}</Text>
                      <FontAwesome5 name="chevron-right" solid size={14} color={active ? tint : C.textSecondary} />
                    </View>
                    <View style={s.benefitList}>
                      {benefits.map((b) => (
                        <View key={b} style={s.benefitRow}>
                          <FontAwesome5 name="check-circle" solid size={13} color={tint} style={s.benefitIcon} />
                          {/* Wraps to two lines: the longest benefit no longer
                              fits on one, and clipping it would cut the copy. */}
                          <Text style={[s.benefitText, { color: C.text }]} numberOfLines={2}>{b}</Text>
                        </View>
                      ))}
                    </View>

                    <View style={[s.exampleChip, { backgroundColor: active ? `${tint}1A` : C.primaryLight, borderColor: active ? `${tint}33` : C.border }]}>
                      <Text style={[s.exampleText, { color: active ? tint : C.textSecondary }]}>
                        {cardExample}
                      </Text>
                    </View>
                  </View>
                </Pressable>
                </Fragment>
              );
            })}
          </View>

          {/* Same closing reassurance line the login screen ends on. */}
          <View style={s.trustRow}>
            <FontAwesome5 name="shield-alt" solid size={11} color={C.textSecondary} />
            <Text style={[s.trustText, { color: C.textSecondary }]}>{t('auth.login.footer')}</Text>
          </View>
        </ScrollView>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

function useStyles(C: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    safe:   { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxl, gap: SPACING.lg },

    // ── Header ── mirrors login.tsx's pinned row.
    headerRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md, paddingBottom: SPACING.lg },
    headerBrand: { flex: 1 },
    headerLogo:  { width: 84, height: 28 },
    langChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.md, minHeight: 36, justifyContent: 'center' },
    langChipText: { fontSize: FONT_SIZE.xs, fontFamily: F.bold },

    // ── Page heading ──
    intro:        { gap: SPACING.xs },
    pageTitle:    { fontSize: FONT_SIZE.xxl, fontFamily: F.bold, letterSpacing: -0.2, lineHeight: lineHeightFor(FONT_SIZE.xxl) },

    // ── Card separator ── the "or" rule between the two choices.
    orRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    orRule:  { flex: 1, height: StyleSheet.hairlineWidth },
    orText:  { fontSize: FONT_SIZE.xs, fontFamily: F.bold, letterSpacing: 0.6, textTransform: 'uppercase' },

    // ── Choice cards ── standard content cards (surface, hairline, raised).
    cards: { gap: SPACING.lg },
    card:  { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },

    imageWrap:  { height: 124, position: 'relative' },
    cardArt:    { width: '100%', height: '100%' },
    imageScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 60 },
    checkBadge: {
      position: 'absolute', top: SPACING.md, right: SPACING.md, zIndex: 1,
      width: 26, height: 26, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center',
    },
    cardBody:      { padding: SPACING.lg, gap: 6 },
    cardTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    cardTitle:     { flex: 1, fontSize: FONT_SIZE.lg, fontFamily: F.bold, letterSpacing: 0.1, lineHeight: lineHeightFor(FONT_SIZE.lg) },

    benefitList: { gap: SPACING.sm, marginTop: SPACING.sm, marginBottom: SPACING.xs },
    benefitRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
    // Nudged down so the tick sits on the first line's centre, not its cap.
    benefitIcon: { marginTop: 3 },
    benefitText: { flex: 1, fontSize: FONT_SIZE.sm, fontFamily: F.medium, lineHeight: lineHeightFor(FONT_SIZE.sm) },

    // Example line — the home feed's inline chip: pill, tinted fill, hairline.
    exampleChip: { alignSelf: 'flex-start', maxWidth: '100%', borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: 6 },
    exampleText: { fontSize: FONT_SIZE.xs, fontFamily: F.medium, lineHeight: lineHeightFor(FONT_SIZE.xs) },

    trustRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: SPACING.xs },
    trustText: { fontSize: FONT_SIZE.xs, fontFamily: F.medium, textAlign: 'center' },
  });
}
