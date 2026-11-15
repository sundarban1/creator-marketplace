// Guest → Events: every published opportunity (paid campaigns + free open
// events), searchable, paged. Same public /api/campaigns feed creators browse;
// opening one goes to the shared campaign-detail screen (Apply asks to log in).
import { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/EmptyState';
import { SearchInput } from '@/components/SearchInput';
import { TabSlider } from '@/components/TabSlider';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { CampaignListItem } from '@/features/creator/components/CampaignListItem';
import { GuestHeader, RowSkeletons } from '@/features/guest/components';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { STALE } from '@/lib/queryClient';
import { campaignService } from '@/services/campaign';
import { SCREEN_GUTTER, SPACING } from '@/utilities/constants';

type TypeFilter = 'all' | 'PAID_CAMPAIGN' | 'OPEN_EVENT';
const PAGE_SIZE = 15;

export default function GuestEventsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [q] = useDebouncedValue(search.trim(), 350);
  const [type, setType] = useState<TypeFilter>('all');
  const listRef = useRef<FlatList>(null);
  useScrollToTopOnTabPress('guest-events', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

  const query = useInfiniteQuery({
    queryKey: ['guest', 'events', type, q],
    queryFn: ({ pageParam }) => campaignService.list({
      search: q || undefined,
      campaignType: type === 'all' ? undefined : type,
      page: pageParam,
      limit: PAGE_SIZE,
    }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    // Keep old results while a search is typed; not across a filter switch.
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[2] === type ? prev : undefined),
    staleTime: STALE.list,
  });
  const items = query.data?.pages.flatMap((p) => p.campaigns) ?? [];

  const tabs = [
    { key: 'all',           label: t('guest.events.all'),  icon: 'th-large' as const,  color: C.accent },
    { key: 'PAID_CAMPAIGN', label: t('guest.events.paid'), icon: 'wallet' as const,    color: '#4F46E5' },
    { key: 'OPEN_EVENT',    label: t('guest.events.open'), icon: 'door-open' as const, color: '#059669' },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.background }]} edges={['top']}>
      <GuestHeader title={t('guest.tab.events')} />
      <View style={s.controls}>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('guest.events.search')}
          returnKeyType="search"
          accessibilityLabel={t('guest.events.search')}
        />
        <TabSlider tabs={tabs} active={type} onChange={(k) => setType(k as TypeFilter)} justify />
      </View>

      {/* One FlatList stays mounted through loading → data (avoids the first-visit
          layout jump from swapping a skeleton View for a new list). */}
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <CampaignListItem campaign={item} />}
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
            <RowSkeletons count={6} height={96} />
          ) : query.isError ? (
            <EmptyState faIcon="wifi" title={t('guest.loadFailed')} action={{ label: t('guest.retry'), onPress: () => void query.refetch() }} />
          ) : (
              <EmptyState faIcon="briefcase" title={q ? t('guest.empty.searchTitle') : t('guest.empty.events')} subtitle={q ? t('guest.empty.searchBody') : undefined} />
          )
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={{ paddingVertical: SPACING.lg }} color={C.accent} /> : null}
      />
    </SafeAreaView>
  );
}

function Gap() {
  return <View style={{ height: SPACING.md }} />;
}

const s = StyleSheet.create({
  safe:     { flex: 1 },
  controls: { paddingHorizontal: SCREEN_GUTTER, gap: SPACING.md, paddingBottom: SPACING.md },
  list:     { paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxl, flexGrow: 1 },
});
