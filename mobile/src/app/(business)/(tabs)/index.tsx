import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SearchInput } from '@/components/SearchInput';
import { AttentionBanner } from '@/components/AttentionBanner';
import { PromoBanner } from '@/components/PromoBanner';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { TabSlider } from '@/components/TabSlider';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { useStickyBelowHeader } from '@/hooks/useStickyBelowHeader';
import { useTabTransition } from '@/hooks/useTabTransition';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { F, FONT_SIZE, lineHeightFor, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';
import { isValidNepaliPhone } from '@/utilities/phone';
import { campaignService } from '@/services/campaign';
import { useNotificationBadge } from '@/context/NotificationContext';
import { notificationService } from '@/services/notifications';
import { profileService } from '@/services/profile';
import { creatorService, type ApiCreatorListItem } from '@/services/creator';
import type { Campaign } from '@/types';
import { useAllCategories, useCategories, getCategoryMeta, sortOtherLast, sortSelectedFirst } from '@/hooks/useCategories';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { EntityCard } from '@/components/EntityCard';
import { TabColors } from '@/utilities/tabColors';
import { getCached, setCached } from '@/utilities/offlineCache';

const STATUS_STYLE = {
  active: { bg: TabColors.positive.bg, color: TabColors.positive.color, statusKey: 'business.home.statusActive' as const },
  draft:  { bg: TabColors.warning.bg,  color: TabColors.warning.color,  statusKey: 'business.home.statusPaused' as const },
  closed: { bg: TabColors.closed.bg,   color: TabColors.closed.color,   statusKey: 'business.home.statusClosed' as const },
  pending_approval: { bg: TabColors.warning.bg, color: TabColors.warning.color, statusKey: 'business.home.statusPendingApproval' as const },
  expired: { bg: TabColors.closed.bg, color: TabColors.closed.color, statusKey: 'business.home.statusExpired' as const },
};

// Tablet/iPad: two cards per row in Recent Events, matching the events tab's
// own grid. 768 matches the breakpoint used there.
const TABLET_BREAKPOINT = 768;

// Left-to-right order of the Recent Events type filter — drives the slide
// direction of the panel transition (see useTabTransition).
const TYPE_TAB_ORDER = ['All', 'Paid', 'Open'] as const;

export default function BusinessHomeScreen() {
  const { user } = useAuth();
  const { t, languageVersion } = useLanguage();
  const C = useAppColors();
  const { categories: allCategories } = useAllCategories();
  // BOTH-scope rows are the shared industry/niche list (Hotels, Restaurants, …)
  // — the categories a business browses people *by*, as opposed to the
  // CREATOR-scope provider-type rows used inside explore-creators' filters.
  const { categories: browseCategories } = useCategories('BOTH');
  const { width: windowWidth } = useWindowDimensions();
  const numColumns = windowWidth >= TABLET_BREAKPOINT ? 2 : 1;
  const name = user?.name?.split(' ')[0] ?? 'there';

  const { badgeCount, setBadgeCount } = useNotificationBadge();
  const { openDrawer } = useContext(DrawerContext);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [businessLocation, setBusinessLocation] = useState('');
  // The industry/industries the business selected during onboarding
  // (`profile.categories`) — surfaced first in "Find People by Category"
  // below so the business doesn't have to scroll to its own niche.
  const [businessIndustries, setBusinessIndustries] = useState<string[]>([]);
  const [recommendedProviders, setRecommendedProviders] = useState<ApiCreatorListItem[]>([]);
  // Count of accepted applications actually waiting on a business action
  // (payment due, or submitted work awaiting review) — not the raw
  // applications total, which includes proposals nothing is blocked on.
  const [attentionCount, setAttentionCount] = useState(0);
  // Phone-only signups default `name` to the raw phone number until the user sets
  // a real one — never show that in the header (as text, or as the avatar's
  // first-letter fallback initial, which would render a bare "+").
  const displayName = businessName || (user?.name && !isValidNepaliPhone(user.name) ? user.name : 'Business');
  // Header shows just the city, not the full saved Places address (e.g.
  // "Thamel, Kathmandu 44600, Nepal") — the country segment is always last
  // (search is scoped to Nepal, see LocationSearchModal), so the city is the
  // segment right before it; a 2-segment "City, Nepal" address is just the
  // city itself. Postal codes ride along in that segment, so strip them too.
  const cityFromLocation = (() => {
    const parts = businessLocation.split(',').map((s) => s.trim()).filter(Boolean);
    const city = parts.length >= 2 ? parts[parts.length - 2] : (parts[0] ?? '');
    return city.replace(/\s*\d{4,6}\s*$/, '').trim();
  })();
  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? 'home.greetingMorning' : hour < 17 ? 'home.greetingAfternoon' : 'home.greetingEvening';
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [referralBannerDismissed, setReferralBannerDismissed] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnTabPress('index', () => scrollRef.current?.scrollTo({ y: 0, animated: true }));
  const {
    stuck:             tabFilterStuck,
    setOffsetY:        tabFilterSetOffsetY,
    onRowLayout:       tabFilterOnRowLayout,
    onScroll:          tabFilterOnScroll,
    placeholderHeight: tabFilterPlaceholderHeight,
  } = useStickyBelowHeader();

  async function fetchCampaigns(showLoader = true) {
    if (showLoader) setLoading(true);
    setFetchError('');
    try {
      const { campaigns: data } = await campaignService.listMy();
      setCampaigns(data);
      void setCached('business_feed_campaigns', data);
    } catch (e) {
      // Offline or request failed — fall back to the last-known feed instead
      // of leaving the screen blank/erroring, so it stays usable offline.
      const cached = await getCached<Campaign[]>('business_feed_campaigns');
      if (cached && cached.length > 0) {
        setCampaigns(cached);
      } else {
        setFetchError(e instanceof Error ? e.message : t('business.home.loadError'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Refetches on every focus, not just mount — otherwise editing a campaign's
  // title/details elsewhere (e.g. from campaign-detail) and navigating back
  // here would keep showing this screen's stale local copy indefinitely,
  // since campaignService has no shared cache other screens invalidate.
  // Only the very first load shows the skeleton; later refocuses refresh
  // silently so cards don't flash/blank on every back-navigation.
  const hasLoadedCampaignsRef = useRef(false);
  useFocusEffect(useCallback(() => {
    if (!hasLoadedCampaignsRef.current) {
      // Show the last-known feed immediately (e.g. cold launch while
      // offline) while the real fetch below runs and replaces it.
      void getCached<Campaign[]>('business_feed_campaigns').then((cached) => {
        if (cached && cached.length > 0) {
          setCampaigns(cached);
          setLoading(false);
        }
      });
    }
    void fetchCampaigns(!hasLoadedCampaignsRef.current);
    hasLoadedCampaignsRef.current = true;
  }, [languageVersion]));

  // Refetches on every focus (not just mount) — editing the business name in
  // edit-profile navigates back here rather than remounting this screen, so a
  // mount-only fetch would keep showing the name typed during onboarding.
  useFocusEffect(useCallback(() => {
    notificationService.getBadge().then((r) => setBadgeCount(r.count)).catch(() => {});
    profileService.getBusinessProfile()
      .then((profile) => {
        setBusinessName(profile.businessName);
        setBusinessLocation(profile.location ?? '');
        setBusinessIndustries(profile.categories ?? []);
        const missing: string[] = [];
        if (!profile.logoUrl)            missing.push(t('business.home.fieldLogo'));
        if (!profile.description)        missing.push(t('business.home.fieldDescription'));
        if (!profile.location)           missing.push(t('business.home.fieldLocation'));
        if (!profile.categories?.length) missing.push(t('business.home.fieldCategories'));
        if (!profile.website)            missing.push(t('business.home.fieldWebsite'));
        setMissingFields(missing);

        // "What do you usually need help with?" — first entry only (the API
        // takes one category, not a list) is enough for a "recommended for
        // your next hire" hint; a real multi-category blend can come later.
        const category = profile.defaultCreatorCategories?.[0];
        if (category) {
          creatorService.getRecommendedCreators({ category, limit: 5 })
            .then(setRecommendedProviders)
            .catch(() => setRecommendedProviders([]));
        } else {
          setRecommendedProviders([]);
        }
      })
      .catch(() => {});
  }, [languageVersion]));

  // Refetches on every focus — mirrors the creator home screen's pending-action
  // check. Only counts applications where the ball is in the business's court:
  // payment not yet made (paid campaigns) or submitted work not yet reviewed.
  useFocusEffect(useCallback(() => {
    campaignService.getBusinessProposals({ status: 'ACCEPTED', limit: 100 })
      .then(({ proposals }) => {
        const count = proposals.filter((p) => {
          const needsPayment = p.workStatus === 'NONE' && p.campaign.campaignType !== 'OPEN_EVENT' && p.paymentStatus !== 'PAID' && p.paymentStatus !== 'RELEASED';
          const needsApproval = p.workStatus === 'SUBMITTED';
          return needsPayment || needsApproval;
        }).length;
        setAttentionCount(count);
      })
      .catch(() => {});
  }, []));

  // Auto-refresh the moment connectivity is restored after being offline.
  const { reconnectedAt } = useNetworkStatus();
  useEffect(() => {
    if (reconnectedAt) void fetchCampaigns(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconnectedAt]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchCampaigns(false);
  }, []);

  const stats = {
    active:    campaigns.filter((c) => c.status === 'active').length,
    total:     campaigns.length,
    completed: campaigns.filter((c) => c.status === 'closed').length,
  };

  const [typeFilter, setTypeFilter] = useState<'All' | 'Paid' | 'Open'>('All');
  // Cross-fade + slide the Recent Events list when the type filter changes, so
  // the tab switch glides instead of the list popping to new contents.
  const recentListStyle = useTabTransition(typeFilter, TYPE_TAB_ORDER);

  function matchesType(c: Campaign) {
    if (typeFilter === 'All')  return true;
    if (typeFilter === 'Paid') return !c.campaignType || c.campaignType === 'PAID_CAMPAIGN';
    return c.campaignType === 'OPEN_EVENT';
  }

  const paidCount = campaigns.filter((c) => !c.campaignType || c.campaignType === 'PAID_CAMPAIGN').length;
  const openCount = campaigns.filter((c) => c.campaignType === 'OPEN_EVENT').length;

  const TYPE_TABS = [
    { key: 'All',  label: t('business.home.tabAll'),      icon: 'layer-group' as const,  color: TabColors.neutral.color, count: campaigns.length },
    { key: 'Paid', label: t('business.home.tabPaid'),     icon: 'money-bill-alt'  as const,   color: TabColors.brand.color,   count: paidCount        },
    { key: 'Open', label: t('business.home.tabOpenFree'), icon: 'gift'  as const,   color: TabColors.info.color,    count: openCount        },
  ];

  const recent = campaigns.filter(matchesType).slice(0, 5);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      {/* ── Header: greeting, bell, avatar (opens drawer) — matches the
          creator home header layout. Kept outside the ScrollView so it
          stays floating/pinned above the content instead of scrolling away. ── */}
      <View style={[styles.header, { backgroundColor: C.background }]}>
        <View style={styles.headerText}>
          <Text style={[styles.greeting, { color: C.text }]} numberOfLines={1}>{t(greetingKey, { name: displayName })}</Text>
          {cityFromLocation ? (
            <View style={styles.locationRow}>
              <FontAwesome5 name="map-marker-alt" solid size={11} color={C.textSecondary} />
              <Text style={[styles.locationText, { color: C.textSecondary }]} numberOfLines={1}>{cityFromLocation}</Text>
            </View>
          ) : null}
        </View>

        <Pressable hitSlop={8} onPress={() => router.push('/(business)/(tabs)/notifications')} style={styles.iconBtn}>
          <FontAwesome5 name="bell" size={20} color={C.text} />
          {badgeCount > 0 && (
            <View style={styles.notifBadge}><Text style={styles.notifBadgeText}>{badgeCount > 9 ? '9+' : badgeCount}</Text></View>
          )}
        </Pressable>

        <Pressable style={[styles.avatarCircle, { backgroundColor: C.surface }, SHADOW.card]} onPress={openDrawer}>
          {/* Clipping lives on its own layer — Android's elevation shadow doesn't
              composite correctly with overflow:hidden + a translucent child background
              on the same view. */}
          <View style={styles.avatarClip}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={[styles.avatarInitial, { color: C.brinjal1 }]}>{displayName.trim()[0].toUpperCase()}</Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>

      {/* Sticky tab filter — hand-rolled (see useStickyBelowHeader), not
          stickyHeaderIndices, which reliably crashes Android on this app's
          RN/Fabric setup. This wrapper is the positioning context the
          overlay below is anchored to (`top: 0` here lands right below the
          header above). */}
      <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
        onScroll={tabFilterOnScroll}
        scrollEventThrottle={16}>

        <View style={styles.heroGroup}>
          {/* ── Search — read-only, hands off to Explore Creators (which owns the
              real search/filter experience), mirroring the creator home's
              tap-through-to-Discover pattern. ── */}
          <SearchInput
            placeholder={t('business.home.searchPlaceholder')}
            onPress={() => router.push('/(business)/explore-creators')}
          />

          {/* One "needs your attention" banner, shown at most once — pending
              proposals and an incomplete profile are both the same kind of
              nudge, so stacking two boxes for both would just be redundant.
              Pending proposals always win since they're the more
              time-sensitive of the two. Shared AttentionBanner component —
              see creator home for the identical pattern on that side. */}
          {!loading && attentionCount > 0 ? (
            <AttentionBanner
              icon="exclamation-circle"
              title={t('business.home.attentionTitle')}
              subtitle={
                attentionCount === 1
                  ? t('business.home.attentionProposalsSingular', { n: attentionCount })
                  : t('business.home.attentionProposalsPlural', { n: attentionCount })
              }
              onPress={() => router.push('/(business)/proposals')}
              style={{ marginHorizontal: 0, marginTop: 0 }}
            />
          ) : !bannerDismissed && missingFields.length > 0 && (
            <AttentionBanner
              icon="building"
              title={t('business.home.completeProfile')}
              subtitle={t('business.home.missingFieldsPrefix', { fields: missingFields.join(' · ') })}
              numberOfLines={2}
              onPress={() => router.push('/(business)/edit-profile' as never)}
              onDismiss={() => setBannerDismissed(true)}
              style={{ marginHorizontal: 0, marginTop: 0 }}
            />
          )}

          {/* ── Primary CTA ── */}
          <Pressable onPress={() => router.push('/create-campaign')}>
            <LinearGradient colors={[C.brinjal1, C.brinjal2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaCard}>
              <View style={styles.ctaTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ctaTitle}>{t('business.home.heroCtaTitle')}</Text>
                  <Text style={styles.ctaSub}>{t('business.home.heroCtaSub')}</Text>
                </View>
                <View style={styles.ctaIconWrap}>
                  <FontAwesome5 name="clipboard-list" solid size={22} color="#fff" />
                </View>
              </View>
              <View style={styles.ctaBtn}>
                <Text style={[styles.ctaBtnText, { color: C.brinjal2 }]}>{t('business.home.heroCtaBtn')}</Text>
                <FontAwesome5 name="plus" solid size={13} color={C.brinjal2} />
              </View>
            </LinearGradient>
          </Pressable>

          {/* ── Error ── */}
          {fetchError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{fetchError}</Text>
              <Pressable onPress={() => fetchCampaigns()}>
                <Text style={[styles.retryText, { color: C.brinjal1 }]}>{t('business.home.retry')}</Text>
              </Pressable>
            </View>
          ) : null}

        </View>

        {/* ── Find People by Category — horizontal slider over the full
            BOTH-scope category list (no longer a fixed 4-tile grid, so an
            admin adding a category surfaces here without a code change). ── */}
        {browseCategories.length > 0 && (
          <View style={styles.findPeopleSection}>
            <View style={styles.findPeopleHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('business.home.findPeople')}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(business)/explore-creators')}>
                <Text style={[styles.viewAll, { color: C.brinjal1 }]}>{t('business.home.viewAll')}</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceSlider}>
              {sortOtherLast(sortSelectedFirst(browseCategories, businessIndustries)).map((cat) => (
                <Pressable
                  key={cat.id}
                  style={styles.serviceTile}
                  accessibilityRole="button"
                  accessibilityLabel={cat.name}
                  onPress={() => router.push({ pathname: '/(business)/explore-creators', params: { category: cat.name } })}>
                  <View style={[styles.serviceIconWrap, { backgroundColor: cat.iconBg }, SHADOW.card]}>
                    <FontAwesome5 name={cat.icon as any} size={18} color={cat.color} />
                  </View>
                  <Text style={[styles.serviceLabel, { color: C.text }]} numberOfLines={2}>{cat.name}</Text>
                </Pressable>
              ))}
              <Pressable
                style={styles.serviceTile}
                accessibilityRole="button"
                accessibilityLabel={t('business.home.allServicesTile')}
                onPress={() => router.push('/(business)/explore-creators')}>
                <View style={[styles.serviceIconWrap, { backgroundColor: C.background, borderWidth: 1, borderColor: C.border }, SHADOW.card]}>
                  <FontAwesome5 name="th-large" solid size={18} color={C.textSecondary} />
                </View>
                <Text style={[styles.serviceLabel, { color: C.text }]} numberOfLines={2}>{t('business.home.allServicesTile')}</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* ── Recent Events ── */}
        <View style={[styles.sectionHeader, { marginTop: SPACING.xxl }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('business.home.recentEvents')}</Text>
          <Pressable onPress={() => router.push('/(business)/campaigns')}>
            <Text style={[styles.viewAll, { color: C.brinjal1 }]}>{t('business.home.viewAll')}</Text>
          </Pressable>
        </View>

        {tabFilterStuck ? (
          <View
            style={{ height: tabFilterPlaceholderHeight }}
            onLayout={(e) => { tabFilterOnRowLayout(e); tabFilterSetOffsetY(e.nativeEvent.layout.y); }}
          />
        ) : (
          <View
            style={[styles.typeFilterWrapInline, { backgroundColor: C.background }]}
            onLayout={(e) => { tabFilterOnRowLayout(e); tabFilterSetOffsetY(e.nativeEvent.layout.y); }}
          >
            <TabSlider
              tabs={TYPE_TABS}
              active={typeFilter}
              onChange={(k) => setTypeFilter(k as typeof typeFilter)}
            />
          </View>
        )}

        <Animated.View style={recentListStyle}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={C.brinjal1} />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>{t('business.home.loading')}</Text>
          </View>
        ) : recent.length === 0 ? (
          <View style={[styles.emptyWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
            <FontAwesome5 name="file-alt" solid size={48} color={C.textSecondary} />
            <Text style={[styles.emptyTitle, { color: C.text }]}>{t('business.home.noEventsTitle')}</Text>
            <Text style={[styles.emptyHint, { color: C.textSecondary }]}>{t('business.home.noEventsSub')}</Text>
            <Pressable
              style={[
                styles.emptyBtn,
                {
                  backgroundColor: C.brinjal1, shadowColor: C.brinjal1,
                  shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
                },
              ]}
              onPress={() => router.push('/create-campaign')}>
              <Text style={styles.emptyBtnText}>{t('business.home.createEventBtn')}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.campaignList, numColumns === 2 && styles.campaignListGrid]}>
            {recent.map((c) => {
              const meta = getCategoryMeta(allCategories, c.categoryKey ?? c.category);
              const st = STATUS_STYLE[c.status ?? 'draft'] ?? STATUS_STYLE.draft;
              const cardImage = c.featureImageUrl ?? getTemplateImage(c.template, c.categoryKey ?? c.category);
              return (
                // Shadow lives on this outer, unclipped wrapper; the Pressable inside
                // handles its own corner/border-left clipping via overflow:hidden — on
                // the same view, overflow:hidden would clip the shadow right off, same
                // fix as the events list's cardWrap/card split.
                <View key={c.id} style={[styles.campaignCardWrap, numColumns === 2 && styles.campaignCardWrapHalf, { backgroundColor: C.surface }]}>
                <Pressable
                  style={({ pressed }) => [styles.campaignCard, { backgroundColor: C.surface, borderColor: C.border }, pressed && { opacity: 0.92 }]}
                  onPress={() => router.push({ pathname: '/campaign-detail', params: { campaignId: c.id } })}>

                  {/* Header — thumbnail on the left, title + tags on the right */}
                  <View style={styles.cardHeader}>
                    <View style={[styles.thumb, { backgroundColor: meta.bg }]}>
                      <FontAwesome5 name={meta.icon} size={22} color={meta.color} />
                      {cardImage && (
                        <Image source={{ uri: cardImage }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      )}
                    </View>
                    <View style={styles.titleSection}>
                      <Text style={[styles.eventTitle, { color: C.text }]} numberOfLines={2}>{c.title}</Text>
                      <View style={styles.tagContainer}>
                        <View style={[styles.typeBadge, c.campaignType === 'OPEN_EVENT' ? styles.typeBadgeFree : styles.typeBadgePaid]}>
                          <Text style={[styles.typeBadgeText, c.campaignType === 'OPEN_EVENT' ? styles.typeBadgeTextFree : styles.typeBadgeTextPaid]}>
                            {c.campaignType === 'OPEN_EVENT' ? t('business.home.badgeFree') : t('business.home.badgePaid')}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                          <Text style={[styles.statusText, { color: st.color }]}>{t(st.statusKey)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Per-requirement progress — only for multi-role campaigns
                      (CampaignRequirement); simple campaigns render exactly as
                      they always have, nothing below this block changes for them. */}
                  {c.requirements && c.requirements.length > 0 && (() => {
                    const totalQuantity = c.requirements!.reduce((sum, r) => sum + r.quantity, 0);
                    const totalAccepted = c.requirements!.reduce((sum, r) => sum + r.acceptedCount, 0);
                    const totalApplications = c.proposals ?? 0;
                    const pct = totalQuantity > 0 ? Math.round((totalAccepted / totalQuantity) * 100) : 0;
                    return (
                      <View style={styles.requirementsBlock}>
                        <Text style={[styles.requirementsSummary, { color: C.textSecondary }]}>
                          {t('business.home.requirementsSummary', { n: c.requirements!.length, apps: totalApplications })}
                        </Text>
                        <View style={styles.progressRow}>
                          <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
                            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: C.brinjal1 }]} />
                          </View>
                          <Text style={[styles.progressPct, { color: C.brinjal1 }]}>{pct}%</Text>
                        </View>
                        <View style={styles.requirementPillsRow}>
                          {c.requirements!.map((r) => (
                            <View key={r.id} style={[styles.requirementPill, { backgroundColor: C.background, borderColor: C.border }]}>
                              <FontAwesome5 name={r.category.icon as any} solid size={11} color={r.category.color} />
                              <Text style={[styles.requirementPillText, { color: C.text }]}>{r.acceptedCount}/{r.quantity}</Text>
                              <Text style={[styles.requirementPillLabel, { color: C.textSecondary }]} numberOfLines={1}>{r.category.name}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })()}

                  {/* Details — budget */}
                  <View style={styles.detailsSection}>
                    <View style={styles.cardFooter}>
                      <View style={styles.detailRow}>
                        <FontAwesome5 name="money-bill-wave" size={12} color={C.textSecondary} />
                        <Text style={[styles.detailText, styles.budgetText, { color: C.text }]}>{c.budget}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Proposals + View Details — both styled as pill buttons,
                      pinned to either end via the row's space-between. */}
                  <View style={styles.cardFooter}>
                    <Pressable
                      disabled={!c.proposals}
                      style={({ pressed }) => [
                        styles.viewDetailsBtn,
                        { borderColor: c.proposals ? C.brinjal1 : C.border },
                        pressed && !!c.proposals && { opacity: 0.7 },
                      ]}
                      onPress={() => router.push({
                        pathname: '/(business)/campaign-proposals',
                        params: {
                          campaignId:    c.id,
                          campaignTitle: c.title,
                          campaignType:  c.campaignType ?? 'PAID_CAMPAIGN',
                        },
                      })}>
                      <FontAwesome5 name="file-alt" solid size={12} color={c.proposals ? C.brinjal1 : C.textSecondary} />
                      <Text style={[styles.viewDetailsText, { color: c.proposals ? C.brinjal1 : C.textSecondary }]}>
                        {c.proposals
                          ? t(c.proposals === 1 ? 'business.home.viewProposalsBtn' : 'business.home.viewProposalsBtnPlural', { n: c.proposals })
                          : t('business.home.noProposalsBtn')}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.viewDetailsBtn, { borderColor: C.brinjal1 }, pressed && { opacity: 0.7 }]}
                      onPress={() => router.push({ pathname: '/campaign-detail', params: { campaignId: c.id } })}>
                      <Text style={[styles.viewDetailsText, { color: C.brinjal1 }]}>{t('business.home.viewDetails')}</Text>
                      <FontAwesome5 name="arrow-right" solid size={12} color={C.brinjal1} />
                    </Pressable>
                  </View>
                </Pressable>
                </View>
              );
            })}
          </View>
        )}
        </Animated.View>

        {/* ── Recommended for you — based on "What do you usually need help
            with?" from onboarding (BusinessProfile.defaultCreatorCategories).
            Hidden entirely if that wasn't set. Horizontal rail reusing
            EntityCard (shared with explore-creators/explore-businesses)
            instead of a bespoke card. ── */}
        {recommendedProviders.length > 0 && (
          <View style={styles.recommendedSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('business.home.recommendedProviders')}</Text>
              <Pressable onPress={() => router.push('/(business)/explore-creators')}>
                <Text style={[styles.viewAll, { color: C.brinjal1 }]}>{t('business.home.viewAll')}</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railScroll}>
              {recommendedProviders.map((p) => {
                const meta = getCategoryMeta(allCategories, p.categories[0] ?? '');
                return (
                  <View key={p.id} style={styles.recommendedCardWrap}>
                    <EntityCard
                      avatarUrl={p.avatarUrl}
                      avatarBg={C.primaryLight}
                      initials={(p.fullName ?? '?').trim().charAt(0).toUpperCase()}
                      circularAvatar
                      ringColor={C.brinjal1}
                      name={p.fullName ?? 'Provider'}
                      verified={p.fullyVerified || p.isVerified}
                      locationText={[p.location, p.distanceKm != null ? `${p.distanceKm.toFixed(1)} km away` : null].filter(Boolean).join(' · ')}
                      categoryLabel={p.categories[0]}
                      categoryIcon={meta.icon}
                      categoryColor={meta.color}
                      categoryBg={meta.bg}
                      stat={p.averageRating != null ? {
                        icon: 'star',
                        text: `${p.averageRating.toFixed(1)}${p.completedEvents ? ` (${p.completedEvents})` : ''}`,
                        color: '#F59E0B',
                      } : undefined}
                      ctaLabel={t('business.home.viewProfileBtn')}
                      ctaStyle="chevron"
                      onPress={() => router.push({ pathname: '/(business)/creator-detail', params: { id: p.id } })}
                    />
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Refer a business banner — last block on the page: it's the one
            section here that isn't the business's own events or a provider
            they might book, so it trails the feed rather than interrupting
            it between the CTA and the content. Shared PromoBanner component
            — see creator home for the identical pattern, in the identical
            position, on that side. marginHorizontal: 0 drops the component's
            own inset (sized for a parent without padding); `scroll` already
            supplies the gutter, and marginTop matches the xxl step every
            other top-level row on this screen uses. ── */}
        {!referralBannerDismissed && (() => {
          const [prefix, suffix] = t('businessReferral.homeBannerSub').split('{{amount}}');
          return (
            <PromoBanner
              icon="gift"
              title={t('businessReferral.homeBannerTitle')}
              subtitlePrefix={prefix}
              subtitleAmount={t('businessReferral.homeBannerAmount')}
              subtitleSuffix={suffix}
              onPress={() => router.push('/(business)/refer')}
              onDismiss={() => setReferralBannerDismissed(true)}
              style={{ marginHorizontal: 0, marginTop: SPACING.xxl }}
            />
          );
        })()}

      </ScrollView>
      {tabFilterStuck && (
        <View style={[styles.typeFilterWrapSticky, styles.stickyOverlay, { backgroundColor: C.background }]}>
          <TabSlider
            tabs={TYPE_TABS}
            active={typeFilter}
            onChange={(k) => setTypeFilter(k as typeof typeFilter)}
          />
        </View>
      )}
      </View>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: SCREEN_GUTTER, paddingTop: 0, paddingBottom: SPACING.xxxl },

  // Header — avatar, greeting + location, notification bell, and menu button
  // all in one row, mirroring the creator home's header structure. Lives
  // outside the ScrollView (see render) so it stays pinned at the top instead
  // of scrolling away. Same background as the page and no border/shadow —
  // reads as part of the page, not a separate bar; pinning is purely
  // structural, not a visual layer.
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.lg,
  },
  headerText: { flex: 1, gap: 3 },
  greeting: { fontSize: 17, fontFamily: F.bold },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  locationText: { fontSize: 12, fontFamily: F.medium },
  iconBtn: { padding: 4 },
  notifBadge: {
    position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: RADIUS.full,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { fontSize: 9, color: '#fff', fontFamily: F.bold },
  avatarCircle: { width: 44, height: 44, borderRadius: RADIUS.full },
  avatarClip:   { width: '100%', height: '100%', borderRadius: RADIUS.full, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  avatarInitial:  { fontSize: 18, fontFamily: F.extrabold },

  // Action zone — search, alerts, primary CTA, error retry and the referral
  // banner are all things demanding the business's attention right now, so
  // they're clustered tightly (gap: md) to read as one connected group —
  // mirrors creator home's heroGroup. Whichever optional cards happen to
  // render (banner / attentionBanner / errorCard, any combination, any
  // order) always sit the same distance apart via the shared gap, instead of
  // per-block margins compounding or collapsing depending on what's visible.
  heroGroup: { gap: SPACING.md },

  // Primary CTA — uses the theme's brinjal1/brinjal2 (green for the BUSINESS
  // role, see useAppColors) rather than a hardcoded hex, so it stays the
  // single source of truth and adapts correctly in dark mode. Generous
  // padding (SPACING.xl) since this is the single most important action on
  // the screen — hero-level, not standard-card.
  ctaCard: { borderRadius: RADIUS.xl, padding: SPACING.xl, gap: SPACING.lg, ...SHADOW.floating },
  ctaTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  ctaTitle: { fontSize: FONT_SIZE.lg, fontFamily: F.bold, color: '#fff', lineHeight: 26 },
  ctaSub: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, color: 'rgba(255,255,255,0.85)', marginTop: 4, lineHeight: 20 },
  ctaIconWrap: { width: 48, height: 48, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  ctaBtn: {
    flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: '#fff', borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: 11,
  },
  ctaBtnText: { fontSize: FONT_SIZE.sm, fontFamily: F.bold },

  // Section headers — margin-free (spacing supplied by the surrounding
  // block, e.g. an explicit marginTop override or the parent section's own
  // marginTop), mirroring creator home's sectionHeader.
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZE.lg, fontFamily: F.bold },
  viewAll: { fontSize: FONT_SIZE.sm, fontFamily: F.semibold, opacity: 0.7 },

  // Find People — dynamic category grid, mirrors the creator home's Explore Services
  // (Quick Actions) row. marginTop: xxl steps away from heroGroup's tightly-clustered
  // action items, same gap used by every other row on the page (Recent Events,
  // Recommended) so the whole page reads on one consistent rhythm.
  findPeopleSection: { marginTop: SPACING.xxl, gap: SPACING.md },
  // Same title/"View all" split as sectionHeader, minus its marginBottom —
  // findPeopleSection's own `gap` already spaces the row off the slider.
  findPeopleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // Horizontal slider (not a flex row) — the tile count is however many
  // BOTH-scope categories the admin has active, so tiles get a fixed width
  // and scroll instead of being squeezed to fit the screen.
  serviceSlider: { flexDirection: 'row', gap: 12, paddingRight: SPACING.xs },
  serviceTile: { width: 68, alignItems: 'center', gap: 6 },
  serviceIconWrap: { width: 52, height: 52, borderRadius: RADIUS.lg, justifyContent: 'center', alignItems: 'center' },
  // Two-line labels now (category names are longer than the old 4 hand-picked
  // ones), so the Devanagari-safe lineHeight matters here — matras clip below 1.5×.
  serviceLabel: { fontSize: 11, lineHeight: lineHeightFor(11), fontFamily: F.medium, textAlign: 'center' },

  // Recommended for you — horizontal EntityCard rail.
  recommendedSection: { marginTop: SPACING.xxl },
  railScroll: { gap: SPACING.md, paddingRight: SPACING.xs },
  recommendedCardWrap: { width: 300 },

  // Error
  errorCard: { backgroundColor: '#FEE2E2', borderRadius: RADIUS.md, padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1, fontFamily: F.medium },
  retryText: { fontSize: 13, marginLeft: 12, fontFamily: F.bold },

  // Type filter — flush with the page (no card/shadow), horizontally aligned
  // with Recent Events below it. TabSlider's own wrapper adds 3px of internal
  // padding around the tabs, which the two placements below cancel out
  // differently depending on what horizontal inset they already sit inside.
  //
  // Inline (still scrolling with the page): already lives inside the
  // ScrollView's own SCREEN_GUTTER padding, so it only needs to cancel
  // TabSlider's 3px via a negative margin — adding SCREEN_GUTTER again here
  // double-inset the tabs past the campaign cards below.
  typeFilterWrapInline: { marginHorizontal: -3, paddingBottom: SPACING.md },
  // Sticky (pinned below the header, outside the ScrollView): has no
  // surrounding padding to inherit, so it supplies the full SCREEN_GUTTER
  // inset itself, trimmed by TabSlider's 3px to land on the same edge.
  // Padding (not margin) so the opaque background set at the call site spans
  // the full width while pinned (see useStickyBelowHeader) — a transparent
  // side margin would let scrolled-under content peek through.
  typeFilterWrapSticky: { paddingHorizontal: SCREEN_GUTTER - 3, paddingBottom: SPACING.md },
  stickyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, ...SHADOW.card },

  // Campaign cards
  typeBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 3 },
  typeBadgePaid: { backgroundColor: TabColors.brand.bg },
  typeBadgeFree: { backgroundColor: TabColors.info.bg },
  typeBadgeText: { fontSize: 10, fontFamily: F.bold },
  typeBadgeTextPaid: { color: TabColors.brand.color },
  typeBadgeTextFree: { color: TabColors.info.color },

  campaignList: { gap: SPACING.md },
  // Tablet/iPad two-per-row grid — mirrors the events tab's listGrid/cardWrapHalf.
  campaignListGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  // Shadow (unclipped) and rounded-corner clip are split across two views —
  // see the render-side comment for why. Matches the events list's own
  // cardWrap/card split, and its stronger SHADOW.raised.
  campaignCardWrap: { borderRadius: RADIUS.lg, ...SHADOW.raised },
  campaignCardWrapHalf: { width: '48%' },
  campaignCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, overflow: 'hidden' },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  thumb: { width: 64, height: 64, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0, overflow: 'hidden' },
  titleSection: { flex: 1, gap: 6 },
  eventTitle: { fontSize: 16, fontFamily: F.bold, lineHeight: 24 },
  tagContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, gap: 6 },
  statusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontSize: 11, fontFamily: F.bold },

  // No border here on purpose — the budget row separates itself from the
  // header/status area above with spacing alone (see user feedback: the
  // top/bottom rule lines around this single row read as visual clutter).
  detailsSection: { marginBottom: 14, gap: 10 },

  requirementsBlock: { gap: 8, marginBottom: 14 },
  requirementsSummary: { fontSize: 12, fontFamily: F.medium },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: RADIUS.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: RADIUS.full },
  progressPct: { fontSize: 12, fontFamily: F.bold, width: 36, textAlign: 'right' },
  requirementPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  requirementPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 5, maxWidth: 140 },
  requirementPillText: { fontSize: 11, fontFamily: F.bold },
  requirementPillLabel: { fontSize: 11, fontFamily: F.regular, flexShrink: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, fontFamily: F.regular },
  budgetText: { fontFamily: F.bold },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  viewDetailsText: { fontSize: 12, fontFamily: F.semibold },

  loadingWrap: { paddingVertical: 60, alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 14, fontFamily: F.regular },

  // Bordered box (dashed, rounded) — matches the "no results" card style used
  // for Featured/Nearby Events on the creator side, instead of floating
  // unbounded on the page.
  emptyWrap: { alignItems: 'center', paddingVertical: SPACING.xxl, gap: 10, paddingHorizontal: SPACING.xl, borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed' },
  emptyTitle: { fontSize: 17, fontFamily: F.bold },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
  emptyBtn: { borderRadius: RADIUS.full, paddingHorizontal: 28, paddingVertical: 13, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: F.bold },
});
