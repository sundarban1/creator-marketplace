// Guest → Competitions: open competitions + published results, from the
// public /api/competitions feed. Detail is the shared competition-detail
// screen, where Join asks a guest to log in first.
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/EmptyState';
import { SearchInput } from '@/components/SearchInput';
import { TabSlider } from '@/components/TabSlider';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { CompetitionCardItem } from '@/features/creator/competition/parts';
import { GuestHeader, RowSkeletons } from '@/features/guest/components';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { STALE } from '@/lib/queryClient';
import { creatorCompetitionService } from '@/services/competition';
import { SCREEN_GUTTER, SPACING } from '@/utilities/constants';

type Tab = 'open' | 'results';
const PAGE_SIZE = 12;

export default function GuestCompetitionsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [q] = useDebouncedValue(search.trim(), 350);
  // `?tab=results` (e.g. from guest home's empty state) opens on Results.
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'results' ? 'results' : 'open');
  const [seenParam, setSeenParam] = useState(params.tab);
  // Tabs stay mounted, so a later navigate with a new ?tab must still switch.
  if (params.tab !== seenParam) {
    setSeenParam(params.tab);
    if (params.tab === 'results' || params.tab === 'open') setTab(params.tab);
  }
  const listRef = useRef<FlatList>(null);
  useScrollToTopOnTabPress('guest-competitions', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

  const query = useInfiniteQuery({
    queryKey: ['guest', 'competitions', tab, q],
    queryFn: ({ pageParam }) => creatorCompetitionService.discover({ tab, q: q || undefined, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined),
    // Keep old results while a search is typed; not across a filter switch.
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[2] === tab ? prev : undefined),
    staleTime: STALE.list,
  });
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  const tabs = [
    { key: 'open',    label: t('guest.competitions.open'),    icon: 'trophy' as const, color: C.accent },
    { key: 'results', label: t('guest.competitions.results'), icon: 'award' as const,  color: '#059669' },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <GuestHeader title={t('guest.tab.competitions')} />
      <View style={s.controls}>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('guest.competitions.search')}
          returnKeyType="search"
          accessibilityLabel={t('guest.competitions.search')}
        />
        <TabSlider tabs={tabs} active={tab} onChange={(k) => setTab(k as Tab)} justify />
      </View>

      {/* One FlatList stays mounted through loading → data (avoids the first-visit
          layout jump from swapping a skeleton View for a new list). */}
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <CompetitionCardItem c={item} showSummary onPress={() => router.push({ pathname: '/competition-detail', params: { id: item.id } })} />
        )}
        contentContainerStyle={s.list}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
        ItemSeparatorComponent={Gap}
        keyboardDismissMode="on-drag"
        onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} tintColor={C.accent} />}
        ListEmptyComponent={
          query.isPending ? (
            <RowSkeletons count={3} height={280} />
          ) : query.isError ? (
            <EmptyState faIcon="wifi" title={t('guest.loadFailed')} action={{ label: t('guest.retry'), onPress: () => void query.refetch() }} />
          ) : (
              <EmptyState
                faIcon="trophy"
                title={q ? t('guest.empty.searchTitle') : tab === 'results' ? t('comp.emptyResultsTitle') : t('guest.empty.competitions')}
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
  return <View style={{ height: SPACING.lg }} />;
}

const s = StyleSheet.create({
  safe:     { flex: 1 },
  controls: { paddingHorizontal: SCREEN_GUTTER, gap: SPACING.md, paddingBottom: SPACING.md },
  list:     { paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxl, flexGrow: 1 },
});
