import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Keyboard, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { CampaignListItem } from '@/features/creator/components/CampaignListItem';
import { CampaignCard } from '@/features/creator/components/CampaignCard';
import { CampaignCardSkeleton } from '@/features/creator/components/CampaignCardSkeleton';
import { NearbyLocationSheet, type NearbySource } from '@/features/creator/components/NearbyLocationSheet';
import { FilterModal, DEFAULT_EVENT_TYPES } from '@/features/creator/components/FilterModal';
import type { EventTypeFilter, LocationFilter } from '@/features/creator/components/FilterModal';
import { useCategories, sortOtherLast, sortSelectedFirst } from '@/hooks/useCategories';
import { EmptyState } from '@/components/EmptyState';
import { SearchInput } from '@/components/SearchInput';
import { CategoryPillRow } from '@/components/CategoryPillRow';
import { ResultCountPill } from '@/components/ResultCountPill';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { useTabTransition } from '@/hooks/useTabTransition';
import { useStickyBelowHeader } from '@/hooks/useStickyBelowHeader';
import { TabSlider } from '@/components/TabSlider';
import { RangeDropdown } from '@/components/RangeDropdown';
import { campaignService } from '@/services/campaign';
import { creatorService } from '@/services/creator';
import { getSocket } from '@/lib/socket';
import { getCached, setCached } from '@/utilities/offlineCache';
import { getCurrentLocation, geocodeAddress, type LatLng } from '@/utilities/geolocation';
import { F, FONT_SIZE, RADIUS, SHADOW, SCREEN_GUTTER, SPACING, lineHeightFor } from '@/utilities/constants';
import { TabColors } from '@/utilities/tabColors';
import { trendingScores } from '@/features/creator/data/trending';
import type { Campaign } from '@/types';
import ExploreBusinessesScreen, { type BusinessesExploreHandle } from '@/app/(creator)/explore-businesses';
import ExploreCreatorPeersScreen, { type PeopleExploreHandle } from '@/app/(creator)/explore-creators';

const RADIUS_PRESETS = [5, 10, 25, 50, 100];

const SLIDER_MAX = 100000;

type SortOption = 'date-latest' | 'date-oldest' | 'price-low' | 'price-high';

// The tab filter + "count · sort" header are rendered as synthetic rows at
// the front of the FlatList's `data` (instead of inside ListHeaderComponent)
// so they scroll as part of the virtualized list rather than being forced
// to stay mounted with the rest of the (much heavier) header content above.
//
// NOT using `stickyHeaderIndices` to pin the tab filter to the top on scroll,
// even though that'd be the obvious way to do it: on this RN/Fabric version
// it reliably crashes on Android with "addViewAt: failed to insert view ...
// into parent ... index=N count=1" — sticky headers work by detaching that
// item's native view from the list's content and reattaching it into a
// separate overlay container outside normal React reconciliation, which was
// consistently reproducible (100% of cold launches) until removed. Confirmed
// via a live emulator + logcat trace pointing at
// SurfaceMountingManager.addViewAt. If revisiting pinned-tab-filter UX later,
// implement it by hand (an overlay View synced to this FlatList's onScroll)
// rather than re-enabling stickyHeaderIndices.
type ListRow =
  | { kind: 'tabFilter' }
  | { kind: 'countSort' }
  | { kind: 'empty' }
  | { kind: 'campaign'; campaign: Campaign }
  | { kind: 'campaignRow'; campaigns: Campaign[] };

// Tablet/iPad: two cards per row in the All/Recommended/etc. list, matching
// the grid used on the business events tab. Phones stay single-column.
const TABLET_BREAKPOINT = 768;

// Full-featured campaign browsing: search, category/platform filters, featured
// rail, nearby-events (GPS/home/custom location), sticky quick-filter tabs.
// Rendered as the "Opportunities" tab of the unified DiscoverScreen shell
// below — kept as its own component (not inlined) since it owns a lot of
// interdependent state that would be risky to untangle. The search bar and
// filter button live in the shell now (shared across every tab), so this
// component exposes `setSearchText`/`openFilter` via ref instead of owning
// its own visible search input.
export type CampaignsExploreHandle = { setSearchText: (text: string) => void; openFilter: () => void };

const CampaignsExplore = forwardRef<CampaignsExploreHandle, { onFilterCountChange?: (count: number) => void }>(function CampaignsExplore({ onFilterCountChange }, ref) {
  const { t, languageVersion } = useLanguage();
  const C = useAppColors();
  const { width: windowWidth } = useWindowDimensions();
  const numColumns = windowWidth >= TABLET_BREAKPOINT ? 2 : 1;

  const { categories: adminCategories } = useCategories('CREATOR');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activePlatforms, setActivePlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const [activeSearch, setActiveSearch] = useState('');
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  // The creator's own onboarding-selected niches — surfaced first in the
  // category pill row below, matching the business side's identical
  // treatment (see (business)/explore-creators.tsx's businessIndustries).
  const [myCategories, setMyCategories] = useState<string[]>([]);
  const [activeFilterTab, setActiveFilterTab] = useState('new');
  const [sortBy, setSortBy] = useState<SortOption>('date-latest');
  const [eventType, setEventType] = useState<EventTypeFilter[]>(DEFAULT_EVENT_TYPES);
  const [tempEventType, setTempEventType] = useState<EventTypeFilter[]>(DEFAULT_EVENT_TYPES);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(SLIDER_MAX);
  const [locationFilter, setLocationFilter] = useState<LocationFilter>([]);
  const [locationTypeFilter, setLocationTypeFilter] = useState<'ONSITE' | 'REMOTE'>('ONSITE');
  const [tempLocationTypeFilter, setTempLocationTypeFilter] = useState<'ONSITE' | 'REMOTE'>('ONSITE');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const listRef         = useRef<FlatList<ListRow>>(null);
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
  const [nearbyHomeAddress, setNearbyHomeAddress] = useState<string | null>(null);
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
      eventType?: EventTypeFilter[];
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
        // Both types selected == no filter (backend has no "either of these
        // two" query shape, just a single optional campaignType).
        campaignType: et.length === 1 ? et[0] : undefined,
        limit: 50,
      });
      setCampaigns(data);
      void setCached('creator_feed_campaigns', data);
    } catch (e) {
      // Offline or request failed — fall back to the last-known feed instead
      // of leaving the screen blank/erroring, so it stays usable offline.
      const cached = await getCached<Campaign[]>('creator_feed_campaigns');
      if (cached && cached.length > 0) {
        setCampaigns(cached);
      } else {
        setFetchError(e instanceof Error ? e.message : 'Failed to load events');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchNearby(
    coords: LatLng,
    radiusKm: number,
    opts: { silent?: boolean; search?: string; category?: string[]; platform?: string[] } = {},
  ) {
    const { silent = false, search, category, platform } = opts;
    if (!silent) setNearbyLoading(true);
    try {
      const { campaigns: data } = await campaignService.nearby({
        lat: coords.lat,
        lng: coords.lng,
        radiusKm,
        search:   search   !== undefined ? search   : activeSearch,
        category: category !== undefined ? category : activeCategories,
        platform: platform !== undefined ? platform : activePlatforms,
        limit: 10,
      });
      setNearbyCampaigns(data);
    } catch {
      if (!silent) setNearbyCampaigns([]);
    } finally {
      if (!silent) setNearbyLoading(false);
    }
  }

  // Re-fetches nearby with the same search/category/platform filters just
  // applied to the main list — mirrors resolveNearbyCoords() + nearbyRadiusKm
  // so "Nearby Events" never drifts out of sync with the active filters.
  function refreshNearbyWithFilters(overrides: { search?: string; category?: string[]; platform?: string[] } = {}) {
    const coords = resolveNearbyCoords();
    if (coords) void fetchNearby(coords, nearbyRadiusKm, overrides);
  }

  async function initNearby(
    profile: { nearbyRadiusKm: number; nearbyUseHomeLocation: boolean; location: string | null; locationLat: number | null; locationLng: number | null },
    opts: { silent?: boolean } = {},
  ) {
    const radius = profile.nearbyRadiusKm ?? 25;
    setNearbyRadiusKm(radius);
    setNearbyHomeLabel(
      profile.location
        ?.split(',')[0]
        ?.replace(/\s*\d{4,6}\s*$/, '')
        ?.trim() ?? null,
    );
    setNearbyHomeAddress(profile.location ?? null);

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
    // Silent: a non-silent fetch drops nearbyCampaigns back to the skeleton
    // row first, then swaps in results — two separate height changes on the
    // Nearby Events section, each one shoving the Recommended/Trending/
    // Ending Soon list below it (same ListHeaderComponent/FlatList flow) up
    // or down. The radius label above already updates immediately via
    // setNearbyRadiusKm, so the tap still gets instant feedback without the
    // extra skeleton flash and layout jump.
    if (coords) void fetchNearby(coords, next, { silent: true });
  }

  useEffect(() => {
    // Show the last-known feed immediately (e.g. cold launch while offline)
    // while the real fetch below runs and replaces it once it resolves.
    void getCached<Campaign[]>('creator_feed_campaigns').then((cached) => {
      if (cached && cached.length > 0) {
        setCampaigns(cached);
        setLoading(false);
      }
    });
    void fetchCampaigns();
    creatorService.getProfile()
      .then((profile) => { setMyCategories(profile.categories ?? []); void initNearby(profile); })
      .catch(() => { setNearbyLoading(false); });
  }, [languageVersion]);

  // Re-sync "Home location" whenever this tab regains focus (e.g. returning from
  // Edit Profile after changing location, or just popping back from campaign
  // detail). The mount effect above only runs once (or on language change), so
  // without this the Nearby Events sheet keeps showing whatever location was
  // fetched at first load. Silent because this fires on *every* re-focus
  // (including a plain back-navigation where nothing changed) — a non-silent
  // fetch would drop nearbyCampaigns back to the skeleton loader every time,
  // flickering the whole row for no reason.
  const skipNextNearbyFocusRef = useRef(true);
  useFocusEffect(useCallback(() => {
    if (skipNextNearbyFocusRef.current) { skipNextNearbyFocusRef.current = false; return; }
    creatorService.getProfile()
      .then((profile) => { setMyCategories(profile.categories ?? []); void initNearby(profile, { silent: true }); })
      .catch(() => {});
  }, []));

  // Keep a stable ref to the latest fetch so the socket handler never captures stale state
  const fetchRef = useRef(fetchCampaigns);
  useEffect(() => { fetchRef.current = fetchCampaigns; });

  // Auto-refresh the moment connectivity is restored after being offline.
  const { reconnectedAt } = useNetworkStatus();
  useEffect(() => {
    if (reconnectedAt) void fetchRef.current({ showLoader: false });
  }, [reconnectedAt]);

  useScrollToTopOnTabPress('discover', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
  const {
    stuck:             tabFilterStuck,
    setOffsetY:        tabFilterSetOffsetY,
    onRowLayout:       tabFilterOnRowLayout,
    onScroll:          tabFilterOnScroll,
    placeholderHeight: tabFilterPlaceholderHeight,
  } = useStickyBelowHeader();

  const refreshNearbyRef = useRef(() => {});
  useEffect(() => {
    refreshNearbyRef.current = () => {
      const coords = resolveNearbyCoords();
      if (coords) void fetchNearby(coords, nearbyRadiusKm, { silent: true });
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchCampaigns({ showLoader: false });
  }, [activeCategories, priceMin, priceMax, dateFrom, dateTo]);

  const filterActiveCount = [
    eventType.length === 1, // both selected == no real filter
    priceMin > 0 || priceMax < SLIDER_MAX,
    locationFilter.length > 0,
    !!dateFrom,
    locationTypeFilter === 'REMOTE', // ONSITE is the default (no real filter)
  ].filter(Boolean).length;

  // Reports the active-filter count up to the shell so the shared filter
  // button (search bar lives there now) can show the same badge this
  // component used to render on its own filter icon.
  // See explore-businesses.tsx's identical effect for why onFilterCountChange
  // is deliberately left out of the deps array (a fresh closure every parent
  // render would otherwise re-fire this on every render, looping forever).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onFilterCountChange?.(filterActiveCount); }, [filterActiveCount]);

  function openFilter() {
    setTempEventType(eventType);
    setTempPriceMin(priceMin);
    setTempPriceMax(priceMax);
    setTempLocation(locationFilter);
    setTempDateFrom(dateFrom);
    setTempDateTo(dateTo);
    setTempLocationTypeFilter(locationTypeFilter);
    setFilterOpen(true);
  }

  function applyFilter() {
    setEventType(tempEventType);
    setPriceMin(tempPriceMin);
    setPriceMax(tempPriceMax);
    setLocationFilter(tempLocation);
    setDateFrom(tempDateFrom);
    setDateTo(tempDateTo);
    setLocationTypeFilter(tempLocationTypeFilter);
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
    setTempEventType(DEFAULT_EVENT_TYPES);
    setTempPriceMin(0);
    setTempPriceMax(SLIDER_MAX);
    setTempLocation([]);
    setTempDateFrom(null);
    setTempDateTo(null);
    setTempLocationTypeFilter('ONSITE');
  }

  function resetAllFilters() {
    setEventType(DEFAULT_EVENT_TYPES);
    setPriceMin(0);
    setPriceMax(SLIDER_MAX);
    setLocationFilter([]);
    setDateFrom(null);
    setDateTo(null);
    setLocationTypeFilter('ONSITE');
    setActiveCategories([]);
    setActivePlatforms([]);
    setActiveFilterTab('new');
    void fetchCampaigns({ category: [], platform: [], priceMin: 0, priceMax: SLIDER_MAX, dateFrom: null, dateTo: null, eventType: DEFAULT_EVENT_TYPES });
    refreshNearbyWithFilters({ category: [], platform: [] });
  }

  // `useCategories('CREATOR')` widens to CREATOR + BOTH scope rows (see the
  // hook's own comment) — BOTH-scope rows are the shared industry/content
  // niches (Fashion, Food, Beauty, ...) and are the only ones relevant to
  // browsing opportunities; CREATOR-scope rows are provider *role* types
  // (used for onboarding/profile pickers) and don't apply here. BOTH-scope
  // rows are the ones with no `group` (see ApiCategory's own comment).
  // sortOtherLast keeps the catch-all "Other" chip pinned to the end of the
  // slider instead of sitting alphabetically mid-row — it's the fallback
  // bucket, so it reads last after every named niche. sortSelectedFirst runs
  // before it so the creator's own onboarding-selected niches lead the row
  // (matching the business side's identical treatment), while a selected
  // "Other" still ends up pinned last.
  const visibleCategories = sortOtherLast(sortSelectedFirst(adminCategories.filter((cat) => cat.group === null), myCategories));

  function toggleCategory(label: string) {
    const next = activeCategories.includes(label)
      ? activeCategories.filter((c) => c !== label)
      : [...activeCategories, label];
    setActiveCategories(next);
    void fetchCampaigns({ category: next });
    refreshNearbyWithFilters({ category: next });
  }

  function clearCategories() {
    setActiveCategories([]);
    void fetchCampaigns({ category: [] });
    refreshNearbyWithFilters({ category: [] });
  }

  const featured = campaigns.filter((c) => c.isFeatured && (c.locationType ?? 'ONSITE') === locationTypeFilter);

  // Remote events have no lat/lng, so they'd never turn up in a geo "nearby"
  // query anyway — filtering here just means Nearby correctly goes empty
  // instead of silently ignoring the Onsite/Remote choice when Remote is picked.
  const visibleNearbyCampaigns = nearbyCampaigns.filter((c) => (c.locationType ?? 'ONSITE') === locationTypeFilter);

  // Category, budget, deadline, and search are filtered server-side.
  // Trending is a ranking, not a flag — score the whole feed once here, then
  // the filter below keeps whatever qualified and the sort orders by it. See
  // features/creator/data/trending.ts for the algorithm. Scored once per feed
  // rather than per comparison, so the ordering also stays stable while the
  // list is scrolled (it refreshes with the feed, on focus or pull-to-refresh).

  const trending = trendingScores(campaigns);

  // Client-side: location and quick-tab filters only.
  const filteredList = campaigns.filter((c) => {
    const matchLocation =
      locationFilter.length === 0 ||
      locationFilter.some((l) =>
        l.label === 'Remote'
          ? c.locationType === 'REMOTE'
          : c.location?.toLowerCase().includes(l.label.toLowerCase()),
      );
    const matchLocationType = (c.locationType ?? 'ONSITE') === locationTypeFilter;

    let matchTab = true;
    if (activeFilterTab === 'new') {
      const daysSinceCreated = (Date.now() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      matchTab = daysSinceCreated <= 7;
    }
    // Anything the scorer rejected (closed, full, past deadline, or nobody
    // applying) isn't in the map at all.
    else if (activeFilterTab === 'trending') matchTab = trending.has(c.id);
    // "Free" == the open/free events (no payout, open sign-up) as opposed to
    // paid campaigns — same PAID_CAMPAIGN/OPEN_EVENT split the filter sheet uses.
    else if (activeFilterTab === 'free') matchTab = c.campaignType === 'OPEN_EVENT';
    else if (activeFilterTab === 'ending-soon') {
      const deadline = c.deadline ? new Date(c.deadline) : null;
      if (deadline && !isNaN(deadline.getTime())) {
        const daysLeft = (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        matchTab = daysLeft >= 0 && daysLeft <= 7;
      } else {
        matchTab = false;
      }
    }

    return matchLocation && matchLocationType && matchTab;
  }).sort((a, b) => {
    // "New" always leads with the most recently posted events regardless of
    // the Sort dropdown — that's the whole point of the tab.
    if (activeFilterTab === 'new') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    // Same reasoning for Trending: the ranking IS the tab, so it overrides the
    // Sort dropdown rather than being re-sorted by date underneath it.
    if (activeFilterTab === 'trending') return (trending.get(b.id) ?? 0) - (trending.get(a.id) ?? 0);
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

  // Tablet/iPad: pair campaigns up into two-per-row grid rows. Phones keep
  // one campaign per row (numColumns === 1) exactly as before.
  const campaignRows: ListRow[] = numColumns === 2
    ? visibleList.reduce<ListRow[]>((rows, c, i) => {
        if (i % 2 === 0) rows.push({ kind: 'campaignRow', campaigns: [c] });
        else (rows[rows.length - 1] as { kind: 'campaignRow'; campaigns: Campaign[] }).campaigns.push(c);
        return rows;
      }, [])
    : visibleList.map((c): ListRow => ({ kind: 'campaign', campaign: c }));

  const listRows: ListRow[] = loading ? [] : [
    { kind: 'tabFilter' },
    { kind: 'countSort' },
    ...(filteredList.length === 0
      ? [{ kind: 'empty' } as const]
      : campaignRows),
  ];

  useEffect(() => { setFeaturedVisibleCount(PAGE_SIZE); }, [campaigns]);
  useEffect(() => { setListVisibleCount(PAGE_SIZE); }, [campaigns, activeFilterTab, locationFilter, locationTypeFilter, sortBy]);
  useEffect(() => { setFeaturedVisibleCount(PAGE_SIZE); }, [campaigns, locationTypeFilter]);

  function handleFeaturedScroll(e: { nativeEvent: { contentOffset: { x: number }; contentSize: { width: number }; layoutMeasurement: { width: number } } }) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentOffset.x + layoutMeasurement.width >= contentSize.width - 80) {
      setFeaturedVisibleCount((n) => Math.min(n + PAGE_SIZE, featured.length));
    }
  }


  // Dismisses the keyboard once the list starts scrolling.
  function handleOutsideDismiss() {
    Keyboard.dismiss();
  }

  const FILTER_TABS = [
    { key: 'new',          label: t('creator.home.tabNew'),         icon: 'bolt'     as const, color: TabColors.info.color },
    { key: 'trending',     label: t('creator.home.tabTrending'),    icon: 'fire'    as const, color: TabColors.danger.color },
    { key: 'free',         label: t('creator.home.tabFree'),        icon: 'gift'    as const, color: TabColors.brand.color },
    { key: 'ending-soon',  label: t('creator.home.tabEndingSoon'),  icon: 'stopwatch'    as const, color: TabColors.warning.color },
  ];

  // Driven by the shared search bar in the DiscoverScreen shell — mirrors what
  // used to be this component's own SearchInput onChangeText handler.
  function setSearchText(text: string) {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (text.length >= 3) {
      searchDebounce.current = setTimeout(() => {
        setActiveSearch(text);
        void fetchCampaigns({ search: text });
        refreshNearbyWithFilters({ search: text });
      }, 400);
    } else if (!text && activeSearch) {
      setActiveSearch('');
      void fetchCampaigns({ search: '' });
      refreshNearbyWithFilters({ search: '' });
    }
  }

  useImperativeHandle(ref, () => ({ setSearchText, openFilter }));

  return (
    <View style={{ flex: 1 }}>

      {/* ── Categories ── fixed above the list (not inside ListHeaderComponent),
          so it stays pinned below the Opportunities/Businesses/People tab strip
          instead of scrolling away. Same shared CategoryPillRow component (not
          just a similar-looking copy) as the Businesses and People tabs, so
          spacing and pill styling are byte-identical across all three. */}
      <CategoryPillRow
        categories={visibleCategories}
        activeLabels={activeCategories}
        onToggle={toggleCategory}
        showAll
        onAllPress={clearCategories}
      />

      {/* Sticky tab filter — hand-rolled (see useStickyBelowHeader), not
          stickyHeaderIndices: that reliably crashes Android on this app's
          RN/Fabric setup (see the ListRow comment above). This wrapper is the
          positioning context the overlay below is anchored to (`top: 0` here
          lands right below the header divider above). */}
      <View style={{ flex: 1 }}>
      <FlatList
        ref={listRef}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={handleOutsideDismiss}
        onScroll={tabFilterOnScroll}
        scrollEventThrottle={16}
        onEndReached={() => setListVisibleCount((n) => Math.min(n + PAGE_SIZE, filteredList.length))}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        data={listRows}
        keyExtractor={(row, i) => (
          row.kind === 'campaign' ? row.campaign.id :
          row.kind === 'campaignRow' ? row.campaigns.map((c) => c.id).join('-') :
          `${row.kind}-${i}`
        )}
        renderItem={({ item: row }) => {
          switch (row.kind) {
            case 'tabFilter':
              return tabFilterStuck ? (
                <View style={{ height: tabFilterPlaceholderHeight }} onLayout={tabFilterOnRowLayout} />
              ) : (
                <View style={[styles.filterTabsWrap, { backgroundColor: C.background }]} onLayout={tabFilterOnRowLayout}>
                  <TabSlider
                    tabs={FILTER_TABS}
                    active={activeFilterTab}
                    onChange={setActiveFilterTab}
                  />
                </View>
              );
            case 'countSort':
              return (
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: C.text }]}>
                    {FILTER_TABS.find((tab) => tab.key === activeFilterTab)?.label ?? ''}
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
              );
            case 'empty':
              return (
                <EmptyState
                  faIcon={campaigns.length === 0 ? 'calendar-times' : 'filter'}
                  title={t('creator.home.noEventsFound')}
                  subtitle={campaigns.length === 0
                    ? t('creator.home.noActiveEvents')
                    : t('creator.home.tryAdjustFilters')}
                  action={campaigns.length > 0 ? { label: t('creator.home.clearFilters'), onPress: resetAllFilters } : undefined}
                />
              );
            case 'campaign':
              return (
                <View style={styles.campaignItemWrap}>
                  <CampaignListItem campaign={row.campaign} />
                </View>
              );
            case 'campaignRow':
              return (
                <View style={styles.campaignRowWrap}>
                  {row.campaigns.map((c) => (
                    <View key={c.id} style={styles.campaignRowItem}>
                      <CampaignListItem campaign={c} />
                    </View>
                  ))}
                </View>
              );
          }
        }}
        ListFooterComponent={
          // Same closing pill the Businesses and People tabs end on (see
          // ResultCountPill) — only once the whole filtered list is on screen,
          // so the number can't contradict the rows still paging in above it.
          !loading && listVisibleCount < filteredList.length ? (
            <View style={styles.listLoadingMore}>
              <ActivityIndicator size="small" color={C.brinjal1} />
            </View>
          ) : !loading && filteredList.length > 0 ? (
            <ResultCountPill
              label={filteredList.length !== 1
                ? t('explore.worksFoundPlural', { count: filteredList.length })
                : t('explore.worksFound', { count: filteredList.length })}
            />
          ) : null
        }
        ListHeaderComponent={
          // A real View (not a Fragment) so onLayout can report its rendered
          // height — since `tabFilter` is the very first row in `data`, that
          // height is exactly its content-offset within the full scrollable
          // content (see useStickyBelowHeader's usage note on measuring a
          // FlatList row's position via what precedes it, not the row itself).
          <View onLayout={(e) => tabFilterSetOffsetY(e.nativeEvent.layout.height)}>
        {/* ── Error ── */}
        {fetchError ? (
          <View style={[styles.errorCard, { backgroundColor: '#FEE2E2' }]}>
            <Text style={styles.errorText}>{fetchError}</Text>
            <Pressable onPress={() => fetchCampaigns()}>
              <Text style={[styles.retryText, { color: C.brinjal1 }]}>{t('creator.home.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ── Featured / Loading ── */}
        {loading ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('creator.home.featuredEvents')}</Text>
            </View>
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
              {[0, 1, 2].map((i) => <CampaignCardSkeleton key={i} />)}
            </ScrollView>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('creator.home.nearbyEvents')}</Text>
            </View>
            <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
              {[0, 1, 2].map((i) => <CampaignCardSkeleton key={i} />)}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t('creator.home.featuredEvents')}</Text>
            </View>
            {featured.length > 0 ? (
              <ScrollView
                horizontal
                nestedScrollEnabled
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
                <FontAwesome5 name="star" size={32} color={C.textSecondary} />
                <Text style={[styles.featuredEmptyTitle, { color: C.text }]}>{t('creator.home.noFeaturedEvents')}</Text>
                <Text style={[styles.featuredEmptySub, { color: C.textSecondary }]}>{t('creator.home.noFeaturedEventsHint')}</Text>
              </View>
            )}

            {/* ── Nearby Events ── */}
            <View style={styles.sectionHeader}>
              <View style={styles.nearbyTitleRow}>
                <Text style={[styles.sectionTitle, { color: C.text }]}>{t('creator.home.nearbyEvents')}</Text>
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
              <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
                {[0, 1, 2].map((i) => <CampaignCardSkeleton key={i} />)}
              </ScrollView>
            ) : visibleNearbyCampaigns.length > 0 ? (
              <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
                {visibleNearbyCampaigns.map((c) => <CampaignCard key={c.id} campaign={c} variant="nearby" />)}
              </ScrollView>
            ) : nearbyLocationDenied && !nearbyHomeCoords ? (
              <View style={[styles.featuredEmpty, { backgroundColor: C.surface, borderColor: C.border }]}>
                <FontAwesome5 name="map-marker-alt" solid size={32} color={C.textSecondary} />
                <Text style={[styles.featuredEmptyTitle, { color: C.text }]}>{t('creator.home.enableLocationTitle')}</Text>
                <Text style={[styles.featuredEmptySub, { color: C.textSecondary }]}>{t('creator.home.enableLocationSub')}</Text>
              </View>
            ) : (
              <View style={[styles.featuredEmpty, { backgroundColor: C.surface, borderColor: C.border }]}>
                <FontAwesome5 name="location-arrow" solid size={32} color={C.textSecondary} />
                <Text style={[styles.featuredEmptyTitle, { color: C.text }]}>{t('creator.home.noEventsWithinKm', { km: nearbyRadiusKm })}</Text>
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
          </>
        )}
          </View>
        }
      />
      {tabFilterStuck && (
        // marginTop: 0 overrides filterTabsWrap's usual 8px top margin — that
        // margin creates the right breathing room when sitting in-flow below
        // the "Recent Events"-style content above it, but here (pinned via
        // `top: 0`) it would just push this away from the header divider,
        // leaving a gap. (filterTabsWrap's own paddingTop still applies —
        // see its comment for why that one's padding, not margin.)
        <View style={[styles.filterTabsWrap, styles.stickyOverlay, { backgroundColor: C.background, marginTop: 0 }]}>
          <TabSlider
            tabs={FILTER_TABS}
            active={activeFilterTab}
            onChange={setActiveFilterTab}
          />
        </View>
      )}
      </View>

      <FilterModal
        visible={filterOpen}
        tempEventType={tempEventType}
        tempPriceMin={tempPriceMin}
        tempPriceMax={tempPriceMax}
        tempLocation={tempLocation}
        tempDateFrom={tempDateFrom}
        tempDateTo={tempDateTo}
        tempLocationType={tempLocationTypeFilter}
        setTempEventType={setTempEventType}
        setTempPriceMin={setTempPriceMin}
        setTempPriceMax={setTempPriceMax}
        setTempLocation={setTempLocation}
        setTempDateFrom={setTempDateFrom}
        setTempDateTo={setTempDateTo}
        setTempLocationType={setTempLocationTypeFilter}
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
        homeAddress={nearbyHomeAddress}
        currentCoords={nearbyCurrentCoords}
        homeCoords={nearbyHomeCoords}
        customCoords={nearbyCustomCoords}
        onApply={handleNearbyApply}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxxl },

  // ── Error ──
  errorCard: { marginHorizontal: SCREEN_GUTTER, marginTop: 16, marginBottom: 0, borderRadius: RADIUS.sm, padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText:  { color: '#DC2626', fontSize: 13, flex: 1, fontFamily: F.medium },
  retryText:  { fontSize: 13, marginLeft: 12, fontFamily: F.bold },

  // ── Section headers ──
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, marginTop: SPACING.xl, marginBottom: SPACING.md },
  sectionTitle:  { fontSize: FONT_SIZE.lg, fontFamily: F.bold },

  // ── Platform pills (Categories now uses the shared CategoryPillRow) ──
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 38, borderRadius: RADIUS.full, paddingHorizontal: 12,
    borderWidth: 1,
    ...SHADOW.card,
  },
  // fontSize matches CategoryPillRow's own pill label exactly (13/FONT_SIZE.sm)
  // — this Platforms row sits directly below that Categories row, so the two
  // pill styles need to read as one system, not two slightly different ones.
  catLabel: { fontSize: FONT_SIZE.sm, fontFamily: F.semibold, lineHeight: 20 },

  // ── Featured ──
  featuredRow:       { paddingHorizontal: SCREEN_GUTTER, gap: 8, marginTop: 16, marginBottom: 16 },
  featuredEmpty:     { marginHorizontal: SCREEN_GUTTER, marginBottom: 16, borderRadius: RADIUS.md, borderWidth: 1.5, borderStyle: 'dashed', padding: 24, alignItems: 'center', gap: 8 },
  featuredEmptyTitle:{ fontSize: FONT_SIZE.md, fontFamily: F.bold, textAlign: 'center' },
  featuredEmptySub:  { fontSize: FONT_SIZE.sm, fontFamily: F.regular, textAlign: 'center', lineHeight: 20 },
  featuredLoadingMore: { width: 60, justifyContent: 'center', alignItems: 'center' },

  // ── Nearby ──
  nearbyTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, flex: 1 },
  nearbyChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: SPACING.sm, paddingVertical: 5, flexShrink: 1 },
  nearbyChipText: { fontSize: FONT_SIZE.xs, fontFamily: F.bold, flexShrink: 1 },
  expandRadiusBtn: { borderRadius: RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, minHeight: 40, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  expandRadiusBtnText: { color: '#fff', fontSize: FONT_SIZE.sm, fontFamily: F.bold },

  // ── Tab filter ──
  // No background/shadow here — matches the proposals page's tab bar, which
  // lets TabSlider (already self-contained: page-background wrapper, shadow
  // only on the animated active pill) sit directly on the page. paddingHorizontal
  // 20 matches the search bar/CategoryPillRow/sectionHeader/featuredRow above —
  // TabSlider has no horizontal inset of its own, so without this its "All" tab
  // sat flush against the screen edge instead of lining up with everything else.
  // paddingTop (not marginTop) so the space is inside this View's own
  // backgroundColor — margin is transparent, which would let the card
  // scrolled up underneath the sticky overlay show through the gap.
  // Applied here (not just on the stuck overlay) so the in-flow row picks
  // up the same height: the sticky placeholder reserves whatever height
  // this row measured while in-flow, so if only the stuck variant were
  // taller, it'd overlap the row below by the difference every time it locks.
  filterTabsWrap: { marginTop: 0, marginBottom: 4, paddingTop: 6, paddingHorizontal: SCREEN_GUTTER },
  stickyOverlay: { position: 'absolute', top: 0, left: 0, right: 0, ...SHADOW.card },

  // ── Campaign list ──
  // Matches featuredRow's horizontal padding above — without this, cards here
  // ran full-bleed edge-to-edge while every other section on this screen
  // (including Featured Events) keeps a 20px margin from the screen edges.
  // marginBottom (not a separator) so every card — including the last one
  // before the footer/end of list — gets the same breathing room below it.
  campaignItemWrap: { paddingHorizontal: SCREEN_GUTTER, marginBottom: 14 },
  // Tablet/iPad two-per-row grid — mirrors the events tab's cardWrapHalf.
  campaignRowWrap: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, marginBottom: 14 },
  campaignRowItem: { width: '48%' },
  listLoadingMore: { paddingVertical: 16, alignItems: 'center' },
});

// ─── Unified Discover shell — segmented Opportunities / Businesses / People
// tabs (Opportunities first, selected by default). Each tab keeps its own
// self-contained screen/logic (search, filters, pagination, ...); this shell
// only owns which one is showing. Tabs are mounted lazily on first visit,
// then kept alive (display:none) so switching back preserves scroll position
// and filters instead of refetching. ────────────────────────────────────────
type MainTab = 'campaigns' | 'businesses' | 'people';

// Left-to-right tab order — drives the slide direction when switching panels.
const MAIN_TAB_ORDER: readonly MainTab[] = ['campaigns', 'businesses', 'people'];

export default function DiscoverScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [mainTab, setMainTab] = useState<MainTab>('campaigns');
  const [visited, setVisited] = useState<Record<MainTab, boolean>>({ campaigns: true, businesses: false, people: false });

  // One shared search bar + filter button for every tab (instead of each tab
  // owning its own) — typing/filtering is forwarded to whichever tab is
  // active via its exposed ref, and each tab reports its own active-filter
  // count back up so the shared filter button's badge stays accurate.
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const [filterCounts, setFilterCounts] = useState<Partial<Record<MainTab, number>>>({});
  const businessesRef = useRef<BusinessesExploreHandle>(null);
  const peopleRef     = useRef<PeopleExploreHandle>(null);
  const campaignsRef  = useRef<CampaignsExploreHandle>(null);

  function selectTab(tab: MainTab) {
    setVisited((v) => (v[tab] ? v : { ...v, [tab]: true }));
    setMainTab(tab);
  }

  // Home's quick-action tiles ("Find Businesses" / "Find People") deep-link
  // here with ?tab=businesses|people instead of pushing the old standalone
  // explore screens — same ?tab= pattern as proposals.tsx's "My Campaigns"
  // quick action.
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  useEffect(() => {
    if (tabParam === 'businesses' || tabParam === 'people' || tabParam === 'campaigns') {
      selectTab(tabParam);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  // Whenever the active tab changes, push whatever's currently in the shared
  // search box into it — covers both "typed something, then switched tabs"
  // and a tab mounting for the first time while a search was already active.
  // Deliberately keyed only on `mainTab`, not `searchText` — per-keystroke
  // forwarding is handleSearchChange's job, not this effect's.
  useEffect(() => {
    if (mainTab === 'businesses') businessesRef.current?.setSearchText(searchText);
    else if (mainTab === 'people') peopleRef.current?.setSearchText(searchText);
    else if (mainTab === 'campaigns') campaignsRef.current?.setSearchText(searchText);
  }, [mainTab]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchChange(text: string) {
    setSearchText(text);
    if (mainTab === 'businesses') businessesRef.current?.setSearchText(text);
    else if (mainTab === 'people') peopleRef.current?.setSearchText(text);
    else if (mainTab === 'campaigns') campaignsRef.current?.setSearchText(text);
  }

  function handleFilterPress() {
    if (mainTab === 'businesses') businessesRef.current?.openFilter();
    else if (mainTab === 'people') peopleRef.current?.openFilter();
    else if (mainTab === 'campaigns') campaignsRef.current?.openFilter();
  }

  const activeFilterCount = filterCounts[mainTab] ?? 0;
  const isFilterActive = activeFilterCount > 0;

  // Cross-fade + slide the panel stack on tab change so the switch glides
  // instead of popping. Only the visible panel actually shows the motion —
  // the other two are display:none behind it.
  const panelStyle = useTabTransition(mainTab, MAIN_TAB_ORDER);

  const MAIN_TABS = [
    { key: 'campaigns',   label: t('creator.discover.tabCampaigns'),   color: C.brinjal1 },
    { key: 'businesses',  label: t('creator.discover.tabBusinesses'),  color: C.brinjal1 },
    { key: 'people',      label: t('creator.discover.tabPeople'),      color: C.brinjal1 },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }} edges={['top']}>
      {/* Single MaxWidthContainer for the whole screen (header + content as
          siblings inside it) — giving the header row its own separate
          MaxWidthContainer previously made it a flex:1 sibling of the content
          area below, and two flex:1 siblings split the available height
          between them, leaving the short header block stretched tall with a
          big blank gap under it. */}
      <MaxWidthContainer>
        <View style={shellStyles.titleRow}>
          <Text style={[shellStyles.title, { color: C.text }]} numberOfLines={2}>
            {mainTab === 'businesses' ? t('creator.discover.titleBusinesses') :
             mainTab === 'people'     ? t('creator.discover.titlePeople') :
             t('creator.discover.title')}
          </Text>
          {mainTab === 'businesses' && (
            <Pressable
              style={[shellStyles.savedBtn, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}
              onPress={() => router.push('/(creator)/favorite-businesses' as Parameters<typeof router.push>[0])}>
              <FontAwesome5 name="heart" solid size={14} color={C.brinjal1} />
              <Text style={[shellStyles.savedBtnText, { color: C.brinjal1 }]}>{t('explore.businesses.savedLink')}</Text>
            </Pressable>
          )}
          {/* Same shortcut for events — where the bookmark icon on each card saves to. */}
          {mainTab === 'campaigns' && (
            <Pressable
              style={[shellStyles.savedBtn, { backgroundColor: C.surface, borderColor: C.border, borderWidth: 1 }]}
              onPress={() => router.push('/(creator)/shortlisted-events' as Parameters<typeof router.push>[0])}>
              <FontAwesome5 name="bookmark" solid size={14} color={C.brinjal1} />
              <Text style={[shellStyles.savedBtnText, { color: C.brinjal1 }]}>{t('shortlistedEvents.savedLink')}</Text>
            </Pressable>
          )}
        </View>

        <View style={shellStyles.searchRow}>
          <View style={[
            shellStyles.searchCard,
            { backgroundColor: C.primaryLight },
            // Only the border reacts to focus — toggling `elevation`/shadow
            // here (as this used to) forces Android to recomposite the view
            // the instant the TextInput gains focus, which steals native
            // focus right back (cursor flashes, then the input goes dead).
            searchFocused && { borderColor: C.brinjal1 },
          ]}>
            <SearchInput
              ref={searchInputRef}
              placeholder={
                mainTab === 'businesses' ? t('explore.businesses.searchPlaceholder') :
                mainTab === 'people'     ? t('explore.searchCreators') :
                t('creator.browse.searchPlaceholder')
              }
              value={searchText}
              onChangeText={handleSearchChange}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
              onSubmitEditing={() => searchInputRef.current?.blur()}
            />
          </View>
          <Pressable
            style={[
              shellStyles.filterBtn,
              { backgroundColor: isFilterActive ? C.brinjal1 : C.primaryLight },
              isFilterActive && { shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
            ]}
            onPress={handleFilterPress}
            hitSlop={6}>
            <FontAwesome5 name="sliders-h" solid size={18} color={isFilterActive ? '#fff' : C.brinjal1} />
            {isFilterActive && (
              <View style={shellStyles.filterCountBadge}>
                <Text style={shellStyles.filterCountBadgeTxt}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Tab strip gets the row to itself — the Saved shortcut now lives up
            in the title row. */}
        <View style={shellStyles.tabsWrap}>
          <TabSlider tabs={MAIN_TABS} active={mainTab} onChange={(key) => selectTab(key as MainTab)} />
        </View>

        <Animated.View style={[{ flex: 1 }, panelStyle]}>
          {visited.businesses && (
            <View style={[{ flex: 1 }, mainTab !== 'businesses' && shellStyles.hidden]}>
              <ExploreBusinessesScreen
                ref={businessesRef}
                embedded
                onFilterCountChange={(n) => setFilterCounts((f) => (f.businesses === n ? f : { ...f, businesses: n }))}
              />
            </View>
          )}
          {visited.people && (
            <View style={[{ flex: 1 }, mainTab !== 'people' && shellStyles.hidden]}>
              <ExploreCreatorPeersScreen
                ref={peopleRef}
                embedded
                onFilterCountChange={(n) => setFilterCounts((f) => (f.people === n ? f : { ...f, people: n }))}
              />
            </View>
          )}
          {visited.campaigns && (
            <View style={[{ flex: 1 }, mainTab !== 'campaigns' && shellStyles.hidden]}>
              <CampaignsExplore
                ref={campaignsRef}
                onFilterCountChange={(n) => setFilterCounts((f) => (f.campaigns === n ? f : { ...f, campaigns: n }))}
              />
            </View>
          )}
        </Animated.View>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const shellStyles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SCREEN_GUTTER, paddingTop: 12, paddingBottom: 4 },
  // flexShrink so the longer per-tab titles wrap instead of pushing the
  // Businesses tab's "Saved" button off the row; lineHeight keeps Nepali
  // matras from clipping on the wrapped second line.
  // Matches the creator home greeting's treatment exactly (see that screen's
  // styles.greeting) so the two pinned headers read as the same level.
  title:    { flexShrink: 1, fontSize: FONT_SIZE.xl, fontFamily: F.bold, lineHeight: lineHeightFor(FONT_SIZE.xl) },
  savedBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 6 },
  savedBtnText: { fontSize: FONT_SIZE.xs, fontFamily: F.bold },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SCREEN_GUTTER, paddingTop: 10, paddingBottom: 4 },
  // Focus ring color is applied inline (C.brinjal1) rather than hardcoded
  // here, so it correctly tracks both role (creator purple / business green)
  // and dark mode instead of a fixed hex that only ever matched one of them.
  searchCard: { flex: 1, borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: 'transparent' },
  filterBtn: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  filterCountBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: RADIUS.full, paddingHorizontal: 3, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  filterCountBadgeTxt: { fontSize: 9, fontFamily: F.extrabold, color: '#fff' },
  // paddingHorizontal 20 matches searchRow above — TabSlider has no inset of
  // its own, so without this "Opportunities" sat flush against the screen
  // edge instead of lining up with the search bar/category pills below it.
  tabsWrap: { paddingBottom: 8, paddingHorizontal: SCREEN_GUTTER },
  hidden:   { display: 'none' },
});
