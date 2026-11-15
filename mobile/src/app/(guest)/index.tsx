// Guest Home — the signed-out discovery homepage. Real published content only
// (events, competitions, opted-in creator profiles) from the public API;
// every account-only action routes through the guest login prompt.
import { useRef, useState } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useAnimatedValue, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { openGuestSignup } from '@/components/GuestAuthPrompt';
import { Skeleton } from '@/components/Skeleton';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { FriendlyEmpty, GuestHeader, InlineNotice, RailSkeleton, SectionHeader } from '@/features/guest/components';
import { CREATOR_PHOTO_CARD_W, CompetitionRow, CreatorPhotoCard, OpportunityRow } from '@/features/guest/homeCards';
import { CardSlider } from '@/features/guest/CardSlider';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { STALE } from '@/lib/queryClient';
import { campaignService } from '@/services/campaign';
import { creatorCompetitionService } from '@/services/competition';
import { publicService } from '@/services/public';
import { withAlpha } from '@/utilities/color';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING, lineHeightFor } from '@/utilities/constants';

const HERO_ART      = require('@/assets/images/login/creator3.png');
const CREATOR_PHOTO = require('@/assets/images/login/login_1.jpg');
const BUSINESS_PHOTO = require('@/assets/images/login/business.jpg');
const FINAL_BG      = require('@/assets/images/login/himalaya.jpg');

const TRACK_PAD = 4;

// The hero was designed on a 393pt-wide phone (iPhone 15/16/17 Pro). Its
// fixed sizes scale with the screen width so small (SE, compact Android) and
// large (Pro Max, wide Android) phones keep the same composition. Clamped so
// nothing becomes tiny or oversized on extreme widths.
const DESIGN_WIDTH = 393;
function heroMetrics(screenW: number) {
  const k = Math.min(1.12, Math.max(0.82, screenW / DESIGN_WIDTH));
  const r = (n: number) => Math.round(n * k);
  const title = Math.max(26, r(32));
  const art = r(185);
  return {
    title,
    titleLineLatin: Math.round(title * 1.18),
    art,
    // The art floats (absolute) over the right of the row, so the text column
    // reserves at least the art's height: the row then ends at whichever is
    // lower — the image or a long, wrapped headline — never at a fixed number.
    text: { minHeight: art, paddingTop: r(48) },
    // One consistent gap between that row and the tagline.
    taglineGap: r(4),
    pillLift: -r(48),
    pillGap: r(12),
  };
}
// Big Dynamic Type / Android font scaling still grows text, but capped where
// the hero's fixed two-column layout would otherwise break apart.
const HERO_FONT_CAP = 1.3;
const PURPLE = '#7C3AED';

export default function GuestHomeScreen() {
  const C = useAppColors();
  const { t, language } = useLanguage();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnTabPress('guest-index', () => scrollRef.current?.scrollTo({ y: 0, animated: true }));

  const events = useQuery({
    queryKey: ['guest', 'home', 'events'],
    queryFn: () => campaignService.list({ limit: 8 }),
    staleTime: STALE.list,
  });
  const competitions = useQuery({
    queryKey: ['guest', 'home', 'competitions'],
    queryFn: () => creatorCompetitionService.discover({ tab: 'open', limit: 6 }),
    staleTime: STALE.list,
  });
  const creators = useQuery({
    queryKey: ['guest', 'home', 'creators'],
    queryFn: () => publicService.listCreators({ limit: 10 }),
    staleTime: STALE.list,
  });
  const { refreshing, onRefresh } = usePullToRefresh(events, competitions, creators);
  const { width: screenW } = useWindowDimensions();
  const hm = heroMetrics(screenW);

  const eventList = events.data?.campaigns ?? [];
  const compList = competitions.data?.items ?? [];
  const creatorList = creators.data?.creators ?? [];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <GuestHeader />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}>

        {/* ── B. Hero ── headline left, collaboration art right */}
        <View style={s.hero}>
          <ExpoImage source={HERO_ART} style={[s.heroArt, { width: hm.art, height: hm.art }]} contentFit="contain" accessible={false} />
          <View style={[s.heroText, hm.text]}>
            <View style={[s.badgePill, { marginTop: hm.pillLift, marginBottom: hm.pillGap, backgroundColor: C.surface, borderColor: withAlpha(C.accent, 0.3) }]}>
              <View style={[s.badgeDot, { backgroundColor: C.accent }]} />
              <Text style={[s.badgeText, { color: C.text }]} numberOfLines={1} maxFontSizeMultiplier={HERO_FONT_CAP}>{t('guest.hero.badge')}</Text>
            </View>
            <Text
              style={[s.heroTitle, { color: C.text, fontSize: hm.title, lineHeight: language === 'ne' ? lineHeightFor(hm.title) : hm.titleLineLatin }]}
              maxFontSizeMultiplier={HERO_FONT_CAP}
              accessibilityRole="header">
              {/* Three-tone headline: brand indigo → body colour → accent orange.
                  headlineMid may be empty (Nepali word order has no middle part). */}
              <Text style={{ color: C.brinjal1 }}>{t('guest.hero.headlineBrand')}</Text>{' '}
              {t('guest.hero.headlineMid') ? `${t('guest.hero.headlineMid')} ` : ''}
              <Text style={{ color: C.accent }}>{t('guest.hero.headlineAccent')}</Text>
            </Text>
          </View>
          {/* Tagline on one full-width line under the headline/art row. */}
          <Text
            style={[s.heroTagline, { color: C.textSecondary, marginTop: hm.taglineGap }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}>
            {t('guest.hero.tagline')}
          </Text>
          <View style={s.heroCtas}>
            <Pressable
              onPress={() => router.navigate('/(guest)/events')}
              style={({ pressed }) => [s.pillBtn, { backgroundColor: C.accent }, SHADOW.raised, { shadowColor: C.accent }, pressed && { opacity: 0.9 }]}
              accessibilityRole="button">
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[s.pillBtnText, { color: '#fff' }]}>{t('guest.hero.explore')}</Text>
              <FontAwesome5 name="arrow-right" size={12} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => openGuestSignup()}
              style={({ pressed }) => [s.pillBtn, { borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface }, pressed && { opacity: 0.85 }]}
              accessibilityRole="button">
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[s.pillBtnText, { color: C.text }]}>{t('guest.createAccount')}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── C. Discover Opportunities ── */}
        <View style={s.section}>
          <SectionHeader title={t('guest.sections.opportunities')} onSeeAll={() => router.navigate('/(guest)/events')} />
          {events.isPending ? (
            <RowSkeletons count={1} />
          ) : events.isError && eventList.length === 0 ? (
            <InlineNotice icon="wifi" text={t('guest.loadFailed')} actionLabel={t('guest.retry')} onAction={() => void events.refetch()} />
          ) : eventList.length === 0 ? (
            <FriendlyEmpty
              icon="briefcase"
              title={t('guest.empty.eventsTitle')}
              body={t('guest.empty.eventsBody')}
              actionLabel={t('guest.empty.eventsCta')}
              onAction={() => openGuestSignup()}
            />
          ) : (
            <CardSlider data={eventList} keyExtractor={(c) => c.id} renderItem={(c) => <OpportunityRow campaign={c} />} />
          )}
        </View>

        {/* ── D. Competitions ── */}
        <View style={s.section}>
          <SectionHeader title={t('guest.sections.competitions')} onSeeAll={() => router.navigate('/(guest)/competitions')} />
          {competitions.isPending ? (
            <RowSkeletons count={1} />
          ) : competitions.isError && compList.length === 0 ? (
            <InlineNotice icon="wifi" text={t('guest.loadFailed')} actionLabel={t('guest.retry')} onAction={() => void competitions.refetch()} />
          ) : compList.length === 0 ? (
            <FriendlyEmpty
              icon="trophy"
              title={t('guest.empty.competitionsTitle')}
              body={t('guest.empty.competitionsBody')}
              actionLabel={t('guest.empty.competitionsCta')}
              onAction={() => router.navigate({ pathname: '/(guest)/competitions', params: { tab: 'results' } })}
            />
          ) : (
            <CardSlider data={compList} keyExtractor={(c) => c.id} renderItem={(c) => <CompetitionRow c={c} />} />
          )}
        </View>

        {/* ── E. Discover Creators ── */}
        <View style={s.section}>
          <SectionHeader title={t('guest.sections.creators')} onSeeAll={() => router.navigate('/(guest)/discover')} />
          {creators.isPending ? (
            <RailSkeleton width={CREATOR_PHOTO_CARD_W} height={200} />
          ) : creators.isError && creatorList.length === 0 ? (
            <InlineNotice icon="wifi" text={t('guest.loadFailed')} actionLabel={t('guest.retry')} onAction={() => void creators.refetch()} />
          ) : creatorList.length === 0 ? (
            <FriendlyEmpty
              icon="user-friends"
              title={t('guest.empty.creatorsTitle')}
              body={t('guest.empty.creatorsBody')}
              actionLabel={t('guest.empty.creatorsCta')}
              onAction={() => openGuestSignup('CREATOR')}
            />
          ) : (
            <CardSlider
              data={creatorList}
              keyExtractor={(c) => c.id}
              renderItem={(c) => <CreatorPhotoCard creator={c} />}
              itemWidth={CREATOR_PHOTO_CARD_W}
            />
          )}
        </View>

        {/* ── F / G. For Creators · For Businesses — one card, slider picks the audience ── */}
        <View style={s.section}>
          <AudienceSwitcher />
        </View>

        {/* ── H. How Kolab Works ── four connected steps */}
        <View style={s.section}>
          <SectionHeader title={t('guest.how.title')} />
          <View style={s.steps}>
            <View style={[s.stepsLine, { backgroundColor: C.border }]} pointerEvents="none" />
            {([
              ['search', 'discover'],
              ['users', 'connect'],
              ['handshake', 'collaborate'],
              ['chart-line', 'grow'],
            ] as const).map(([icon, key], i) => (
              <View key={key} style={s.step} accessible accessibilityLabel={`${i + 1}. ${t(`guest.how.${key}`)}. ${t(`guest.how.${key}Body`)}`}>
                <View style={[s.stepIcon, { backgroundColor: C.accentLight, borderColor: C.background }]}>
                  <FontAwesome5 name={icon} size={16} color={C.accent} />
                </View>
                <Text style={[s.stepTitle, { color: C.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{`${i + 1}. ${t(`guest.how.${key}`)}`}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── I. Final CTA ── */}
        <View style={[s.final, { backgroundColor: C.accentLight }]}>
          {/* Full-bleed background photo; text + button sit on top of it. A fade
              from the card colour on the left keeps the copy readable over the
              mountains in both light and dark mode. */}
          <ExpoImage source={FINAL_BG} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="right bottom" accessible={false} />
          <LinearGradient
            colors={[C.accentLight, withAlpha(C.accentLight, 0.85), withAlpha(C.accentLight, 0.1)]}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Text style={[s.finalTitle, { color: C.text }]} accessibilityRole="header">{t('guest.final.title')}</Text>
          <Pressable
            onPress={() => openGuestSignup()}
            style={({ pressed }) => [s.pillBtn, s.finalBtn, { backgroundColor: C.accent }, pressed && { opacity: 0.9 }]}
            accessibilityRole="button">
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[s.pillBtnText, { color: '#fff' }]}>{t('guest.final.cta')}</Text>
            <FontAwesome5 name="arrow-right" size={12} color="#fff" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RowSkeletons({ count }: { count: number }) {
  return (
    <View style={s.stack}>
      {Array.from({ length: count }, (_, i) => <Skeleton key={i} width="100%" height={112} radius={RADIUS.lg} />)}
    </View>
  );
}

type Audience = 'creators' | 'businesses';

const AUDIENCES: {
  key: Audience; icon: keyof typeof FontAwesome5.glyphMap; i18n: string; role: 'CREATOR' | 'BUSINESS'; photo: number;
}[] = [
  { key: 'creators',   icon: 'palette', i18n: 'guest.forCreators',   role: 'CREATOR',  photo: CREATOR_PHOTO },
  { key: 'businesses', icon: 'store',   i18n: 'guest.forBusinesses', role: 'BUSINESS', photo: BUSINESS_PHOTO },
];

/** "For creators / For businesses" — a two-option slider over a single tinted card. */
function AudienceSwitcher() {
  const C = useAppColors();
  // Photo column ≈ 29% of the screen (112 on a 393pt phone), so the copy
  // column keeps enough room on compact phones.
  const { width: screenW } = useWindowDimensions();
  const photoW = Math.round(Math.min(130, Math.max(90, screenW * 0.285)));
  const { t } = useLanguage();
  const [active, setActive] = useState<Audience>('creators');
  const [trackW, setTrackW] = useState(0);
  const indicatorX = useAnimatedValue(0);

  const segW = trackW > 0 ? (trackW - TRACK_PAD * 2) / AUDIENCES.length : 0;
  const current = AUDIENCES.find((a) => a.key === active)!;
  // Creators on the orange accent, businesses on violet — same split as the reference.
  const tone = active === 'creators' ? C.accent : PURPLE;
  const tint = active === 'creators' ? C.accentLight : withAlpha(PURPLE, 0.1);

  function select(key: Audience) {
    setActive(key);
    const index = AUDIENCES.findIndex((a) => a.key === key);
    Animated.spring(indicatorX, { toValue: index * segW, useNativeDriver: true, speed: 18, bounciness: 4 }).start();
  }

  return (
    <View style={s.audienceWrap}>
      {/* Slider menu */}
      <View
        style={[s.track, { backgroundColor: C.surface, borderColor: C.border }]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setTrackW(w);
          // Keep the indicator on the selected option after a layout change.
          const index = AUDIENCES.findIndex((a) => a.key === active);
          indicatorX.setValue(index * ((w - TRACK_PAD * 2) / AUDIENCES.length));
        }}
        accessibilityRole="tablist">
        {segW > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[s.indicator, { width: segW, backgroundColor: tone, transform: [{ translateX: indicatorX }] }]}
          />
        )}
        {AUDIENCES.map((a) => {
          const selected = a.key === active;
          return (
            <Pressable
              key={a.key}
              onPress={() => select(a.key)}
              style={s.segment}
              accessibilityRole="tab"
              accessibilityState={{ selected }}>
              <FontAwesome5 name={a.icon} size={selected ? 14 : 12} color={selected ? '#fff' : C.textSecondary} />
              <Text
                style={[
                  s.segmentText,
                  selected
                    ? { color: '#fff', fontSize: FONT_SIZE.md, fontFamily: F.bold }
                    : { color: C.textSecondary, fontSize: FONT_SIZE.sm, fontFamily: F.semibold },
                ]}
                numberOfLines={1}>
                {t(`${a.i18n}.eyebrow`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Tinted card: copy left, photo right */}
      <View style={[s.audience, { backgroundColor: tint }]}>
        <View style={s.audienceText}>
          <View style={s.eyebrowRow}>
            <FontAwesome5 name={current.icon} size={12} color={tone} />
            <Text style={[s.eyebrow, { color: tone }]}>{t(`${current.i18n}.eyebrow`)}</Text>
          </View>
          <Text style={[s.audienceTitle, { color: C.text }]}>{t(`${current.i18n}.title`)}</Text>
          <View style={s.points}>
            {[1, 2, 3, 4].map((n) => (
              <View key={n} style={s.point}>
                <FontAwesome5 name="check" size={10} color={tone} style={{ marginTop: 4 }} />
                <Text style={[s.pointText, { color: C.text }]}>{t(`${current.i18n}.p${n}`)}</Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => openGuestSignup(current.role)}
            style={({ pressed }) => [s.audienceBtn, { backgroundColor: tone }, pressed && { opacity: 0.9 }]}
            accessibilityRole="button">
            <Text style={s.audienceBtnText} numberOfLines={1}>{t(`${current.i18n}.cta`)}</Text>
            <FontAwesome5 name="arrow-right" size={11} color="#fff" />
          </Pressable>
        </View>
        <ExpoImage source={current.photo} style={[s.audiencePhoto, { width: photoW }]} contentFit="cover" transition={150} accessible={false} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1 },
  scroll:  { paddingBottom: SPACING.xxl },
  section: { marginTop: SPACING.xl + 4 },
  stack:   { paddingHorizontal: SCREEN_GUTTER, gap: SPACING.md },

  // Hero
  hero:        { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, overflow: 'hidden' },
  // Sizes / offsets below are the 393pt design; heroMetrics() scales them inline.
  heroArt:     { position: 'absolute', right: -4, top: SPACING.lg },
  heroText:    { width: '60%', gap: SPACING.md },
  badgePill: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', maxWidth: '100%',
    borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6, gap: 6,
    // marginTop (lift) / marginBottom (gap to headline) are set inline, scaled with the screen.
  },
  badgeDot:  { width: 7, height: 7, borderRadius: 3.5 },
  badgeText: { fontSize: FONT_SIZE.sm, fontFamily: F.semibold, flexShrink: 1 },
  // lineHeight set inline: tight for Latin, ≥1.5× for Devanagari (matras clip otherwise).
  heroTitle:   { fontFamily: F.bold, letterSpacing: -0.6 },
  heroTagline: { fontSize: FONT_SIZE.md, fontFamily: F.medium, lineHeight: lineHeightFor(FONT_SIZE.md) },
  heroCtas:    { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  pillBtn: {
    flex: 1, minHeight: 50, borderRadius: RADIUS.full, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: SPACING.md,
  },
  pillBtnText: { fontSize: FONT_SIZE.md, fontFamily: F.bold },

  // How it works
  steps:     { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER },
  stepsLine: { position: 'absolute', top: 24, left: SCREEN_GUTTER + 40, right: SCREEN_GUTTER + 40, height: 1.5 },
  step:      { flex: 1, alignItems: 'center', gap: SPACING.sm },
  stepIcon:  { width: 48, height: 48, borderRadius: 24, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 12, fontFamily: F.semibold },

  // Audience switcher
  audienceWrap: { paddingHorizontal: SCREEN_GUTTER, gap: SPACING.md },
  track:        { flexDirection: 'row', borderWidth: 1, borderRadius: RADIUS.full, padding: TRACK_PAD },
  indicator:    { position: 'absolute', top: TRACK_PAD, bottom: TRACK_PAD, left: TRACK_PAD, borderRadius: RADIUS.full },
  segment:      { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: SPACING.xs },
  segmentText:  { flexShrink: 1 },
  audience:     { flexDirection: 'row', borderRadius: RADIUS.lg, overflow: 'hidden', minHeight: 230 },
  audienceText: { flex: 1, padding: SPACING.lg, paddingRight: SPACING.sm, gap: SPACING.sm },
  eyebrowRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrow:      { fontSize: 12, fontFamily: F.bold },
  audienceTitle: { fontSize: FONT_SIZE.lg + 1, fontFamily: F.bold, lineHeight: lineHeightFor(FONT_SIZE.lg + 1) },
  points:       { gap: 4 },
  point:        { flexDirection: 'row', gap: 7 },
  pointText:    { flex: 1, fontSize: 13, fontFamily: F.regular, lineHeight: lineHeightFor(13) },
  audienceBtn: {
    alignSelf: 'flex-start', minHeight: 40, borderRadius: RADIUS.full, flexDirection: 'row',
    alignItems: 'center', gap: 6, paddingHorizontal: 14, marginTop: SPACING.xs,
  },
  audienceBtnText: { color: '#fff', fontSize: 13, fontFamily: F.bold },
  audiencePhoto:   { alignSelf: 'stretch' },

  // Final CTA
  final:      { marginHorizontal: SCREEN_GUTTER, marginTop: SPACING.xl + 4, borderRadius: RADIUS.lg, padding: SPACING.xl, minHeight: 180, justifyContent: 'center', gap: SPACING.lg, overflow: 'hidden' },
  finalTitle: { fontSize: FONT_SIZE.xl, fontFamily: F.bold, lineHeight: lineHeightFor(FONT_SIZE.xl), maxWidth: '75%' },
  finalBtn:   { flex: 0, alignSelf: 'flex-start', paddingHorizontal: SPACING.xl },
});
