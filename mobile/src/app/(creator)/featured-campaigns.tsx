import { useCallback, useEffect, useState } from 'react';
import { BackButton } from '@/components/BackButton';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CampaignListItem } from '@/features/creator/components/CampaignListItem';
import { useAppColors } from '@/context/ThemeContext';
import { campaignService } from '@/services/campaign';
import type { Campaign } from '@/types';

const PAGE_SIZE = 6;

export default function FeaturedCampaignsScreen() {
  const C = useAppColors();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function fetchPage(pageNum: number, replace = false) {
    setError('');
    try {
      const res = await campaignService.list({ isFeatured: true, page: pageNum, limit: PAGE_SIZE });
      setCampaigns((prev) => replace ? res.campaigns : [...prev, ...res.campaigns]);
      setPage(pageNum);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load campaigns');
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchPage(1, true).finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPage(1, true).finally(() => setRefreshing(false));
  }, []);

  async function loadMore() {
    if (loadingMore || page >= totalPages) return;
    setLoadingMore(true);
    await fetchPage(page + 1, false);
    setLoadingMore(false);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <BackButton fallback="/(creator)/" />
        <Text style={[styles.headerTitle, { color: C.text }]}>⭐ Featured Campaigns</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.brinjal1} />
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>Loading…</Text>
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => { setLoading(true); fetchPage(1, true).finally(() => setLoading(false)); }}>
            <Text style={[styles.retryText, { color: C.brinjal1 }]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={campaigns}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CampaignListItem campaign={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.brinjal1} />}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyEmoji}>⭐</Text>
              <Text style={[styles.emptyTitle, { color: C.text }]}>No featured campaigns yet</Text>
            </View>
          }
          ListFooterComponent={
            page < totalPages ? (
              <Pressable
                style={[styles.loadMoreBtn, { backgroundColor: C.primaryLight }]}
                onPress={loadMore}
                disabled={loadingMore}>
                {loadingMore
                  ? <ActivityIndicator size="small" color={C.brinjal1} />
                  : <Text style={[styles.loadMoreText, { color: C.brinjal1 }]}>Load More</Text>}
              </Pressable>
            ) : campaigns.length > 0 ? (
              <Text style={[styles.endText, { color: C.textSecondary }]}>
                Showing all {campaigns.length} featured campaigns
              </Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 40 },
  separator: { height: 12 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 14 },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { color: '#DC2626', fontSize: 14 },
  retryText: { fontSize: 14, fontWeight: '700' },
  emptyWrap: { paddingTop: 80, alignItems: 'center', gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  loadMoreBtn: {
    marginTop: 20, marginHorizontal: 20, height: 46,
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  loadMoreText: { fontSize: 14, fontWeight: '700' },
  endText: { textAlign: 'center', fontSize: 12, marginTop: 20, marginBottom: 8 },
});
