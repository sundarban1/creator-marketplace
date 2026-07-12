import { useCallback, useEffect, useRef, useState } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
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
import { useLanguage } from '@/context/LanguageContext';
import { campaignService } from '@/services/campaign';
import type { Campaign } from '@/types';
import { F } from '@/utilities/constants';

const PAGE_SIZE = 6;

export default function FeaturedCampaignsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Ref (not state) so the guard is synchronous — a fast double-tap of "Load
  // more" can fire before a state update commits, otherwise triggering the
  // same page fetch twice and appending duplicate campaigns (duplicate keys).
  const loadingMoreRef = useRef(false);

  async function fetchPage(pageNum: number, replace = false) {
    setError('');
    try {
      const res = await campaignService.list({ isFeatured: true, page: pageNum, limit: PAGE_SIZE });
      setCampaigns((prev) => {
        if (replace) return res.campaigns;
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...res.campaigns.filter((c) => !seen.has(c.id))];
      });
      setPage(pageNum);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('creator.featuredCampaigns.loadError'));
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
    if (loadingMoreRef.current || page >= totalPages) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    await fetchPage(page + 1, false);
    setLoadingMore(false);
    loadingMoreRef.current = false;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <BackButton fallback="/(creator)/" />
        <Text style={[styles.headerTitle, { color: C.text }]}>{t('creator.featuredCampaigns.headerTitle')}</Text>
        <View style={{ width: 38 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.brinjal1} />
          <Text style={[styles.loadingText, { color: C.textSecondary }]}>{t('creator.featuredCampaigns.loading')}</Text>
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => { setLoading(true); fetchPage(1, true).finally(() => setLoading(false)); }}>
            <Text style={[styles.retryText, { color: C.brinjal1 }]}>{t('creator.featuredCampaigns.retry')}</Text>
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
              <FontAwesome5 name="star" size={44} color={C.textSecondary} solid style={styles.emptyIcon} />
              <Text style={[styles.emptyTitle, { color: C.text }]}>{t('creator.featuredCampaigns.empty')}</Text>
            </View>
          }
          ListFooterComponent={
            page < totalPages ? (
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                style={[styles.loadMoreBtn, { backgroundColor: C.primaryLight }]}
                onPress={loadMore}
                disabled={loadingMore}>
                {loadingMore
                  ? <ActivityIndicator size="small" color={C.brinjal1} />
                  : <Text style={[styles.loadMoreText, { color: C.brinjal1 }]}>{t('creator.featuredCampaigns.loadMore')}</Text>}
              </Pressable>
            ) : campaigns.length > 0 ? (
              <Text style={[styles.endText, { color: C.textSecondary }]}>
                {t('creator.featuredCampaigns.showingAll', { n: campaigns.length })}
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
  headerTitle: { fontSize: 17, fontFamily: F.bold },
  list: { padding: 16, paddingBottom: 40 },
  separator: { height: 12 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
  loadingText: { fontSize: 14, fontFamily: F.regular },
  errorWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorText: { color: '#DC2626', fontSize: 14, fontFamily: F.regular },
  retryText: { fontSize: 14, fontFamily: F.bold },
  emptyWrap: { paddingTop: 80, alignItems: 'center', gap: 10 },
  emptyIcon: { opacity: 0.6 },
  emptyTitle: { fontSize: 16, fontFamily: F.bold },
  loadMoreBtn: {
    marginTop: 20, marginHorizontal: 20, height: 46,
    borderRadius: 12, justifyContent: 'center', alignItems: 'center',
  },
  loadMoreText: { fontSize: 14, fontFamily: F.bold },
  endText: { textAlign: 'center', fontSize: 12, marginTop: 20, marginBottom: 8, fontFamily: F.regular },
});
