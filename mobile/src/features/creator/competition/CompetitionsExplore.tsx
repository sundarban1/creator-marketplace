// "Competitions" tab of the creator Find Work screen — mobile counterpart of
// web/src/app/competitions/CreatorCompetitionsPage.tsx: Discover / My
// competitions / Results. Search text comes from the Find Work shell's shared
// search bar via the exposed ref (same pattern as the Work/Businesses tabs).
import { forwardRef, useImperativeHandle, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { TabSlider } from '@/components/TabSlider';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { creatorCompetitionService, type CompetitionCard, type JoinedCompetition } from '@/services/competition';
import { TabColors } from '@/utilities/tabColors';
import { RADIUS, SCREEN_GUTTER } from '@/utilities/constants';
import { CompetitionCardItem, JoinedRow } from './parts';

export type CompetitionsExploreHandle = { setSearchText: (text: string) => void };
type SubTab = 'discover' | 'mine' | 'results';
const PAGE_SIZE = 12;

const openDetail = (id: string) => router.push({ pathname: '/competition-detail', params: { id } });

export const CompetitionsExplore = forwardRef<CompetitionsExploreHandle>(function CompetitionsExplore(_props, ref) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<SubTab>('discover');
  const [search, setSearch] = useState('');
  useImperativeHandle(ref, () => ({ setSearchText: setSearch }), []);

  const tabs = [
    { key: 'discover', label: t('comp.tabDiscover'), icon: 'trophy' as const,       color: TabColors.warning.color },
    { key: 'mine',     label: t('comp.tabMine'),     icon: 'user-check' as const,   color: TabColors.brand.color },
    { key: 'results',  label: t('comp.tabResults'),  icon: 'award' as const,        color: TabColors.positive.color },
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.subTabs}>
        <TabSlider tabs={tabs} active={tab} onChange={(k) => setTab(k as SubTab)} />
      </View>
      {tab === 'mine' ? <MyCompetitions /> : <Browse key={tab} tab={tab === 'results' ? 'results' : 'open'} search={search} />}
    </View>
  );
});

function Browse({ tab, search }: { tab: 'open' | 'results'; search: string }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [q] = useDebouncedValue(search.trim(), 300);
  const query = useInfiniteQuery({
    queryKey: ['competitions', 'discover', tab, q],
    queryFn: ({ pageParam }) => creatorCompetitionService.discover({ tab, q: q || undefined, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
  const items: CompetitionCard[] = query.data?.pages.flatMap((p) => p.items) ?? [];

  if (query.isPending) return <ListSkeleton tall />;
  if (query.isError) {
    return <EmptyState faIcon="exclamation-circle" title={t('common.somethingWentWrong')} action={{ label: t('common.retry'), onPress: () => void query.refetch() }} />;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(c) => c.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <CompetitionCardItem c={item} onPress={() => openDetail(item.id)} />}
      ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
      onEndReached={() => { if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage(); }}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} tintColor={C.brinjal1} />}
      ListEmptyComponent={
        <EmptyState
          faIcon="trophy"
          title={tab === 'results' ? t('comp.emptyResultsTitle') : t('comp.emptyDiscoverTitle')}
          subtitle={tab === 'results' ? t('comp.emptyResultsBody') : t('comp.emptyDiscoverBody')}
        />
      }
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={{ paddingVertical: 16 }} color={C.brinjal1} /> : null}
    />
  );
}

function MyCompetitions() {
  const C = useAppColors();
  const { t } = useLanguage();
  const query = useQuery({ queryKey: ['competitions', 'joined'], queryFn: () => creatorCompetitionService.joined() });
  const items: JoinedCompetition[] = query.data ?? [];

  if (query.isPending) return <ListSkeleton />;
  if (query.isError) {
    return <EmptyState faIcon="exclamation-circle" title={t('common.somethingWentWrong')} action={{ label: t('common.retry'), onPress: () => void query.refetch() }} />;
  }
  return (
    <FlatList
      data={items}
      keyExtractor={(j) => j.participantId}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <JoinedRow j={item} onPress={() => openDetail(item.competition.id)} />}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={C.brinjal1} />}
      ListEmptyComponent={<EmptyState faIcon="trophy" title={t('comp.emptyMineTitle')} subtitle={t('comp.emptyMineBody')} />}
    />
  );
}

function ListSkeleton({ tall }: { tall?: boolean }) {
  return (
    <View style={styles.list}>
      {[0, 1, 2].map((i) => <Skeleton key={i} width="100%" height={tall ? 300 : 110} radius={RADIUS.lg} style={{ marginBottom: 14 }} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  subTabs: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: 8 },
  list:    { paddingHorizontal: SCREEN_GUTTER, paddingTop: 4, paddingBottom: 120, flexGrow: 1 },
});
