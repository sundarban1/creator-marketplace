import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { DrawerContext } from '@/context/DrawerContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { CampaignListItem } from '@/features/creator/components/CampaignListItem';
import { CampaignCard } from '@/features/creator/components/CampaignCard';
import { CampaignCardSkeleton } from '@/features/creator/components/CampaignCardSkeleton';
import { NearbyLocationSheet, type NearbySource } from '@/features/creator/components/NearbyLocationSheet';
import { FilterModal } from '@/features/creator/components/FilterModal';
import type { EventTypeFilter, LocationFilter } from '@/features/creator/components/FilterModal';
import { displayCategory } from '@/features/creator/data/filterOptions';
import { useCategories, getCategoryMeta } from '@/hooks/useCategories';
import { usePlatforms, getPlatformMeta } from '@/hooks/usePlatforms';
import { EmptyState } from '@/components/EmptyState';
import { isValidNepaliPhone } from '@/utilities/phone';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { TabSlider } from '@/components/TabSlider';
import { RangeDropdown } from '@/components/RangeDropdown';
import { campaignService } from '@/services/campaign';
import { creatorService } from '@/services/creator';
import { getSocket } from '@/lib/socket';
import { storage } from '@/utilities/storage';
import { getCurrentLocation, geocodeAddress, type LatLng } from '@/utilities/geolocation';
import { ACCESS_TOKEN_KEY, F, RADIUS, SHADOW } from '@/utilities/constants';
import { TabColors } from '@/utilities/tabColors';
import type { Campaign } from '@/types';

const RADIUS_PRESETS = [5, 10, 25, 50, 100];

const SLIDER_MAX = 100000;

type SortOption = 'date-latest' | 'date-oldest' | 'price-low' | 'price-high';

export default function HomeScreen() {
  const { user } = useAuth();
  // Phone-only signups default `name` to the raw phone number until the user sets
  // a real one — never show that in the header (as text, or as the avatar's
  // first-letter fallback initial, which would render a bare "+").
  const displayName = user?.name && !isValidNepaliPhone(user.name) ? user.name : 'Creator';
  const { openDrawer } = useContext(DrawerContext);
  const { t, languageVersion } = useLanguage();
  const C = useAppColors();

  const { categories: adminCategories } = useCategories('CREATOR');
  const { platforms: adminPlatforms } = usePlatforms();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activePlatforms, setActivePlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [search, setSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeFilterTab, setActiveFilterTab] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-latest');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [referralBannerDismissed, setReferralBannerDismissed] = useState(false);
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
  const listRef         = useRef<FlatList<Campaign>>(null);
  const searchDebounce  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tempPriceMin, setTempPriceMin] = useState(0);
  const [tempPriceMax, setTempPriceMax] = useState(SLIDER_MAX);
  const [tempLocation, setTempLocation] = useState<LocationFilter>([]);
  const [tempDateFrom, setTempDateFrom] = useState<Date | null>(null);
  const [tempDateTo, setTempDateTo] = useState<Date | null>(null);

  const PAGE_SIZE = 10;
  const [featuredVisibleCount, setFeaturedVisibleCount] = useState(PAGE_SIZE);
  const [listVisibleCount, setListVisibleCount] = useState(PAGE_SIZE);

  // ── Nearby Events ──
  const [nearbyCampaigns, setNearbyCampaigns] = useState<Campaign[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(true);
  const [nearbySource, setNearbySource] = useState<NearbySource>('current');
  const [nearbyRadiusKm, setNearbyRadiusKm] = useState(25);
  const [nearbyHomeLabel, setNearbyHomeLabel] = useState<string | null>(null);
  const [nearbyHomeCoords, setNearbyHomeCoords] = useState<LatLng | null>(null);
  const [nearbyCurrentCoords, setNearbyCurrentCoords] = useState<LatLng | null>(null);
  const [nearbyCustomCoords, setNearbyCustomCoords] = useState<LatLng | null>(null);
  const [nearbyLocationDenied, setNearbyLocationDenied] = useState(false);
  const [nearbySheetOpen, setNearbySheetOpen] = useState(false);

  async function fetchCampaigns(
    overrides: {
      search?: string;
      category?: string[];
      platform?: string[];
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
    const cat   = overrides.category  !== undefined ? overrides.category  : activeCategories;
    const plat  = overrides.platform  !== undefined ? overrides.platform  : activePlatforms;
    const pMin  = overrides.priceMin  !== undefined ? overrides.priceMin  : priceMin;
    const pMax  = overrides.priceMax  !== undefined ? overrides.priceMax  : priceMax;
    const df    = overrides.dateFrom  !== undefined ? overrides.dateFrom  : dateFrom;
    const dt    = overrides.dateTo    !== undefined ? overrides.dateTo    : dateTo;
    const et    = overrides.eventType !== undefined ? overrides.eventType : eventType;

    try {
      const { campaigns: data } = await campaignService.list({
        search:       q || undefined,
        category:     cat,
        platform:     plat,
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

  async function fetchNearby(coords: LatLng, radiusKm: number, silent = false) {
    if (!silent) setNearbyLoading(true);
    try {
      const { campaigns: data } = await campaignService.nearby({ lat: coords.lat, lng: coords.lng, radiusKm, limit: 10 });
      setNearbyCampaigns(data);
    } catch {
      if (!silent) setNearbyCampaigns([]);
    } finally {
      if (!silent) setNearbyLoading(false);
    }
  }

  async function initNearby(profile: { nearbyRadiusKm: number; nearbyUseHomeLocation: boolean; location: string | null; locationLat: number | null; locationLng: number | null }) {
    const radius = profile.nearbyRadiusKm ?? 25;
    setNearbyRadiusKm(radius);
    setNearbyHomeLabel(profile.location?.split(',')[0]?.trim() ?? null);

    const [current, home] = await Promise.all([
      getCurrentLocation(),
      profile.locationLat != null && profile.locationLng != null
        ? Promise.resolve<LatLng>({ lat: profile.locationLat, lng: profile.locationLng })
        // Profiles that only ever saved location as free text (no Places picker used)
        // have no coordinates — geocode the text so "Home" is still selectable.
        : profile.location ? geocodeAddress(profile.location) : Promise.resolve(null),
    ]);
    setNearbyCurrentCoords(current);
    setNearbyHomeCoords(home);
    setNearbyLocationDenied(current === null);

    let preferredSource: NearbySource = profile.nearbyUseHomeLocation ? 'home' : 'current';
    // Fall back to home if current location was preferred but permission was denied
    if (preferredSource === 'current' && !current) preferredSource = home ? 'home' : 'current';
    setNearbySource(preferredSource);

    const coords = preferredSource === 'current' ? current : (home ?? current);
    if (coords) void fetchNearby(coords, radius);
    else setNearbyLoading(false);
  }

  function handleNearbyApply(source: NearbySource, radiusKm: number, coords: LatLng) {
    setNearbySource(source);
    setNearbyRadiusKm(radiusKm);
    creatorService.updateProfile({ nearbyRadiusKm: radiusKm, nearbyUseHomeLocation: source === 'home' }).catch(() => {});

    // Dragging the map to a custom point is remembered for this session so
    // reopening the sheet starts from where the creator left off — it never
    // overwrites the real GPS "current" coords, which always stay fresh.
    if (source === 'custom') setNearbyCustomCoords(coords);
    // The sheet re-requests a fresh GPS fix when "Current Location" is tapped —
    // propagate it here so later actions (radius expand, socket refresh) use it too.
    if (source === 'current') setNearbyCurrentCoords(coords);

    void fetchNearby(coords, radiusKm);
  }

  function resolveNearbyCoords(): LatLng | null {
    if (nearbySource === 'home')   return nearbyHomeCoords   ?? nearbyCurrentCoords;
    if (nearbySource === 'custom') return nearbyCustomCoords ?? nearbyCurrentCoords;
    return nearbyCurrentCoords;
  }

  function handleExpandNearbyRadius() {
    const next = RADIUS_PRESETS.find((r) => r > nearbyRadiusKm) ?? 100;
    setNearbyRadiusKm(next);
    const coords = resolveNearbyCoords();
    if (coords) void fetchNearby(coords, next);
  }

  useEffect(() => {
    void fetchCampaigns();
    creatorService.getProfile()
      .then((profile) => {
        const missing: string[] = [];
        if (!profile.avatarUrl)            missing.push(t('creator.home.fieldProfilePhoto'));
        if (!profile.bio)                  missing.push(t('creator.home.fieldBio'));
        if (!profile.location)             missing.push(t('creator.home.fieldLocation'));
        if (!profile.categories?.length)   missing.push(t('creator.home.fieldCategories'));
        const hasLink = profile.socialLinks &&
          Object.values(profile.socialLinks).some((v) => !!v);
        if (!hasLink) missing.push(t('creator.home.fieldSocialLinks'));
        setMissingFields(missing);
        void initNearby(profile);
      })
      .catch(() => { setNearbyLoading(false); });
  }, [languageVersion]);

  // Keep a stable ref to the latest fetch so the socket handler never captures stale state
  const fetchRef = useRef(fetchCampaigns);
  useEffect(() => { fetchRef.current = fetchCampaigns; });

  // Auto-refresh the moment connectivity is restored after being offline.
  const { reconnectedAt } = useNetworkStatus();
  useEffect(() => {
    if (reconnectedAt) void fetchRef.current({ showLoader: false });
  }, [reconnectedAt]);

  useScrollToTopOnTabPress('index', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

  const refreshNearbyRef = useRef(() => {});
  useEffect(() => {
    refreshNearbyRef.current = () => {
      const coords = resolveNearbyCoords();
      if (coords) void fetchNearby(coords, nearbyRadiusKm, true);
    };
  });

  // Subscribe to real-time campaign updates while this screen is focused
  useFocusEffect(useCallback(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => {
      void fetchRef.current({ showLoader: false });
      refreshNearbyRef.current();
    };
    socket.on('campaign:new', handler);
    return () => { socket.off('campaign:new', handler); };
  }, []));

  // Check for pending creator actions on every focus
  useFocusEffect(useCallback(() => {
    if (!storage.get(ACCESS_TOKEN_KEY)) return;
    campaignService.getMyApplications()
      .then(({ proposals: apps }) => {
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
  }, [activeCategories, priceMin, priceMax, dateFrom, dateTo]);

  const filterActiveCount = [
    eventType !== 'ALL',
    priceMin > 0 || priceMax < SLIDER_MAX,
    locationFilter.length > 0,
    !!dateFrom,
  ].filter(Boolean).length;
  const isFilterActive = filterActiveCount > 0;

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
    setActiveCategories([]);
    setActivePlatforms([]);
    setActiveFilterTab('all');
    void fetchCampaigns({ category: [], platform: [], priceMin: 0, priceMax: SLIDER_MAX, dateFrom: null, dateTo: null, eventType: 'ALL' });
  }

  const visibleCategories = adminCategories.map((cat) => ({
    label: cat.name,
    ...getCategoryMeta(adminCategories, cat.name),
  }));

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
  }).sort((a, b) => {
    switch (sortBy) {
      case 'date-oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'price-low':   return a.budgetRaw - b.budgetRaw;
      case 'price-high':  return b.budgetRaw - a.budgetRaw;
      case 'date-latest':
      default:            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const visibleFeatured = featured.slice(0, featuredVisibleCount);
  const visibleList     = filteredList.slice(0, listVisibleCount);

  useEffect(() => { setFeaturedVisibleCount(PAGE_SIZE); }, [campaigns]);
  useEffect(() => { setListVisibleCount(PAGE_SIZE); }, [campaigns, activeFilterTab, locationFilter, sortBy]);

  function handleFeaturedScroll(e: { nativeEvent: { contentOffset: { x: number }; contentSize: { width: number }; layoutMeasurement: { width: number } } }) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentOffset.x + layoutMeasurement.width >= contentSize.width - 80) {
      setFeaturedVisibleCount((n) => Math.min(n + PAGE_SIZE, featured.length));
    }
  }


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <FlatList
        ref={listRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onEndReached={() => setListVisibleCount((n) => Math.min(n + PAGE_SIZE, filteredList.length))}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
        data={loading ? [] : visibleList}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CampaignListItem campaign={item} />}
        ItemSeparatorComponent={() => <View style={styles.eventSeparator} />}
        ListEmptyComponent={
          !loading && filteredList.length === 0 ? (
            <EmptyState
              faIcon={campaigns.length === 0 ? 'calendar-times' : 'filter'}
              title={t('creator.home.noEventsFound')}
              subtitle={campaigns.length === 0
                ? t('creator.home.noActiveEvents')
                : t('creator.home.tryAdjustFilters')}
              action={campaigns.length > 0 ? { label: t('creator.home.clearFilters'), onPress: resetAllFilters } : undefined}
            />
          ) : null
        }
        ListFooterComponent={
          !loading && listVisibleCount < filteredList.length ? (
            <View style={styles.listLoadingMore}>
              <ActivityIndicator size="small" color={C.brinjal1} />
            </View>
          ) : null
        }
        ListHeaderComponent={
          <>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[styles.avatarCircle, { borderColor: C.brinjal1 + '30', borderWidth: 2.5 }, SHADOW.card]}
              onPress={() => router.push('/(creator)/profile')}>
              <View style={styles.avatarClip}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: C.primaryLight }]}>
                    <Text style={[styles.avatarInitial, { color: C.brinjal1 }]}>{displayName.trim()[0].toUpperCase()}</Text>
                  </View>
                )}
              </View>
            </Pressable>
            <View>
              <Text style={[styles.greeting, { color: C.textSecondary }]}>{t('creator.home.greeting')}</Text>
              <Text style={[styles.brandName, { color: C.text }]} numberOfLines={1}>{displayName}</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.menuBtn} onPress={openDrawer} hitSlop={6}>
              <View style={[styles.menuBtnInner, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }, SHADOW.card]}>
                <Ionicons name="menu" size={22} color={C.text} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* ── Search bar ── */}
        <View style={styles.searchRow}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.searchCard, { backgroundColor: C.surface, borderColor: C.border }, searchFocused && styles.searchCardFocused]}
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
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={[
                styles.filterBtn,
                { backgroundColor: isFilterActive ? C.brinjal1 : C.primaryLight },
                isFilterActive && { shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
              ]}
              onPress={openFilter}
              hitSlop={6}>
              <Ionicons name="options-outline" size={18} color={isFilterActive ? '#fff' : C.brinjal1} />
              {isFilterActive && (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountBadgeTxt}>{filterActiveCount}</Text>
                </View>
              )}
            </Pressable>
          </Pressable>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActionsRow}>
          {([
            { icon: 'document-text-outline', label: 'Proposals', bg: '#EDE9FE', color: '#7C3AED', route: '/(creator)/(tabs)/proposals' },
            { icon: 'storefront-outline',    label: 'Businesses', bg: '#DCFCE7', color: '#059669', route: '/(creator)/explore-businesses' },
            { icon: 'people-outline',        label: 'Creators',  bg: '#DBEAFE', color: '#2563EB', route: '/(creator)/explore-creators' },
            { icon: 'heart-outline',         label: 'Saved',     bg: '#FEE2E2', color: '#DC2626', route: '/(creator)/favorite-businesses' },
          ] as const).map(({ icon, label, bg, color, route }) => (
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              key={label}
              style={[styles.quickAction, { backgroundColor: C.surface, borderColor: C.border }]}
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
                <Ionicons name={icon} size={20} color={color} />
              </View>
              <Text style={[styles.quickActionLabel, { color: C.text }]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Profile completion banner ── */}
        {!bannerDismissed && missingFields.length > 0 && (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.banner, { backgroundColor: C.surface, borderLeftColor: C.brinjal1 }]}
            onPress={() => router.push('/(creator)/profile')}>
            <View
              style={[
                styles.bannerIconBox,
                {
                  backgroundColor: C.primaryLight, shadowColor: C.brinjal1,
                  shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                },
              ]}
            >
              <Ionicons name="person-outline" size={20} color={C.brinjal1} />
            </View>
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: C.text }]}>{t('creator.home.completeProfile')}</Text>
              <Text style={[styles.bannerSub, { color: C.error }]} numberOfLines={2}>
                {t('creator.home.missingFieldsPrefix', { fields: missingFields.join(' · ') })}
              </Text>
            </View>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.bannerClose} onPress={() => setBannerDismissed(true)} hitSlop={10}>
              <Ionicons name="close" size={16} color={C.textSecondary} />
            </Pressable>
          </Pressable>
        )}

        {/* ── Pending action attention banner ── */}
        {pendingActions.length > 0 && (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={styles.attentionBanner}
            onPress={() => router.push('/(creator)/(tabs)/proposals')}>
            <View
              style={[
                styles.attentionIconWrap,
                { shadowColor: '#D97706', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
              ]}
            >
              <Ionicons name="alert-circle" size={18} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.attentionTitle}>{t('creator.home.actionRequired')}</Text>
              <Text style={styles.attentionSub} numberOfLines={1}>
                {pendingActions.length === 1
                  ? pendingActions[0]!.type === 'start_work'
                    ? t('creator.home.actionStartWork', { title: pendingActions[0]!.title })
                    : pendingActions[0]!.type === 'upload_work'
                      ? t('creator.home.actionUploadWork', { title: pendingActions[0]!.title })
                      : t('creator.home.actionSubmitContent', { title: pendingActions[0]!.title })
                  : t('creator.home.actionMultiple', { n: pendingActions.length })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#D97706" />
          </Pressable>
        )}

        {/* ── Refer a friend banner ── */}
        {!referralBannerDismissed && (
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
            style={[styles.banner, { backgroundColor: C.surface, borderLeftColor: '#EC4899' }]}
            onPress={() => router.push('/(creator)/referral')}>
            <View
              style={[
                styles.bannerIconBox,
                {
                  backgroundColor: '#FCE7F3', shadowColor: '#EC4899',
                  shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
                },
              ]}
            >
              <Ionicons name="gift-outline" size={20} color="#EC4899" />
            </View>
            <View style={styles.bannerText}>
              <Text style={[styles.bannerTitle, { color: C.text }]}>{t('referral.homeBannerTitle')}</Text>
              <Text style={[styles.bannerSub, { color: C.textSecondary }]} numberOfLines={1}>
                {(() => {
                  const [prefix, suffix] = t('referral.homeBannerSub').split('{{amount}}');
                  return (
                    <>
                      {prefix}
                      <Text style={styles.bannerSubAmount}>{t('referral.homeBannerAmount')}</Text>
                      {suffix}
                    </>
                  );
                })()}
              </Text>
            </View>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.bannerClose} onPress={() => setReferralBannerDismissed(true)} hitSlop={10}>
              <Ionicons name="close" size={16} color={C.textSecondary} />
            </Pressable>
          </Pressable>
        )}

        {/* ── Error ── */}
        {fetchError ? (
          <View style={[styles.errorCard, { backgroundColor: '#FEE2E2' }]}>
            <Text style={styles.errorText}>{fetchError}</Text>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => fetchCampaigns()}>
              <Text style={[styles.retryText, { color: C.brinjal1 }]}>{t('creator.home.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── Categories ── */}
        <View style={[styles.sectionHeader, { marginTop: 6 }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('creator.home.categories')}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
          {visibleCategories.map((cat) => {
            const isActive = activeCategories.includes(cat.label);
            return (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                key={cat.label}
                style={[
                  styles.catPill,
                  {
                    backgroundColor: isActive ? C.brinjal1 : C.surface,
                    borderColor: isActive ? C.brinjal1 : C.border,
                  },
                ]}
                onPress={() => {
                  const next = activeCategories.includes(cat.label)
                    ? activeCategories.filter((c) => c !== cat.label)
                    : [...activeCategories, cat.label];
                  setActiveCategories(next);
                  void fetchCampaigns({ category: next });
                }}>
                <FontAwesome5 name={cat.icon} size={13} color={isActive ? '#fff' : cat.color} />
                <Text
                  style={[styles.catLabel, { color: isActive ? '#fff' : C.text }]}
                  numberOfLines={1}>
                  {displayCategory(cat.label)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Platform Filter ── */}
        {adminPlatforms.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('creator.home.platforms')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformsRow}>
              {adminPlatforms.map((p) => {
                const meta = getPlatformMeta(adminPlatforms, p.name);
                const isActive = activePlatforms.includes(p.name);
                return (
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    key={p.id}
                    style={[
                      styles.catPill,
                      {
                        backgroundColor: isActive ? C.brinjal1 : C.surface,
                        borderColor: isActive ? C.brinjal1 : C.border,
                      },
                    ]}
                    onPress={() => {
                      const next = activePlatforms.includes(p.name)
                        ? activePlatforms.filter((x) => x !== p.name)
                        : [...activePlatforms, p.name];
                      setActivePlatforms(next);
                      void fetchCampaigns({ platform: next });
                    }}>
                    <FontAwesome5 name={meta.icon} size={13} color={isActive ? '#fff' : meta.color} />
                    <Text style={[styles.catLabel, { color: isActive ? '#fff' : C.text }]} numberOfLines={1}>{p.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}

        {/* ── Featured / Loading ── */}
        {loading ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('creator.home.featuredEvents')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
              {[0, 1, 2].map((i) => <CampaignCardSkeleton key={i} />)}
            </ScrollView>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('creator.home.nearbyEvents')}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
              {[0, 1, 2].map((i) => <CampaignCardSkeleton key={i} />)}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('creator.home.featuredEvents')}</Text>
              {featured.length > 0 && (
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => router.push('/(creator)/featured-campaigns')}>
                  <Text style={[styles.seeAll, { color: C.brinjal1 }]}>{t('creator.home.seeAll')}</Text>
                </Pressable>
              )}
            </View>
            {featured.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredRow}
                onScroll={handleFeaturedScroll}
                scrollEventThrottle={16}>
                {visibleFeatured.map((c) => <CampaignCard key={c.id} campaign={c} variant="featured" />)}
                {featuredVisibleCount < featured.length && (
                  <View style={styles.featuredLoadingMore}>
                    <ActivityIndicator size="small" color={C.brinjal1} />
                  </View>
                )}
              </ScrollView>
            ) : (
              <View style={[styles.featuredEmpty, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Ionicons name="star-outline" size={32} color={C.textSecondary} />
                <Text style={[styles.featuredEmptyTitle, { color: C.text }]}>{t('creator.home.noFeaturedEvents')}</Text>
                <Text style={[styles.featuredEmptySub, { color: C.textSecondary }]}>{t('creator.home.noFeaturedEventsHint')}</Text>
              </View>
            )}

            {/* ── Nearby Events ── */}
            <View style={styles.sectionHeader}>
              <View style={styles.nearbyTitleRow}>
                <Text style={[styles.sectionTitle, { color: C.text }]}>{t('creator.home.nearbyEvents')}</Text>
                <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                  style={[styles.nearbyChip, { backgroundColor: C.primaryLight, borderColor: C.border }]}
                  onPress={() => setNearbySheetOpen(true)}>
                  <Ionicons
                    name={nearbySource === 'current' ? 'navigate' : nearbySource === 'home' ? 'home' : 'pin'}
                    size={11} color={C.brinjal1}
                  />
                  <Text style={[styles.nearbyChipText, { color: C.brinjal1 }]} numberOfLines={1}>
                    {nearbySource === 'current'
                      ? `Current Location · ${nearbyRadiusKm} km`
                      : nearbySource === 'home'
                        ? `Home${nearbyHomeLabel ? ` · ${nearbyHomeLabel}` : ''} · ${nearbyRadiusKm} km`
                        : `Custom Location · ${nearbyRadiusKm} km`}
                  </Text>
                  <Ionicons name="chevron-down" size={11} color={C.brinjal1} />
                </Pressable>
              </View>
            </View>

            {nearbyLoading ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
                {[0, 1, 2].map((i) => <CampaignCardSkeleton key={i} />)}
              </ScrollView>
            ) : nearbyCampaigns.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
                {nearbyCampaigns.map((c) => <CampaignCard key={c.id} campaign={c} variant="nearby" />)}
              </ScrollView>
            ) : nearbyLocationDenied && !nearbyHomeCoords ? (
              <View style={[styles.featuredEmpty, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Ionicons name="location-outline" size={32} color={C.textSecondary} />
                <Text style={[styles.featuredEmptyTitle, { color: C.text }]}>{t('creator.home.enableLocationTitle')}</Text>
                <Text style={[styles.featuredEmptySub, { color: C.textSecondary }]}>{t('creator.home.enableLocationSub')}</Text>
              </View>
            ) : (
              <View style={[styles.featuredEmpty, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Ionicons name="navigate-outline" size={32} color={C.textSecondary} />
                <Text style={[styles.featuredEmptyTitle, { color: C.text }]}>{t('creator.home.noEventsWithinKm', { km: nearbyRadiusKm })}</Text>
                {nearbyRadiusKm < 100 && (
                  <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
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

            {/* ── Tab filter ── */}
            <View style={[styles.filterTabsWrap, { backgroundColor: C.surface }]}>
              <TabSlider
                tabs={[
                  { key: 'all',          label: t('creator.home.tabAll'),         icon: 'layers-outline',   color: TabColors.neutral.color },
                  { key: 'recommended',  label: t('creator.home.tabRecommended'), icon: 'star-outline',     color: TabColors.info.color },
                  { key: 'trending',     label: t('creator.home.tabTrending'),    icon: 'flame-outline',    color: TabColors.danger.color },
                  { key: 'ending-soon',  label: t('creator.home.tabEndingSoon'),  icon: 'timer-outline',    color: TabColors.warning.color },
                ]}
                active={activeFilterTab}
                onChange={setActiveFilterTab}
              />
            </View>

            {/* ── Campaign list header with count + sort ── */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>
                {activeFilterTab === 'all' ? 'All Events' :
                 activeFilterTab === 'recommended' ? 'Recommended' :
                 activeFilterTab === 'trending' ? 'Trending' : 'Ending Soon'}
                {filteredList.length > 0 ? `  ·  ${filteredList.length}` : ''}
              </Text>
              <RangeDropdown
                value={sortBy}
                options={[
                  { value: 'date-latest', label: t('creator.home.sortDateLatest') },
                  { value: 'date-oldest', label: t('creator.home.sortDateOldest') },
                  { value: 'price-low',   label: t('creator.home.sortPriceLow') },
                  { value: 'price-high',  label: t('creator.home.sortPriceHigh') },
                ]}
                onChange={setSortBy}
              />
            </View>
          </>
        )}
          </>
        }
      />

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

      <NearbyLocationSheet
        visible={nearbySheetOpen}
        onClose={() => setNearbySheetOpen(false)}
        source={nearbySource}
        radiusKm={nearbyRadiusKm}
        homeLabel={nearbyHomeLabel}
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
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  // ── Header ──
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn:      { padding: 0 },
  menuBtnInner: { width: 38, height: 38, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  greeting:     { fontSize: 12, marginBottom: 2, fontFamily: F.medium },
  brandName:    { fontSize: 20, fontFamily: F.bold, maxWidth: 180, letterSpacing: -0.3 },
  avatarCircle: { width: 44, height: 44, borderRadius: RADIUS.full },
  avatarClip:   { width: '100%', height: '100%', borderRadius: RADIUS.full, overflow: 'hidden' },
  avatarImage:  { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  avatarInitial:  { fontSize: 18, fontFamily: F.extrabold },

  // ── Search ──
  searchRow: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  searchCard: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, paddingHorizontal: 14, height: 52, borderWidth: 1.5 },
  searchCardFocused: {
    borderColor: '#7C3AED', borderWidth: 2,
    shadowColor: '#7C3AED', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  searchIcon:      { marginRight: 8 },
  searchInput:     { flex: 1, fontSize: 14, fontFamily: F.regular },
  filterBtn:       { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  filterCountBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: RADIUS.full, paddingHorizontal: 3, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  filterCountBadgeTxt: { fontSize: 9, fontFamily: F.extrabold, color: '#fff' },

  // ── Quick Actions ──
  quickActionsRow:  { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, gap: 10 },
  quickAction:      { flex: 1, alignItems: 'center', borderRadius: RADIUS.lg, paddingVertical: 14, gap: 8, borderWidth: 1, ...SHADOW.card },
  quickActionIcon:  { width: 44, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: 11, fontFamily: F.medium, textAlign: 'center' },

  // ── Banner ──
  banner:        { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, marginHorizontal: 20, marginTop: 14, marginBottom: 2, padding: 14, gap: 12, ...SHADOW.card, borderLeftWidth: 4 },
  bannerIconBox: { width: 38, height: 38, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  bannerText:    { flex: 1, gap: 2 },
  bannerTitle:   { fontSize: 13, fontFamily: F.semibold },
  bannerSub:     { fontSize: 12, fontFamily: F.regular, lineHeight: 17, opacity: 0.75 },
  bannerSubAmount: { fontSize: 15, fontFamily: F.extrabold, color: '#059669', opacity: 1 },
  bannerClose:   { position: 'absolute', top: 8, right: 8, padding: 4 },

  // ── Error ──
  errorCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: RADIUS.sm, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText:  { color: '#DC2626', fontSize: 13, flex: 1, fontFamily: F.medium },
  retryText:  { fontSize: 13, marginLeft: 12, fontFamily: F.bold },

  // ── Section headers ──
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 20, marginBottom: 12 },
  sectionTitle:  { fontSize: 16, fontFamily: F.bold },
  seeAll:        { fontSize: 13, fontFamily: F.semibold, opacity: 0.7 },

  // ── Categories (pills) ──
  categoriesRow: { paddingHorizontal: 20, gap: 8, marginBottom: 0 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 38, borderRadius: RADIUS.full, paddingHorizontal: 12,
    borderWidth: 1,
    ...SHADOW.card,
  },
  catLabel: { fontSize: 12, fontFamily: F.semibold, lineHeight: 16 },

  // ── Platforms (pills) ──
  platformsRow: { paddingHorizontal: 20, gap: 8, marginBottom: 0 },

  // ── Loading ──
  loadingWrap: { paddingVertical: 60, alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 14, fontFamily: F.regular },

  // ── Featured ──
  featuredRow:       { paddingHorizontal: 20, gap: 8, marginTop: 16, marginBottom: 16 },
  featuredEmpty:     { marginHorizontal: 20, marginBottom: 0, borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 8 },
  featuredEmptyTitle:{ fontSize: 14, fontFamily: F.bold, textAlign: 'center' },
  featuredEmptySub:  { fontSize: 12, fontFamily: F.regular, textAlign: 'center', lineHeight: 18 },
  featuredLoadingMore: { width: 60, justifyContent: 'center', alignItems: 'center' },

  // ── Nearby ──
  nearbyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  nearbyChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5, flexShrink: 1 },
  nearbyChipText: { fontSize: 11, fontFamily: F.bold, flexShrink: 1 },
  expandRadiusBtn: { borderRadius: RADIUS.full, paddingHorizontal: 20, paddingVertical: 10, minHeight: 40, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  expandRadiusBtnText: { color: '#fff', fontSize: 13, fontFamily: F.bold },

  // ── Attention banner ──
  attentionBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, marginHorizontal: 20, marginTop: 12, padding: 14, gap: 12, backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  attentionIconWrap: { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  attentionTitle: { fontSize: 13, color: '#92400E', fontFamily: F.bold },
  attentionSub: { fontSize: 11, color: '#B45309', fontFamily: F.regular, marginTop: 1 },

  // ── Tab filter ──
  filterTabsWrap: { marginTop: 8, marginBottom: 4, ...SHADOW.card },

  // ── Campaign list ──
  eventSeparator: { height: 6 },
  listLoadingMore: { paddingVertical: 16, alignItems: 'center' },
});
