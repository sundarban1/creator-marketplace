import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { creatorService, type ApiCreatorListItem } from '@/services/creator';
import { serviceService, type ApiService } from '@/services/service';
import { F, RADIUS } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { getIconColor } from '@/features/creator/data/filterOptions';
import { useAllCategories, useCategories, getCategoryMeta } from '@/hooks/useCategories';
import { usePlatforms, getPlatformMeta } from '@/hooks/usePlatforms';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ApiCategory } from '@/services/category';
import { CategoryPillRow } from '@/components/CategoryPillRow';

const PAGE_SIZE = 10;

type CreatorSort = 'newest' | 'oldest' | 'followers';
type EntityTab = 'people' | 'services';

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
  const { categories: allCategories } = useAllCategories();
  const meta = firstCategoryMeta(allCategories, creator.categories);
  const categoryPills = creator.categories.slice(0, 1).map((name) => {
    const catMeta = getCategoryMeta(allCategories, name);
    return { label: name, icon: catMeta.icon, color: catMeta.color, bg: catMeta.bg };
  });
  const extraCategories = Math.max(0, creator.categories.length - 1);

  return (
    <EntityCard
      avatarUrl={creator.avatarUrl}
      avatarBg={meta.bg}
      initials={getInitials(creator.fullName ?? 'Creator')}
      circularAvatar
      ringColor={meta.color}
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
  const provider = service.creatorProfile;
  const initials = provider?.fullName ? getInitials(provider.fullName) : undefined;
  const priceText = service.startingPrice != null
    ? `Rs. ${service.startingPrice.toLocaleString()}`
    : t(`servicesScreen.pricing${service.pricingModel === 'PER_PROJECT' ? 'PerProject' : service.pricingModel === 'PER_HOUR' ? 'PerHour' : service.pricingModel === 'PER_DAY' ? 'PerDay' : service.pricingModel === 'PER_CAMPAIGN' ? 'PerCampaign' : 'CustomQuote'}`);

  return (
    <EntityCard
      avatarUrl={provider?.avatarUrl ?? null}
      avatarBg={C.primaryLight}
      initials={initials}
      circularAvatar
      ringColor={service.category.color}
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

  const [creators, setCreators] = useState<ApiCreatorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [searchDebounced] = useDebouncedValue(search, 400);

  const [entityTab, setEntityTab] = useState<EntityTab>('people');
  const [services, setServices] = useState<ApiService[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesLoadingMore, setServicesLoadingMore] = useState(false);
  const [servicesPage, setServicesPage] = useState(1);
  const [servicesTotal, setServicesTotal] = useState(0);
  const [servicesError, setServicesError] = useState('');
  const loadingMoreServicesRef = useRef(false);

  const [sort, setSort] = useState<CreatorSort>('newest');
  const sortOptions: { value: CreatorSort; label: string }[] = [
    { value: 'newest',    label: t('explore.sortNewest') },
    { value: 'oldest',    label: t('explore.sortOldest') },
    { value: 'followers', label: t('explore.sortFollowers') },
  ];

  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<CreatorFilterState>(DEFAULT_CREATOR_FILTER);
  const [tempFilter, setTempFilter] = useState<CreatorFilterState>(DEFAULT_CREATOR_FILTER);
  // `strict` — provider-type rows only, no BOTH-scope content-niche rows mixed
  // in. Services are categorized by the same provider types (a creator picks
  // one when they list a service), so both tabs' pill rows share this list.
  const { categories: adminCategories } = useCategories('CREATOR', true);
  const [serviceCategory, setServiceCategory] = useState<string | null>(null);

  const filterActive = isCreatorFilterActive(activeFilter);
  const filterCount  = creatorFilterActiveCount(activeFilter);

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  // Ref (not state) so the guard is synchronous — FlatList's onEndReached can
  // fire multiple times before a state update commits, otherwise triggering
  // the same page fetch twice and appending duplicate creators (duplicate keys).
  const loadingMoreRef = useRef(false);

  useFocusEffect(useCallback(() => {
    creatorService.getSavedCreatorIds()
      .then((ids) => setSavedIds(new Set(ids)))
      .catch(() => {});
  }, []));

  async function handleToggleSave(creatorId: string) {
    const wasSaved = savedIds.has(creatorId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      wasSaved ? next.delete(creatorId) : next.add(creatorId);
      return next;
    });
    try {
      await creatorService.toggleSaveCreator(creatorId);
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        wasSaved ? next.add(creatorId) : next.delete(creatorId);
        return next;
      });
    }
  }


  async function fetchCreators(p: number, replace: boolean, filter: CreatorFilterState, nameSearch: string, sortBy: CreatorSort) {
    if (p === 1 && replace) setLoading(true);
    else if (!replace) setLoadingMore(true);
    setError('');
    try {
      const locationText = filter.locations.length > 0
        ? filter.locations.filter((l) => l.label !== 'Remote').map((l) => l.label).join(',')
        : undefined;

      const res = await creatorService.listCreators({
        page: p,
        limit: PAGE_SIZE,
        search: nameSearch.trim() || undefined,
        location: locationText || undefined,
        categories: filter.categories.length ? filter.categories : undefined,
        platforms: filter.platforms.length ? filter.platforms : undefined,
        priceMin: filter.priceMin > CREATOR_SLIDER_MIN ? filter.priceMin : undefined,
        priceMax: filter.priceMax < CREATOR_SLIDER_MAX ? filter.priceMax : undefined,
        sort: sortBy,
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
    if (entityTab !== 'people') return;
    void fetchCreators(1, true, activeFilter, searchDebounced, sort);
  }, [entityTab, searchDebounced, activeFilter, sort]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (entityTab === 'people') void fetchCreators(1, true, activeFilter, searchDebounced, sort);
    else void fetchServices(1, true, searchDebounced, serviceCategory);
  }, [entityTab, searchDebounced, activeFilter, sort, serviceCategory]);

  function loadMore() {
    if (loadingMoreRef.current || page >= Math.ceil(total / PAGE_SIZE)) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    void fetchCreators(page + 1, false, activeFilter, searchDebounced, sort);
  }

  async function fetchServices(p: number, replace: boolean, nameSearch: string, categoryName: string | null) {
    if (p === 1 && replace) setServicesLoading(true);
    else if (!replace) setServicesLoadingMore(true);
    setServicesError('');
    try {
      const categoryId = categoryName ? adminCategories.find((c) => c.name === categoryName)?.id : undefined;
      const res = await serviceService.listPublic({ page: p, limit: PAGE_SIZE, search: nameSearch.trim() || undefined, categoryId });
      setServicesTotal(res.total);
      setServices((prev) => {
        if (replace) return res.items;
        const seen = new Set(prev.map((sv) => sv.id));
        return [...prev, ...res.items.filter((sv) => !seen.has(sv.id))];
      });
      setServicesPage(p);
    } catch (e) {
      setServicesError(e instanceof Error ? e.message : 'Failed to load services');
    } finally {
      setServicesLoading(false);
      setServicesLoadingMore(false);
      loadingMoreServicesRef.current = false;
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (entityTab !== 'services') return;
    void fetchServices(1, true, searchDebounced, serviceCategory);
  }, [entityTab, searchDebounced, serviceCategory, adminCategories]);

  function loadMoreServices() {
    if (loadingMoreServicesRef.current || servicesPage >= Math.ceil(servicesTotal / PAGE_SIZE)) return;
    loadingMoreServicesRef.current = true;
    setServicesLoadingMore(true);
    void fetchServices(servicesPage + 1, false, searchDebounced, serviceCategory);
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

      {/* People / Services pills — switches what the search bar above and the
          list below operate on. People stays the default landing view since
          hiring creators is this screen's primary job. */}
      <View style={s.entityPillRow}>
        <Pressable
          style={[s.entityPill, { backgroundColor: entityTab === 'people' ? C.brinjal1 : C.surface, borderColor: entityTab === 'people' ? C.brinjal1 : C.border }]}
          onPress={() => setEntityTab('people')}>
          <FontAwesome5 name="users" solid size={13} color={entityTab === 'people' ? '#fff' : C.text} />
          <Text style={[s.entityPillText, { color: entityTab === 'people' ? '#fff' : C.text }]}>{t('explore.tabPeople')}</Text>
        </Pressable>
        <Pressable
          style={[s.entityPill, { backgroundColor: entityTab === 'services' ? C.brinjal1 : C.surface, borderColor: entityTab === 'services' ? C.brinjal1 : C.border }]}
          onPress={() => setEntityTab('services')}>
          <FontAwesome5 name="briefcase" solid size={13} color={entityTab === 'services' ? '#fff' : C.text} />
          <Text style={[s.entityPillText, { color: entityTab === 'services' ? '#fff' : C.text }]}>{t('explore.tabServices')}</Text>
        </Pressable>
        {entityTab === 'people' && (
          <View style={{ marginLeft: 'auto' }}>
            <RangeDropdown value={sort} options={sortOptions} onChange={setSort} />
          </View>
        )}
      </View>

      {entityTab === 'people' && (
        // Category pills — single scrollable row, matching Discover's
        // "Opportunities" tab pill style.
        <CategoryPillRow
          categories={adminCategories}
          activeLabels={activeFilter.categories}
          onToggle={toggleCategory}
        />
      )}

      {entityTab === 'services' && (
        // Same provider-type pill row as People (scoped strictly to CREATOR
        // categories, not the BOTH-scope content niches) — a service is
        // categorized by the provider type its creator picked when listing it.
        // No wrapper margin, same as People's CategoryPillRow, so the pill
        // row sits at the identical position switching between tabs. The gap
        // before the card list now comes from list's own paddingTop (see
        // styles) rather than a margin here, matching the creator-side
        // Discover tabs' convention.
        <CategoryPillRow
          categories={adminCategories}
          activeLabels={serviceCategory ? [serviceCategory] : []}
          onToggle={toggleServiceCategory}
        />
      )}

      {/* Active filter chips — wraps to multiple lines, doesn't scroll, so
          the row's height is deterministic and the content below it
          (empty state / list) never gets pushed around unpredictably.
          Categories are deliberately excluded here since the CategoryPillRow
          above already highlights the selected ones; repeating them as
          chips+Clear-all was redundant. */}
      {entityTab === 'people' && filterActive && (
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
          loading ? (
            <View style={s.list}>
              {[0, 1, 2, 3, 4].map((i) => <ExploreCardSkeleton key={i} />)}
            </View>
          ) : error ? (
            <EmptyState
              icon="exclamation-circle"
              title={t('common.error')}
              subtitle={error}
              action={{ label: t('common.retry'), onPress: () => fetchCreators(1, true, activeFilter, searchDebounced, sort) }}
            />
          ) : creators.length === 0 ? (
            <EmptyState
              faIcon="users"
              title={t('explore.noCreators')}
              subtitle={filterActive || search ? t('explore.adjustFilters') : t('explore.noCreatorsYet')}
              action={(filterActive || search) ? { label: t('explore.clearFilters'), onPress: () => { setSearch(''); setActiveFilter(DEFAULT_CREATOR_FILTER); } } : undefined}
            />
          ) : (
            <FlatList
              style={{ flex: 1 }}
              data={creators}
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
              onEndReached={loadMore}
              onEndReachedThreshold={0.3}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={7}
              removeClippedSubviews={Platform.OS === 'android'}
              ListFooterComponent={
                <View style={s.listFooter}>
                  {loadingMore && <ActivityIndicator color={C.brinjal1} style={{ paddingVertical: 20 }} />}
                  <Text style={[s.countText, { color: C.textSecondary }]} numberOfLines={1}>
                    {total !== 1 ? t('explore.creatorsFoundPlural', { count: total }) : t('explore.creatorsFound', { count: total })}
                  </Text>
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
              action={{ label: t('common.retry'), onPress: () => fetchServices(1, true, searchDebounced, serviceCategory) }}
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
                  <Text style={[s.countText, { color: C.textSecondary }]} numberOfLines={1}>
                    {servicesTotal !== 1 ? t('explore.servicesFoundPlural', { count: servicesTotal }) : t('explore.servicesFound', { count: servicesTotal })}
                  </Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, gap: 12 },

  searchCard: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  filterBtn: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  filterCountBadge: { position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: RADIUS.full, paddingHorizontal: 3, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  filterCountBadgeTxt: { fontSize: 9, fontFamily: F.extrabold, color: '#fff' },

  entityPillRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 8 },
  entityPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, borderRadius: RADIUS.full, paddingHorizontal: 14, borderWidth: 1 },
  entityPillText: { fontSize: 13, fontFamily: F.semibold },

  chipRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 6, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontFamily: F.semibold },

  countText: { fontSize: 12, fontFamily: F.semibold },

  loadingText: { fontSize: 14, fontFamily: F.regular },

  // paddingTop matches the creator-side Discover tabs' explore-creators.tsx/
  // explore-businesses.tsx list (both paddingTop: 14) — keeps the gap between
  // the category pills (or, on People, the sort row) and the first card
  // consistent with that convention instead of a smaller one-off margin.
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40, gap: 14 },
  listFooter: { alignItems: 'center', paddingTop: 4, paddingBottom: 8 },
});
