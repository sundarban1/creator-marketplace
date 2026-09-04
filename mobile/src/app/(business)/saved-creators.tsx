import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '@/components/BackButton';
import { SearchInput } from '@/components/SearchInput';
import { EntityCard } from '@/components/EntityCard';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { creatorService, type SavedCreatorItem } from '@/services/creator';
import { EmptyState } from '@/components/EmptyState';
import { ExploreCardSkeleton } from '@/components/ExploreCardSkeleton';
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
import { useAllCategories, useCategories, getCategoryMeta } from '@/hooks/useCategories';
import { usePlatforms, getPlatformMeta } from '@/hooks/usePlatforms';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useRefetchOnFocusIfStale } from '@/hooks/useRefetchOnFocusIfStale';
import { STALE } from '@/lib/queryClient';
import { getIconColor } from '@/features/creator/data/filterOptions';
import { F, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}
function formatFollowers(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/** First admin category (in order) that matches one of a creator's category labels. */
function firstCategoryMeta(categories: ReturnType<typeof useAllCategories>['categories'], creatorCats: string[]) {
  for (const name of creatorCats) {
    const match = categories.find((c) => c.name === name);
    if (match) return { icon: match.icon, bg: match.iconBg, color: match.color };
  }
  return { icon: 'bullseye', bg: '#F0F0F0', color: '#6B7280' };
}

function CreatorCard({ item, onRemove }: { item: SavedCreatorItem; onRemove: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: allCategories } = useAllCategories();
  const { platforms: allPlatforms } = usePlatforms();
  const { creator } = item;
  const meta = firstCategoryMeta(allCategories, creator.categories);
  const topAccount = creator.socialAccounts.length > 0
    ? [...creator.socialAccounts].sort((a, b) => b.followers - a.followers)[0]
    : null;
  const topPlatform = topAccount ? getPlatformMeta(allPlatforms, topAccount.platform) : null;
  const extraCats = creator.categories.length - 1;

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
      verified={creator.isVerified}
      locationText={creator.location ?? undefined}
      categoryLabel={creator.categories.length > 0 ? creator.categories[0] : undefined}
      categoryIcon={meta.icon}
      categoryColor={meta.color}
      categoryBg={meta.bg}
      extraCount={extraCats}
      stat={topAccount && topPlatform ? {
        icon: topPlatform.icon,
        color: topPlatform.color,
        text: formatFollowers(topAccount.followers),
      } : undefined}
      ctaLabel={t('explore.viewProfile')}
      onPress={() => router.push({ pathname: '/(business)/creator-detail', params: { id: creator.id } })}
      action={{
        active: true,
        onToggle: onRemove,
        activeIcon: 'bookmark',
        inactiveIcon: 'bookmark',
        activeColor: C.brinjal1,
        activeBg: C.primaryLight,
        bordered: true,
      }}
    />
  );
}

const EMPTY_SAVED: SavedCreatorItem[] = [];

export default function SavedCreatorsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { categories: allCategories } = useAllCategories();
  const { platforms: allPlatforms } = usePlatforms();

  const [search, setSearch] = useState('');
  const [searchDebounced] = useDebouncedValue(search, 400);

  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CreatorFilterState>(DEFAULT_CREATOR_FILTER);
  const [tempFilter, setTempFilter] = useState<CreatorFilterState>(DEFAULT_CREATOR_FILTER);
  const { categories: adminCategories } = useCategories('CREATOR');
  const availableCategories = adminCategories.map((c) => c.name);

  const filterActive = isCreatorFilterActive(activeFilter);
  const filterCount  = creatorFilterActiveCount(activeFilter);

  const locationText = activeFilter.locations.length > 0
    ? activeFilter.locations.filter((l) => l.label !== 'Remote').map((l) => l.label).join(',')
    : undefined;
  const trimmedSearch = searchDebounced.trim() || undefined;

  // Root 'saved-raw' (not 'saved') — deliberately distinct from
  // explore-creators.tsx's ['creators','saved',...] cache, which stores the
  // list mapped to a different shape (ApiCreatorListItem via
  // savedItemToListItem); this screen keeps the raw SavedCreatorItem shape
  // (item.creator.*), so the two must never share a cache entry.
  const savedKey = ['creators', 'saved-raw', { search: trimmedSearch, location: locationText, categories: activeFilter.categories, platforms: activeFilter.platforms, priceMin: activeFilter.priceMin, priceMax: activeFilter.priceMax }] as const;
  const savedQuery = useQuery({
    queryKey: savedKey,
    queryFn: () => creatorService.getSavedCreators({
      search: trimmedSearch,
      location: locationText,
      categories: activeFilter.categories.length ? activeFilter.categories : undefined,
      platforms: activeFilter.platforms.length ? activeFilter.platforms : undefined,
      priceMin: activeFilter.priceMin > CREATOR_SLIDER_MIN ? activeFilter.priceMin : undefined,
      priceMax: activeFilter.priceMax < CREATOR_SLIDER_MAX ? activeFilter.priceMax : undefined,
    }),
    staleTime: STALE.list,
  });
  useRefetchOnFocusIfStale(savedQuery);
  const items = savedQuery.data ?? EMPTY_SAVED;
  const loading = savedQuery.isPending;

  // Optimistic removal — un-saving is low-risk/reversible (§20) — rolled back
  // on failure via the snapshot taken before the write.
  async function handleRemove(creatorId: string) {
    const previous = queryClient.getQueryData<SavedCreatorItem[]>(savedKey);
    queryClient.setQueryData<SavedCreatorItem[]>(savedKey, (prev) => prev?.filter((i) => i.creator.id !== creatorId));
    try {
      await creatorService.toggleSaveCreator(creatorId);
    } catch {
      queryClient.setQueryData(savedKey, previous);
    }
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

  const hasFilter = !!(search || filterActive);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      {/* Header — back button + search, same row */}
      <View style={{ backgroundColor: C.surface }}>
        <View style={s.header} accessibilityRole="header" accessibilityLabel={t('savedCreators.title')}>
          <BackButton />
          <View style={[s.searchCard, { flex: 1 }]}>
            <View style={{ flex: 1 }}>
              <SearchInput
                placeholder={t('explore.searchCreators')}
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
      </View>

      {/* Result count */}
      {!loading && items.length > 0 && (
        <Text style={[s.countText, { color: C.textSecondary }]}>
          {items.length !== 1
            ? t('savedCreators.creatorsSaved', { n: items.length })
            : t('savedCreators.creatorSaved', { n: items.length })}
        </Text>
      )}

      {/* Active filter chips */}
      {filterActive && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
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
          {activeFilter.categories.map((cat) => {
            const meta = getCategoryMeta(allCategories, cat);
            return (
              <Pressable key={cat} onPress={() => removeActiveFilter('categories', cat)} style={[s.chip, { backgroundColor: C.primaryLight, borderColor: C.brinjal1 }]}>
                <FontAwesome5 name={meta.icon} size={11} color={meta.color} />
                <Text style={[s.chipText, { color: C.brinjal1 }]}>{cat}</Text>
                <FontAwesome5 name="times" solid size={12} color={C.brinjal1} />
              </Pressable>
            );
          })}
          <Pressable onPress={() => setActiveFilter(DEFAULT_CREATOR_FILTER)} style={[s.chip, { backgroundColor: C.background, borderColor: C.border }]}>
            <Text style={[s.chipText, { color: C.textSecondary }]}>{t('common.clearAll')}</Text>
          </Pressable>
        </ScrollView>
      )}

      {loading ? (
        <View style={s.list}>
          {[0, 1, 2, 3, 4].map((i) => <ExploreCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <CreatorCard item={item} onRemove={() => handleRemove(item.creator.id)} />
          )}
          contentContainerStyle={[s.list, items.length === 0 && s.listEmpty]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            hasFilter ? (
              <EmptyState
                faIcon="search"
                title={t('explore.noCreators')}
                subtitle={t('explore.adjustFilters')}
                action={{ label: t('explore.clearFilters'), onPress: () => { setSearch(''); setActiveFilter(DEFAULT_CREATOR_FILTER); } }}
              />
            ) : (
              <EmptyState
                faIcon="bookmark"
                title={t('savedCreators.empty')}
                subtitle={t('savedCreators.emptySub')}
                action={{ label: t('savedCreators.browseCTA'), onPress: () => router.push('/(business)/explore-creators') }}
              />
            )
          }
        />
      )}
      </MaxWidthContainer>

      <CreatorFilterModal
        visible={filterVisible}
        temp={tempFilter}
        setTemp={setTempFilter}
        availableCategories={availableCategories}
        onApply={applyFilter}
        onReset={resetFilter}
        onClose={() => setFilterVisible(false)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md, paddingBottom: SPACING.md, gap: 12 },
  headerSeparator: { height: StyleSheet.hairlineWidth, marginHorizontal: SCREEN_GUTTER },

  searchCard: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  filterBtn: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  filterCountBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: RADIUS.full, paddingHorizontal: 3, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  filterCountBadgeTxt: { fontSize: 9, fontFamily: F.extrabold, color: '#fff' },

  countText: { fontSize: 12, fontFamily: F.semibold, paddingHorizontal: SCREEN_GUTTER, marginTop: 4, marginBottom: 4 },

  chipRow: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: 8, gap: 6, flexDirection: 'row', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontFamily: F.semibold },

  list:   { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
  listEmpty: { flexGrow: 1 },
});
