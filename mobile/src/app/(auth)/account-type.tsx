import { FontAwesome5 } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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

// The glyph that rides each card also rides the "Signing up as …" chip on the
// next screen (login.tsx's SignupForm), so the mark the user picks here is the
// one that confirms their choice afterwards.
const CARD_ICON: Record<Role, 'magic' | 'search'> = { CREATOR: 'magic', BUSINESS: 'search' };

// The most important screen in the signup flow — it's what determines whether
// the user lands in the Creator or Business experience, so the two choices get
// full-width, fully-tappable cards rather than a compact side-by-side picker
// (that denser variant already exists inline in login.tsx's SignupForm and in
// its OAuth needsRole bottom sheet, both of which stay as-is — this screen is
// the primary Welcome → Get Started path, not a replacement for those).
//
// Laid out from the same pieces as the creator home feed and login.tsx: a
// pinned header row, then content cards (surface fill, hairline border, raised
// lift) each fronted by the home feed's rounded-square Quick Action tile.
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
            <FontAwesome5 name="globe" solid size={11} color={C.brinjal1} />
            <Text style={[s.langChipText, { color: C.brinjal1 }]}>{LANG_LABELS[language === 'en' ? 'ne' : 'en']}</Text>
          </Pressable>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.cards}>
            {roles.map((r) => {
              const active = selected === r.key;
              const tint = r.grad[0];
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

                    {/* Quick Action tile, straight off the home feed — a rounded
                        square of the role's own colour, straddling the photo's
                        bottom edge so it anchors the body text below it. */}
                    <LinearGradient
                      colors={r.grad}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={[s.iconTile, { borderColor: C.surface }]}>
                      <FontAwesome5 name={CARD_ICON[r.key]} solid size={20} color="#fff" />
                    </LinearGradient>
                  </View>

                  <View style={s.cardBody}>
                    <View style={s.cardTitleRow}>
                      <Text style={[s.cardTitle, { color: C.text }]}>{cardTitle}</Text>
                      <FontAwesome5 name="chevron-right" solid size={14} color={active ? tint : C.textSecondary} />
                    </View>
                    <Text style={[s.cardDesc, { color: C.textSecondary }]}>{cardDesc}</Text>

                    <View style={s.benefitList}>
                      {benefits.map((b) => (
                        <View key={b} style={s.benefitRow}>
                          <FontAwesome5 name="check-circle" solid size={13} color={tint} />
                          <Text style={[s.benefitText, { color: C.text }]} numberOfLines={1}>{b}</Text>
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

    // ── Choice cards ── standard content cards (surface, hairline, raised).
    cards: { gap: SPACING.lg },
    card:  { borderRadius: RADIUS.lg, borderWidth: 1, overflow: 'hidden' },

    // zIndex lifts the whole band — and with it the tile hanging below its
    // bottom edge — above `cardBody`, which is a later sibling and would
    // otherwise paint straight over the overlapping part of the tile.
    imageWrap:  { height: 124, position: 'relative', zIndex: 2 },
    cardArt:    { width: '100%', height: '100%' },
    imageScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 60 },
    checkBadge: {
      position: 'absolute', top: SPACING.md, right: SPACING.md, zIndex: 1,
      width: 26, height: 26, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center',
    },
    // Straddles the photo's bottom edge — the 3px ring in the card's own
    // surface colour is what keeps it legible against the photo behind it.
    iconTile: {
      position: 'absolute', left: SPACING.lg, bottom: -22, zIndex: 1,
      width: 52, height: 52, borderRadius: RADIUS.lg, borderWidth: 3,
      justifyContent: 'center', alignItems: 'center', ...SHADOW.card,
    },

    // paddingTop clears the tile overlapping from the photo above.
    cardBody:      { padding: SPACING.lg, paddingTop: SPACING.xl + SPACING.sm, gap: 6 },
    cardTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    cardTitle:     { flex: 1, fontSize: FONT_SIZE.lg, fontFamily: F.bold, letterSpacing: 0.1, lineHeight: lineHeightFor(FONT_SIZE.lg) },
    cardDesc:      { fontSize: FONT_SIZE.sm, fontFamily: F.regular, lineHeight: lineHeightFor(FONT_SIZE.sm) },

    benefitList: { gap: SPACING.sm, marginTop: SPACING.sm, marginBottom: SPACING.xs },
    benefitRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
    benefitText: { flex: 1, fontSize: FONT_SIZE.sm, fontFamily: F.medium, lineHeight: lineHeightFor(FONT_SIZE.sm) },

    // Example line — the home feed's inline chip: pill, tinted fill, hairline.
    exampleChip: { alignSelf: 'flex-start', maxWidth: '100%', borderRadius: RADIUS.full, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: 6 },
    exampleText: { fontSize: FONT_SIZE.xs, fontFamily: F.medium, lineHeight: lineHeightFor(FONT_SIZE.xs) },

    trustRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: SPACING.xs },
    trustText: { fontSize: FONT_SIZE.xs, fontFamily: F.medium, textAlign: 'center' },
  });
}
