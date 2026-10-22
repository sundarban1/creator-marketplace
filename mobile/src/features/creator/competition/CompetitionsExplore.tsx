// "Competitions" tab of the creator Find Work screen — lists open competitions
// (the old Discover sub-tab). The creator's own competitions + Results live in
// the Applications tab → Competitions (see CompetitionApplications below).
// Search text comes from the Find Work shell's shared search bar via the
// exposed ref (same pattern as the Work/Businesses tabs).
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
import { creatorCompetitionService, type CompetitionCard, type CreatorCompetitionStatus, type JoinedCompetition } from '@/services/competition';
import { TabColors } from '@/utilities/tabColors';
import { RADIUS, SCREEN_GUTTER } from '@/utilities/constants';
import { CompetitionCardItem, JoinedRow } from './parts';

export type CompetitionsExploreHandle = { setSearchText: (text: string) => void };
const PAGE_SIZE = 12;

const openDetail = (id: string) => router.push({ pathname: '/competition-detail', params: { id } });

export const CompetitionsExplore = forwardRef<CompetitionsExploreHandle>(function CompetitionsExplore(_props, ref) {
  const [search, setSearch] = useState('');
  useImperativeHandle(ref, () => ({ setSearchText: setSearch }), []);

  return (
    <View style={{ flex: 1 }}>
      <Browse tab="open" search={search} />
    </View>
  );
});

// ─── Applications tab → Competitions ─────────────────────────────────────────

export type CompetitionAppTab = 'all' | 'action' | 'active' | 'ended' | 'results';

const ACTIVE_STATUSES: CreatorCompetitionStatus[] = ['JOINED', 'SUBMITTED', 'UNDER_REVIEW', 'ADVANCED', 'FINALIST'];
const ENDED_STATUSES: CreatorCompetitionStatus[]  = ['COMPLETED', 'NOT_SELECTED', 'NO_SUBMISSION', 'CANCELLED', 'WITHDRAWN'];

function matchesTab(j: JoinedCompetition, tab: CompetitionAppTab): boolean {
  if (tab === 'action') return j.status === 'SUBMISSION_REQUIRED';
  if (tab === 'active') return ACTIVE_STATUSES.includes(j.status);
  if (tab === 'ended')  return ENDED_STATUSES.includes(j.status);
  return true;
}

/** The creator's joined competitions, split by status, plus public Results. */
export function CompetitionApplications() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<CompetitionAppTab>('all');
  const query = useQuery({ queryKey: ['competitions', 'joined'], queryFn: () => creatorCompetitionService.joined() });
  const joined: JoinedCompetition[] = query.data ?? [];
  const count = (k: CompetitionAppTab) => joined.filter((j) => matchesTab(j, k)).length;

  const tabs = [
    { key: 'all',     label: t('comp.appTabAll'),     icon: 'copy' as const,               color: TabColors.neutral.color,  count: count('all') },
    { key: 'action',  label: t('comp.appTabAction'),  icon: 'exclamation-circle' as const, color: TabColors.warning.color,  count: count('action') },
    { key: 'active',  label: t('comp.appTabActive'),  icon: 'clock' as const,              color: TabColors.brand.color,    count: count('active') },
    { key: 'ended',   label: t('comp.appTabEnded'),   icon: 'flag-checkered' as const,     color: TabColors.closed.color,   count: count('ended') },
    { key: 'results', label: t('comp.tabResults'),    icon: 'award' as const,              color: TabColors.positive.color },
  ];

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.subTabs}>
        <TabSlider tabs={tabs} active={tab} onChange={(k) => setTab(k as CompetitionAppTab)} />
      </View>
      {tab === 'results' ? <Browse tab="results" search="" /> : <MyCompetitions tab={tab} />}
    </View>
  );
}

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

function MyCompetitions({ tab }: { tab: CompetitionAppTab }) {
  const C = useAppColors();
  const { t } = useLanguage();
  // Same query key as CompetitionApplications — React Query shares one request.
  const query = useQuery({ queryKey: ['competitions', 'joined'], queryFn: () => creatorCompetitionService.joined() });
  const items: JoinedCompetition[] = (query.data ?? []).filter((j) => matchesTab(j, tab));

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
      ListEmptyComponent={
        tab === 'all'
          ? <EmptyState faIcon="trophy" title={t('comp.emptyMineTitle')} subtitle={t('comp.emptyMineBody')}
              action={{ label: t('comp.browseCompetitions'), onPress: () => router.push({ pathname: '/(creator)/(tabs)/discover', params: { tab: 'competitions' } }) }} />
          : <EmptyState faIcon="trophy" title={t('comp.emptyFilteredTitle')} />
      }
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
  // Same spacing as the Paid/Open status sub-menu in proposals.tsx (tabBar marginTop 8, list starts 16 below).
  subTabs: { marginTop: 8, paddingBottom: 12 },
  list:    { paddingHorizontal: SCREEN_GUTTER, paddingTop: 4, paddingBottom: 120, flexGrow: 1 },
});
