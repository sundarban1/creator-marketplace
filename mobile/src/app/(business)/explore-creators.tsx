import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
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
import { ResultCountPill } from '@/components/ResultCountPill';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { creatorService, type ApiCreatorListItem, type SavedCreatorItem } from '@/services/creator';
import { serviceService, type ApiService } from '@/services/service';
import { F, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { getIconColor } from '@/features/creator/data/filterOptions';
import { useAllCategories, useCategories, getCategoryMeta, sortOtherLast, sortSelectedFirst } from '@/hooks/useCategories';
import { profileService } from '@/services/profile';
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

  // People/Services switching is disabled for now (see the commented-out pills
  // in the render) — the tab is pinned to 'people'. Re-add `setEntityTab` here
  // when restoring the switcher.
  const [entityTab] = useState<EntityTab>('people');

  // "Saved Creators" pill — an in-place filter, not a separate screen. When on,
  // the People list is replaced by the business's saved creators (same card,
  // same search/category/filter controls, no sort or pagination).
  const [savedOnly, setSavedOnly] = useState(false);
  const [savedCreators, setSavedCreators] = useState<ApiCreatorListItem[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState('');
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
  // business home's "Find People by Category" slider.
  const [businessIndustries, setBusinessIndustries] = useState<string[]>([]);
  useFocusEffect(useCallback(() => {
    profileService.getBusinessProfile()
      .then((profile) => setBusinessIndustries(profile.categories ?? []))
      .catch(() => {});
  }, []));
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
    const removed = wasSaved ? savedCreators.find((c) => c.id === creatorId) : undefined;
    setSavedIds((prev) => {
      const next = new Set(prev);
      wasSaved ? next.delete(creatorId) : next.add(creatorId);
      return next;
    });
    // In the saved-only view, un-saving drops the card from the list immediately.
    if (wasSaved) setSavedCreators((prev) => prev.filter((c) => c.id !== creatorId));
    try {
      await creatorService.toggleSaveCreator(creatorId);
    } catch {
      setSavedIds((prev) => {
        const next = new Set(prev);
        wasSaved ? next.add(creatorId) : next.delete(creatorId);
        return next;
      });
      if (removed) setSavedCreators((prev) => (prev.some((c) => c.id === creatorId) ? prev : [removed, ...prev]));
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

  // Saved-only view. Honours the same search + category + filter controls as the
  // browse list (the saved endpoint accepts them); no sort, no pagination.
  async function fetchSaved(filter: CreatorFilterState, nameSearch: string) {
    setSavedLoading(true);
    setSavedError('');
    try {
      const locationText = filter.locations.length > 0
        ? filter.locations.filter((l) => l.label !== 'Remote').map((l) => l.label).join(',')
        : undefined;
      const data = await creatorService.getSavedCreators({
        search: nameSearch.trim() || undefined,
        location: locationText || undefined,
        categories: filter.categories.length ? filter.categories : undefined,
        platforms: filter.platforms.length ? filter.platforms : undefined,
        priceMin: filter.priceMin > CREATOR_SLIDER_MIN ? filter.priceMin : undefined,
        priceMax: filter.priceMax < CREATOR_SLIDER_MAX ? filter.priceMax : undefined,
      });
      setSavedCreators(data.map(savedItemToListItem));
    } catch (e) {
      setSavedError(e instanceof Error ? e.message : 'Failed to load saved creators');
    } finally {
      setSavedLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (!savedOnly) return;
    void fetchSaved(activeFilter, searchDebounced);
  }, [savedOnly, searchDebounced, activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (savedOnly) void fetchSaved(activeFilter, searchDebounced);
    else if (entityTab === 'people') void fetchCreators(1, true, activeFilter, searchDebounced, sort);
    else void fetchServices(1, true, searchDebounced, serviceCategory);
  }, [savedOnly, entityTab, searchDebounced, activeFilter, sort, serviceCategory]);

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
          onPress={() => {
            // Show the skeleton immediately on turn-on so there's no flash of
            // the "no saved creators" empty state before the fetch effect runs.
            if (!savedOnly) setSavedLoading(true);
            setSavedOnly((v) => !v);
          }}
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
              action={{ label: t('common.retry'), onPress: () => (savedOnly ? fetchSaved(activeFilter, searchDebounced) : fetchCreators(1, true, activeFilter, searchDebounced, sort)) }}
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
