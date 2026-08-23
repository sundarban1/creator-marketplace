import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
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
import { sortOtherLast, useAllCategories, useCategories } from '@/hooks/useCategories';
import { usePlatforms, getPlatformMeta } from '@/hooks/usePlatforms';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ApiCategory } from '@/services/category';
import { CategoryPillRow } from '@/components/CategoryPillRow';
import { ResultCountPill } from '@/components/ResultCountPill';

const PAGE_SIZE = 10;
const MAX_LOCS = 3;

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

  return (
    <EntityCard
      avatarUrl={creator.avatarUrl}
      avatarBg={meta.bg}
      initials={initials || undefined}
      circularAvatar
      ringColor={meta.color}
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

  const [creators, setCreators] = useState<ApiCreatorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchDebounced] = useDebouncedValue(search, 400);

  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [tempFilter, setTempFilter] = useState<FilterState>(DEFAULT_FILTER);
  // BOTH-scope industry rows only. This row filters creators by their profile
  // `categories`, which onboarding/edit-categories now fill from that same
  // BOTH-scope list — a CREATOR-scope provider-role pill would match nobody.
  const { categories: adminCategories } = useCategories('BOTH');

  const filterActive = isFilterActive(activeFilter);
  const filterCount  = filterActiveCount(activeFilter);

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

  // Ref (not state) so the guard is synchronous — FlatList's onEndReached can
  // fire multiple times before a state update commits, otherwise triggering
  // the same page fetch twice and appending duplicate creators (duplicate keys).
  const loadingMoreRef = useRef(false);

  async function fetchCreators(p: number, replace: boolean, filter: FilterState, nameSearch: string) {
    if (p === 1 && replace) setLoading(true);
    else if (!replace) setLoadingMore(true);
    setError('');
    try {
      const locationText = filter.locations.length > 0
        ? filter.locations.map((l) => l.label).join(',')
        : undefined;

      const res = await creatorService.listPeerCreators({
        page: p,
        limit: PAGE_SIZE,
        search: nameSearch.trim() || undefined,
        location: locationText || undefined,
        categories: filter.categories.length ? filter.categories : undefined,
      });
      setTotal(res.total);
      setCreators((prev) => {
        if (replace) return res.creators;
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...res.creators.filter((c) => !seen.has(c.id))];
      });
      setPage(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load creators');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void fetchCreators(1, true, activeFilter, searchDebounced);
  }, [searchDebounced, activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchCreators(1, true, activeFilter, searchDebounced);
  }, [searchDebounced, activeFilter]);

  function loadMore() {
    if (loadingMoreRef.current || page >= Math.ceil(total / PAGE_SIZE)) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    void fetchCreators(page + 1, false, activeFilter, searchDebounced);
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

  function removeActiveFilter<K extends keyof FilterState>(key: K, value?: unknown) {
    if (key === 'locations' && value !== undefined) {
      setActiveFilter({ ...activeFilter, locations: activeFilter.locations.filter((l) => l.label !== value) });
    } else if (key === 'categories' && value !== undefined) {
      setActiveFilter({ ...activeFilter, categories: activeFilter.categories.filter((c) => c !== value) });
    }
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
        categories={sortOtherLast(adminCategories)}
        activeLabels={activeFilter.categories}
        onToggle={toggleCategory}
        showAll
        onAllPress={clearCategories}
      />

      {/* Active filter chips — wraps to multiple lines, doesn't scroll, so the
          row's height is deterministic and the content below it never gets
          pushed around unpredictably. Categories are deliberately excluded
          here since the CategoryPillRow above already highlights the
          selected ones; repeating them as chips+Clear-all was redundant. */}
      {activeFilter.locations.length > 0 && (
        <View style={s.chipRow}>
          {activeFilter.locations.map((loc) => (
            <Pressable key={loc.label} onPress={() => removeActiveFilter('locations', loc.label)} style={[s.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
              <FontAwesome5 name="map-marker-alt" solid size={12} color={C.brinjal1} />
              <Text style={[s.chipText, { color: C.brinjal1 }]}>{loc.label}</Text>
              <FontAwesome5 name="times" solid size={12} color={C.brinjal1} />
            </Pressable>
          ))}
          <Pressable onPress={() => setActiveFilter(DEFAULT_FILTER)} style={[s.chip, { backgroundColor: C.background, borderColor: C.border }]}>
            <Text style={[s.chipText, { color: C.textSecondary }]}>{t('common.clearAll')}</Text>
          </Pressable>
        </View>
      )}

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
            action={{ label: t('common.retry'), onPress: () => fetchCreators(1, true, activeFilter, searchDebounced) }}
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

  chipRow: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: 8, gap: 6, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontFamily: F.semibold },


  loadingText: { fontSize: 14, fontFamily: F.regular },

  // paddingTop — without it the first card sat flush against the category
  // pill row above with zero gap, reading as the card overlapping it.
  list: { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
});
