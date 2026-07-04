import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { CampaignListItem } from '@/features/creator/components/CampaignListItem';
import { FeaturedCard } from '@/features/creator/components/FeaturedCard';
import { FilterModal } from '@/features/creator/components/FilterModal';
import type { EventTypeFilter, LocationFilter } from '@/features/creator/components/FilterModal';
import { CATEGORY_META, DEFAULT_META, displayCategory } from '@/features/creator/data/filterOptions';
import { TabSlider } from '@/components/TabSlider';
import { campaignService } from '@/services/campaign';
import { creatorService } from '@/services/creator';
import { getSocket } from '@/lib/socket';
import { storage } from '@/utilities/storage';
import { ACCESS_TOKEN_KEY, F } from '@/utilities/constants';
import type { Campaign } from '@/types';

const SLIDER_MAX = 100000;

const PLATFORM_ICONS: Record<string, { icon: string; color: string; onColor?: string }> = {
  instagram:     { icon: 'logo-instagram', color: '#E1306C' },
  tiktok:        { icon: 'musical-notes',  color: '#010101' },
  youtube:       { icon: 'logo-youtube',   color: '#FF0000' },
  facebook:      { icon: 'logo-facebook',  color: '#1877F2' },
  twitter:       { icon: 'logo-twitter',   color: '#1DA1F2' },
  'twitter / x': { icon: 'logo-twitter',   color: '#1DA1F2' },
  x:             { icon: 'logo-twitter',   color: '#1DA1F2' },
  linkedin:      { icon: 'logo-linkedin',  color: '#0A66C2' },
  pinterest:     { icon: 'logo-pinterest', color: '#E60023' },
  snapchat:      { icon: 'logo-snapchat',  color: '#F5C300', onColor: '#1a1a1a' },
  whatsapp:      { icon: 'logo-whatsapp',  color: '#25D366' },
};

function getPlatformMeta(name: string) {
  return PLATFORM_ICONS[name.toLowerCase()] ?? { icon: 'globe-outline', color: '#6B7280', onColor: undefined };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { openDrawer } = useContext(DrawerContext);
  const { t, languageVersion } = useLanguage();
  const C = useAppColors();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [apiCategories, setApiCategories] = useState<string[]>([]);
  const [apiPlatforms, setApiPlatforms] = useState<string[]>([]);
  const [activePlatform, setActivePlatform] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeFilterTab, setActiveFilterTab] = useState('all');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [pendingActions, setPendingActions] = useState<Array<{ type: 'start_work' | 'upload_work' | 'event_pending'; title: string }>>([]);
  const [eventType, setEventType] = useState<EventTypeFilter>('ALL');
  const [tempEventType, setTempEventType] = useState<EventTypeFilter>('ALL');
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(SLIDER_MAX);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>([]);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef  = useRef<TextInput>(null);
  const searchDebounce  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tempPriceMin, setTempPriceMin] = useState(0);
  const [tempPriceMax, setTempPriceMax] = useState(SLIDER_MAX);
  const [tempLocation, setTempLocation] = useState<LocationFilter>([]);
  const [tempDateFrom, setTempDateFrom] = useState<Date | null>(null);
  const [tempDateTo, setTempDateTo] = useState<Date | null>(null);

  async function fetchCampaigns(
    overrides: {
      search?: string;
      category?: string;
      platform?: string;
      priceMin?: number;
      priceMax?: number;
      dateFrom?: Date | null;
      dateTo?: Date | null;
      eventType?: EventTypeFilter;
      showLoader?: boolean;
    } = {},
  ) {
    const showLoader = overrides.showLoader !== false;
    if (showLoader) setLoading(true);
    setFetchError('');

    const q    = overrides.search    !== undefined ? overrides.search    : activeSearch;
    const cat   = overrides.category  !== undefined ? overrides.category  : activeCategory;
    const plat  = overrides.platform  !== undefined ? overrides.platform  : activePlatform;
    const pMin  = overrides.priceMin  !== undefined ? overrides.priceMin  : priceMin;
    const pMax  = overrides.priceMax  !== undefined ? overrides.priceMax  : priceMax;
    const df    = overrides.dateFrom  !== undefined ? overrides.dateFrom  : dateFrom;
    const dt    = overrides.dateTo    !== undefined ? overrides.dateTo    : dateTo;
    const et    = overrides.eventType !== undefined ? overrides.eventType : eventType;

    try {
      const { campaigns: data } = await campaignService.list({
        search:       q    || undefined,
        category:     cat  !== 'All' ? cat  : undefined,
        platform:     plat !== 'All' ? plat : undefined,
        minBudget:    pMin > 0 ? pMin : undefined,
        maxBudget:    pMax < SLIDER_MAX ? pMax : undefined,
        dateFrom:     df ?? undefined,
        dateTo:       dt ?? undefined,
        campaignType: et !== 'ALL' ? et : undefined,
        limit: 50,
      });
      setCampaigns(data);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load events');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void fetchCampaigns();
    campaignService.getCategories()
      .then((cats) => { if (cats.length > 0) setApiCategories(cats); })
      .catch(() => {});
    campaignService.getPlatforms()
      .then((plats) => { if (plats.length > 0) setApiPlatforms(plats); })
      .catch(() => {});
    creatorService.getProfile()
      .then((profile) => {
        const missing: string[] = [];
        if (!profile.avatarUrl)            missing.push('Profile photo');
        if (!profile.bio)                  missing.push('Bio');
        if (!profile.location)             missing.push('Location');
        if (!profile.categories?.length)   missing.push('Categories');
        const hasLink = profile.socialLinks &&
          Object.values(profile.socialLinks).some((v) => !!v);
        if (!hasLink) missing.push('Social links');
        setMissingFields(missing);
      })
      .catch(() => {});
  }, [languageVersion]);

  // Keep a stable ref to the latest fetch so the socket handler never captures stale state
  const fetchRef = useRef(fetchCampaigns);
  useEffect(() => { fetchRef.current = fetchCampaigns; });

  // Subscribe to real-time campaign updates while this screen is focused
  useFocusEffect(useCallback(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => { void fetchRef.current({ showLoader: false }); };
    socket.on('campaign:new', handler);
    return () => { socket.off('campaign:new', handler); };
  }, []));

  // Check for pending creator actions on every focus
  useFocusEffect(useCallback(() => {
    if (!storage.get(ACCESS_TOKEN_KEY)) return;
    campaignService.getMyApplications()
      .then((apps) => {
        const actions: Array<{ type: 'start_work' | 'upload_work' | 'event_pending'; title: string }> = [];
        for (const app of apps) {
          if (app.status !== 'accepted') continue;
          if (app.campaignType === 'PAID_CAMPAIGN') {
            if (app.paymentStatus === 'PAID' && app.workStatus === 'NONE') {
              actions.push({ type: 'start_work', title: app.campaignTitle });
            } else if (app.paymentStatus === 'PAID' && app.workStatus === 'IN_PROGRESS') {
              actions.push({ type: 'upload_work', title: app.campaignTitle });
            }
          } else if (app.campaignType === 'OPEN_EVENT') {
            if (app.workStatus === 'NONE' || app.workStatus === 'IN_PROGRESS') {
              actions.push({ type: 'event_pending', title: app.campaignTitle });
            }
          }
        }
        setPendingActions(actions);
      })
      .catch(() => {});
  }, []));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchCampaigns({ showLoader: false });
  }, [activeCategory, priceMin, priceMax, dateFrom, dateTo]);

  const isFilterActive = eventType !== 'ALL' || priceMin > 0 || priceMax < SLIDER_MAX || locationFilter.length > 0 || !!dateFrom;

  function openFilter() {
    setTempEventType(eventType);
    setTempPriceMin(priceMin);
    setTempPriceMax(priceMax);
    setTempLocation(locationFilter);
    setTempDateFrom(dateFrom);
    setTempDateTo(dateTo);
    setFilterOpen(true);
  }

  function applyFilter() {
    setEventType(tempEventType);
    setPriceMin(tempPriceMin);
    setPriceMax(tempPriceMax);
    setLocationFilter(tempLocation);
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setFilterOpen(false);

    // Re-fetch with the new committed values (don't wait for state to flush)
    void fetchCampaigns({
      eventType: tempEventType,
      priceMin:  tempPriceMin,
      priceMax:  tempPriceMax,
      dateFrom:  tempDateFrom,
      dateTo:    tempDateTo,
    });

    // Persist first non-Remote location's lat/lng to creator profile
    const geoLoc = tempLocation.find((l) => l.label !== 'Remote' && l.lat !== null);
    if (geoLoc && geoLoc.lat !== null && geoLoc.lng !== null) {
      creatorService.updateProfile({
        location: geoLoc.label,
        locationLat: geoLoc.lat,
        locationLng: geoLoc.lng,
      }).catch(() => {});
    }
  }

  function resetFilter() {
    setTempEventType('ALL');
    setTempPriceMin(0);
    setTempPriceMax(SLIDER_MAX);
    setTempLocation([]);
    setTempDateFrom(null);
    setTempDateTo(null);
  }

  function resetAllFilters() {
    setEventType('ALL');
    setPriceMin(0);
    setPriceMax(SLIDER_MAX);
    setLocationFilter([]);
    setDateFrom(null);
    setDateTo(null);
    setActiveCategory('All');
    setActivePlatform('All');
    setActiveFilterTab('all');
    void fetchCampaigns({ category: 'All', platform: 'All', priceMin: 0, priceMax: SLIDER_MAX, dateFrom: null, dateTo: null, eventType: 'ALL' });
  }

  const visibleCategories = [
    { label: 'All', ...(CATEGORY_META['All'] ?? DEFAULT_META) },
    ...apiCategories.map((label) => ({
      label,
      ...(CATEGORY_META[label] ?? DEFAULT_META),
    })),
  ];

  const featured = campaigns.filter((c) => c.isFeatured);

  // Category, budget, deadline, and search are filtered server-side.
  // Client-side: location and quick-tab filters only.
  const filteredList = campaigns.filter((c) => {
    const matchLocation =
      locationFilter.length === 0 ||
      locationFilter.some((l) =>
        l.label === 'Remote'
          ? c.location === 'Remote'
          : c.location?.toLowerCase().includes(l.label.toLowerCase()),
      );

    let matchTab = true;
    if (activeFilterTab === 'recommended') matchTab = !c.isFeatured;
    else if (activeFilterTab === 'trending') matchTab = c.proposals >= 3;
    else if (activeFilterTab === 'ending-soon') {
      const deadline = c.deadline ? new Date(c.deadline) : null;
      if (deadline && !isNaN(deadline.getTime())) {
        const daysLeft = (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        matchTab = daysLeft >= 0 && daysLeft <= 7;
      } else {
        matchTab = false;
      }
    }

    return matchLocation && matchTab;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}>

        {/* ── Gradient header ── */}
        <LinearGradient colors={['#312e81', '#4f46e5', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradientHeader}>

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Pressable style={styles.menuBtn} onPress={openDrawer}>
                <View style={styles.menuBtnInner}>
                  <Ionicons name="menu" size={22} color="#fff" />
                </View>
              </Pressable>
              <View>
                <Text style={styles.greeting}>{t('creator.home.greeting')}</Text>
                <Text style={styles.brandName} numberOfLines={1}>{user?.name ?? 'Creator'}</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <Pressable
                style={[styles.avatarCircle, { borderColor: 'rgba(255,255,255,0.5)', borderWidth: 2.5 }]}
                onPress={() => router.push('/(creator)/profile')}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <Ionicons name="person" size={20} color="#fff" />
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {/* ── Search bar ── */}
        <View style={styles.searchRow}>
          <Pressable
            style={[styles.searchCard, searchFocused ? styles.searchCardFocused : { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => searchInputRef.current?.focus()}>
            <Ionicons name="search-outline" size={18} color={searchFocused ? C.brinjal1 : C.textSecondary} style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: C.text }]}
              placeholder={t('creator.browse.searchPlaceholder')}
              placeholderTextColor={C.textSecondary}
              value={search}
              onChangeText={(text) => {
                setSearch(text);
                if (searchDebounce.current) clearTimeout(searchDebounce.current);
                if (text.length >= 3) {
                  searchDebounce.current = setTimeout(() => {
                    setActiveSearch(text);
                    void fetchCampaigns({ search: text });
                  }, 400);
                } else if (!text && activeSearch) {
                  setActiveSearch('');
                  void fetchCampaigns({ search: '' });
                }
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
              onSubmitEditing={() => {
                searchInputRef.current?.blur();
                if (searchDebounce.current) clearTimeout(searchDebounce.current);
                setActiveSearch(search);
                void fetchCampaigns({ search });
              }}
            />
            <Pressable
              style={[styles.filterBtn, { backgroundColor: isFilterActive ? C.brinjal1 : C.primaryLight }]}
              onPress={openFilter}>
              <Ionicons name="options-outline" size={18} color={isFilterActive ? '#fff' : C.brinjal1} />
              {isFilterActive && <View style={styles.filterActiveDot} />}
            </Pressable>
          </Pressable>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActionsRow}>
          {([
            { icon: 'document-text-outline', label: 'Proposals', bg: '#EDE9FE', color: '#7C3AED', route: '/(creator)/(tabs)/proposals' },
            { icon: 'storefront-outline',    label: 'Brands',    bg: '#DCFCE7', color: '#059669', route: '/(creator)/explore-businesses' },
            { icon: 'chatbubbles-outline',   label: 'Messages',  bg: '#DBEAFE', color: '#2563EB', route: '/(creator)/(tabs)/messages' },
            { icon: 'heart-outline',         label: 'Saved',     bg: '#FEE2E2', color: '#DC2626', route: '/(creator)/favorite-businesses' },
          ] as const).map(({ icon, label, bg, color, route }) => (
            <Pressable
              key={label}
              style={[styles.quickAction, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => router.push(route as never)}>
              <View style={[styles.quickActionIcon, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <Text style={[styles.quickActionLabel, { color: C.text }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Profile completion banner ── */}
        {!bannerDismissed && missingFields.length > 0 && (
          <Pressable
            style={[styles.banner, { backgroundColor: C.surface, borderLeftColor: C.brinjal1 }]}
            onPress={() => router.push('/(creator)/edit-profile')}>
            <View style={[styles.bannerIconBox, { backgroundColor: C.primaryLight }]}>
              <Ionicons name="person-outline" size={20} color={C.brinjal1} />
            </View>
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: C.text }]}>Complete your profile</Text>
              <Text style={[styles.bannerSub, { color: C.textSecondary }]} numberOfLines={2}>
                Missing: {missingFields.join(' · ')}
              </Text>
            </View>
            <Pressable style={styles.bannerClose} onPress={() => setBannerDismissed(true)}>
              <Ionicons name="close" size={16} color={C.textSecondary} />
            </Pressable>
          </Pressable>
        )}

        {/* ── Pending action attention banner ── */}
        {pendingActions.length > 0 && (
          <Pressable
            style={styles.attentionBanner}
            onPress={() => router.push('/(creator)/(tabs)/proposals')}>
            <View style={styles.attentionIconWrap}>
              <Ionicons name="alert-circle" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.attentionTitle}>Action Required</Text>
              <Text style={styles.attentionSub} numberOfLines={1}>
                {pendingActions.length === 1
                  ? pendingActions[0]!.type === 'start_work'
                    ? `Payment received — start work on "${pendingActions[0]!.title}"`
                    : pendingActions[0]!.type === 'upload_work'
                      ? `Upload deliverables for "${pendingActions[0]!.title}"`
                      : `Submit your content for "${pendingActions[0]!.title}"`
                  : `${pendingActions.length} campaigns are waiting for your action`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D97706" />
          </Pressable>
        )}

        {/* ── Error ── */}
        {fetchError ? (
          <View style={[styles.errorCard, { backgroundColor: '#FEE2E2' }]}>
            <Text style={styles.errorText}>{fetchError}</Text>
            <Pressable onPress={() => fetchCampaigns()}>
              <Text style={[styles.retryText, { color: C.brinjal1 }]}>{t('creator.home.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── Categories ── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('creator.home.categories')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
          {visibleCategories.map((cat) => {
            const isAll    = cat.label === 'All';
            const isActive = activeCategory === cat.label;
            return (
              <Pressable
                key={cat.label}
                style={[
                  styles.catPill,
                  {
                    backgroundColor: isActive ? C.brinjal1 : isAll ? 'transparent' : C.surface,
                    borderColor: isActive ? C.brinjal1 : C.border,
                    overflow: 'hidden',
                  },
                ]}
                onPress={() => {
                  setActiveCategory(cat.label);
                  void fetchCampaigns({ category: cat.label });
                }}>
                {isAll && !isActive && (
                  <LinearGradient
                    colors={['#7C3AED', '#EC4899', '#F97316']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <Text
                  style={[styles.catLabel, { color: isActive || isAll ? '#fff' : C.text }]}
                  numberOfLines={1}>
                  {displayCategory(cat.label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Platform Filter ── */}
        {apiPlatforms.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('creator.home.platforms')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformsRow}>
              <Pressable
                style={[styles.platCard, { backgroundColor: 'transparent' }]}
                onPress={() => { setActivePlatform('All'); void fetchCampaigns({ platform: 'All' }); }}>
                <LinearGradient
                  colors={['#E1306C', '#1877F2', '#FF0000']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, { opacity: activePlatform === 'All' ? 1 : 0.18, borderRadius: 20 }]}
                />
                <Ionicons name="apps" size={18} color={activePlatform === 'All' ? '#fff' : C.textSecondary} />
                <Text style={[styles.platLabel, { color: activePlatform === 'All' ? '#fff' : C.text }]}>All</Text>
              </Pressable>

              {apiPlatforms.map((p) => {
                const meta = getPlatformMeta(p);
                const isActive = activePlatform === p;
                const fg = meta.onColor ?? '#fff';
                return (
                  <Pressable
                    key={p}
                    style={[styles.platCard, { backgroundColor: isActive ? meta.color : meta.color + '28' }]}
                    onPress={() => { setActivePlatform(p); void fetchCampaigns({ platform: p }); }}>
                    <Ionicons name={meta.icon as any} size={18} color={isActive ? fg : meta.color} />
                    <Text style={[styles.platLabel, { color: isActive ? fg : C.text }]} numberOfLines={1}>{p}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ── Featured / Loading ── */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={C.brinjal1} />
            <Text style={[styles.loadingText, { color: C.textSecondary }]}>{t('creator.home.loading')}</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('creator.home.featuredEvents')}</Text>
              {featured.length > 0 && (
                <Pressable onPress={() => router.push('/(creator)/featured-campaigns')}>
                  <Text style={[styles.seeAll, { color: C.brinjal1 }]}>{t('creator.home.seeAll')}</Text>
                </Pressable>
              )}
            </View>
            {featured.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
                {featured.map((c) => <FeaturedCard key={c.id} campaign={c} />)}
              </ScrollView>
            ) : (
              <View style={[styles.featuredEmpty, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Ionicons name="star-outline" size={32} color={C.textSecondary} />
                <Text style={[styles.featuredEmptyTitle, { color: C.text }]}>{t('creator.home.noFeaturedEvents')}</Text>
                <Text style={[styles.featuredEmptySub, { color: C.textSecondary }]}>{t('creator.home.noFeaturedEventsHint')}</Text>
              </View>
            )}

            {/* ── Tab filter ── */}
            <View style={[styles.filterTabsWrap, { backgroundColor: C.surface }]}>
              <TabSlider
                tabs={[
                  { key: 'all',          label: t('creator.home.tabAll'),         icon: 'layers-outline',   color: '#4F46E5' },
                  { key: 'recommended',  label: t('creator.home.tabRecommended'), icon: 'star-outline',     color: '#D97706' },
                  { key: 'trending',     label: t('creator.home.tabTrending'),    icon: 'flame-outline',    color: '#DC2626' },
                  { key: 'ending-soon',  label: t('creator.home.tabEndingSoon'),  icon: 'timer-outline',    color: '#059669' },
                ]}
                active={activeFilterTab}
                onChange={setActiveFilterTab}
              />
            </View>

            {/* ── Campaign list header with count ── */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>
                {activeFilterTab === 'all' ? 'All Campaigns' :
                 activeFilterTab === 'recommended' ? 'Recommended' :
                 activeFilterTab === 'trending' ? 'Trending' : 'Ending Soon'}
                {filteredList.length > 0 ? `  ·  ${filteredList.length}` : ''}
              </Text>
            </View>

            {/* ── Campaign list ── */}
            <View style={styles.listWrap}>
              {filteredList.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="search" size={40} color={C.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: C.text }]}>{t('creator.home.noEventsFound')}</Text>
                  <Text style={[styles.emptyHint, { color: C.textSecondary }]}>
                    {campaigns.length === 0
                      ? t('creator.home.noActiveEvents')
                      : t('creator.home.tryAdjustFilters')}
                  </Text>
                </View>
              ) : (
                filteredList.map((c) => <CampaignListItem key={c.id} campaign={c} />)
              )}
            </View>
          </>
        )}
      </ScrollView>

      <FilterModal
        visible={filterOpen}
        tempEventType={tempEventType}
        tempPriceMin={tempPriceMin}
        tempPriceMax={tempPriceMax}
        tempLocation={tempLocation}
        tempDateFrom={tempDateFrom}
        tempDateTo={tempDateTo}
        setTempEventType={setTempEventType}
        setTempPriceMin={setTempPriceMin}
        setTempPriceMax={setTempPriceMax}
        setTempLocation={setTempLocation}
        setTempDateFrom={setTempDateFrom}
        setTempDateTo={setTempDateTo}
        onApply={applyFilter}
        onReset={resetFilter}
        onClose={() => setFilterOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // ── Header ──
  gradientHeader: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn:      { padding: 0 },
  menuBtnInner: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  greeting:     { fontSize: 12, marginBottom: 2, fontFamily: F.medium, color: 'rgba(255,255,255,0.75)' },
  brandName:    { fontSize: 20, fontFamily: F.bold, color: '#fff', maxWidth: 180, letterSpacing: -0.3 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  avatarImage:  { width: 44, height: 44 },
  avatarFallback: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },

  // ── Search ──
  searchRow: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  searchCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 14, height: 52, borderWidth: 1.5 },
  searchCardFocused: {
    borderColor: '#7C3AED', borderWidth: 2,
    shadowColor: '#7C3AED', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  searchIcon:      { marginRight: 8 },
  searchInput:     { flex: 1, fontSize: 14, fontFamily: F.regular },
  filterBtn:       { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  filterActiveDot: { position: 'absolute', top: 4, right: 4, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444' },

  // ── Quick Actions ──
  quickActionsRow:  { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, gap: 10 },
  quickAction:      { flex: 1, alignItems: 'center', borderRadius: 16, paddingVertical: 12, gap: 6, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  quickActionIcon:  { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: 11, fontFamily: F.medium, textAlign: 'center' },

  // ── Banner ──
  banner:        { flexDirection: 'row', alignItems: 'center', borderRadius: 16, marginHorizontal: 20, marginTop: 14, marginBottom: 2, padding: 14, gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2, borderLeftWidth: 4 },
  bannerIconBox: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bannerText:    { flex: 1, gap: 2 },
  bannerTitle:   { fontSize: 13, fontFamily: F.semibold },
  bannerSub:     { fontSize: 12, fontFamily: F.regular, lineHeight: 17, opacity: 0.75 },
  bannerClose:   { position: 'absolute', top: 8, right: 8, padding: 4 },

  // ── Error ──
  errorCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText:  { color: '#DC2626', fontSize: 13, flex: 1, fontFamily: F.medium },
  retryText:  { fontSize: 13, fontWeight: '700', marginLeft: 12, fontFamily: F.bold },

  // ── Section headers ──
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 12 },
  sectionTitle:  { fontSize: 16, fontFamily: F.bold },
  seeAll:        { fontSize: 13, fontFamily: F.semibold, opacity: 0.7 },

  // ── Categories (pills) ──
  categoriesRow: { paddingHorizontal: 20, gap: 8, marginBottom: 0 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 38, borderRadius: 20, paddingHorizontal: 12,
    borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: 12, fontFamily: F.semibold, lineHeight: 16 },

  // ── Platforms (pills) ──
  platformsRow: { paddingHorizontal: 20, gap: 8, marginBottom: 0 },
  platCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 38, borderRadius: 20, overflow: 'hidden', paddingHorizontal: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  platLabel: { fontSize: 12, fontFamily: F.medium, lineHeight: 16 },

  // ── Loading ──
  loadingWrap: { paddingVertical: 60, alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 14, fontFamily: F.regular },

  // ── Featured ──
  featuredRow:       { paddingHorizontal: 20, gap: 16, marginBottom: 0 },
  featuredEmpty:     { marginHorizontal: 20, marginBottom: 0, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 8 },
  featuredEmptyTitle:{ fontSize: 14, fontFamily: F.bold, textAlign: 'center' },
  featuredEmptySub:  { fontSize: 12, fontFamily: F.regular, textAlign: 'center', lineHeight: 18 },

  // ── Attention banner ──
  attentionBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, marginHorizontal: 20, marginTop: 12, padding: 14, gap: 12, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  attentionIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  attentionTitle: { fontSize: 13, color: '#92400E', fontFamily: F.bold },
  attentionSub: { fontSize: 11, color: '#B45309', fontFamily: F.regular, marginTop: 1 },

  // ── Tab filter ──
  filterTabsWrap: { marginTop: 8, marginBottom: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },

  // ── Campaign list ──
  listWrap:   { paddingHorizontal: 20, gap: 12 },
  emptyWrap:  { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: F.bold },
  emptyHint:  { fontSize: 13, fontFamily: F.regular, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
});
