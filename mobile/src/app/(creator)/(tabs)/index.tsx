import { useCallback, useContext, useState } from 'react';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SearchInput } from '@/components/SearchInput';
import { AttentionBanner } from '@/components/AttentionBanner';
import { PromoBanner } from '@/components/PromoBanner';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useNotificationBadge } from '@/context/NotificationContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { CampaignCard } from '@/features/creator/components/CampaignCard';
import { CampaignCardSkeleton } from '@/features/creator/components/CampaignCardSkeleton';
import { NearbyLocationSheet, type NearbySource } from '@/features/creator/components/NearbyLocationSheet';
import { creatorService, type ApiCreatorProfile, type ApiProviderMember } from '@/services/creator';
import { campaignService } from '@/services/campaign';
import { getCurrentLocation, geocodeAddress, type LatLng } from '@/utilities/geolocation';
import type { Campaign } from '@/types';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

const RADIUS_PRESETS = [5, 10, 25, 50, 100];

// One color per Quick Action tile — chosen for the concept, not the brand
// (purple/work, amber/needs-a-response, blue/discover, teal/invitations)
// — so four different icon shapes also read as four different colors
// instead of one repeated brand tint.
const QUICK_ACTION_COLORS = {
  myCampaigns:     { icon: '#7C3AED', bg: '#F3E8FF' },
  serviceRequests: { icon: '#D97706', bg: '#FEF3C7' },
  shortlisted:     { icon: '#0369A1', bg: '#E0F2FE' },
  invitations:     { icon: '#0D9488', bg: '#CCFBF1' },
} as const;

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

type WorkItem = Awaited<ReturnType<typeof campaignService.getMyApplications>>['proposals'][number];

// Screens elsewhere in the (creator) stack reach a tab via `router.push`,
// which — crossing from a sibling Stack.Screen into this Tabs group — mounts
// a brand-new instance of this whole navigator (including this screen)
// rather than refocusing the existing one, so a plain component ref can't
// remember "already loaded" across that. Module scope survives it; keying by
// user id makes it correctly re-arm the skeleton on a different login.
let creatorHomeLoadedForUserId: string | null = null;

export default function HomeScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { openDrawer } = useContext(DrawerContext);
  const { badgeCount } = useNotificationBadge();

  const [profile, setProfile] = useState<ApiCreatorProfile | null>(null);
  const [yourWork, setYourWork] = useState<WorkItem[]>([]);
  const [recommended, setRecommended] = useState<Campaign[]>([]);
  // §16 — the Team dashboard block. Only a TEAM has a roster, and the
  // roster endpoint 400s for anyone else, so it's fetched conditionally.
  const [teamMembers, setTeamMembers] = useState<ApiProviderMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [referralBannerDismissed, setReferralBannerDismissed] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [pendingActions, setPendingActions] = useState<Array<{ type: 'start_work' | 'upload_work'; title: string }>>([]);

  // ── Nearby Opportunities ──
  const [nearbyCampaigns, setNearbyCampaigns] = useState<Campaign[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(true);
  const [nearbySource, setNearbySource] = useState<NearbySource>('current');
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(25);
  const [nearbyHomeLabel, setNearbyHomeLabel] = useState<string | null>(null);
  const [nearbyHomeAddress, setNearbyHomeAddress] = useState<string | null>(null);
  const [nearbyHomeCoords, setNearbyHomeCoords] = useState<LatLng | null>(null);
  const [nearbyCurrentCoords, setNearbyCurrentCoords] = useState<LatLng | null>(null);
  const [nearbyCustomCoords, setNearbyCustomCoords] = useState<LatLng | null>(null);
  const [nearbyLocationDenied, setNearbyLocationDenied] = useState(false);
  const [nearbySheetOpen, setNearbySheetOpen] = useState(false);

  async function fetchNearby(coords: LatLng, radiusKm: number, opts: { silent?: boolean } = {}) {
    const { silent = false } = opts;
    if (!silent) setNearbyLoading(true);
    try {
      const { campaigns: data } = await campaignService.nearby({ lat: coords.lat, lng: coords.lng, radiusKm, limit: 6 });
      setNearbyCampaigns(data);
    } catch {
      if (!silent) setNearbyCampaigns([]);
    } finally {
      // Always clear — `silent` only suppresses the skeleton *transition* (we
      // never set loading true on that path), never the completion. Leaving it
      // set strands the section on its skeleton whenever a silent fetch lands
      // on a freshly-mounted screen where nearbyLoading is still at its `true`
      // default (Fast Refresh, re-login, a failed earlier load).
      setNearbyLoading(false);
    }
  }

  function resolveNearbyCoords(): LatLng | null {
    if (nearbySource === 'home')   return nearbyHomeCoords   ?? nearbyCurrentCoords;
    if (nearbySource === 'custom') return nearbyCustomCoords ?? nearbyCurrentCoords;
    return nearbyCurrentCoords;
  }

  async function initNearby(p: ApiCreatorProfile, opts: { silent?: boolean } = {}) {
    const radius = p.nearbyRadiusKm ?? 25;
    setNearbyRadiusKm(radius);
    setNearbyHomeLabel(p.location?.split(',')[0]?.replace(/\s*\d{4,6}\s*$/, '')?.trim() ?? null);
    setNearbyHomeAddress(p.location ?? null);

    const [current, home] = await Promise.all([
      getCurrentLocation(),
      p.locationLat != null && p.locationLng != null
        ? Promise.resolve<LatLng>({ lat: p.locationLat, lng: p.locationLng })
        // Profiles that only ever saved location as free text (no Places picker used)
        // have no coordinates — geocode the text so "Home" is still selectable.
        : p.location ? geocodeAddress(p.location) : Promise.resolve(null),
    ]);
    setNearbyCurrentCoords(current);
    setNearbyHomeCoords(home);
    setNearbyLocationDenied(current === null);

    // Default to the creator's saved home address whenever one is available —
    // only fall back to their live GPS position if no home location is set.
    const preferredSource: NearbySource = home ? 'home' : 'current';
    setNearbySource(preferredSource);

    const coords = preferredSource === 'home' ? (home ?? current) : current;
    if (coords) void fetchNearby(coords, radius, { silent: opts.silent });
    else setNearbyLoading(false);
  }

  function handleNearbyApply(source: NearbySource, radiusKm: number, coords: LatLng) {
    setNearbySource(source);
    setNearbyRadiusKm(radiusKm);
    creatorService.updateProfile({ nearbyRadiusKm: radiusKm, nearbyUseHomeLocation: source === 'home' }).catch(() => {});

    if (source === 'custom') setNearbyCustomCoords(coords);
    if (source === 'current') setNearbyCurrentCoords(coords);

    void fetchNearby(coords, radiusKm);
  }

  function handleExpandNearbyRadius() {
    const next = RADIUS_PRESETS.find((r) => r > nearbyRadiusKm) ?? 100;
    setNearbyRadiusKm(next);
    const coords = resolveNearbyCoords();
    if (coords) void fetchNearby(coords, next, { silent: true });
  }

  const load = useCallback(async (isRefresh = false) => {
    const isFirstLoad = creatorHomeLoadedForUserId !== user?.id;
    if (isRefresh) setRefreshing(true);
    else if (isFirstLoad) setLoading(true);
    try {
      const p = await creatorService.getProfile();
      setProfile(p);

      // Photo and social links matter most for a creator's discoverability, so
      // they're checked first and lead the list. Work portfolio is a
      // secondary nudge — it only appears once the creator has added a photo
      // or a social link, so a brand-new profile isn't overwhelmed.
      const missing: string[] = [];
      const hasPhoto = !!p.avatarUrl;
      if (!hasPhoto) missing.push(t('creator.home.fieldProfilePhoto'));
      const hasLink = p.socialLinks && Object.values(p.socialLinks).some((v) => !!v);
      if (!hasLink) missing.push(t('creator.home.fieldSocialLinks'));
      if (!p.bio)                missing.push(t('creator.home.fieldBio'));
      if (!p.location)           missing.push(t('creator.home.fieldLocation'));
      if (!p.categories?.length) missing.push(t('creator.home.fieldCategories'));
      if ((hasPhoto || hasLink) && !p.portfolioLinks?.length) missing.push(t('creator.home.fieldPortfolio'));
      setMissingFields(missing);

      const isTeam = p.providerType === 'TEAM';
      const [applications, recs, roster] = await Promise.all([
        campaignService.getMyApplications({ status: 'ACCEPTED', limit: 10 }).catch(() => ({ proposals: [], total: 0 })),
        campaignService.recommended({ limit: 5 }).catch(() => ({ campaigns: [] })),
        isTeam ? creatorService.listTeamMembers().catch(() => [] as ApiProviderMember[]) : Promise.resolve([] as ApiProviderMember[]),
      ]);
      setTeamMembers(roster);
      setYourWork(applications.proposals.filter((a) => a.workStatus === 'IN_PROGRESS' || a.workStatus === 'SUBMITTED'));

      // Same `status: 'ACCEPTED'` fetch above already has everything needed
      // to flag actions actually waiting on the creator — no separate call.
      const actions: Array<{ type: 'start_work' | 'upload_work'; title: string }> = [];
      for (const app of applications.proposals) {
        if (app.campaignType === 'PAID_CAMPAIGN') {
          if (app.paymentStatus === 'PAID' && app.workStatus === 'NONE') {
            actions.push({ type: 'start_work', title: app.campaignTitle });
          } else if (app.paymentStatus === 'PAID' && app.workStatus === 'IN_PROGRESS') {
            actions.push({ type: 'upload_work', title: app.campaignTitle });
          }
        }
        // Free events (OPEN_EVENT) never wait on the creator: being accepted
        // is the end of that flow — nothing to start, nothing to submit.
      }
      setPendingActions(actions);

      setRecommended(recs.campaigns);
      void initNearby(p, { silent: !isFirstLoad });
    } catch {
      // Dashboard sections degrade to empty rather than blocking the whole
      // screen on one failed fetch — each section already has its own empty
      // state, and this is a low-stakes landing screen, not a form.
      // initNearby never ran, so clear its skeleton here too (mirrors discover.tsx).
      setNearbyLoading(false);
    } finally {
      creatorHomeLoadedForUserId = user?.id ?? null;
      setLoading(false);
      setRefreshing(false);
    }
  // `t` changes reference on every language switch (see LanguageContext) — depending
  // on it here re-runs the missing-fields check so those labels stay translated.
  }, [t, user?.id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? 'home.greetingMorning' : hour < 17 ? 'home.greetingAfternoon' : 'home.greetingEvening';
  const displayName = (user?.name && !/^\+?\d+$/.test(user.name)) ? user.name.split(' ')[0] : '';
  // Prefer the structured `city` field; fall back to deriving the city from
  // the saved Places address (e.g. "Thamel, Kathmandu 44600, Nepal") rather
  // than showing that full string — country is always the last segment
  // (search is scoped to Nepal, see LocationSearchModal), so city is the
  // segment right before it, with any trailing postal code stripped.
  const location = profile?.city
    ? [profile.city, profile.district].filter(Boolean).join(', ')
    : (() => {
        const parts = (profile?.location ?? '').split(',').map((s) => s.trim()).filter(Boolean);
        const city = parts.length >= 2 ? parts[parts.length - 2] : (parts[0] ?? '');
        return city.replace(/\s*\d{4,6}\s*$/, '').trim();
      })();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
        {/* Header — kept outside the ScrollView so it stays pinned at the top
            instead of scrolling away, matching the business/service-taker
            home's header (see that screen's `styles.header` comment). */}
        <View style={[styles.headerRow, { backgroundColor: C.background }]}>
          <View style={styles.headerText}>
            <Text style={[styles.greeting, { color: C.text }]} numberOfLines={1}>
              {displayName ? t(greetingKey, { name: displayName }) : t('home.greetingGeneric')}
            </Text>
            {location ? (
              <View style={styles.locationRow}>
                <FontAwesome5 name="map-marker-alt" solid size={11} color={C.textSecondary} />
                <Text style={[styles.locationText, { color: C.textSecondary }]} numberOfLines={1}>{location}</Text>
              </View>
            ) : null}
          </View>
          <Pressable hitSlop={8} onPress={() => router.push('/(creator)/(tabs)/notifications')} style={styles.iconBtn}>
            <FontAwesome5 name="bell" size={20} color={C.text} />
            {badgeCount > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text></View>
            )}
          </Pressable>
          <Pressable onPress={openDrawer} hitSlop={8} style={[styles.avatarCircle, { backgroundColor: C.surface }, SHADOW.card]}>
            <View style={styles.avatarClip}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Text style={[styles.avatarInitial, { color: C.brinjal1 }]}>{getInitials(displayName || 'Creator')}</Text>
              )}
            </View>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={C.brinjal1} />}>

          {/* Action zone — search, alerts and the primary CTA are all things
              demanding the creator's attention right now, so they're
              clustered tightly (gap: md) to read as one connected group
              rather than a stack of evenly-spaced, unrelated cards. The
              referral promo deliberately does NOT live here — it's the one
              block on the page that isn't the creator's own work, so it
              sits at the very bottom of the feed instead of wedging between
              the CTA and the content below. */}
          <View style={styles.heroGroup}>
            {/* Search — deliberately read-only here, tapping hands off to the
                full-screen Search page (recent/popular searches + suggestions,
                see search.tsx) rather than duplicating that logic here. */}
            <SearchInput
              placeholder={t('home.searchPlaceholder')}
              onPress={() => router.push('/(creator)/search')}
            />

            {/* One "needs your attention" banner, shown at most once — pending
                work and an incomplete profile are both the same kind of nudge,
                so stacking two identically-styled boxes would just be
                redundant clutter. Pending work always wins since it's the more
                time-sensitive of the two. Shared AttentionBanner component —
                see business home for the identical pattern on that side.
                style={{ marginHorizontal: 0, marginTop: 0 }} overrides the
                component's own defaults (sized for business home, whose
                ScrollView has no horizontal padding of its own) — here
                heroGroup/scroll already supply both, so the banner's
                defaults would otherwise double the horizontal inset (making
                it narrower than the search bar above, and misaligned) and
                stack an extra top margin on top of heroGroup's own gap. */}
            {pendingActions.length > 0 ? (
              <AttentionBanner
                icon="exclamation-circle"
                title={t('creator.home.actionRequired')}
                subtitle={
                  pendingActions.length === 1
                    ? pendingActions[0]!.type === 'start_work'
                      ? t('creator.home.actionStartWork', { title: pendingActions[0]!.title })
                      : t('creator.home.actionUploadWork', { title: pendingActions[0]!.title })
                    : t('creator.home.actionMultiple', { n: pendingActions.length })
                }
                onPress={() => router.push('/(creator)/(tabs)/proposals')}
                style={{ marginHorizontal: 0, marginTop: 0 }}
              />
            ) : !bannerDismissed && missingFields.length > 0 && (
              <AttentionBanner
                icon="user"
                title={t('creator.home.completeProfile')}
                subtitle={t('creator.home.missingFieldsPrefix', { fields: missingFields.join(' · ') })}
                onPress={() => router.push('/(creator)/(tabs)/profile')}
                onDismiss={() => setBannerDismissed(true)}
                style={{ marginHorizontal: 0, marginTop: 0 }}
              />
            )}

            {/* Primary CTA */}
            <Pressable onPress={() => router.push('/(creator)/(tabs)/discover')}>
              <LinearGradient colors={[C.brinjal1, '#7C3AED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaCard}>
                <View style={styles.ctaTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ctaTitle}>{t('home.ctaTitle')}</Text>
                    <Text style={styles.ctaSub}>{t('home.ctaSub')}</Text>
                  </View>
                  <View style={styles.ctaIconWrap}>
                    <FontAwesome5 name="briefcase" solid size={22} color="#fff" />
                  </View>
                </View>
                <View style={styles.ctaBtn}>
                  <Text style={[styles.ctaBtnText, { color: C.brinjal1 }]}>{t('home.ctaBtn')}</Text>
                  <FontAwesome5 name="arrow-right" solid size={13} color={C.brinjal1} />
                </View>
              </LinearGradient>
            </Pressable>

          </View>

          {/* Quick Actions — each tile gets its own icon color/tint (a small
              fixed palette below, not the app's brand purple repeated four
              times) so the shapes are distinguishable at a glance instead of
              blurring into one same-colored row. No card/border around each
              tile — just the icon-circle (with a soft SHADOW.card lift) +
              label. All four stay on screen at once (flex: 1 each, no
              scrolling). Sits its own step (marginTop: xl) below the action
              zone above — a distinct row of shortcuts, not part of that
              cluster. */}
          <View style={styles.quickActionsRow}>
            {[
              { key: 'myCampaigns',      icon: 'briefcase'      as const, label: t('home.qaMyCampaigns'),     color: QUICK_ACTION_COLORS.myCampaigns,     onPress: () => router.push({ pathname: '/(creator)/(tabs)/proposals', params: { tab: 'accepted' } }) },
              { key: 'serviceRequests',  icon: 'clipboard-list' as const, label: t('home.qaServiceRequests'), color: QUICK_ACTION_COLORS.serviceRequests, onPress: () => router.push('/(creator)/service-requests') },
              { key: 'shortlisted',      icon: 'bookmark'       as const, label: t('home.qaShortlisted'),     color: QUICK_ACTION_COLORS.shortlisted,     onPress: () => router.push('/(creator)/shortlisted-events' as Parameters<typeof router.push>[0]) },
              { key: 'invitations',      icon: 'envelope-open-text' as const, label: t('home.qaMyInvitations'), color: QUICK_ACTION_COLORS.invitations,   onPress: () => router.push('/(creator)/invitations') },
            ].map((qa) => (
              <Pressable
                key={qa.key}
                style={({ pressed }) => [styles.quickActionTile, pressed && styles.quickActionTilePressed]}
                onPress={qa.onPress}>
                <View style={[styles.quickActionIconWrap, { backgroundColor: qa.color.bg }, SHADOW.card]}>
                  <FontAwesome5 name={qa.icon} solid size={18} color={qa.color.icon} />
                </View>
                <Text style={[styles.quickActionLabel, { color: C.text }]} numberOfLines={2}>{qa.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Content feed — the biggest gap on the screen (marginTop: xxl)
              marks the shift from "actions" above to "browse your feed"
              below; sections within it get the same xxl gap from each other
              since each is its own distinct content block. */}
          <View style={styles.sectionsGroup}>
            {loading ? (
              <View style={{ gap: SPACING.md }}>
                <ListRowSkeleton />
                <ListRowSkeleton />
              </View>
            ) : (
              <View style={{ gap: SPACING.xxl }}>
                {/* §16 — Team block, teams and agencies only. Deliberately a
                    feed section rather than an extra tab or an extra quick
                    action: the tab bar already carries five items, and the
                    quick-action row is fixed-width columns that fill the
                    screen exactly (see quickActionTile), so one more of
                    either would overflow on a small phone. */}
                {profile?.providerType === 'TEAM' && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: C.text }]}>{t('home.teamSection')}</Text>
                      <Pressable onPress={() => router.push('/(creator)/team')}>
                        <Text style={[styles.seeAll, { color: C.brinjal1 }]}>{t('home.teamManage')}</Text>
                      </Pressable>
                    </View>
                    <Pressable
                      style={[styles.workCard, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.raised]}
                      onPress={() => router.push('/(creator)/team')}>
                      <View style={[styles.workThumb, { backgroundColor: C.primaryLight }]}>
                        <FontAwesome5 name="users" solid size={18} color={C.brinjal1} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.workTitle, { color: C.text }]} numberOfLines={1}>
                          {(() => {
                            // t() is a flat lookup with {{var}} interpolation —
                            // no plural rules — so the branch is explicit here.
                            const n = teamMembers.filter((m) => m.status === 'ACCEPTED').length;
                            return n === 0 ? t('home.teamMemberCountNone')
                              : n === 1 ? t('home.teamMemberCountOne')
                              : t('home.teamMemberCountMany', { n });
                          })()}
                        </Text>
                        <Text style={[styles.workBrand, { color: C.textSecondary }]} numberOfLines={1}>
                          {teamMembers.some((m) => m.status === 'PENDING')
                            ? t('home.teamPending', { n: teamMembers.filter((m) => m.status === 'PENDING').length })
                            : t('home.teamInviteHint')}
                        </Text>
                      </View>
                      <FontAwesome5 name="chevron-right" size={13} color={C.textSecondary} />
                    </Pressable>
                  </View>
                )}

                {/* Your Work */}
                {yourWork.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, { color: C.text }]}>{t('home.yourWork')}</Text>
                      <Pressable onPress={() => router.push('/(creator)/(tabs)/proposals')}>
                        <Text style={[styles.seeAll, { color: C.brinjal1 }]}>{t('home.seeAll')}</Text>
                      </Pressable>
                    </View>
                    {yourWork.slice(0, 3).map((w) => (
                      <Pressable
                        key={w.id}
                        style={[styles.workCard, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.raised]}
                        onPress={() =>
                          router.push({
                            pathname: '/(business)/activity-timeline',
                            params: {
                              campaignId:    w.campaignId,
                              campaignTitle: w.campaignTitle,
                              role:          'CREATOR',
                              businessId:    w.businessId,
                              brand:         w.brand,
                            },
                          })
                        }>
                        <View style={[styles.workThumb, { backgroundColor: C.primaryLight }]}>
                          {w.featureImageUrl ? (
                            <Image source={{ uri: w.featureImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                          ) : (
                            <FontAwesome5 name="briefcase" solid size={18} color={C.brinjal1} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.workTitle, { color: C.text }]} numberOfLines={1}>{w.campaignTitle}</Text>
                          <Text style={[styles.workBrand, { color: C.textSecondary }]} numberOfLines={1}>{w.brand}</Text>
                        </View>
                        <View style={[styles.workStatusBadge, { backgroundColor: C.primaryLight }]}>
                          <Text style={[styles.workStatusText, { color: C.brinjal1 }]}>
                            {w.workStatus === 'SUBMITTED' ? t('home.workSubmitted') : t('home.workInProgress')}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* Recommended Opportunities */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: C.text }]}>{t('home.recommended')}</Text>
                    <Pressable onPress={() => router.push('/(creator)/(tabs)/discover')}>
                      <Text style={[styles.seeAll, { color: C.brinjal1 }]}>{t('home.seeAll')}</Text>
                    </Pressable>
                  </View>
                  {profile && profile.categories.length > 0 && recommended.length > 0 && (
                    <Text style={[styles.recommendedHint, { color: C.textSecondary }]}>
                      {t('home.becauseYouOffer', { categories: profile.categories.slice(0, 3).join(', ') })}
                    </Text>
                  )}
                  {recommended.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railScroll}>
                      {recommended.map((c) => <CampaignCard key={c.id} campaign={c} variant="featured" />)}
                    </ScrollView>
                  ) : (
                    <View style={[styles.cardEmpty, { backgroundColor: C.surface, borderColor: C.border }]}>
                      <FontAwesome5 name="star" size={28} color={C.textSecondary} />
                      <Text style={[styles.cardEmptyTitle, { color: C.text }]}>{t('creator.home.noRecommendedOpportunities')}</Text>
                      <Pressable
                        style={[
                          styles.expandRadiusBtn,
                          {
                            backgroundColor: C.brinjal1, shadowColor: C.brinjal1,
                            shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
                          },
                        ]}
                        onPress={() => router.push('/(creator)/(tabs)/discover')}>
                        <Text style={styles.expandRadiusBtnText}>{t('creator.home.discoverBtn')}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* Nearby Opportunities */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.nearbyTitleRow}>
                      <Text style={[styles.sectionTitle, { color: C.text }]}>{t('home.nearby')}</Text>
                      <Pressable
                        style={[styles.nearbyChip, { backgroundColor: C.primaryLight, borderColor: C.border }]}
                        onPress={() => setNearbySheetOpen(true)}>
                        <FontAwesome5
                          name={nearbySource === 'current' ? 'location-arrow' : nearbySource === 'home' ? 'home' : 'map-pin'}
                          solid
                          size={11} color={C.brinjal1}
                        />
                        <Text style={[styles.nearbyChipText, { color: C.brinjal1 }]} numberOfLines={1}>
                          {nearbySource === 'current'
                            ? 'Current Location'
                            : nearbySource === 'home'
                              ? `Home${nearbyHomeLabel ? ` · ${nearbyHomeLabel}` : ''}`
                              : 'Custom Location'}
                        </Text>
                        <FontAwesome5 name="chevron-down" solid size={11} color={C.brinjal1} />
                      </Pressable>
                    </View>
                  </View>

                  {nearbyLoading ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railScroll}>
                      {[0, 1, 2].map((i) => <CampaignCardSkeleton key={i} />)}
                    </ScrollView>
                  ) : nearbyCampaigns.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railScroll}>
                      {nearbyCampaigns.map((c) => <CampaignCard key={c.id} campaign={c} variant="nearby" />)}
                    </ScrollView>
                  ) : nearbyLocationDenied && !nearbyHomeCoords ? (
                    <View style={[styles.cardEmpty, { backgroundColor: C.surface, borderColor: C.border }]}>
                      <FontAwesome5 name="map-marker-alt" solid size={28} color={C.textSecondary} />
                      <Text style={[styles.cardEmptyTitle, { color: C.text }]}>{t('creator.home.enableLocationTitle')}</Text>
                      <Text style={[styles.cardEmptySub, { color: C.textSecondary }]}>{t('creator.home.enableLocationSub')}</Text>
                    </View>
                  ) : (
                    <View style={[styles.cardEmpty, { backgroundColor: C.surface, borderColor: C.border }]}>
                      <FontAwesome5 name="location-arrow" solid size={28} color={C.textSecondary} />
                      <Text style={[styles.cardEmptyTitle, { color: C.text }]}>{t('creator.home.noEventsWithinKm', { km: nearbyRadiusKm })}</Text>
                      {nearbyRadiusKm < 100 && (
                        <Pressable
                          style={[
                            styles.expandRadiusBtn,
                            {
                              backgroundColor: C.brinjal1, shadowColor: C.brinjal1,
                              shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
                            },
                          ]}
                          onPress={handleExpandNearbyRadius}>
                          <Text style={styles.expandRadiusBtnText}>{t('creator.home.expandToKm', { km: RADIUS_PRESETS.find((r) => r > nearbyRadiusKm) ?? 100 })}</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Refer a friend banner — reward/growth nudge, deliberately a
              different color family (pink) than the attention banner up top.
              Last block on the page: it's the only section here that isn't
              the creator's own work or a listing they might act on, so it
              trails the feed rather than interrupting it. Shared PromoBanner
              component — see business home for the identical pattern, in the
              identical position, on that side. marginHorizontal: 0 drops the
              component's own inset (sized for a parent without padding);
              `scroll` already supplies the gutter, and marginTop matches the
              xxl step every other top-level row on this screen uses. */}
          {!referralBannerDismissed && (() => {
            const [prefix, suffix] = t('referral.homeBannerSub').split('{{amount}}');
            return (
              <PromoBanner
                icon="gift"
                title={t('referral.homeBannerTitle')}
                subtitlePrefix={prefix}
                subtitleAmount={t('referral.homeBannerAmount')}
                subtitleSuffix={suffix}
                onPress={() => router.push('/(creator)/referral')}
                onDismiss={() => setReferralBannerDismissed(true)}
                style={{ marginHorizontal: 0, marginTop: SPACING.xxl }}
              />
            );
          })()}
        </ScrollView>
      </MaxWidthContainer>

      <NearbyLocationSheet
        visible={nearbySheetOpen}
        onClose={() => setNearbySheetOpen(false)}
        source={nearbySource}
        radiusKm={nearbyRadiusKm}
        homeLabel={nearbyHomeLabel}
        homeAddress={nearbyHomeAddress}
        currentCoords={nearbyCurrentCoords}
        homeCoords={nearbyHomeCoords}
        customCoords={nearbyCustomCoords}
        onApply={handleNearbyApply}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // paddingTop 0 — the header above now supplies its own bottom padding
  // instead, so the two don't stack into a double gap.
  // Horizontal gutter comes from the app's shared scale (SCREEN_GUTTER) so
  // this screen lines up edge-to-edge with every other screen. No top-level
  // `gap` here — spacing between the three groups below (heroGroup,
  // quickActionsRow, sectionsGroup) is deliberately tiered (see each group's
  // own comment), not a flat repeated value.
  scroll: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 0, paddingBottom: SPACING.xxxl },

  // ── Layout rhythm ──
  // Two tiers: heroGroup clusters tightly-related action items (md=12);
  // every row below that — quickActionsRow, sectionsGroup, and the gap
  // between sectionsGroup's own sections — steps away with the same
  // gap (xxl=32), so every row on the page reads as equally distinct.
  heroGroup: { gap: SPACING.md },
  sectionsGroup: { marginTop: SPACING.xxl },

  // No longer a child of `scroll` (see render) — carries its own padding
  // instead of inheriting the ScrollView's, matching business home's `header`.
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.lg },
  headerText: { flex: 1, gap: 3 },
  greeting: { fontSize: FONT_SIZE.xl, fontFamily: F.bold },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { fontSize: FONT_SIZE.xs, fontFamily: F.medium },
  iconBtn: { padding: 4 },
  badge: {
    position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: RADIUS.full,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: '#fff', fontFamily: F.bold },
  // Shadow lives on this outer circle, unclipped — overflow:hidden on the
  // same view as a shadow silently clips the shadow away, same fix as the
  // business-home avatar and the campaign card thumb/shadow split.
  avatarCircle: { width: 40, height: 40, borderRadius: RADIUS.full },
  avatarClip:   { width: '100%', height: '100%', borderRadius: RADIUS.full, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitial: { fontSize: FONT_SIZE.md, fontFamily: F.bold },

  // Primary CTA — the single most important action on the screen, so it
  // gets the most generous padding here (hero-level, not standard-card).
  ctaCard: { borderRadius: RADIUS.xl, padding: SPACING.xl, gap: SPACING.lg, ...SHADOW.floating },
  ctaTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  ctaTitle: { fontSize: FONT_SIZE.lg, fontFamily: F.bold, color: '#fff' },
  ctaSub: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 20 },
  ctaIconWrap: { width: 48, height: 48, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  ctaBtn: {
    flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#fff', borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: 11,
  },
  ctaBtnText: { fontSize: FONT_SIZE.sm, fontFamily: F.bold },

  quickActionsRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xxl },
  // flex: 1 (not a fixed width) — four equal-width columns that always sum
  // to the full row, on any screen size, with no scrolling.
  quickActionTile: { flex: 1, alignItems: 'center', gap: SPACING.sm },
  quickActionTilePressed: { opacity: 0.7 },
  quickActionIconWrap: { width: 52, height: 52, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: FONT_SIZE.xs, fontFamily: F.medium, textAlign: 'center', lineHeight: 17 },

  section: { gap: SPACING.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontFamily: F.bold },
  seeAll: { fontSize: FONT_SIZE.sm, fontFamily: F.semibold },
  recommendedHint: { fontSize: FONT_SIZE.xs, fontFamily: F.regular, marginTop: -4 },
  railScroll: { gap: SPACING.md, paddingRight: SPACING.xs },

  workCard: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md },
  workThumb: { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 },
  workTitle: { fontSize: FONT_SIZE.md, fontFamily: F.semibold },
  workBrand: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, marginTop: 2 },
  workStatusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 5 },
  workStatusText: { fontSize: FONT_SIZE.xs, fontFamily: F.bold },

  cardEmpty: { borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed', padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm },
  cardEmptyTitle: { fontSize: FONT_SIZE.md, fontFamily: F.bold, textAlign: 'center' },
  cardEmptySub: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, textAlign: 'center', lineHeight: 20 },

  nearbyTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, flex: 1 },
  nearbyChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 5, flexShrink: 1 },
  nearbyChipText: { fontSize: FONT_SIZE.xs, fontFamily: F.bold, flexShrink: 1 },
  expandRadiusBtn: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, minHeight: 40, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  expandRadiusBtnText: { color: '#fff', fontSize: FONT_SIZE.sm, fontFamily: F.bold },
});
