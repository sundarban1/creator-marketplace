import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { TabSlider } from '@/components/TabSlider';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { useStickyBelowHeader } from '@/hooks/useStickyBelowHeader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { isValidNepaliPhone } from '@/utilities/phone';
import { campaignService } from '@/services/campaign';
import { useNotificationBadge } from '@/context/NotificationContext';
import { notificationService } from '@/services/notifications';
import { profileService } from '@/services/profile';
import type { Campaign } from '@/types';
import { useAllCategories, getCategoryMeta } from '@/hooks/useCategories';
import { usePlatforms, getPlatformMeta } from '@/hooks/usePlatforms';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { TabColors } from '@/utilities/tabColors';

const STATUS_STYLE = {
  active: { bg: TabColors.positive.bg, color: TabColors.positive.color, statusKey: 'business.home.statusActive' as const },
  draft:  { bg: TabColors.warning.bg,  color: TabColors.warning.color,  statusKey: 'business.home.statusPaused' as const },
  closed: { bg: TabColors.closed.bg,   color: TabColors.closed.color,   statusKey: 'business.home.statusClosed' as const },
  pending_approval: { bg: TabColors.warning.bg, color: TabColors.warning.color, statusKey: 'business.home.statusPendingApproval' as const },
};

// Tablet/iPad: two cards per row in Recent Events, matching the events tab's
// own grid. 768 matches the breakpoint used there.
const TABLET_BREAKPOINT = 768;

export default function BusinessHomeScreen() {
  const { user } = useAuth();
  const { t, languageVersion } = useLanguage();
  const C = useAppColors();
  const { categories: allCategories } = useAllCategories();
  const { platforms: allPlatforms } = usePlatforms();
  const { width: windowWidth } = useWindowDimensions();
  const numColumns = windowWidth >= TABLET_BREAKPOINT ? 2 : 1;
  const name = user?.name?.split(' ')[0] ?? 'there';

  const { setBadgeCount } = useNotificationBadge();
  const { openDrawer } = useContext(DrawerContext);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [businessName, setBusinessName] = useState('');
  // Count of accepted applications actually waiting on a business action
  // (payment due, or submitted work awaiting review) — not the raw
  // applications total, which includes proposals nothing is blocked on.
  const [attentionCount, setAttentionCount] = useState(0);
  // Phone-only signups default `name` to the raw phone number until the user sets
  // a real one — never show that in the header (as text, or as the avatar's
  // first-letter fallback initial, which would render a bare "+").
  const displayName = businessName || (user?.name && !isValidNepaliPhone(user.name) ? user.name : 'Business');
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
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : t('business.home.loadError'));
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
        const missing: string[] = [];
        if (!profile.logoUrl)            missing.push(t('business.home.fieldLogo'));
        if (!profile.description)        missing.push(t('business.home.fieldDescription'));
        if (!profile.location)           missing.push(t('business.home.fieldLocation'));
        if (!profile.categories?.length) missing.push(t('business.home.fieldCategories'));
        if (!profile.website)            missing.push(t('business.home.fieldWebsite'));
        setMissingFields(missing);
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
      {/* ── Header: avatar, centered name, menu button — kept outside the
          ScrollView so it stays floating/pinned above the content instead of
          scrolling away. ── */}
      <View style={[styles.header, { backgroundColor: C.background, borderBottomColor: C.border }]}>
        <Pressable style={[styles.avatarCircle, { backgroundColor: C.surface }, SHADOW.card]} onPress={() => router.push('/(business)/profile')}>
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

        <Text style={[styles.brandName, { color: C.brinjal1 }]} numberOfLines={1}>{displayName}</Text>

        <Pressable style={styles.menuBtn} onPress={openDrawer} hitSlop={6}>
          <View
            style={[
              styles.menuBtnInner,
              { backgroundColor: C.surface },
              SHADOW.card,
            ]}
          >
            <FontAwesome5 name="bars" solid size={22} color={C.text} />
          </View>
        </Pressable>
      </View>
      <View style={[styles.headerDivider, { backgroundColor: C.border }]} />

      {/* Sticky tab filter — hand-rolled (see useStickyBelowHeader), not
          stickyHeaderIndices, which reliably crashes Android on this app's
          RN/Fabric setup. This wrapper is the positioning context the
          overlay below is anchored to (`top: 0` here lands right below the
          header divider above). */}
      <View style={{ flex: 1 }}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
        onScroll={tabFilterOnScroll}
        scrollEventThrottle={16}>

        <View>
          {/* ── Attention banner (shown when a business action is actually pending) ── */}
          {!loading && attentionCount > 0 && (
            <Pressable style={styles.attentionBanner} onPress={() => router.push('/(business)/proposals')}>
              <View
                style={[
                  styles.attentionIconWrap,
                  { shadowColor: '#D97706', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
                ]}
              >
                <FontAwesome5 name="exclamation-circle" solid size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.attentionTitle}>{t('business.home.attentionTitle')}</Text>
                <Text style={styles.attentionSub}>
                  {attentionCount === 1
                    ? t('business.home.attentionProposalsSingular', { n: attentionCount })
                    : t('business.home.attentionProposalsPlural', { n: attentionCount })}
                </Text>
              </View>
              <FontAwesome5 name="chevron-right" solid size={16} color="#D97706" />
            </Pressable>
          )}

          {/* ── Quick Actions ── */}
          <View style={styles.quickActionsRow}>
            {([
              { icon: 'plus-circle' as const,  label: t('business.home.quickActionCreate'),    bg: '#EDE9FE', color: '#7C3AED', route: '/create-campaign' },
              { icon: 'users' as const,       label: t('business.home.quickActionCreators'),      bg: '#DCFCE7', color: '#059669', route: '/(business)/explore-creators' },
              { icon: 'comments'as const,  label: t('business.home.quickActionMessages'),  bg: '#DBEAFE', color: '#2563EB', route: '/(business)/messages' },
              { icon: 'briefcase'  as const,  label: t('business.home.quickActionEvents'),    bg: '#FEF3C7', color: '#D97706', route: '/(business)/campaigns' },
            ]).map(({ icon, label, bg, color, route }) => (
              <Pressable key={label} style={[styles.quickAction, { backgroundColor: C.surface, borderColor: C.border }]}
                onPress={() => router.push(route as never)}>
                <View
                  style={[
                    styles.quickActionIcon,
                    {
                      backgroundColor: bg, shadowColor: color,
                      shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
                    },
                  ]}
                >
                  <FontAwesome5 name={icon} size={20} color={color} />
                </View>
                <Text style={[styles.quickActionLabel, { color: C.text }]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {/* ── Profile completion banner ── */}
          {!bannerDismissed && missingFields.length > 0 && (
            <Pressable
              style={[styles.banner, { backgroundColor: C.surface, borderLeftColor: C.brinjal1 }]}
              onPress={() => router.push('/(business)/edit-profile' as never)}>
              <View
                style={[
                  styles.bannerIconBox,
                  {
                    backgroundColor: C.primaryLight, shadowColor: C.brinjal1,
                    shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                  },
                ]}
              >
                <FontAwesome5 name="building" solid size={20} color={C.brinjal1} />
              </View>
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: C.text }]}>{t('business.home.completeProfile')}</Text>
                <Text style={[styles.bannerSub, { color: C.error }]} numberOfLines={2}>
                  {t('business.home.missingFieldsPrefix', { fields: missingFields.join(' · ') })}
                </Text>
              </View>
              <Pressable style={styles.bannerClose} onPress={() => setBannerDismissed(true)} hitSlop={10}>
                <FontAwesome5 name="times" solid size={16} color={C.textSecondary} />
              </Pressable>
            </Pressable>
          )}

          {/* ── Error ── */}
          {fetchError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{fetchError}</Text>
              <Pressable onPress={() => fetchCampaigns()}>
                <Text style={[styles.retryText, { color: C.brinjal1 }]}>{t('business.home.retry')}</Text>
              </Pressable>
            </View>
          ) : null}

          {/* ── Refer a business banner ── */}
          {!referralBannerDismissed && (
            <Pressable
              style={[styles.banner, { backgroundColor: C.surface, borderLeftColor: '#EC4899' }]}
              onPress={() => router.push('/(business)/refer')}>
              <View
                style={[
                  styles.bannerIconBox,
                  {
                    backgroundColor: '#FCE7F3', shadowColor: '#EC4899',
                    shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                  },
                ]}
              >
                <FontAwesome5 name="gift" solid size={20} color="#EC4899" />
              </View>
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: C.text }]}>{t('businessReferral.homeBannerTitle')}</Text>
                <Text style={[styles.bannerSub, { color: C.textSecondary }]} numberOfLines={1}>
                  {(() => {
                    const [prefix, suffix] = t('businessReferral.homeBannerSub').split('{{amount}}');
                    return (
                      <>
                        {prefix}
                        <Text style={styles.bannerSubAmount}>{t('businessReferral.homeBannerAmount')}</Text>
                        {suffix}
                      </>
                    );
                  })()}
                </Text>
              </View>
              <Pressable style={styles.bannerClose} onPress={() => setReferralBannerDismissed(true)} hitSlop={10}>
                <FontAwesome5 name="times" solid size={16} color={C.textSecondary} />
              </Pressable>
            </Pressable>
          )}
        </View>

        {/* ── Recent Events ── */}
        <View style={styles.sectionHeader}>
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
            style={[styles.typeFilterWrap, { backgroundColor: C.background }]}
            onLayout={(e) => { tabFilterOnRowLayout(e); tabFilterSetOffsetY(e.nativeEvent.layout.y); }}
          >
            <TabSlider
              tabs={TYPE_TABS}
              active={typeFilter}
              onChange={(k) => setTypeFilter(k as typeof typeFilter)}
            />
          </View>
        )}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>{t('business.home.loading')}</Text>
          </View>
        ) : recent.length === 0 ? (
          <View style={styles.emptyWrap}>
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

                  {/* Details — budget on the left, platform icons on the right of the same row */}
                  <View style={[styles.detailsSection, { borderTopColor: C.border, borderBottomColor: C.border }]}>
                    <View style={styles.cardFooter}>
                      <View style={styles.detailRow}>
                        <FontAwesome5 name="money-bill-wave" size={12} color={C.textSecondary} />
                        <Text style={[styles.detailText, styles.budgetText, { color: C.text }]}>{c.budget}</Text>
                      </View>
                      <View style={styles.socialPlatforms}>
                        {c.platforms.map((p) => {
                          const pMeta = getPlatformMeta(allPlatforms, p);
                          return (
                            <View key={p} style={[styles.socialIcon, { backgroundColor: pMeta.bg }]}>
                              <FontAwesome5 name={pMeta.icon} size={12} color={pMeta.color} />
                            </View>
                          );
                        })}
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
                          platform:      c.platforms.join(', '),
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

      </ScrollView>
      {tabFilterStuck && (
        <View style={[styles.typeFilterWrap, styles.stickyOverlay, { backgroundColor: C.background }]}>
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
  scroll: { paddingBottom: 40 },

  // Header — avatar, centered business name, and menu button all in one row.
  // Avatar and the menu button are both 44×44, so the name's flex:1 +
  // textAlign:'center' lands it on the row's true center, not just the
  // midpoint of the leftover space. Lives outside the ScrollView (see render)
  // so it stays pinned at the top instead of scrolling away. Same background
  // as the page and no border/shadow — reads as part of the page, not a
  // separate bar; pinning is purely structural, not a visual layer.
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18,
  },
  // Inset divider (not a full-bleed border) separating the header from the
  // scrolling content — matches the gap-at-the-corners divider style used
  // elsewhere (e.g. SavedListCard, campaigns footer).
  headerDivider: { height: 1, marginHorizontal: 20 },
  menuBtn: { padding: 0 },
  menuBtnInner: { width: 44, height: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  brandName: { flex: 1, textAlign: 'center', fontSize: 20, fontFamily: F.bold, letterSpacing: -0.3 },
  avatarCircle: { width: 44, height: 44, borderRadius: RADIUS.full },
  avatarClip:   { width: '100%', height: '100%', borderRadius: RADIUS.full, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  avatarInitial:  { fontSize: 18, fontFamily: F.extrabold },

  // Quick actions
  // paddingBottom is 0 here (and on every block below) on purpose — each block
  // only contributes its own *leading* gap via marginTop/paddingTop. That way
  // whichever optional cards happen to render (banner / attentionBanner /
  // errorCard, any combination, any order) always sit the same distance apart,
  // instead of gaps compounding or collapsing depending on what's visible.
  quickActionsRow:  { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 0, gap: 10 },
  quickAction:      { flex: 1, alignItems: 'center', borderRadius: RADIUS.lg, paddingVertical: 14, gap: 8, borderWidth: 1, ...SHADOW.card },
  quickActionIcon:  { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: 11, fontFamily: F.medium, textAlign: 'center' },

  // Profile completion banner
  banner:        { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, marginHorizontal: 20, marginTop: 16, marginBottom: 0, padding: 14, gap: 10, ...SHADOW.card, borderLeftWidth: 4 },
  bannerIconBox: { width: 38, height: 38, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bannerText:    { flex: 1, gap: 2 },
  bannerTitle:   { fontSize: 13, fontFamily: F.semibold },
  bannerSub:     { fontSize: 12, fontFamily: F.regular, lineHeight: 17, opacity: 0.75 },
  bannerSubAmount: { fontSize: 15, fontFamily: F.extrabold, color: '#059669' },
  bannerClose:   { position: 'absolute', top: 8, right: 8, padding: 4 },

  // Attention banner
  attentionBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, marginHorizontal: 20, marginTop: 16, marginBottom: 0, padding: 14, gap: 10, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  attentionIconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  attentionTitle: { fontSize: 13, color: '#92400E', fontFamily: F.bold },
  attentionSub: { fontSize: 11, color: '#B45309', fontFamily: F.regular, marginTop: 1 },

  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontFamily: F.bold },
  viewAll: { fontSize: 13, fontFamily: F.semibold, opacity: 0.7 },

  // Error
  errorCard: { backgroundColor: '#FEE2E2', marginHorizontal: 20, marginTop: 16, marginBottom: 0, borderRadius: RADIUS.md, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderLeftWidth: 4, borderLeftColor: '#EF4444' },
  errorText: { color: '#DC2626', fontSize: 13, flex: 1, fontFamily: F.medium },
  retryText: { fontSize: 13, marginLeft: 12, fontFamily: F.bold },

  // Type filter — flush with the page (no card/shadow), horizontally aligned
  // with Recent Events below it. TabSlider's own wrapper adds 3px of internal
  // padding around the tabs, so the outer inset is trimmed to 17px to land
  // the tab edges exactly on the same 20px line as the campaign cards.
  // Padding (not margin) so the opaque background set at the call site spans
  // the full width when this block is pinned (see useStickyBelowHeader) — a
  // transparent side margin would let scrolled-under content peek through.
  typeFilterWrap: { paddingHorizontal: 17, paddingBottom: 12 },
  stickyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, ...SHADOW.card },

  // Campaign cards
  typeBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 3 },
  typeBadgePaid: { backgroundColor: TabColors.brand.bg },
  typeBadgeFree: { backgroundColor: TabColors.info.bg },
  typeBadgeText: { fontSize: 10, fontFamily: F.bold },
  typeBadgeTextPaid: { color: TabColors.brand.color },
  typeBadgeTextFree: { color: TabColors.info.color },

  campaignList: { paddingHorizontal: 20, gap: 12 },
  // Tablet/iPad two-per-row grid — mirrors the events tab's listGrid/cardWrapHalf.
  campaignListGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  // Shadow (unclipped) and rounded-corner clip are split across two views —
  // see the render-side comment for why. Matches the events list's own
  // cardWrap/card split, and its stronger SHADOW.raised.
  campaignCardWrap: { borderRadius: RADIUS.lg, ...SHADOW.raised },
  campaignCardWrapHalf: { width: '48%' },
  campaignCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 18, overflow: 'hidden' },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  thumb: { width: 64, height: 64, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0, overflow: 'hidden' },
  titleSection: { flex: 1, gap: 6 },
  eventTitle: { fontSize: 16, fontFamily: F.bold, lineHeight: 21 },
  tagContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, gap: 6 },
  statusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 9, paddingVertical: 4 },
  statusText: { fontSize: 11, fontFamily: F.bold },

  detailsSection: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12, marginBottom: 14, gap: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, fontFamily: F.regular },
  budgetText: { fontFamily: F.bold },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  socialPlatforms: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, flexShrink: 1 },
  socialIcon: { width: 24, height: 24, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  viewDetailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  viewDetailsText: { fontSize: 12, fontFamily: F.semibold },

  loadingWrap: { paddingVertical: 60, alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 14, fontFamily: F.regular },

  emptyWrap: { alignItems: 'center', paddingVertical: 48, gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontFamily: F.bold },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
  emptyBtn: { borderRadius: RADIUS.full, paddingHorizontal: 28, paddingVertical: 13, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: F.bold },
});
