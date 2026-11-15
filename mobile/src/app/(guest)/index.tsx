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
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { CampaignCard } from '@/features/creator/components/CampaignCard';
import { CompetitionCardItem } from '@/features/creator/competition/parts';
import {
  Bullet, CREATOR_CARD_W, CreatorCard, GuestHeader, InlineNotice, RailSkeleton, SectionHeader,
} from '@/features/guest/components';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { STALE } from '@/lib/queryClient';
import { campaignService } from '@/services/campaign';
import { creatorCompetitionService } from '@/services/competition';
import { publicService } from '@/services/public';
import { withAlpha } from '@/utilities/color';
import { COLORS, F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING, lineHeightFor } from '@/utilities/constants';

const HERO = require('@/assets/images/login/login.jpg');
const COMP_CARD_W = 286;
const RAIL_GAP = SPACING.md;
const TRACK_PAD = 4;

export default function GuestHomeScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
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

        {/* ── B. Hero ── */}
        <View style={s.heroWrap}>
          <View style={[s.hero, SHADOW.raised]}>
            <ExpoImage source={HERO} style={StyleSheet.absoluteFill} contentFit="cover" accessible={false} />
            <LinearGradient
              colors={[withAlpha(COLORS.brinjal2, 0.25), withAlpha(COLORS.brinjal2, 0.7), withAlpha(COLORS.brinjal2, 0.96)]}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            {/* Creator ⇄ Business — the two sides Kolab connects */}
            <View style={s.heroPills}>
              <View style={s.heroPill}>
                <FontAwesome5 name="camera" size={11} color="#fff" />
                <Text style={s.heroPillText}>{t('guest.hero.creators')}</Text>
              </View>
              <FontAwesome5 name="exchange-alt" size={12} color={withAlpha('#FFFFFF', 0.85)} />
              <View style={s.heroPill}>
                <FontAwesome5 name="store" size={11} color="#fff" />
                <Text style={s.heroPillText}>{t('guest.hero.businesses')}</Text>
              </View>
            </View>
            <View style={s.heroBody}>
              <Text style={s.heroTitle} accessibilityRole="header">{t('guest.hero.headline')}</Text>
              <Text style={s.heroTagline}>{t('guest.hero.tagline')}</Text>
              <Text style={s.heroDesc}>{t('guest.hero.description')}</Text>
              <View style={s.heroCtas}>
                <Pressable
                  onPress={() => router.navigate('/(guest)/events')}
                  style={({ pressed }) => [s.heroBtn, { backgroundColor: C.accent }, pressed && { opacity: 0.9 }]}
                  accessibilityRole="button">
                  <Text style={s.heroBtnText}>{t('guest.hero.explore')}</Text>
                  <FontAwesome5 name="arrow-right" size={12} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() => openGuestSignup()}
                  style={({ pressed }) => [s.heroBtn, s.heroBtnGhost, pressed && { opacity: 0.9 }]}
                  accessibilityRole="button">
                  <Text style={s.heroBtnText}>{t('guest.createAccount')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* ── C. Discover Opportunities ── */}
        <View style={s.section}>
          <SectionHeader
            title={t('guest.sections.opportunities')}
            subtitle={t('guest.sections.opportunitiesSub')}
            onSeeAll={() => router.navigate('/(guest)/events')}
          />
          {events.isPending ? (
            <RailSkeleton width={260} height={300} />
          ) : events.isError && eventList.length === 0 ? (
            <InlineNotice icon="wifi" text={t('guest.loadFailed')} actionLabel={t('guest.retry')} onAction={() => void events.refetch()} />
          ) : eventList.length === 0 ? (
            <InlineNotice icon="briefcase" text={t('guest.empty.events')} />
          ) : (
            <FlatList
              horizontal
              data={eventList}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => <CampaignCard campaign={item} variant="featured" />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.rail}
              ItemSeparatorComponent={RailGap}
            />
          )}
        </View>

        {/* ── D. Competitions ── */}
        <View style={s.section}>
          <SectionHeader
            title={t('guest.sections.competitions')}
            subtitle={t('guest.sections.competitionsSub')}
            onSeeAll={() => router.navigate('/(guest)/competitions')}
          />
          {competitions.isPending ? (
            <RailSkeleton width={COMP_CARD_W} height={300} />
          ) : competitions.isError && compList.length === 0 ? (
            <InlineNotice icon="wifi" text={t('guest.loadFailed')} actionLabel={t('guest.retry')} onAction={() => void competitions.refetch()} />
          ) : compList.length === 0 ? (
            <InlineNotice icon="trophy" text={t('guest.empty.competitions')} />
          ) : (
            <FlatList
              horizontal
              data={compList}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <View style={{ width: COMP_CARD_W }}>
                  <CompetitionCardItem c={item} showSummary onPress={() => router.push({ pathname: '/competition-detail', params: { id: item.id } })} />
                </View>
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.rail}
              ItemSeparatorComponent={RailGap}
            />
          )}
        </View>

        {/* ── E. Discover Creators ── */}
        <View style={s.section}>
          <SectionHeader
            title={t('guest.sections.creators')}
            subtitle={t('guest.sections.creatorsSub')}
            onSeeAll={() => router.navigate('/(guest)/discover')}
          />
          {creators.isPending ? (
            <RailSkeleton width={CREATOR_CARD_W} height={190} />
          ) : creators.isError && creatorList.length === 0 ? (
            <InlineNotice icon="wifi" text={t('guest.loadFailed')} actionLabel={t('guest.retry')} onAction={() => void creators.refetch()} />
          ) : creatorList.length === 0 ? (
            <InlineNotice icon="users" text={t('guest.empty.creators')} />
          ) : (
            <FlatList
              horizontal
              data={creatorList}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => <CreatorCard creator={item} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.rail}
              ItemSeparatorComponent={RailGap}
            />
          )}
        </View>

        {/* ── F / G. For Creators · For Businesses — one card, slider picks the audience ── */}
        <AudienceSwitcher />

        {/* ── H. How Kolab Works ── */}
        <View style={s.section}>
          <SectionHeader title={t('guest.how.title')} />
          <View style={s.steps}>
            {([
              ['search', 'discover'],
              ['handshake', 'connect'],
              ['users', 'collaborate'],
              ['chart-line', 'grow'],
            ] as const).map(([icon, key], i) => (
              <View key={key} style={[s.step, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={[s.stepNum, { backgroundColor: C.accentLight }]}>
                  <FontAwesome5 name={icon} size={15} color={C.accent} />
                </View>
                <Text style={[s.stepIndex, { color: C.textSecondary }]}>{String(i + 1).padStart(2, '0')}</Text>
                <Text style={[s.stepTitle, { color: C.text }]}>{t(`guest.how.${key}`)}</Text>
                <Text style={[s.stepBody, { color: C.textSecondary }]}>{t(`guest.how.${key}Body`)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── I. Final CTA ── */}
        <View style={[s.final, { backgroundColor: COLORS.brinjal2 }]}>
          <Text style={s.finalTitle} accessibilityRole="header">{t('guest.final.title')}</Text>
          <Pressable
            onPress={() => openGuestSignup()}
            style={({ pressed }) => [s.heroBtn, { backgroundColor: C.accent, alignSelf: 'stretch' }, pressed && { opacity: 0.9 }]}
            accessibilityRole="button">
            <Text style={s.heroBtnText}>{t('guest.final.cta')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RailGap() {
  return <View style={{ width: RAIL_GAP }} />;
}

type Audience = 'creators' | 'businesses';

const AUDIENCES: { key: Audience; icon: keyof typeof FontAwesome5.glyphMap; i18n: string; role: 'CREATOR' | 'BUSINESS' }[] = [
  { key: 'creators',   icon: 'palette', i18n: 'guest.forCreators',   role: 'CREATOR' },
  { key: 'businesses', icon: 'store',   i18n: 'guest.forBusinesses', role: 'BUSINESS' },
];

/** "For creators / For businesses" — a two-option slider over a single card. */
function AudienceSwitcher() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [active, setActive] = useState<Audience>('creators');
  const [trackW, setTrackW] = useState(0);
  const indicatorX = useAnimatedValue(0);

  const segW = trackW > 0 ? (trackW - TRACK_PAD * 2) / AUDIENCES.length : 0;

  function select(key: Audience) {
    setActive(key);
    const index = AUDIENCES.findIndex((a) => a.key === key);
    Animated.spring(indicatorX, { toValue: index * segW, useNativeDriver: true, speed: 18, bounciness: 4 }).start();
  }

  const current = AUDIENCES.find((a) => a.key === active)!;

  return (
    <View style={[s.audience, SHADOW.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      {/* Slider menu */}
      <View
        style={[s.track, { backgroundColor: C.background, borderColor: C.border }]}
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
            style={[s.indicator, { width: segW, backgroundColor: C.accent, transform: [{ translateX: indicatorX }] }]}
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

      <AudienceBody
        title={t(`${current.i18n}.title`)}
        points={[1, 2, 3, 4].map((n) => t(`${current.i18n}.p${n}`))}
        cta={t(`${current.i18n}.cta`)}
        onPress={() => openGuestSignup(current.role)}
      />
    </View>
  );
}

function AudienceBody({ title, points, cta, onPress }: {
  title: string; points: string[]; cta: string; onPress: () => void;
}) {
  const C = useAppColors();
  return (
    <>
      <Text style={[s.audienceTitle, { color: C.text }]}>{title}</Text>
      <View style={s.points}>
        {points.map((p) => <Bullet key={p}>{p}</Bullet>)}
      </View>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [s.audienceBtn, { borderColor: C.text }, pressed && { opacity: 0.85 }]}
        accessibilityRole="button">
        <Text style={[s.audienceBtnText, { color: C.text }]}>{cta}</Text>
        <FontAwesome5 name="arrow-right" size={12} color={C.text} />
      </Pressable>
    </>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1 },
  scroll:  { paddingBottom: SPACING.xxl },
  section: { marginTop: SPACING.xxl },
  rail:    { paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.sm },

  heroWrap: { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.sm },
  hero:     { borderRadius: RADIUS.xl, overflow: 'hidden', minHeight: 420, justifyContent: 'space-between', backgroundColor: COLORS.brinjal2 },
  heroPills: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.lg },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full,
    backgroundColor: withAlpha('#FFFFFF', 0.16), borderWidth: 1, borderColor: withAlpha('#FFFFFF', 0.3),
  },
  heroPillText: { color: '#fff', fontSize: FONT_SIZE.xs, fontFamily: F.semibold },
  heroBody:  { padding: SPACING.xl, paddingTop: 0, gap: SPACING.sm },
  heroTitle: { color: '#fff', fontSize: 30, fontFamily: F.bold, lineHeight: lineHeightFor(30), letterSpacing: -0.4 },
  heroTagline: { color: '#FED7AA', fontSize: FONT_SIZE.md, fontFamily: F.semibold, lineHeight: lineHeightFor(FONT_SIZE.md) },
  heroDesc:  { color: withAlpha('#FFFFFF', 0.88), fontSize: FONT_SIZE.md, fontFamily: F.regular, lineHeight: lineHeightFor(FONT_SIZE.md) },
  heroCtas:  { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  heroBtn: {
    flex: 1, minHeight: 48, borderRadius: RADIUS.md, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: SPACING.md,
  },
  heroBtnGhost: { backgroundColor: withAlpha('#FFFFFF', 0.14), borderWidth: 1, borderColor: withAlpha('#FFFFFF', 0.45) },
  heroBtnText:  { color: '#fff', fontSize: FONT_SIZE.md, fontFamily: F.bold },

  audience:      { marginHorizontal: SCREEN_GUTTER, marginTop: SPACING.xxl, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.xl },
  track:         { flexDirection: 'row', borderWidth: 1, borderRadius: RADIUS.full, padding: TRACK_PAD },
  indicator:     { position: 'absolute', top: TRACK_PAD, bottom: TRACK_PAD, left: TRACK_PAD, borderRadius: RADIUS.full },
  segment:       { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: SPACING.xs },
  segmentText:   { flexShrink: 1 },
  audienceTitle: { fontSize: FONT_SIZE.xl, fontFamily: F.bold, marginTop: SPACING.md, lineHeight: lineHeightFor(FONT_SIZE.xl) },
  points:        { gap: SPACING.sm, marginTop: SPACING.md },
  audienceBtn: {
    marginTop: SPACING.lg, minHeight: 48, borderRadius: RADIUS.md, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  audienceBtnText: { fontSize: FONT_SIZE.md, fontFamily: F.bold },

  steps:     { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, paddingHorizontal: SCREEN_GUTTER },
  step:      { flexBasis: '47%', flexGrow: 1, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 4 },
  stepNum:   { width: 36, height: 36, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  stepIndex: { fontSize: FONT_SIZE.xs, fontFamily: F.bold, letterSpacing: 0.6 },
  stepTitle: { fontSize: FONT_SIZE.md, fontFamily: F.bold },
  stepBody:  { fontSize: 12.5, fontFamily: F.regular, lineHeight: lineHeightFor(12.5) },

  final:      { marginHorizontal: SCREEN_GUTTER, marginTop: SPACING.xxl, borderRadius: RADIUS.xl, padding: SPACING.xl, gap: SPACING.lg, alignItems: 'center' },
  finalTitle: { color: '#fff', fontSize: FONT_SIZE.xxl, fontFamily: F.bold, textAlign: 'center', lineHeight: lineHeightFor(FONT_SIZE.xxl) },
});
