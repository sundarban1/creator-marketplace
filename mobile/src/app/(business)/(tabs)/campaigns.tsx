import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { TabSlider } from '@/components/TabSlider';
import { useToast } from '@/components/Toast';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { campaignService } from '@/services/campaign';
import { creatorService, type SavedCreatorItem, type ApiCreatorListItem } from '@/services/creator';
import { useAllCategories, getCategoryMeta } from '@/hooks/useCategories';
import { usePlatforms, getPlatformMeta } from '@/hooks/usePlatforms';
import { getTemplateImage } from '@/features/creator/data/templateImages';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { FilterSheet, FilterSectionHeader } from '@/components/FilterSheet';
import type { Campaign } from '@/types';
import { F, RADIUS, SHADOW } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { TabColors } from '@/utilities/tabColors';

type IoniconName = keyof typeof Ionicons.glyphMap;

const FILTERS = ['All', 'Active', 'Draft', 'Closed'] as const;

const EMPTY_CFG: Record<typeof FILTERS[number], {
  icon: IoniconName; iconColor: string; iconBg: string; showCreate: boolean;
}> = {
  All:    { icon: 'megaphone-outline',    iconColor: TabColors.neutral.color,  iconBg: TabColors.neutral.bg,  showCreate: true  },
  Active: { icon: 'flash-outline',        iconColor: TabColors.positive.color, iconBg: TabColors.positive.bg, showCreate: true  },
  Draft:  { icon: 'create-outline',       iconColor: TabColors.warning.color,  iconBg: TabColors.warning.bg,  showCreate: true  },
  Closed: { icon: 'lock-closed-outline',  iconColor: TabColors.closed.color,   iconBg: TabColors.closed.bg,   showCreate: false },
};

const STATUS_CFG = {
  active: { bg: TabColors.positive.bg, color: TabColors.positive.color },
  draft:  { bg: TabColors.warning.bg,  color: TabColors.warning.color  },
  closed: { bg: TabColors.closed.bg,   color: TabColors.closed.color   },
  pending_approval: { bg: TabColors.warning.bg, color: TabColors.warning.color },
} as const;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Tablet/iPad: two cards per row within the MaxWidthContainer-capped width;
// phones stay single-column. 768 matches the common iPad-portrait cutoff
// used elsewhere for responsive breakpoints in this app's design tokens.
const TABLET_BREAKPOINT = 768;

const PAGE_SIZE = 10;
type FilterKey = typeof FILTERS[number];
type TabState = { items: Campaign[]; page: number; total: number; loadingMore: boolean; loaded: boolean };
const emptyTabState = (): TabState => ({ items: [], page: 0, total: 0, loadingMore: false, loaded: false });

const STATUS_PARAM: Record<FilterKey, 'ACTIVE' | 'DRAFT' | 'CLOSED' | undefined> = {
  All: undefined, Active: 'ACTIVE', Draft: 'DRAFT', Closed: 'CLOSED',
};

export default function CampaignsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: allCategories } = useAllCategories();
  const { platforms: allPlatforms } = usePlatforms();
  const toast = useToast();
  const { width: windowWidth } = useWindowDimensions();
  const numColumns = windowWidth >= TABLET_BREAKPOINT ? 2 : 1;
  const [tabData, setTabData] = useState<Record<FilterKey, TabState>>({
    All: emptyTabState(), Active: emptyTabState(), Draft: emptyTabState(), Closed: emptyTabState(),
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All');

  // Search + category — filtered client-side over whatever's currently
  // loaded for the active status tab, same as every other list search in
  // this app (explore-creators, saved-creators): no new backend support.
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchDebounced(search), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const [categoryFilter, setCategoryFilter]         = useState('');
  const [tempCategoryFilter, setTempCategoryFilter] = useState('');
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const activeFilterRef = useRef(activeFilter);
  activeFilterRef.current = activeFilter;
  const listRef = useRef<FlatList<Campaign>>(null);
  useScrollToTopOnTabPress('campaigns', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

  // Invite flow — the sheet shows saved creators by default (or recommended
  // creators automatically when there are none saved), with a link to switch
  // between the two lists either way. Selection/send is shared across both,
  // since inviting just needs creator ids regardless of which list they came from.
  const [inviteCampaign, setInviteCampaign]       = useState<Campaign | null>(null);
  const [savedCreators, setSavedCreators]           = useState<SavedCreatorItem[]>([]);
  const [savedLoading, setSavedLoading]             = useState(false);
  const [listMode, setListMode]                     = useState<'saved' | 'recommended'>('saved');
  const [recommendedCreators, setRecommendedCreators] = useState<ApiCreatorListItem[]>([]);
  const [recommendedLoading, setRecommendedLoading]   = useState(false);
  const [selectedCreators, setSelectedCreators]     = useState<Set<string>>(new Set());
  const [inviteSending, setInviteSending]           = useState(false);
  const [inviteSuccess, setInviteSuccess]           = useState(false);

  async function loadTab(filter: FilterKey, page: number, replace: boolean) {
    if (!replace) setTabData((prev) => ({ ...prev, [filter]: { ...prev[filter], loadingMore: true } }));
    const { campaigns: data, total } = await campaignService.listMy({ page, limit: PAGE_SIZE, status: STATUS_PARAM[filter] });
    setTabData((prev) => {
      const prevItems = replace ? [] : prev[filter].items;
      const seen = new Set(prevItems.map((c) => c.id));
      const merged = [...prevItems, ...data.filter((c) => !seen.has(c.id))];
      return { ...prev, [filter]: { items: merged, page, total, loadingMore: false, loaded: true } };
    });
  }

  async function loadCampaigns(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      await loadTab(activeFilter, 1, true);
    } catch {
      // silently fail — empty state handles it
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingMoreRef.current = false;
    }
  }

  useFocusEffect(useCallback(() => {
    // Only show the full-screen skeleton on the very first load. Later
    // focuses (e.g. coming back from create-campaign or campaign-detail)
    // refresh the tab in view silently in the background instead — clearing
    // its items and flipping loading back to true on every refocus used to
    // blank the list and flash the skeleton on every single back-navigation,
    // even though nothing had changed. loadTab's own setState swaps in fresh
    // items atomically once the fetch resolves, so the old cards just stay
    // on screen until the new ones are ready (same pattern as the creator
    // proposals tab). Other filter tabs are marked stale (not cleared) so a
    // campaign created/edited/closed elsewhere still refetches next time
    // that tab is actually opened, without touching what's on screen now.
    // Reads activeFilter via a ref (not a dependency) so switching filter
    // chips while already focused doesn't re-trigger this and fight
    // selectFilter's own load.
    if (!hasLoadedOnceRef.current) {
      hasLoadedOnceRef.current = true;
      void loadCampaigns();
      return;
    }
    setTabData((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next) as FilterKey[]) {
        if (key !== activeFilterRef.current) next[key] = { ...next[key], loaded: false };
      }
      return next;
    });
    void loadTab(activeFilterRef.current, 1, true);
  }, []));

  const onRefresh = useCallback(() => loadCampaigns(true), [activeFilter]);

  function selectFilter(filter: FilterKey) {
    setActiveFilter(filter);
    if (!tabData[filter].loaded) {
      setLoading(true);
      void loadTab(filter, 1, true).finally(() => setLoading(false));
    }
  }

  function loadMore() {
    const state = tabData[activeFilter];
    if (loadingMoreRef.current || state.loadingMore || state.items.length >= state.total) return;
    loadingMoreRef.current = true;
    void loadTab(activeFilter, state.page + 1, false).finally(() => { loadingMoreRef.current = false; });
  }

  // A status-changing action (e.g. publishing a draft) can move a campaign
  // between tabs — invalidate everything and refetch the tab in view rather
  // than trying to patch each cached tab's items/counts individually.
  function invalidateAllTabs() {
    setTabData({ All: emptyTabState(), Active: emptyTabState(), Draft: emptyTabState(), Closed: emptyTabState() });
  }

  async function loadRecommended(c: Campaign) {
    setRecommendedLoading(true);
    try {
      const results = await creatorService.getRecommendedCreators({
        category:     c.categoryKey,
        lat:          c.locationLat ?? undefined,
        lng:          c.locationLng ?? undefined,
        platforms:    c.platforms,
        minFollowers: c.minFollowersRaw,
        budgetMin:    c.budgetRaw,
        budgetMax:    c.budgetMax,
        limit: 10,
      });
      setRecommendedCreators(results);
    } catch {
      setRecommendedCreators([]);
    } finally {
      setRecommendedLoading(false);
      setListMode('recommended');
    }
  }

  async function openInvite(c: Campaign) {
    setInviteCampaign(c);
    setSelectedCreators(new Set());
    setInviteSuccess(false);
    setListMode('saved');
    setRecommendedCreators([]);
    setSavedLoading(true);
    try {
      const data = await creatorService.getSavedCreators();
      setSavedCreators(data);
      // Nothing saved — go straight to recommended creators instead of an
      // empty picker.
      if (data.length === 0) await loadRecommended(c);
    } catch {
      setSavedCreators([]);
      await loadRecommended(c);
    } finally {
      setSavedLoading(false);
    }
  }

  function switchListMode(mode: 'saved' | 'recommended') {
    if (mode === 'recommended' && recommendedCreators.length === 0 && !recommendedLoading && inviteCampaign) {
      void loadRecommended(inviteCampaign);
    } else {
      setListMode(mode);
    }
  }

  function goViewCreators() {
    setInviteCampaign(null);
    router.push('/(business)/explore-creators');
  }

  function toggleCreator(creatorId: string) {
    setSelectedCreators((prev) => {
      const next = new Set(prev);
      if (next.has(creatorId)) next.delete(creatorId);
      else next.add(creatorId);
      return next;
    });
  }

  async function handleSendInvites() {
    if (!inviteCampaign || selectedCreators.size === 0 || inviteSending) return;
    setInviteSending(true);
    try {
      await creatorService.inviteCreators(inviteCampaign.id, Array.from(selectedCreators));
      setInviteSuccess(true);
      setTimeout(() => setInviteCampaign(null), 1500);
    } catch { /* ignore */ } finally {
      setInviteSending(false);
    }
  }

  async function handlePublishDraft(c: Campaign) {
    if (publishingId) return;
    setPublishingId(c.id);
    try {
      await campaignService.update(c.id, { status: 'active' });
      toast.success(t('campaigns.draftPublished'));
      invalidateAllTabs();
      setLoading(true);
      await loadTab(activeFilter, 1, true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('campaigns.draftPublishFailed'));
    } finally {
      setPublishingId(null);
      setLoading(false);
    }
  }

  function openProposals(c: Campaign) {
    router.push({
      pathname: '/(business)/campaign-proposals',
      params: {
        campaignId:    c.id,
        campaignTitle: c.title,
        campaignType:  c.campaignType ?? 'PAID_CAMPAIGN',
        platform:      c.platforms.join(', '),
      },
    });
  }

  const CAMP_TABS = [
    { key: 'All',    label: t('campaigns.all'),    icon: 'layers-outline'      as const, color: TabColors.neutral.color,  count: tabData.All.total },
    { key: 'Active', label: t('campaigns.active'), icon: 'flash-outline'       as const, color: TabColors.positive.color, count: tabData.Active.total },
    { key: 'Draft',  label: t('campaigns.draft'),  icon: 'create-outline'      as const, color: TabColors.warning.color,  count: tabData.Draft.total },
    { key: 'Closed', label: t('campaigns.closed'), icon: 'lock-closed-outline' as const, color: TabColors.closed.color,   count: tabData.Closed.total },
  ];

  const shown = tabData[activeFilter].items;
  const filterActive = searchDebounced.trim().length > 0 || categoryFilter.length > 0;
  const filtered = shown.filter((c) => {
    if (categoryFilter && c.category !== categoryFilter) return false;
    const q = searchDebounced.trim().toLowerCase();
    if (q && !c.title.toLowerCase().includes(q) && !(c.description ?? '').toLowerCase().includes(q)) return false;
    return true;
  });

  function openCategorySheet() {
    setTempCategoryFilter(categoryFilter);
    setCategorySheetVisible(true);
  }
  function applyCategoryFilter() {
    setCategoryFilter(tempCategoryFilter);
    setCategorySheetVisible(false);
  }
  function clearFilters() {
    setSearch('');
    setSearchDebounced('');
    setCategoryFilter('');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      {/* Search + category filter — the exact same compound pill (search
          card with the filter button docked inside it) as the creator home
          feed's top-header search bar, for a consistent feel. */}
      <View style={styles.searchRow}>
        <Pressable
          style={[styles.searchCard, { backgroundColor: C.surface, borderColor: C.border }, searchFocused && styles.searchCardFocused]}
          onPress={() => searchInputRef.current?.focus()}>
          <Ionicons name="search-outline" size={18} color={searchFocused ? C.brinjal1 : C.textSecondary} style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: C.text }]}
            placeholder={t('campaigns.searchPlaceholder')}
            placeholderTextColor={C.textSecondary}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={10} style={{ marginRight: 6 }}>
              <Ionicons name="close-circle" size={18} color={C.textSecondary} />
            </Pressable>
          )}
          <Pressable
            style={[
              styles.filterBtn,
              { backgroundColor: categoryFilter ? C.brinjal1 : C.primaryLight },
              categoryFilter && { shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
            ]}
            onPress={openCategorySheet}
            hitSlop={6}>
            <Ionicons name="pricetag-outline" size={17} color={categoryFilter ? '#fff' : C.brinjal1} />
          </Pressable>
        </Pressable>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <TabSlider
          tabs={CAMP_TABS}
          active={activeFilter}
          onChange={(k) => selectFilter(k as FilterKey)}
        />
      </View>

      {/* Campaign list */}
      {loading ? (
        <View style={[styles.list, numColumns === 2 && styles.listGrid]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <View key={i} style={numColumns === 2 && styles.cardWrapHalf}>
              <ListRowSkeleton avatarSize={64} avatarRadius={RADIUS.md} withBadge />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          key={numColumns}
          ref={listRef}
          data={filtered}
          keyExtractor={(c) => c.id}
          numColumns={numColumns}
          columnWrapperStyle={numColumns === 2 ? styles.columnWrapper : undefined}
          contentContainerStyle={[styles.list, filtered.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={tabData[activeFilter].loadingMore ? <View style={styles.footerLoading}><ActivityIndicator size="small" color={C.brinjal1} /></View> : null}
          ListEmptyComponent={
            filterActive ? (
              <View style={styles.noResultsWrap}>
                <Ionicons name="search-outline" size={40} color={C.textSecondary} />
                <Text style={[styles.emptyTitle, { color: C.text }]}>{t('campaigns.noResultsTitle')}</Text>
                <Text style={[styles.emptySub, { color: C.textSecondary }]}>{t('campaigns.noResultsSub')}</Text>
                <Pressable onPress={clearFilters} style={styles.emptySwitchRow}>
                  <Text style={[styles.emptySwitchLink, { color: C.brinjal1 }]}>{t('campaigns.clearFiltersBtn')}</Text>
                </Pressable>
              </View>
            ) : (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                {/* Decorative dots */}
                <View style={[styles.emptyDot1, { backgroundColor: EMPTY_CFG[activeFilter].iconBg }]} />
                <View style={[styles.emptyDot2, { backgroundColor: EMPTY_CFG[activeFilter].iconBg }]} />

                {/* Icon */}
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      backgroundColor: EMPTY_CFG[activeFilter].iconBg, shadowColor: EMPTY_CFG[activeFilter].iconColor,
                      shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
                    },
                  ]}
                >
                  <Ionicons
                    name={EMPTY_CFG[activeFilter].icon}
                    size={36}
                    color={EMPTY_CFG[activeFilter].iconColor}
                  />
                </View>

                {/* Text */}
                <Text style={[styles.emptyTitle, { color: C.text }]}>
                  {activeFilter === 'All' ? t('campaigns.emptyNoEvents') : activeFilter === 'Active' ? t('campaigns.emptyNoActive') : activeFilter === 'Draft' ? t('campaigns.emptyNoDrafts') : t('campaigns.emptyNoClosed')}
                </Text>
                <Text style={[styles.emptySub, { color: C.textSecondary }]}>
                  {activeFilter === 'All' ? t('campaigns.emptyNoEventsSub') : activeFilter === 'Active' ? t('campaigns.emptyNoActiveSub') : activeFilter === 'Draft' ? t('campaigns.emptyNoDraftsSub') : t('campaigns.emptyNoClosedSub')}
                </Text>

                {/* Create button */}
                {EMPTY_CFG[activeFilter].showCreate && (
                  <Pressable
                    style={[
                      styles.emptyCreateBtn,
                      {
                        backgroundColor: EMPTY_CFG[activeFilter].iconColor, shadowColor: EMPTY_CFG[activeFilter].iconColor,
                        shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
                      },
                    ]}
                    onPress={() => router.push('/create-campaign')}>
                    <Ionicons name="add-circle-outline" size={16} color="#fff" />
                    <Text style={styles.emptyCreateBtnText}>{t('campaigns.createNewEvent')}</Text>
                  </Pressable>
                )}

                {/* Or switch tab hint for non-All filters */}
                {activeFilter !== 'All' && (
                  <Pressable onPress={() => selectFilter('All')} style={styles.emptySwitchRow}>
                    <Text style={[styles.emptySwitchText, { color: C.textSecondary }]}>{t('campaigns.viewAllEvents')}  </Text>
                    <Text style={[styles.emptySwitchLink, { color: C.brinjal1 }]}>{t('campaigns.seeAll')}</Text>
                  </Pressable>
                )}
              </View>
            </View>
            )
          }
          renderItem={({ item: c }) => {
            const st = STATUS_CFG[c.status ?? 'draft'];
            const meta = getCategoryMeta(allCategories, c.categoryKey ?? c.category);
            const cardImage = c.featureImageUrl ?? getTemplateImage(c.template, c.categoryKey ?? c.category);
            const dateIso = c.campaignType === 'OPEN_EVENT' ? c.eventDate : c.deadline;
            const creatorsCount = c.campaignType === 'OPEN_EVENT' ? c.capacity : c.creatorsNeeded;
            const hasFooterActions = c.proposals > 0 || c.status === 'active' || c.status === 'draft';
            return (
              <View style={[styles.cardWrap, numColumns === 2 && styles.cardWrapHalf]}>
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={[styles.cardAccent, { backgroundColor: st.color }]} />
                <View style={styles.cardBody}>
                <Pressable
                  style={({ pressed }) => [styles.cardContent, pressed && { opacity: 0.92 }]}
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
                        <View style={[styles.tagBadge, { backgroundColor: meta.bg }]}>
                          <FontAwesome5 name={meta.icon} size={9} color={meta.color} />
                          <Text style={[styles.tagBadgeText, { color: meta.color }]}>{c.category}</Text>
                        </View>
                        <View style={[styles.tagBadge, c.campaignType === 'OPEN_EVENT' ? styles.typeBadgeFree : styles.typeBadgePaid]}>
                          <Text style={[styles.tagBadgeText, c.campaignType === 'OPEN_EVENT' ? styles.typeBadgeTextFree : styles.typeBadgeTextPaid]}>
                            {c.campaignType === 'OPEN_EVENT' ? t('business.home.badgeFree') : t('business.home.badgePaid')}
                          </Text>
                        </View>
                        {c.status !== 'draft' && (
                          <View style={[styles.tagBadge, { backgroundColor: st.bg }]}>
                            <Text style={[styles.tagBadgeText, { color: st.color }]}>
                              {c.status === 'active' ? t('campaigns.statusActive')
                                : c.status === 'pending_approval' ? t('campaigns.statusPendingApproval')
                                : t('campaigns.statusClosed')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.postedDay, { color: C.textSecondary }]}>{timeAgo(c.createdAt)}</Text>
                    </View>
                  </View>

                  {/* Details — deadline/creators/budget on the left, platforms on the right */}
                  <View style={[styles.detailsSection, { borderTopColor: C.border, borderBottomColor: C.border }]}>
                    <View style={styles.detailsLeft}>
                      {dateIso && (
                        <View style={styles.detailRow}>
                          <Ionicons name="calendar-outline" size={14} color={C.textSecondary} />
                          <Text style={[styles.detailText, { color: C.textSecondary }]}>{formatShortDate(dateIso)}</Text>
                        </View>
                      )}
                      {!!creatorsCount && (
                        <View style={styles.detailRow}>
                          <Ionicons name="people-outline" size={14} color={C.textSecondary} />
                          <Text style={[styles.detailText, { color: C.textSecondary }]}>{t('createEvent.summaryNCreators', { n: creatorsCount })}</Text>
                        </View>
                      )}
                      {c.campaignType !== 'OPEN_EVENT' && (
                        <View style={styles.detailRow}>
                          <FontAwesome5 name="money-bill-wave" size={12} color={C.textSecondary} />
                          <Text style={[styles.detailText, styles.budgetText, { color: C.text }]}>{c.budget}</Text>
                        </View>
                      )}
                    </View>

                    {c.platforms.length > 0 && (
                      <View style={styles.detailsRight}>
                        {c.platforms.map((p) => {
                          const pMeta = getPlatformMeta(allPlatforms, p);
                          return (
                            <View key={p} style={[styles.socialIcon, { backgroundColor: pMeta.bg }]}>
                              <FontAwesome5 name={pMeta.icon} size={13} color={pMeta.color} />
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>

                  {c.status === 'draft' && (
                    <View style={[styles.tagBadge, styles.draftNote, { backgroundColor: TabColors.warning.bg, alignSelf: 'flex-start' }]}>
                      <Ionicons name="create-outline" size={11} color={TabColors.warning.color} />
                      <Text style={[styles.tagBadgeText, { color: TabColors.warning.color }]}>{t('campaigns.tapToEdit')}</Text>
                    </View>
                  )}
                </Pressable>

                {/* Action buttons */}
                {hasFooterActions && (
                  <View style={styles.buttonContainer}>
                    {c.status === 'active' && (
                      <Pressable
                        style={({ pressed }) => [styles.buttonSecondary, { borderColor: C.border }, pressed && { opacity: 0.7 }]}
                        onPress={() => openInvite(c)}>
                        <FontAwesome5 name="user-plus" size={12} color={C.text} />
                        <Text style={[styles.buttonTextSecondary, { color: C.text }]}>{t('campaigns.invite')}</Text>
                      </Pressable>
                    )}
                    {c.status === 'draft' && (
                      <Pressable
                        style={({ pressed }) => [styles.buttonSecondary, { borderColor: C.border, opacity: publishingId === c.id ? 0.6 : 1 }, pressed && { opacity: 0.7 }]}
                        disabled={publishingId === c.id}
                        onPress={() => handlePublishDraft(c)}>
                        {publishingId === c.id ? (
                          <ActivityIndicator size="small" color={C.text} />
                        ) : (
                          <Ionicons name="cloud-upload-outline" size={13} color={C.text} />
                        )}
                        <Text style={[styles.buttonTextSecondary, { color: C.text }]}>{t('campaigns.publishDraft')}</Text>
                      </Pressable>
                    )}
                    {c.proposals > 0 && (
                      <Pressable
                        style={({ pressed }) => [styles.buttonPrimary, { backgroundColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
                        onPress={() => openProposals(c)}>
                        <Text style={styles.buttonTextPrimary} numberOfLines={1}>
                          {t(c.proposals === 1 ? 'campaigns.viewProposalsBtn' : 'campaigns.viewProposalsBtnPlural', { n: c.proposals })}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Proposals count footer */}
                {c.proposals > 0 && (
                  <View style={[styles.proposalsFooter, { borderTopColor: C.border }]}>
                    <Text style={[styles.proposalsText, { color: C.textSecondary }]}>
                      {t(c.proposals === 1 ? 'campaigns.proposals' : 'campaigns.proposalsPlural', { count: c.proposals })}
                    </Text>
                  </View>
                )}
                </View>
              </View>
              </View>
            );
          }}
        />
      )}

      </MaxWidthContainer>

      {/* Category filter sheet */}
      <FilterSheet
        visible={categorySheetVisible}
        title={t('campaigns.filterCategoryTitle')}
        resetLabel={t('common.reset')}
        applyLabel={t('campaigns.filterShowResults')}
        onApply={applyCategoryFilter}
        onReset={() => setTempCategoryFilter('')}
        onClose={() => setCategorySheetVisible(false)}
      >
        <View>
          <FilterSectionHeader icon="pricetag-outline" label={t('campaigns.filterCategory')} />
          <View style={styles.categoryChipGrid}>
            {allCategories.map((cat) => {
              const active = tempCategoryFilter === cat.name;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setTempCategoryFilter(active ? '' : cat.name)}
                  style={[styles.categoryChip, { borderColor: active ? cat.color : C.border, backgroundColor: active ? cat.iconBg : C.background }]}>
                  <FontAwesome5 name={cat.icon} size={12} color={active ? cat.color : C.textSecondary} />
                  <Text style={[styles.categoryChipText, { color: active ? cat.color : C.text, fontWeight: active ? '700' : '400' }]}>{cat.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </FilterSheet>

      {/* Invite Creators bottom sheet */}
      <Modal
        visible={!!inviteCampaign}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteCampaign(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setInviteCampaign(null)} />
        <View style={[styles.modalSheet, { backgroundColor: C.surface }]}>
          <View style={[styles.modalHandle, { backgroundColor: C.border }]} />

          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <View style={styles.modalHeaderText}>
              <Text style={[styles.modalTitle, { color: C.text }]}>{t('campaigns.inviteModalTitle')}</Text>
              <Text style={[styles.modalSubtitle, { color: C.textSecondary }]} numberOfLines={1}>
                {inviteCampaign?.title}
              </Text>
            </View>
            <Pressable hitSlop={8} style={[styles.modalClose, { backgroundColor: C.background }]} onPress={() => setInviteCampaign(null)}>
              <Ionicons name="close" size={16} color={C.textSecondary} />
            </Pressable>
          </View>

          {inviteSuccess ? (
            <View style={styles.inviteSuccess}>
              <FontAwesome5 name="paper-plane" size={40} color="#3B82F6" solid />
              <Text style={[styles.inviteSuccessText, { color: C.text }]}>{t('campaigns.invitationSent')}</Text>
              <Text style={[styles.inviteSuccessHint, { color: C.textSecondary }]}>
                {t('campaigns.invitationSentSub')}
              </Text>
            </View>
          ) : savedLoading ? (
            <View style={styles.center}><ActivityIndicator size="small" color={C.brinjal1} /></View>
          ) : (
            <>
              {savedCreators.length === 0 ? (
                <View style={styles.inlineNotice}>
                  <Text style={[styles.inlineNoticeTitle, { color: C.text }]}>{t('campaigns.noSavedCreatorsInline')}</Text>
                  <Text style={[styles.inlineNoticeSub, { color: C.textSecondary }]}>{t('campaigns.recommendedBelowIntro')}</Text>
                </View>
              ) : (
                <Pressable
                  style={styles.modeSwitchRow}
                  onPress={() => switchListMode(listMode === 'saved' ? 'recommended' : 'saved')}>
                  <Text style={[styles.modeSwitchText, { color: C.brinjal1 }]}>
                    {listMode === 'saved' ? t('campaigns.seeRecommendedCreators') : t('campaigns.seeSavedCreators')}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={C.brinjal1} />
                </Pressable>
              )}

              {selectedCreators.size > 0 && (
                <View style={[styles.selectionBanner, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.selectionText, { color: C.brinjal1 }]}>
                    {t('campaigns.creatorsSelected', { n: selectedCreators.size })}
                  </Text>
                </View>
              )}

              {recommendedLoading ? (
                <View style={styles.center}><ActivityIndicator size="small" color={C.brinjal1} /></View>
              ) : listMode === 'recommended' && recommendedCreators.length === 0 ? (
                <View style={styles.suggestEmpty}>
                  <FontAwesome5 name="user-friends" size={28} color={C.textSecondary} />
                  <Text style={[styles.inlineNoticeSub, { color: C.textSecondary }]}>{t('campaigns.noSuggestedCreators')}</Text>
                  <Pressable style={[styles.suggestConfirmBtn, { backgroundColor: C.brinjal1, marginTop: 4 }]} onPress={goViewCreators}>
                    <Text style={styles.suggestConfirmText}>{t('campaigns.viewCreatorsBtn')}</Text>
                  </Pressable>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
                  {(listMode === 'recommended'
                    ? recommendedCreators.map((c) => ({ id: c.id, fullName: c.fullName, isVerified: c.isVerified, socialAccounts: c.socialAccounts, distanceKm: c.distanceKm }))
                    : savedCreators.map(({ creator }) => ({ id: creator.id, fullName: creator.fullName, isVerified: creator.isVerified, socialAccounts: creator.socialAccounts, distanceKm: undefined as number | undefined }))
                  ).map((creator) => {
                    const sel = selectedCreators.has(creator.id);
                    const topAcc = [...(creator.socialAccounts ?? [])].sort((a, b) => b.followers - a.followers)[0];
                    const abbr = (creator.fullName ?? 'C').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <Pressable
                        key={creator.id}
                        style={[styles.creatorPickRow, { backgroundColor: sel ? C.primaryLight : C.background, borderColor: sel ? C.brinjal1 : C.border }]}
                        onPress={() => toggleCreator(creator.id)}>
                        <View style={[styles.pickAvatar, { backgroundColor: C.brinjal1 }]}>
                          <Text style={styles.pickAvatarText}>{abbr}</Text>
                        </View>
                        <View style={styles.pickInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={[styles.pickName, { color: C.text }]} numberOfLines={1}>{creator.fullName ?? 'Creator'}</Text>
                            {creator.isVerified && <Ionicons name="checkmark-circle" size={13} color="#3B82F6" />}
                          </View>
                          {(topAcc || creator.distanceKm != null) && (
                            <Text style={[styles.pickSub, { color: C.textSecondary }]} numberOfLines={1}>
                              {topAcc ? `${topAcc.platform} · ${topAcc.followers >= 1000 ? `${(topAcc.followers / 1000).toFixed(1)}K` : topAcc.followers} ${t('campaigns.followersSuffix')}` : ''}
                              {creator.distanceKm != null ? ` · ${creator.distanceKm < 1 ? '<1' : Math.round(creator.distanceKm)} km` : ''}
                            </Text>
                          )}
                        </View>
                        <View style={[styles.checkbox, { borderColor: sel ? C.brinjal1 : C.border, backgroundColor: sel ? C.brinjal1 : 'transparent' }]}>
                          {sel && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}

              <View style={[styles.inviteFooter, { borderTopColor: C.border }]}>
                <Pressable
                  style={[
                    styles.sendInviteBtn,
                    { backgroundColor: selectedCreators.size > 0 ? C.brinjal1 : C.border },
                    selectedCreators.size > 0 && {
                      shadowColor: C.brinjal1, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
                    },
                  ]}
                  onPress={handleSendInvites}
                  disabled={selectedCreators.size === 0 || inviteSending}>
                  <Text style={styles.sendInviteBtnText}>
                    {inviteSending ? t('campaigns.sending') : selectedCreators.size > 0 ? t('campaigns.sendInvite', { n: selectedCreators.size }) : t('campaigns.selectCreatorsToInvite')}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },

  // Search + category filter — same compound search pill (card + docked
  // filter button) as the creator home feed's top-header search bar.
  searchRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  searchCard:  { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, paddingHorizontal: 14, height: 44, borderWidth: 1.5 },
  searchCardFocused: {
    borderColor: '#7C3AED', borderWidth: 2,
    shadowColor: '#7C3AED', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: F.regular },
  filterBtn:   { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },

  // Flush with the page, same as the creator proposals tab bar: no
  // background or shadow of its own, just spacing.
  filterRow: { marginTop: 14 },

  list: { paddingHorizontal: 20, paddingTop: 14, gap: 12, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },
  footerLoading: { paddingVertical: 20 },

  noResultsWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 60, gap: 10 },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  emptyCard: {
    width: '100%', borderRadius: RADIUS.xl, borderWidth: 1,
    alignItems: 'center', paddingHorizontal: 28, paddingVertical: 36, gap: 10,
    overflow: 'hidden',
    ...SHADOW.card,
  },
  emptyDot1: { position: 'absolute', width: 120, height: 120, borderRadius: RADIUS.full, top: -40, right: -30, opacity: 0.5 },
  emptyDot2: { position: 'absolute', width: 80, height: 80, borderRadius: RADIUS.full, bottom: -25, left: -20, opacity: 0.4 },
  emptyIconCircle: { width: 80, height: 80, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 18, textAlign: 'center', fontFamily: F.bold },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular, paddingHorizontal: 8 },
  emptyCreateBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10, borderRadius: RADIUS.full, paddingHorizontal: 22, paddingVertical: 12 },
  emptyCreateBtnText: { color: '#fff', fontSize: 14, fontFamily: F.bold },
  emptySwitchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  emptySwitchText: { fontSize: 12, fontFamily: F.regular },
  emptySwitchLink: { fontSize: 12, fontFamily: F.bold },

  // Category filter sheet chips — same shape as BusinessFilterModal's.
  categoryChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 9 },
  categoryChipText: { fontSize: 13, fontFamily: F.medium },

  // Two-per-row grid on tablet/iPad (numColumns===2) — phones stay single
  // column (numColumns===1, cardWrapHalf unused, columnWrapperStyle unset).
  listGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  columnWrapper: { justifyContent: 'space-between' },
  cardWrap: { borderRadius: RADIUS.lg, ...SHADOW.raised },
  cardWrapHalf: { width: '48%' },
  card: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    flexDirection: 'row',
  },
  cardAccent: { width: 4 },
  // Column wrapper for everything right of the accent stripe — the tappable
  // content (Pressable) plus the action buttons and proposals footer below
  // it, kept out of `card`'s own row flexDirection so they stack vertically
  // instead of sitting beside it.
  cardBody: { flex: 1 },
  cardContent: { padding: 18 },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  titleSection: { flex: 1, gap: 6 },
  eventTitle: { fontSize: 16, fontFamily: F.bold, lineHeight: 21 },
  tagContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, gap: 6 },
  tagBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  tagBadgeText: { fontSize: 11, fontFamily: F.bold },
  typeBadgePaid: { backgroundColor: TabColors.brand.bg },
  typeBadgeFree: { backgroundColor: TabColors.info.bg },
  typeBadgeTextPaid: { color: TabColors.brand.color },
  typeBadgeTextFree: { color: TabColors.info.color },
  postedDay: { fontSize: 12, fontFamily: F.regular },
  thumb: { width: 64, height: 64, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0, overflow: 'hidden' },

  detailsSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 12, marginBottom: 14 },
  detailsLeft:  { gap: 10, flexShrink: 1 },
  detailsRight: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, flexShrink: 0, marginLeft: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, fontFamily: F.regular },
  budgetText: { fontFamily: F.bold },

  socialIcon: { width: 32, height: 32, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },

  draftNote: { marginTop: 8 },

  buttonContainer: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingBottom: 16 },
  buttonPrimary: { flex: 1, minHeight: 42, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  buttonTextPrimary: { color: '#fff', fontSize: 13, fontFamily: F.bold },
  buttonSecondary: { flex: 1, flexDirection: 'row', minHeight: 42, borderRadius: RADIUS.sm, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  buttonTextSecondary: { fontSize: 13, fontFamily: F.bold },

  proposalsFooter: { borderTopWidth: 1, paddingHorizontal: 18, paddingVertical: 12 },
  proposalsText: { fontSize: 12, fontFamily: F.regular },

  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, maxHeight: '75%',
    ...SHADOW.floating,
  },
  modalHandle: { width: 40, height: 4, borderRadius: RADIUS.full, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  modalHeaderText: { flex: 1 },
  modalTitle: { fontSize: 17, fontFamily: F.bold },
  modalSubtitle: { fontSize: 13, marginTop: 2, fontFamily: F.regular },
  modalClose: { width: 28, height: 28, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center' },
  modalList: { padding: 16, gap: 12, paddingBottom: 40 },

  // Invite modal
  inviteSuccess: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  inviteSuccessText: { fontSize: 18, fontFamily: F.bold },
  inviteSuccessHint: { fontSize: 13, textAlign: 'center', fontFamily: F.regular },

  selectionBanner: { paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 16, marginTop: 10, borderRadius: RADIUS.sm },
  selectionText: { fontSize: 13, fontFamily: F.bold },

  creatorPickRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: RADIUS.md, borderWidth: 1.5, padding: 12,
  },
  pickAvatar: { width: 44, height: 44, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  pickAvatarText: { color: '#fff', fontSize: 14, fontFamily: F.bold },
  pickInfo: { flex: 1, gap: 2 },
  pickName: { fontSize: 14, fontFamily: F.bold },
  pickSub: { fontSize: 12, fontFamily: F.regular },
  checkbox: { width: 22, height: 22, borderRadius: RADIUS.full, borderWidth: 2, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },

  inviteFooter: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  sendInviteBtn: { borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center' },
  sendInviteBtnText: { color: '#fff', fontSize: 15, fontFamily: F.bold },

  // Recommended-creators inline section, within the same invite sheet.
  inlineNotice: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, gap: 3, alignItems: 'center' },
  inlineNoticeTitle: { fontSize: 14, fontFamily: F.bold, textAlign: 'center' },
  inlineNoticeSub: { fontSize: 12, fontFamily: F.regular, textAlign: 'center' },
  modeSwitchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 },
  modeSwitchText: { fontSize: 13, fontFamily: F.bold },
  suggestConfirmBtn: { borderRadius: RADIUS.md, height: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  suggestConfirmText: { fontSize: 13, color: '#fff', fontFamily: F.bold, textAlign: 'center' },
  suggestEmpty: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24, gap: 10 },
});
