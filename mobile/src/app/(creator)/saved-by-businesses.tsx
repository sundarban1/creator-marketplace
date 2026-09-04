import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchInput } from '@/components/SearchInput';
import { BackButton } from '@/components/BackButton';
import { EntityCard } from '@/components/EntityCard';
import { realImageUrl } from '@/utilities/avatar';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { businessService, type BusinessListItem } from '@/services/business';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { useRefetchOnFocusIfStale } from '@/hooks/useRefetchOnFocusIfStale';
import { STALE } from '@/lib/queryClient';
import { ExploreCardSkeleton } from '@/components/ExploreCardSkeleton';
import { useCategories, getCategoryMeta } from '@/hooks/useCategories';
import { prefetchBusiness } from '@/lib/prefetch';
import { F, SCREEN_GUTTER, SPACING } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';

function BusinessCard({
  item,
  isFavorited,
  onToggleFavorite,
}: {
  item: BusinessListItem;
  isFavorited: boolean;
  onToggleFavorite: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { categories: businessCategories } = useCategories('BUSINESS');
  const primaryMeta = item.categories.length > 0 ? getCategoryMeta(businessCategories, item.categories[0]) : null;
  const extraCats = item.categories.length - 1;
  const hasEvents = item._count.campaigns > 0;
  const initials = (item.businessName ?? 'Business').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const logoUrl = realImageUrl(item.logoUrl);
  const plainAvatar = !logoUrl;

  return (
    <EntityCard
      avatarUrl={logoUrl}
      avatarBg="#FFFFFF"
      initials={initials}
      initialsColor={plainAvatar ? '#000000' : undefined}
      circularAvatar
      ringColor={plainAvatar ? '#000000' : (primaryMeta?.color ?? C.brinjal1)}
      name={item.businessName ?? 'Business'}
      verified={item.fullyVerified || item.isVerified}
      description={item.description || t('explore.businesses.noDescription')}
      descriptionItalic={!item.description}
      categoryLabel={primaryMeta ? item.categories[0] : undefined}
      categoryIcon={primaryMeta?.icon}
      categoryColor={primaryMeta?.color}
      categoryBg={primaryMeta?.bg}
      extraCount={extraCats}
      stat={{
        icon: 'bullhorn',
        iconSet: 'ionicons',
        color: hasEvents ? C.brinjal1 : C.textSecondary,
        text: hasEvents ? t('explore.businesses.campaignsBadge', { n: item._count.campaigns }) : t('explore.businesses.noEventsYet'),
      }}
      ctaLabel={t('explore.businesses.viewBusiness')}
      onPressIn={() => prefetchBusiness(queryClient, item.id)}
      onPress={() => router.push({ pathname: '/(creator)/business-detail', params: { id: item.id } } as never)}
      action={{
        active: isFavorited,
        onToggle: onToggleFavorite,
        activeIcon: 'heart',
        inactiveIcon: 'heart',
        activeColor: '#EF4444',
        activeBg: '#FEE2E2',
      }}
    />
  );
}

const EMPTY_BUSINESSES: BusinessListItem[] = [];

export default function SavedByBusinessesScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const [search, setSearch]   = useState('');
  const { favoriteIds, toggle } = useFavoriteBusinesses();

  const savedByQuery = useQuery({
    queryKey: ['businesses', 'savedBy'],
    queryFn: () => businessService.getSavedByBusinesses(),
    staleTime: STALE.list,
  });
  useRefetchOnFocusIfStale(savedByQuery);
  const items = savedByQuery.data ?? EMPTY_BUSINESSES;
  const loading = savedByQuery.isPending;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => (i.businessName ?? '').toLowerCase().includes(q));
  }, [items, search]);

  async function handleToggleFavorite(businessId: string) {
    const wasFavorited = favoriteIds.has(businessId);
    try {
      const isFavorited = await toggle(businessId);
      if (isFavorited) toast.success(t('explore.businesses.addedToFavorites'));
    } catch {
      toast.error(wasFavorited ? t('explore.businesses.couldNotRemoveFav') : t('explore.businesses.couldNotAddFav'));
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
        <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]} accessibilityRole="header" accessibilityLabel={t('savedByBusinesses.title')}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <SearchInput
              placeholder={t('explore.businesses.searchPlaceholder')}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>
        </View>

        {loading ? (
          <View style={s.list}>
            {[0, 1, 2, 3, 4].map((i) => <ExploreCardSkeleton key={i} />)}
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <BusinessCard
                item={item}
                isFavorited={favoriteIds.has(item.id)}
                onToggleFavorite={() => { void handleToggleFavorite(item.id); }}
              />
            )}
            contentContainerStyle={[s.list, filteredItems.length === 0 && s.listEmpty]}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            ListEmptyComponent={
              search ? (
                <View style={s.empty}>
                  <FontAwesome5 name="search" solid size={40} color={C.textSecondary} style={s.emptyIcon} />
                  <Text style={[s.emptyTitle, { color: C.text }]}>{t('explore.businesses.noResultsFiltered')}</Text>
                  <Text style={[s.emptyHint, { color: C.textSecondary }]}>{t('explore.businesses.noResultsFilteredSub')}</Text>
                </View>
              ) : (
                <View style={s.empty}>
                  <FontAwesome5 name="bookmark" size={40} color={C.textSecondary} style={s.emptyIcon} />
                  <Text style={[s.emptyTitle, { color: C.text }]}>{t('savedByBusinesses.empty')}</Text>
                  <Text style={[s.emptyHint, { color: C.textSecondary }]}>{t('savedByBusinesses.emptySub')}</Text>
                </View>
              )
            }
          />
        )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md, paddingBottom: SPACING.md, gap: 12, borderBottomWidth: 1 },

  list:      { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
  listEmpty: { flexGrow: 1 },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyIcon:  { marginBottom: 2 },
  emptyTitle: { fontSize: 18, fontFamily: F.bold },
  emptyHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
});
