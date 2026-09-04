import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
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
import { FilterSheet, FilterSectionHeader, ActiveFilterChips, type ActiveFilterChip } from '@/components/FilterSheet';
import { LocationSearchPicker, type LocationEntry } from '@/components/LocationSearchPicker';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { creatorService, type ApiCreatorListItem } from '@/services/creator';
import { F, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useCreatorProfile } from '@/hooks/useCreatorProfile';
import { STALE } from '@/lib/queryClient';
import { sortOtherLast, sortSelectedFirst, useAllCategories, useCategories } from '@/hooks/useCategories';
import { usePlatforms, getPlatformMeta } from '@/hooks/usePlatforms';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ApiCategory } from '@/services/category';
import { CategoryPillRow } from '@/components/CategoryPillRow';
import { ResultCountPill } from '@/components/ResultCountPill';

const PAGE_SIZE = 10;
const MAX_LOCS = 3;

// Stable empty references so derived values aren't recomputed off a fresh []
// every render while a query is pending.
const EMPTY_CREATORS: ApiCreatorListItem[] = [];
const EMPTY_STRINGS: string[] = [];

// ─── Constants ────────────────────────────────────────────────────────────────

/** First admin category (in order) that matches one of a creator's category labels. */
function firstCategoryMeta(categories: ApiCategory[], creatorCats: string[]) {
  for (const name of creatorCats) {
    const match = categories.find((c) => c.name === name);
    if (match) return { icon: match.icon, bg: match.iconBg, color: match.color };
  }
  return { icon: 'bullseye', bg: '#F0F0F0', color: '#6B7280' };
}
function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ─── Filter state ─────────────────────────────────────────────────────────────

type FilterState = {
  locations: LocationEntry[];
  categories: string[];
};

const DEFAULT_FILTER: FilterState = {
  locations: [],
  categories: [],
};

function filterActiveCount(f: FilterState) {
  return [
    f.locations.length > 0,
    f.categories.length > 0,
  ].filter(Boolean).length;
}
function isFilterActive(f: FilterState) {
  return filterActiveCount(f) > 0;
}


// ─── Filter Modal ─────────────────────────────────────────────────────────────

function ExploreFilterModal({
  visible, temp, setTemp,
  onApply, onReset, onClose,
}: {
  visible: boolean;
  temp: FilterState;
  setTemp: (f: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();

  function set<K extends keyof FilterState>(key: K, val: FilterState[K]) {
    setTemp({ ...temp, [key]: val });
  }

  const activeChips: ActiveFilterChip[] = [];
  for (const loc of temp.locations) {
    activeChips.push({
      key: `loc-${loc.label}`,
      label: loc.label,
      onClear: () => set('locations', temp.locations.filter((l) => l.label !== loc.label)),
    });
  }

  const applyLabel = activeChips.length > 0
    ? t('explore.applyFiltersCount', { n: activeChips.length })
    : t('explore.showAllCreators');

  return (
    <FilterSheet
      visible={visible}
      title={t('explore.filterCreators')}
      resetLabel={t('explore.resetAll')}
      applyLabel={applyLabel}
      onApply={onApply}
      onReset={onReset}
      onClose={onClose}
    >
      <ActiveFilterChips chips={activeChips} />

      {/* Category filtering lives on the screen itself (CategoryPillRow),
          not in this modal — keeping it in one place avoids two disagreeing
          controls for the same filter. */}

      {/* Location — kept last */}
      <View>
        <FilterSectionHeader
          icon="map-marker-alt"
          label={t('explore.location')}
          hint={t('explore.locationsAllowed', { count: temp.locations.length, max: MAX_LOCS })}
        />
        {/* No Remote chip — people are filtered by where they are based. */}
        <LocationSearchPicker selected={temp.locations} onSelect={(v) => set('locations', v)} showRemoteOption={false} />
      </View>
    </FilterSheet>
  );
}

// ─── Creator Avatar ───────────────────────────────────────────────────────────

// ─── Creator Card ─────────────────────────────────────────────────────────────

function CreatorCard({ creator, chevronOnly }: { creator: ApiCreatorListItem; /** Discover tab's cards use a plain trailing chevron instead of a full CTA button. */ chevronOnly?: boolean }) {
  const { t } = useLanguage();
  const { categories: allCategories } = useAllCategories();
  const { platforms: allPlatforms } = usePlatforms();
  const meta = firstCategoryMeta(allCategories, creator.categories);
  const topAccount = creator.socialAccounts.length > 0
    ? [...creator.socialAccounts].sort((a, b) => b.followers - a.followers)[0]
    : null;
  const topPlatform = topAccount ? getPlatformMeta(allPlatforms, topAccount.platform) : null;
  const extraCats = creator.categories.length - 1;
  const initials = (creator.fullName ?? '').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  // Always a white avatar chip; no avatar → black initials + a black ring
  // instead of the tinted category-colour placeholder.
  const plainAvatar = !creator.avatarUrl;

  return (
    <EntityCard
      avatarUrl={creator.avatarUrl}
      avatarBg="#FFFFFF"
      initials={initials || undefined}
      initialsColor={plainAvatar ? '#000000' : undefined}
      circularAvatar
      ringColor={plainAvatar ? '#000000' : meta.color}
      name={creator.fullName ?? 'Creator'}
      verified={creator.fullyVerified || creator.isVerified}
      providerType={creator.providerType}
      teamSize={creator.teamSize}
      locationText={creator.location ?? undefined}
      bio={creator.bio ?? undefined}
      categoryLabel={creator.categories.length > 0 ? creator.categories[0] : undefined}
      categoryIcon={meta.icon}
      categoryColor={meta.color}
      categoryBg={meta.bg}
      extraCount={extraCats}
      rating={creator.averageRating}
      stat={topAccount && topPlatform ? {
        icon: topPlatform.icon,
        color: topPlatform.color,
        text: formatFollowers(topAccount.followers),
      } : undefined}
      ctaLabel={t('explore.viewProfile')}
      ctaStyle={chevronOnly ? 'chevron' : 'button'}
      onPress={() => router.push({ pathname: '/(creator)/creator-detail', params: { id: creator.id } })}
    />
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

// `embedded` renders just the content (no SafeAreaView/MaxWidthContainer/
// BackButton/search bar) so this same screen can be reused as the "People"
// tab inside the unified Discover shell — which owns a single shared search
// bar + filter button for every tab and drives this screen's search/filter
// via the exposed ref — while the standalone route (/(creator)/explore-creators)
// keeps its own search bar and works exactly as before.
export type PeopleExploreHandle = { setSearchText: (text: string) => void; openFilter: () => void };

const ExploreCreatorPeersScreen = forwardRef<PeopleExploreHandle, { embedded?: boolean; onFilterCountChange?: (count: number) => void }>(
  function ExploreCreatorPeersScreen({ embedded = false, onFilterCountChange }, ref) {
  const C = useAppColors();
  const { t } = useLanguage();

  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [searchDebounced] = useDebouncedValue(search, 400);

  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [tempFilter, setTempFilter] = useState<FilterState>(DEFAULT_FILTER);
  // BOTH-scope industry rows only. This row filters creators by their profile
  // `categories`, which onboarding/edit-categories now fill from that same
  // BOTH-scope list — a CREATOR-scope provider-role pill would match nobody.
  const { categories: adminCategories } = useCategories('BOTH');
  // The creator's own onboarding-selected niches — surfaced first in the pill
  // row below. From the shared creator-profile cache (also feeds creator home
  // + Discover), so no getProfile() call on every focus.
  const { data: creatorProfile } = useCreatorProfile();
  const myCategories = creatorProfile?.categories ?? EMPTY_STRINGS;

  const filterActive = isFilterActive(activeFilter);
  const filterCount  = filterActiveCount(activeFilter);

  // ── Data — cache-first infinite list (see queryClient.ts). Committed search
  // + filter values are the query key, so changing one re-renders into a
  // cache-first fetch; keepPreviousData keeps the current results on screen
  // until the new page lands instead of flashing the skeleton.
  const locationText = activeFilter.locations.length > 0
    ? activeFilter.locations.map((l) => l.label).join(',')
    : undefined;
  const trimmedSearch = searchDebounced.trim() || undefined;

  const creatorsQuery = useInfiniteQuery({
    queryKey: ['creators', 'peers', { search: trimmedSearch, location: locationText, categories: activeFilter.categories }],
    queryFn: ({ pageParam }) => creatorService.listPeerCreators({
      page: pageParam, limit: PAGE_SIZE,
      search: trimmedSearch,
      location: locationText,
      categories: activeFilter.categories.length ? activeFilter.categories : undefined,
    }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.creators.length, 0);
      return loaded < last.total ? all.length + 1 : undefined;
    },
    staleTime: STALE.list,
    placeholderData: keepPreviousData,
  });

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

  function loadMore() {
    if (creatorsQuery.hasNextPage && !creatorsQuery.isFetchingNextPage) {
      void creatorsQuery.fetchNextPage();
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try { await creatorsQuery.refetch(); } finally { setRefreshing(false); }
  }

  // See explore-businesses.tsx's identical effect for why onFilterCountChange
  // is deliberately left out of the deps array (a fresh closure every parent
  // render would otherwise re-fire this on every render, looping forever).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onFilterCountChange?.(filterCount); }, [filterCount]);

  function toggleCategory(label: string) {
    const next = activeFilter.categories.includes(label)
      ? activeFilter.categories.filter((c) => c !== label)
      : [...activeFilter.categories, label];
    setActiveFilter({ ...activeFilter, categories: next });
  }

  function clearCategories() {
    setActiveFilter({ ...activeFilter, categories: [] });
  }

  function openFilter() {
    setTempFilter(activeFilter);
    setFilterVisible(true);
  }

  useImperativeHandle(ref, () => ({ setSearchText: setSearch, openFilter }));

  function applyFilter() {
    setFilterVisible(false);
    setActiveFilter(tempFilter);
  }

  function resetFilter() {
    setTempFilter(DEFAULT_FILTER);
  }

  const content = (
    <>
      {/* Back button + search, same row — hidden when embedded, since the
          Discover shell owns one shared search bar + filter button for
          every tab and drives this screen's search/filter via its ref. */}
      {!embedded && (
        <>
          <View style={[s.topRow, { backgroundColor: C.surface }]} accessibilityRole="header" accessibilityLabel={t('explore.exploreCreators')}>
            <BackButton fallback="/(creator)/(tabs)" />
            <View style={[s.searchCard, { flex: 1 }]}>
              <View style={{ flex: 1 }}>
                <SearchInput
                  placeholder={t('explore.searchPeople')}
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
          <View style={[s.headerSeparator, { backgroundColor: C.border }]} />
        </>
      )}

      {/* Category pills — single scrollable row through every category,
          matching Discover's Opportunities/Businesses tabs (no label text). */}
      <CategoryPillRow
        categories={sortOtherLast(sortSelectedFirst(adminCategories, myCategories))}
        activeLabels={activeFilter.categories}
        onToggle={toggleCategory}
        showAll
        onAllPress={clearCategories}
      />

      {/* Active filters aren't echoed as a chip row on the listing — the
          filter button keeps its badge count and the filter sheet owns the
          chips + "Reset all". The empty state still offers a one-tap clear. */}

      {/* Always a stable flex:1 region below the pills, so the list/empty
          state gets a well-defined box instead of collapsing/overlapping
          the pill row above it — matches explore-businesses.tsx's identical
          wrapper. */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={s.list}>
            {[0, 1, 2, 3, 4].map((i) => <ExploreCardSkeleton key={i} />)}
          </View>
        ) : error ? (
          <EmptyState
            icon="exclamation-circle"
            title={t('common.error')}
            subtitle={error}
            action={{ label: t('common.retry'), onPress: () => creatorsQuery.refetch() }}
          />
        ) : creators.length === 0 ? (
          <EmptyState
            faIcon="users"
            title={t('explore.noCreators')}
            subtitle={filterActive || search ? t('explore.adjustFilters') : t('explore.noCreatorsYet')}
            action={(filterActive || search) ? { label: t('explore.clearFilters'), onPress: () => { setSearch(''); setActiveFilter(DEFAULT_FILTER); } } : undefined}
          />
        ) : (
          <FlatList
            style={{ flex: 1 }}
            data={creators}
            keyExtractor={(item) => item.id}
            contentContainerStyle={s.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
            renderItem={({ item }) => <CreatorCard creator={item} chevronOnly={embedded} />}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            ListFooterComponent={
              <View>
                {!loading && creators.length > 0 && (
                  <ResultCountPill
                    label={total !== 1 ? t('explore.peopleFoundPlural', { count: total }) : t('explore.peopleFound', { count: total })}
                  />
                )}
                {loadingMore && <ActivityIndicator color={C.brinjal1} style={{ paddingVertical: 20 }} />}
              </View>
            }
          />
        )}
      </View>
    </>
  );

  return (
    <>
      {embedded ? (
        <MaxWidthContainer>{content}</MaxWidthContainer>
      ) : (
        <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
          <MaxWidthContainer>{content}</MaxWidthContainer>
        </SafeAreaView>
      )}

      <ExploreFilterModal
        visible={filterVisible}
        temp={tempFilter}
        setTemp={setTempFilter}
        onApply={applyFilter}
        onReset={resetFilter}
        onClose={() => setFilterVisible(false)}
      />
    </>
  );
});

export default ExploreCreatorPeersScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },


  topRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingTop: 12, paddingBottom: 12, gap: 12 },
  headerSeparator: { height: StyleSheet.hairlineWidth, marginHorizontal: SCREEN_GUTTER, marginBottom: 8 },
  searchCard: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  filterBtn: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  filterCountBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: RADIUS.full, paddingHorizontal: 3, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  filterCountBadgeTxt: { fontSize: 9, fontFamily: F.extrabold, color: '#fff' },

  loadingText: { fontSize: 14, fontFamily: F.regular },

  // paddingTop — without it the first card sat flush against the category
  // pill row above with zero gap, reading as the card overlapping it.
  list: { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
});
