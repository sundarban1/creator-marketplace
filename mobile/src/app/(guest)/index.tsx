// Guest Home — the signed-out discovery homepage. Real published content only
// (events, competitions, opted-in creator profiles) from the public API;
// every account-only action routes through the guest login prompt.
import { useRef, useState } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Animated, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useAnimatedValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { openGuestSignup } from '@/components/GuestAuthPrompt';
import { Skeleton } from '@/components/Skeleton';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { FriendlyEmpty, GuestHeader, InlineNotice, RailSkeleton, SectionHeader } from '@/features/guest/components';
import { CREATOR_PHOTO_CARD_W, CompetitionRow, CreatorPhotoCard, OpportunityRow } from '@/features/guest/homeCards';
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

const RAIL_GAP = SPACING.md;
const TRACK_PAD = 4;
const PURPLE = '#7C3AED';

export default function GuestHomeScreen() {
  const C = useAppColors();
  const { t, language } = useLanguage();
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnTabPress('guest-index', () => scrollRef.current?.scrollTo({ y: 0, animated: true }));

  const events = useQuery({
    queryKey: ['guest', 'home', 'events'],
    queryFn: () => campaignService.list({ limit: 3 }),
    staleTime: STALE.list,
  });
  const competitions = useQuery({
    queryKey: ['guest', 'home', 'competitions'],
    queryFn: () => creatorCompetitionService.discover({ tab: 'open', limit: 2 }),
    staleTime: STALE.list,
  });
  const creators = useQuery({
    queryKey: ['guest', 'home', 'creators'],
    queryFn: () => publicService.listCreators({ limit: 10 }),
    staleTime: STALE.list,
  });
  const { refreshing, onRefresh } = usePullToRefresh(events, competitions, creators);

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

        {/* ── B. Hero ── headline left, collaboration art on a soft blob right */}
        <View style={s.hero}>
          <View style={[s.heroBlob, { backgroundColor: C.accentLight }]} pointerEvents="none" />
          <ExpoImage source={HERO_ART} style={s.heroArt} contentFit="contain" accessible={false} />
          <View style={s.heroText}>
            <Text
              style={[s.heroTitle, { color: C.text, lineHeight: language === 'ne' ? lineHeightFor(34) : 40 }]}
              accessibilityRole="header">
              {t('guest.hero.headlineLead')}{' '}
              <Text style={{ color: C.accent }}>{t('guest.hero.headlineAccent')}</Text>
            </Text>
            <Text style={[s.heroTagline, { color: C.textSecondary }]}>{t('guest.hero.tagline')}</Text>
          </View>
          <Text style={[s.heroDesc, { color: C.textSecondary }]}>{t('guest.hero.description')}</Text>
          <View style={s.heroCtas}>
            <Pressable
              onPress={() => router.navigate('/(guest)/events')}
              style={({ pressed }) => [s.pillBtn, { backgroundColor: C.accent }, SHADOW.raised, { shadowColor: C.accent }, pressed && { opacity: 0.9 }]}
              accessibilityRole="button">
              <Text style={[s.pillBtnText, { color: '#fff' }]}>{t('guest.hero.explore')}</Text>
              <FontAwesome5 name="arrow-right" size={12} color="#fff" />
            </Pressable>
            <Pressable
              onPress={() => openGuestSignup()}
              style={({ pressed }) => [s.pillBtn, { borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface }, pressed && { opacity: 0.85 }]}
              accessibilityRole="button">
              <Text style={[s.pillBtnText, { color: C.text }]}>{t('guest.createAccount')}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── C. Discover Opportunities ── */}
        <View style={s.section}>
          <SectionHeader title={t('guest.sections.opportunities')} onSeeAll={() => router.navigate('/(guest)/events')} />
          {events.isPending ? (
            <RowSkeletons count={2} />
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
            <View style={s.stack}>
              {eventList.map((c) => <OpportunityRow key={c.id} campaign={c} />)}
            </View>
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
            <View style={s.stack}>
              {compList.map((c) => <CompetitionRow key={c.id} c={c} />)}
            </View>
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
            <FlatList
              horizontal
              data={creatorList}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => <CreatorPhotoCard creator={item} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.rail}
              ItemSeparatorComponent={RailGap}
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
                <Text style={[s.stepTitle, { color: C.text }]} numberOfLines={1}>{`${i + 1}. ${t(`guest.how.${key}`)}`}</Text>
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
            <Text style={[s.pillBtnText, { color: '#fff' }]}>{t('guest.final.cta')}</Text>
            <FontAwesome5 name="arrow-right" size={12} color="#fff" />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RailGap() {
  return <View style={{ width: RAIL_GAP }} />;
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
        <ExpoImage source={current.photo} style={s.audiencePhoto} contentFit="cover" transition={150} accessible={false} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1 },
  scroll:  { paddingBottom: SPACING.xxl },
  section: { marginTop: SPACING.xl + 4 },
  stack:   { paddingHorizontal: SCREEN_GUTTER, gap: SPACING.md },
  rail:    { paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.sm },

  // Hero
  hero:        { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, overflow: 'hidden' },
  heroBlob:    { position: 'absolute', right: -60, top: -10, width: 260, height: 240, borderRadius: 130, transform: [{ rotate: '-12deg' }] },
  heroArt:     { position: 'absolute', right: -4, top: SPACING.lg, width: 170, height: 170 },
  heroText:    { width: '60%', gap: SPACING.md, minHeight: 190 },
  // lineHeight set inline: tight for Latin, ≥1.5× for Devanagari (matras clip otherwise).
  heroTitle:   { fontSize: 34, fontFamily: F.bold, letterSpacing: -0.6 },
  heroTagline: { fontSize: FONT_SIZE.md, fontFamily: F.medium, lineHeight: lineHeightFor(FONT_SIZE.md) },
  heroDesc:    { fontSize: FONT_SIZE.sm, fontFamily: F.regular, lineHeight: lineHeightFor(FONT_SIZE.sm), marginTop: SPACING.md },
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
  audiencePhoto:   { width: 112, alignSelf: 'stretch' },

  // Final CTA
  final:      { marginHorizontal: SCREEN_GUTTER, marginTop: SPACING.xl + 4, borderRadius: RADIUS.lg, padding: SPACING.xl, minHeight: 180, justifyContent: 'center', gap: SPACING.lg, overflow: 'hidden' },
  finalTitle: { fontSize: FONT_SIZE.xl, fontFamily: F.bold, lineHeight: lineHeightFor(FONT_SIZE.xl), maxWidth: '75%' },
  finalBtn:   { flex: 0, alignSelf: 'flex-start', paddingHorizontal: SPACING.xl },
});
