// Guest → Discover: browse talent and the businesses hiring it. Creators come
// from /api/public/creators?publicOnly=true — only profiles the creator opted
// to make public; businesses from /api/public/businesses (active only, private
// ones open as a masked profile).
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/EmptyState';
import { SearchInput } from '@/components/SearchInput';
import { TabSlider } from '@/components/TabSlider';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { BusinessRow, CreatorRow, GuestHeader, RowSkeletons } from '@/features/guest/components';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { STALE } from '@/lib/queryClient';
import { publicService } from '@/services/public';
import type { ApiCreatorListItem } from '@/services/creator';
import type { BusinessListItem } from '@/services/business';
import { SCREEN_GUTTER, SPACING } from '@/utilities/constants';

type Tab = 'creators' | 'businesses';
const PAGE_SIZE = 20;

type Row = { kind: 'creator'; item: ApiCreatorListItem } | { kind: 'business'; item: BusinessListItem };

export default function GuestDiscoverScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [q] = useDebouncedValue(search.trim(), 350);
  const [tab, setTab] = useState<Tab>('creators');
  const listRef = useRef<FlatList<Row>>(null);
  useScrollToTopOnTabPress('guest-discover', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

  const query = useInfiniteQuery({
    queryKey: ['guest', 'discover', tab, q],
    queryFn: async ({ pageParam }): Promise<{ rows: Row[]; total: number; page: number }> => {
      if (tab === 'creators') {
        const r = await publicService.listCreators({ page: pageParam, limit: PAGE_SIZE, search: q || undefined });
        return { rows: r.creators.map((item) => ({ kind: 'creator', item })), total: r.total, page: pageParam };
      }
      const r = await publicService.listBusinesses({ page: pageParam, limit: PAGE_SIZE, search: q || undefined });
      return { rows: r.businesses.map((item) => ({ kind: 'business', item })), total: r.total, page: pageParam };
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page * PAGE_SIZE < last.total ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
    staleTime: STALE.list,
  });
  const allRows = query.data?.pages.flatMap((p) => p.rows) ?? [];
  // keepPreviousData keeps the OTHER tab's rows on screen while the new tab
  // loads — show the skeleton instead of a flash of the wrong list.
  const wantKind = tab === 'creators' ? 'creator' : 'business';
  const showingStale = query.isPlaceholderData && allRows.length > 0 && allRows[0].kind !== wantKind;
  const loading = query.isPending || showingStale;
  const rows = loading ? [] : allRows;

  const tabs = [
    { key: 'creators',   label: t('guest.discover.creators'),   icon: 'user-friends' as const, color: C.accent },
    { key: 'businesses', label: t('guest.discover.businesses'), icon: 'store' as const,        color: '#4F46E5' },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <GuestHeader title={t('guest.tab.discover')} />
      <View style={s.controls}>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder={tab === 'creators' ? t('guest.discover.searchCreators') : t('guest.discover.searchBusinesses')}
          returnKeyType="search"
          accessibilityLabel={t('guest.discover.searchCreators')}
        />
        <TabSlider tabs={tabs} active={tab} onChange={(k) => setTab(k as Tab)} justify />
      </View>

      {/* One FlatList stays mounted through loading → data. Swapping a
          skeleton View for a freshly mounted list made the first rows settle a
          few points higher on iOS (visible "pull up" on first visit). */}
      <FlatList
        ref={listRef}
        data={rows}
        keyExtractor={(r) => `${r.kind}-${r.item.id}`}
        renderItem={({ item }) => item.kind === 'creator' ? <CreatorRow creator={item.item} /> : <BusinessRow business={item.item} />}
        contentContainerStyle={s.list}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        ItemSeparatorComponent={Gap}
        keyboardDismissMode="on-drag"
        onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} tintColor={C.accent} />}
        ListEmptyComponent={
          loading ? (
            <RowSkeletons count={7} height={78} />
          ) : query.isError ? (
            <EmptyState faIcon="wifi" title={t('guest.loadFailed')} action={{ label: t('guest.retry'), onPress: () => void query.refetch() }} />
          ) : (
            <EmptyState
              faIcon={tab === 'creators' ? 'users' : 'store'}
              title={q ? t('guest.empty.searchTitle') : tab === 'creators' ? t('guest.empty.creators') : t('guest.empty.businesses')}
              subtitle={q ? t('guest.empty.searchBody') : undefined}
            />
          )
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={{ paddingVertical: SPACING.lg }} color={C.accent} /> : null}
      />
    </SafeAreaView>
  );
}

function Gap() {
  return <View style={{ height: SPACING.sm }} />;
}

const s = StyleSheet.create({
  safe:     { flex: 1 },
  controls: { paddingHorizontal: SCREEN_GUTTER, gap: SPACING.md, paddingBottom: SPACING.md },
  list:     { paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxl, flexGrow: 1 },
});
