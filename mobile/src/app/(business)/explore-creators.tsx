import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { BackButton } from '@/components/BackButton';
import { EmptyState } from '@/components/EmptyState';
import { EntityCard } from '@/components/EntityCard';
import { ExploreCardSkeleton } from '@/components/ExploreCardSkeleton';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchInput } from '@/components/SearchInput';
import {
  CreatorFilterModal,
  DEFAULT_CREATOR_FILTER,
  creatorFilterActiveCount,
  isCreatorFilterActive,
  formatCreatorRate,
  CREATOR_SLIDER_MIN,
  CREATOR_SLIDER_MAX,
  type CreatorFilterState,
} from '@/components/CreatorFilterModal';
import { RangeDropdown } from '@/components/RangeDropdown';
import { ResultCountPill } from '@/components/ResultCountPill';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { creatorService, type ApiCreatorListItem, type SavedCreatorItem } from '@/services/creator';
import { serviceService, type ApiService } from '@/services/service';
import { F, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { getIconColor } from '@/features/creator/data/filterOptions';
import { useAllCategories, useCategories, getCategoryMeta, sortOtherLast, sortSelectedFirst } from '@/hooks/useCategories';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';
import { STALE } from '@/lib/queryClient';
import { prefetchCreatorPublic } from '@/lib/prefetch';
import { usePlatforms, getPlatformMeta } from '@/hooks/usePlatforms';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ApiCategory } from '@/services/category';
import { CategoryPillRow } from '@/components/CategoryPillRow';

const PAGE_SIZE = 10;

type CreatorSort = 'newest' | 'oldest' | 'followers';
type EntityTab = 'people' | 'services';

// Stable empty references so derived values aren't recomputed off a fresh
// value every render while a query is pending.
const EMPTY_CREATORS: ApiCreatorListItem[] = [];
const EMPTY_SERVICES: ApiService[] = [];
const EMPTY_STRINGS: string[] = [];
const EMPTY_IDS: Set<string> = new Set();

/** Comma-free location filter for listCreators/getSavedCreators — "Remote"
 *  is a people-search-only concept (there's no matching creator field), so
 *  it's dropped before the label list reaches the API. */
function locationParam(filter: CreatorFilterState): string | undefined {
  if (filter.locations.length === 0) return undefined;
  const labels = filter.locations.filter((l) => l.label !== 'Remote').map((l) => l.label);
  return labels.length > 0 ? labels.join(',') : undefined;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** First admin category (in order) that matches one of a creator's category labels. */
function firstCategoryMeta(categories: ApiCategory[], creatorCats: string[]) {
  for (const name of creatorCats) {
    const match = categories.find((c) => c.name === name);
    if (match) return { icon: match.icon, bg: match.iconBg, color: match.color };
  }
  return { icon: 'bullseye', bg: '#F0F0F0', color: '#6B7280' };
}
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// The saved-creators endpoint returns a slimmer creator shape than the browse
// list — map it onto ApiCreatorListItem so the same CreatorCard renders it.
// Fields the saved payload omits (providerType/teamSize/bio/rating) fall back
// to null/undefined, which CreatorCard already tolerates.
function savedItemToListItem(s: SavedCreatorItem): ApiCreatorListItem {
  return {
    id: s.creator.id,
    fullName: s.creator.fullName,
    providerType: null,
    teamSize: null,
    bio: null,
    avatarUrl: s.creator.avatarUrl,
    location: s.creator.location,
    categories: s.creator.categories,
    isVerified: s.creator.isVerified,
    fullyVerified: false,
    socialAccounts: s.creator.socialAccounts,
  };
}

// ─── Creator Card ─────────────────────────────────────────────────────────────

// Leads with what a hiring business actually decides on — role/specialisation
// pills and a rating — rather than social-follower reach, which matters less
// here than it does on the creator-to-creator peer view.
function CreatorCard({ creator, isSaved, onToggleSave }: {
  creator: ApiCreatorListItem;
  isSaved: boolean;
  onToggleSave: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { categories: allCategories } = useAllCategories();
  const meta = firstCategoryMeta(allCategories, creator.categories);
  const categoryPills = creator.categories.slice(0, 1).map((name) => {
    const catMeta = getCategoryMeta(allCategories, name);
    return { label: name, icon: catMeta.icon, color: catMeta.color, bg: catMeta.bg };
  });
  const extraCategories = Math.max(0, creator.categories.length - 1);

  const plainAvatar = !creator.avatarUrl;

  return (
    <EntityCard
      avatarUrl={creator.avatarUrl}
      avatarBg="#FFFFFF"
      initials={getInitials(creator.fullName ?? 'Creator')}
      initialsColor={plainAvatar ? '#000000' : undefined}
      circularAvatar
      ringColor={plainAvatar ? '#000000' : meta.color}
      name={creator.fullName ?? 'Creator'}
      verified={creator.fullyVerified || creator.isVerified}
      providerType={creator.providerType}
      teamSize={creator.teamSize}
      locationText={creator.location ?? undefined}
      bio={creator.bio ?? undefined}
      categoryPills={categoryPills}
      extraCount={extraCategories}
      rating={creator.averageRating}
      ctaLabel={t('explore.viewProfile')}
      ctaStyle="chevron"
      onPressIn={() => prefetchCreatorPublic(queryClient, creator.id)}
      onPress={() => router.push({ pathname: '/(business)/creator-detail', params: { id: creator.id } })}
      action={{
        active: isSaved,
        onToggle: onToggleSave,
        activeIcon: 'bookmark',
        inactiveIcon: 'bookmark',
        activeColor: C.brinjal1,
        activeBg: C.primaryLight,
        bordered: true,
      }}
    />
  );
}

// ─── Service Card ─────────────────────────────────────────────────────────────

function ServiceCard({ service }: { service: ApiService }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const provider = service.creatorProfile;
  const initials = provider?.fullName ? getInitials(provider.fullName) : undefined;
  const plainAvatar = !provider?.avatarUrl;
  const priceText = service.startingPrice != null
    ? `Rs. ${service.startingPrice.toLocaleString()}`
    : t(`servicesScreen.pricing${service.pricingModel === 'PER_PROJECT' ? 'PerProject' : service.pricingModel === 'PER_HOUR' ? 'PerHour' : service.pricingModel === 'PER_DAY' ? 'PerDay' : service.pricingModel === 'PER_CAMPAIGN' ? 'PerCampaign' : 'CustomQuote'}`);

  return (
    <EntityCard
      avatarUrl={provider?.avatarUrl ?? null}
      avatarBg="#FFFFFF"
      initials={initials}
      initialsColor={plainAvatar ? '#000000' : undefined}
      circularAvatar
      ringColor={plainAvatar ? '#000000' : service.category.color}
      name={service.name}
      verified={provider?.isVerified ?? false}
      locationText={[provider?.fullName, provider?.location].filter(Boolean).join(' · ') || undefined}
      bio={service.description}
      categoryLabel={service.category.name}
      categoryIcon={service.category.icon}
      categoryColor={service.category.color}
      categoryBg={service.category.iconBg}
      stat={{ icon: 'tag', color: C.brinjal1, text: priceText }}
      ctaLabel={t('search.viewService')}
      ctaStyle="chevron"
      onPressIn={() => prefetchCreatorPublic(queryClient, service.creatorProfileId)}
      onPress={() => router.push({ pathname: '/(business)/creator-detail', params: { id: service.creatorProfileId } })}
    />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

// `showBack` is false when this renders as the Find People tab root (see
// (tabs)/find-people.tsx) — a tab has no back stack, so the button would only
// ever bounce to Home. The standalone /(business)/explore-creators route keeps
// it, since that one IS pushed onto a stack.
export default function ExploreCreatorsScreen({ showBack = true }: { showBack?: boolean } = {}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: allCategories } = useAllCategories();
  const { platforms: allPlatforms } = usePlatforms();
  const queryClient = useQueryClient();

  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [searchDebounced] = useDebouncedValue(search, 400);
  const trimmedSearch = searchDebounced.trim() || undefined;

  // People/Services switching is disabled for now (see the commented-out pills
  // in the render) — the tab is pinned to 'people'. Re-add `setEntityTab` here
  // when restoring the switcher.
  const [entityTab] = useState<EntityTab>('people');

  // "Saved Creators" pill — an in-place filter, not a separate screen. When on,
  // the People list is replaced by the business's saved creators (same card,
  // same search/category/filter controls, no sort or pagination).
  const [savedOnly, setSavedOnly] = useState(false);

  const [sort, setSort] = useState<CreatorSort>('newest');
  const sortOptions: { value: CreatorSort; label: string }[] = [
    { value: 'newest',    label: t('explore.sortNewest') },
    { value: 'oldest',    label: t('explore.sortOldest') },
    { value: 'followers', label: t('explore.sortFollowers') },
  ];

  // `category` is the label of a tile tapped in the business home's "Find
  // People by Category" slider — the screen opens with that category already
  // applied and its results loaded, rather than dropping the business on an
  // unfiltered list and making them find the pill again. Seeded as initial
  // state (not an effect) so the first fetch already carries the filter.
  const { category: presetCategory } = useLocalSearchParams<{ category?: string }>();

  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CreatorFilterState>(
    presetCategory ? { ...DEFAULT_CREATOR_FILTER, categories: [presetCategory] } : DEFAULT_CREATOR_FILTER,
  );
  const [tempFilter, setTempFilter] = useState<CreatorFilterState>(DEFAULT_CREATOR_FILTER);
  // BOTH-scope rows — the shared industry/niche list (Hotels, Restaurants, …)
  // a business browses by, matching the "Find People by Category" slider on
  // the business home. Both tabs' pill rows share this list.
  const { categories: adminCategories } = useCategories('BOTH');
  const [serviceCategory, setServiceCategory] = useState<string | null>(null);
  // The industry/industries the business selected during onboarding —
  // surfaced first in both tabs' category pill rows below, mirroring the
  // business home's "Find People by Category" slider. Shared cache — the
  // business home + profile tabs already keep this warm.
  const { data: businessProfile } = useBusinessProfile();
  const businessIndustries = businessProfile?.categories ?? EMPTY_STRINGS;
  // Computed once and shared by both tabs' CategoryPillRow so People and
  // Services always show the identical pill order.
  const pillCategories = sortOtherLast(sortSelectedFirst(adminCategories, businessIndustries));

  const filterActive = isCreatorFilterActive(activeFilter);
  // Categories are shown as highlighted pills in the row above, never as
  // chips, so counting them here would render a chip row holding nothing but
  // the Clear-all pill the moment a category is tapped.
  const chipFilterActive =
    activeFilter.locations.length > 0 ||
    activeFilter.platforms.length > 0 ||
    activeFilter.priceMin > CREATOR_SLIDER_MIN ||
    activeFilter.priceMax < CREATOR_SLIDER_MAX;
  const filterCount  = creatorFilterActiveCount(activeFilter);

  // Saved-ids is its own small cache — every card everywhere on this screen
  // (browse or saved-only) reads it for its bookmark state.
  const savedIdsQuery = useQuery({
    queryKey: ['creators', 'savedIds'],
    queryFn: () => creatorService.getSavedCreatorIds().then((ids) => new Set(ids)),
    staleTime: STALE.list,
  });
  const savedIds = savedIdsQuery.data ?? EMPTY_IDS;

  // Save is a low-risk, easily-reversible action (§20) — optimistic write to
  // the shared savedIds cache, rolled back on failure. The saved-only list
  // below never needs its own removal logic: it filters live off this same
  // cache, so un-saving drops the card the instant this write lands.
  async function handleToggleSave(creatorId: string) {
    const wasSaved = savedIds.has(creatorId);
    const flip = (from: Set<string>) => {
      const next = new Set(from);
      wasSaved ? next.delete(creatorId) : next.add(creatorId);
      return next;
    };
    queryClient.setQueryData<Set<string>>(['creators', 'savedIds'], (prev) => flip(prev ?? EMPTY_IDS));
    try {
      await creatorService.toggleSaveCreator(creatorId);
    } catch {
      queryClient.setQueryData<Set<string>>(['creators', 'savedIds'], (prev) => flip(prev ?? EMPTY_IDS));
    }
  }

  // ── Browse list — cache-first infinite query (see queryClient.ts). Every
  // committed filter is part of the key, so changing one re-renders into a
  // cache-first fetch; keepPreviousData avoids a skeleton flash mid-filter.
  const creatorsQuery = useInfiniteQuery({
    queryKey: ['creators', 'business-browse', { search: trimmedSearch, categories: activeFilter.categories, platforms: activeFilter.platforms, priceMin: activeFilter.priceMin, priceMax: activeFilter.priceMax, location: locationParam(activeFilter), sort }],
    queryFn: ({ pageParam }) => creatorService.listCreators({
      page: pageParam, limit: PAGE_SIZE,
      search: trimmedSearch,
      location: locationParam(activeFilter),
      categories: activeFilter.categories.length ? activeFilter.categories : undefined,
      platforms: activeFilter.platforms.length ? activeFilter.platforms : undefined,
      priceMin: activeFilter.priceMin > CREATOR_SLIDER_MIN ? activeFilter.priceMin : undefined,
      priceMax: activeFilter.priceMax < CREATOR_SLIDER_MAX ? activeFilter.priceMax : undefined,
      sort,
    }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.creators.length, 0);
      return loaded < last.total ? all.length + 1 : undefined;
    },
    enabled: entityTab === 'people' && !savedOnly,
    staleTime: STALE.list,
    placeholderData: keepPreviousData,
  });

  // Saved-only view. Honours the same search + category + filter controls as
  // the browse list (the saved endpoint accepts them); no sort, no pagination
  // — every result is filtered live against savedIds so an un-save (above)
  // removes the card immediately without a second write.
  const savedCreatorsQuery = useQuery({
    queryKey: ['creators', 'saved', { search: trimmedSearch, categories: activeFilter.categories, platforms: activeFilter.platforms, priceMin: activeFilter.priceMin, priceMax: activeFilter.priceMax, location: locationParam(activeFilter) }],
    queryFn: () => creatorService.getSavedCreators({
      search: trimmedSearch,
      location: locationParam(activeFilter),
      categories: activeFilter.categories.length ? activeFilter.categories : undefined,
      platforms: activeFilter.platforms.length ? activeFilter.platforms : undefined,
      priceMin: activeFilter.priceMin > CREATOR_SLIDER_MIN ? activeFilter.priceMin : undefined,
      priceMax: activeFilter.priceMax < CREATOR_SLIDER_MAX ? activeFilter.priceMax : undefined,
    }).then((data) => data.map(savedItemToListItem)),
    enabled: savedOnly,
    staleTime: STALE.list,
  });

  // Services tab — dormant (the switcher pills are commented out below, see
  // EntityTab), but wired the same way so re-enabling it is just restoring
  // the pills, not rebuilding the data layer.
  const servicesQuery = useInfiniteQuery({
    queryKey: ['services', 'public', { search: trimmedSearch, category: serviceCategory }],
    queryFn: ({ pageParam }) => {
      const categoryId = serviceCategory ? adminCategories.find((c) => c.name === serviceCategory)?.id : undefined;
      return serviceService.listPublic({ page: pageParam, limit: PAGE_SIZE, search: trimmedSearch, categoryId });
    },
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0);
      return loaded < last.total ? all.length + 1 : undefined;
    },
    enabled: entityTab === 'services',
    staleTime: STALE.list,
    placeholderData: keepPreviousData,
  });

  async function onRefresh() {
    setRefreshing(true);
    try {
      if (savedOnly) await savedCreatorsQuery.refetch();
      else if (entityTab === 'people') await creatorsQuery.refetch();
      else await servicesQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  function loadMore() {
    if (creatorsQuery.hasNextPage && !creatorsQuery.isFetchingNextPage) void creatorsQuery.fetchNextPage();
  }

  function loadMoreServices() {
    if (servicesQuery.hasNextPage && !servicesQuery.isFetchingNextPage) void servicesQuery.fetchNextPage();
  }

  function toggleServiceCategory(label: string) {
    setServiceCategory((prev) => (prev === label ? null : label));
  }

  function openFilter() {
    setTempFilter(activeFilter);
    setFilterVisible(true);
  }

  function applyFilter() {
    setFilterVisible(false);
    setActiveFilter(tempFilter);
  }

  function resetFilter() {
    setTempFilter(DEFAULT_CREATOR_FILTER);
  }

  function toggleCategory(label: string) {
    const next = activeFilter.categories.includes(label)
      ? activeFilter.categories.filter((c) => c !== label)
      : [...activeFilter.categories, label];
    setActiveFilter({ ...activeFilter, categories: next });
  }

  function removeActiveFilter<K extends keyof CreatorFilterState>(key: K, value?: unknown) {
    if (key === 'locations' && value !== undefined) {
      setActiveFilter({ ...activeFilter, locations: activeFilter.locations.filter((l) => l.label !== value) });
    } else if (key === 'platforms' && value !== undefined) {
      setActiveFilter({ ...activeFilter, platforms: activeFilter.platforms.filter((p) => p !== value) });
    } else if (key === 'categories' && value !== undefined) {
      setActiveFilter({ ...activeFilter, categories: activeFilter.categories.filter((c) => c !== value) });
    } else if (key === 'priceMin' || key === 'priceMax') {
      setActiveFilter({ ...activeFilter, priceMin: CREATOR_SLIDER_MIN, priceMax: CREATOR_SLIDER_MAX });
    }
  }

  const creators: ApiCreatorListItem[] = (() => {
    const pages = creatorsQuery.data?.pages;
    if (!pages) return EMPTY_CREATORS;
    const seen = new Set<string>();
    const out: ApiCreatorListItem[] = [];
    for (const p of pages) for (const c of p.creators) {
      if (!seen.has(c.id)) { seen.add(c.id); out.push(c); }
    }
    return out;
  })();
  const total = creatorsQuery.data?.pages[0]?.total ?? 0;
  const loading = creatorsQuery.isPending;
  const loadingMore = creatorsQuery.isFetchingNextPage;
  const error = creatorsQuery.isError && creators.length === 0
    ? (creatorsQuery.error instanceof Error ? creatorsQuery.error.message : 'Failed to load creators')
    : '';

  // Filtered live against savedIds so an un-save above removes the card
  // immediately, without a second write to this list.
  const savedCreators = (savedCreatorsQuery.data ?? EMPTY_CREATORS).filter((c) => savedIds.has(c.id));
  const savedLoading = savedCreatorsQuery.isPending;
  const savedError = savedCreatorsQuery.isError && savedCreators.length === 0
    ? (savedCreatorsQuery.error instanceof Error ? savedCreatorsQuery.error.message : 'Failed to load saved creators')
    : '';

  const services: ApiService[] = (() => {
    const pages = servicesQuery.data?.pages;
    if (!pages) return EMPTY_SERVICES;
    const seen = new Set<string>();
    const out: ApiService[] = [];
    for (const p of pages) for (const sv of p.items) {
      if (!seen.has(sv.id)) { seen.add(sv.id); out.push(sv); }
    }
    return out;
  })();
  const servicesTotal = servicesQuery.data?.pages[0]?.total ?? 0;
  const servicesLoading = servicesQuery.isPending;
  const servicesLoadingMore = servicesQuery.isFetchingNextPage;
  const servicesError = servicesQuery.isError && services.length === 0
    ? (servicesQuery.error instanceof Error ? servicesQuery.error.message : 'Failed to load services')
    : '';

  // The People list swaps its data source when the Saved Creators pill is on.
  // Saved results aren't paginated, so loadMore / the loading-more spinner are
  // suppressed in that mode.
  const peopleData     = savedOnly ? savedCreators : creators;
  const peopleLoading  = savedOnly ? savedLoading : loading;
  const peopleError    = savedOnly ? savedError : error;
  const peopleCount    = savedOnly ? savedCreators.length : total;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      {/* Header — back button + search, same row */}
      <View style={{ backgroundColor: C.surface }}>
        <View style={s.header} accessibilityRole="header" accessibilityLabel={t('explore.exploreCreators')}>
          {showBack && <BackButton fallback="/(business)/" />}
          <View style={[s.searchCard, { flex: 1 }]}>
            <View style={{ flex: 1 }}>
              <SearchInput
                placeholder={entityTab === 'people' ? t('explore.searchPeople') : t('explore.searchServices')}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />
            </View>
            <Pressable
              style={[
                s.filterBtn,
                { backgroundColor: filterActive ? C.brinjal1 : C.primaryLight },
                filterActive && { shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
              ]}
              onPress={openFilter}
              hitSlop={6}>
              <FontAwesome5 name="sliders-h" solid size={18} color={filterActive ? '#fff' : C.brinjal1} />
              {filterActive && (
                <View style={s.filterCountBadge}>
                  <Text style={s.filterCountBadgeTxt}>{filterCount}</Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </View>

      {/* Row that used to switch People / Services. Both switcher pills are
          commented out; it now holds a single "Saved Creators" toggle that
          filters the list below in place, plus the sort control. */}
      <View style={s.entityPillRow}>
        {/* "People" tab replaced by the Saved Creators pill below.
        <Pressable
          style={[s.entityPill, { backgroundColor: entityTab === 'people' ? C.brinjal1 : C.surface, borderColor: entityTab === 'people' ? C.brinjal1 : C.border }]}
          onPress={() => setEntityTab('people')}>
          <FontAwesome5 name="users" solid size={13} color={entityTab === 'people' ? '#fff' : C.text} />
          <Text style={[s.entityPillText, { color: entityTab === 'people' ? '#fff' : C.text }]}>{t('explore.tabPeople')}</Text>
        </Pressable>
        */}
        {/* Services tab hidden for now — business "Find People" shows People only.
        <Pressable
          style={[s.entityPill, { backgroundColor: entityTab === 'services' ? C.brinjal1 : C.surface, borderColor: entityTab === 'services' ? C.brinjal1 : C.border }]}
          onPress={() => setEntityTab('services')}>
          <FontAwesome5 name="briefcase" solid size={13} color={entityTab === 'services' ? '#fff' : C.text} />
          <Text style={[s.entityPillText, { color: entityTab === 'services' ? '#fff' : C.text }]}>{t('explore.tabServices')}</Text>
        </Pressable>
        */}
        <Pressable
          style={[s.entityPill, { backgroundColor: savedOnly ? C.brinjal1 : C.surface, borderColor: savedOnly ? C.brinjal1 : C.border }]}
          // savedCreatorsQuery is disabled until savedOnly flips true, so it's
          // already `isPending` (and savedLoading is already true) the instant
          // it turns on — no manual pre-set needed to avoid an empty-state flash.
          onPress={() => setSavedOnly((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ selected: savedOnly }}
          accessibilityLabel={t('explore.tabSavedCreators')}>
          <FontAwesome5 name="bookmark" solid size={13} color={savedOnly ? '#fff' : C.brinjal1} />
          <Text style={[s.entityPillText, { color: savedOnly ? '#fff' : C.text }]}>{t('explore.tabSavedCreators')}</Text>
        </Pressable>
        {entityTab === 'people' && !savedOnly && (
          <View style={{ marginLeft: 'auto' }}>
            <RangeDropdown value={sort} options={sortOptions} onChange={setSort} />
          </View>
        )}
      </View>

      {entityTab === 'people' && (
        // Category pills — single scrollable row, matching Discover's
        // "Opportunities" tab pill style.
        <CategoryPillRow
          categories={pillCategories}
          activeLabels={activeFilter.categories}
          onToggle={toggleCategory}
          autoScrollToActive
        />
      )}

      {entityTab === 'services' && (
        // Same BOTH-scope pill row as People, so switching tabs doesn't switch
        // vocabularies mid-browse.
        // No wrapper margin, same as People's CategoryPillRow, so the pill
        // row sits at the identical position switching between tabs. The gap
        // before the card list now comes from list's own paddingTop (see
        // styles) rather than a margin here, matching the creator-side
        // Discover tabs' convention.
        <CategoryPillRow
          categories={pillCategories}
          activeLabels={serviceCategory ? [serviceCategory] : []}
          onToggle={toggleServiceCategory}
        />
      )}

      {/* Active filter chips — wraps to multiple lines, doesn't scroll, so
          the row's height is deterministic and the content below it
          (empty state / list) never gets pushed around unpredictably.
          Categories are deliberately excluded here since the CategoryPillRow
          above already highlights the selected ones; repeating them as
          chips+Clear-all was redundant — which is also why the row keys off
          chipFilterActive rather than filterActive. */}
      {entityTab === 'people' && chipFilterActive && (
        <View style={s.chipRow}>
          {activeFilter.locations.map((loc) => (
            <Pressable key={loc.label} onPress={() => removeActiveFilter('locations', loc.label)} style={[s.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
              <FontAwesome5 name={loc.label === 'Remote' ? 'globe' : 'map-marker-alt'} solid size={12} color={C.brinjal1} />
              <Text style={[s.chipText, { color: C.brinjal1 }]}>{loc.label}</Text>
              <FontAwesome5 name="times" solid size={12} color={C.brinjal1} />
            </Pressable>
          ))}
          {(activeFilter.priceMin > CREATOR_SLIDER_MIN || activeFilter.priceMax < CREATOR_SLIDER_MAX) && (
            <Pressable onPress={() => removeActiveFilter('priceMin')} style={[s.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
              <FontAwesome5 name="wallet" solid size={11} color={getIconColor('wallet')} />
              <Text style={[s.chipText, { color: C.brinjal1 }]}>{formatCreatorRate(activeFilter.priceMin)}–{activeFilter.priceMax >= CREATOR_SLIDER_MAX ? `${formatCreatorRate(CREATOR_SLIDER_MAX)}+` : formatCreatorRate(activeFilter.priceMax)}</Text>
              <FontAwesome5 name="times" solid size={12} color={C.brinjal1} />
            </Pressable>
          )}
          {activeFilter.platforms.map((p) => {
            const meta = getPlatformMeta(allPlatforms, p);
            const label = allPlatforms.find((x) => x.key === p)?.name ?? p;
            return (
              <Pressable key={p} onPress={() => removeActiveFilter('platforms', p)} style={[s.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
                <FontAwesome5 name={meta.icon} size={11} color={meta.color} />
                <Text style={[s.chipText, { color: C.brinjal1 }]}>{label}</Text>
                <FontAwesome5 name="times" solid size={12} color={C.brinjal1} />
              </Pressable>
            );
          })}
          <Pressable onPress={() => setActiveFilter(DEFAULT_CREATOR_FILTER)} style={[s.chip, { backgroundColor: C.background, borderColor: C.border }]}>
            <Text style={[s.chipText, { color: C.textSecondary }]}>{t('common.clearAll')}</Text>
          </Pressable>
        </View>
      )}

      {/* Content — always a stable flex:1 region below the header/chips, so
          the empty state reliably centers regardless of how tall the chip
          row above it is. */}
      <View style={{ flex: 1 }}>
        {entityTab === 'people' ? (
          peopleLoading ? (
            <View style={s.list}>
              {[0, 1, 2, 3, 4].map((i) => <ExploreCardSkeleton key={i} />)}
            </View>
          ) : peopleError ? (
            <EmptyState
              icon="exclamation-circle"
              title={t('common.error')}
              subtitle={peopleError}
              action={{ label: t('common.retry'), onPress: () => (savedOnly ? savedCreatorsQuery.refetch() : creatorsQuery.refetch()) }}
            />
          ) : peopleData.length === 0 ? (
            <EmptyState
              faIcon={savedOnly ? 'bookmark' : 'users'}
              title={savedOnly ? t('savedCreators.empty') : t('explore.noCreators')}
              subtitle={
                savedOnly
                  ? (filterActive || search ? t('explore.adjustFilters') : t('savedCreators.emptySub'))
                  : (filterActive || search ? t('explore.adjustFilters') : t('explore.noCreatorsYet'))
              }
              action={(filterActive || search) ? { label: t('explore.clearFilters'), onPress: () => { setSearch(''); setActiveFilter(DEFAULT_CREATOR_FILTER); } } : undefined}
            />
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={peopleData}
              keyExtractor={(item) => item.id}
              contentContainerStyle={s.list}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
              renderItem={({ item }) => (
                <CreatorCard
                  creator={item}
                  isSaved={savedIds.has(item.id)}
                  onToggleSave={() => handleToggleSave(item.id)}
                />
              )}
              onEndReached={savedOnly ? undefined : loadMore}
              onEndReachedThreshold={0.3}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
              ListFooterComponent={
                <View style={s.listFooter}>
                  {!savedOnly && loadingMore && <ActivityIndicator color={C.brinjal1} style={{ paddingVertical: 20 }} />}
                  <ResultCountPill
                    label={peopleCount !== 1 ? t('explore.creatorsFoundPlural', { count: peopleCount }) : t('explore.creatorsFound', { count: peopleCount })}
                  />
                </View>
              }
            />
          )
        ) : (
          servicesLoading ? (
            <View style={s.list}>
              {[0, 1, 2, 3, 4].map((i) => <ExploreCardSkeleton key={i} />)}
            </View>
          ) : servicesError ? (
            <EmptyState
              icon="exclamation-circle"
              title={t('common.error')}
              subtitle={servicesError}
              action={{ label: t('common.retry'), onPress: () => servicesQuery.refetch() }}
            />
          ) : services.length === 0 ? (
            <EmptyState
              faIcon="briefcase"
              title={t('explore.noServices')}
              subtitle={(search || serviceCategory) ? t('explore.adjustFilters') : t('explore.noServicesYet')}
              action={(search || serviceCategory) ? { label: t('explore.clearFilters'), onPress: () => { setSearch(''); setServiceCategory(null); } } : undefined}
            />
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={services}
              keyExtractor={(item) => item.id}
              contentContainerStyle={s.list}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
              renderItem={({ item }) => <ServiceCard service={item} />}
              onEndReached={loadMoreServices}
              onEndReachedThreshold={0.3}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
              ListFooterComponent={
                <View style={s.listFooter}>
                  {servicesLoadingMore && <ActivityIndicator color={C.brinjal1} style={{ paddingVertical: 20 }} />}
                  <ResultCountPill
                    label={servicesTotal !== 1 ? t('explore.servicesFoundPlural', { count: servicesTotal }) : t('explore.servicesFound', { count: servicesTotal })}
                  />
                </View>
              }
            />
          )
        )}
      </View>
      </MaxWidthContainer>

      <CreatorFilterModal
        visible={filterVisible}
        temp={tempFilter}
        setTemp={setTempFilter}
        showRemoteOption={false}
        onApply={applyFilter}
        onReset={resetFilter}
        onClose={() => setFilterVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md, paddingBottom: 4, gap: 12 },

  searchCard: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  filterBtn: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  filterCountBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: RADIUS.full, paddingHorizontal: 3, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  filterCountBadgeTxt: { fontSize: 9, fontFamily: F.extrabold, color: '#fff' },

  entityPillRow: { flexDirection: 'row', paddingHorizontal: SCREEN_GUTTER, paddingTop: 8, paddingBottom: 8, gap: 8 },
  entityPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, borderRadius: RADIUS.full, paddingHorizontal: 14, borderWidth: 1 },
  entityPillText: { fontSize: 13, fontFamily: F.semibold },

  chipRow: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: 8, gap: 6, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontFamily: F.semibold },


  loadingText: { fontSize: 14, fontFamily: F.regular },

  // paddingTop matches the creator-side Discover tabs' explore-creators.tsx/
  // explore-businesses.tsx list (both paddingTop: 14) — keeps the gap between
  // the category pills (or, on People, the sort row) and the first card
  // consistent with that convention instead of a smaller one-off margin.
  list: { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
  listFooter: { alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
});
