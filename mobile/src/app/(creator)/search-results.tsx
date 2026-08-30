import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Animated, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '@/components/BackButton';
import { EntityCard } from '@/components/EntityCard';
import { realImageUrl } from '@/utilities/avatar';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { TabSlider } from '@/components/TabSlider';
import { useTabTransition } from '@/hooks/useTabTransition';
import { CampaignListItem } from '@/features/creator/components/CampaignListItem';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCategories, getCategoryMeta } from '@/hooks/useCategories';
import { campaignService } from '@/services/campaign';
import { businessService, type BusinessListItem } from '@/services/business';
import { serviceService, type ApiService } from '@/services/service';
import { OfflineError } from '@/lib/api';
import type { Campaign } from '@/types';
import { F, SCREEN_GUTTER, SPACING } from '@/utilities/constants';

// Each entity's own search-capable endpoint is fetched once per query and kept
// in state — switching tabs below is purely a local re-render, no refetch.
// Capped to a flat page (no pagination yet) — deliberately deferred, this is
// the first phase of the unified search feature.
const RESULTS_LIMIT = 20;

const PRICING_MODEL_LABEL: Record<ApiService['pricingModel'], string> = {
  PER_PROJECT:  'servicesScreen.pricingPerProject',
  PER_HOUR:     'servicesScreen.pricingPerHour',
  PER_DAY:      'servicesScreen.pricingPerDay',
  PER_CAMPAIGN: 'servicesScreen.pricingPerCampaign',
  CUSTOM_QUOTE: 'servicesScreen.pricingCustomQuote',
};

type Tab = 'opportunities' | 'businesses' | 'services';

// Left-to-right order — drives the slide direction when switching results.
const TAB_ORDER: readonly Tab[] = ['opportunities', 'businesses', 'services'];

type Row =
  | { kind: 'campaign'; campaign: Campaign }
  | { kind: 'business'; business: BusinessListItem }
  | { kind: 'service'; service: ApiService };

function BusinessResultCard({ item }: { item: BusinessListItem }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: businessCategories } = useCategories('BUSINESS');
  const primaryMeta = item.categories.length > 0 ? getCategoryMeta(businessCategories, item.categories[0]) : null;
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
      extraCount={item.categories.length - 1}
      stat={{
        icon: 'bullhorn',
        color: item._count.campaigns > 0 ? C.brinjal1 : C.textSecondary,
        text: item._count.campaigns > 0 ? t('explore.businesses.campaignsBadge', { n: item._count.campaigns }) : t('explore.businesses.noEventsYet'),
      }}
      ctaLabel={t('explore.businesses.viewBusiness')}
      onPress={() => router.push({ pathname: '/(creator)/business-detail', params: { id: item.id } } as never)}
    />
  );
}

function ServiceResultCard({ item }: { item: ApiService }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const provider = item.creatorProfile;
  const initials = provider?.fullName ? provider.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() : undefined;
  const plainAvatar = !provider?.avatarUrl;

  return (
    <EntityCard
      avatarUrl={provider?.avatarUrl ?? null}
      avatarBg="#FFFFFF"
      initials={initials}
      initialsColor={plainAvatar ? '#000000' : undefined}
      circularAvatar
      ringColor={plainAvatar ? '#000000' : item.category.color}
      name={item.name}
      verified={provider?.isVerified ?? false}
      locationText={[provider?.fullName, provider?.location].filter(Boolean).join(' · ') || undefined}
      bio={item.description}
      categoryLabel={item.category.name}
      categoryIcon={item.category.icon}
      categoryColor={item.category.color}
      categoryBg={item.category.iconBg}
      stat={{
        icon: 'tag',
        color: C.brinjal1,
        text: item.startingPrice != null ? `Rs. ${item.startingPrice.toLocaleString()}` : t(PRICING_MODEL_LABEL[item.pricingModel]),
      }}
      ctaLabel={t('search.viewService')}
      onPress={() => router.push({ pathname: '/(creator)/creator-detail', params: { id: item.creatorProfileId } } as never)}
    />
  );
}

export default function SearchResultsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const { q } = useLocalSearchParams<{ q: string }>();
  const query = q ?? '';

  const [tab, setTab]         = useState<Tab>('opportunities');
  const panelStyle = useTabTransition(tab, TAB_ORDER);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [campaigns, setCampaigns]           = useState<Campaign[]>([]);
  const [campaignsTotal, setCampaignsTotal] = useState(0);
  const [businesses, setBusinesses]           = useState<BusinessListItem[]>([]);
  const [businessesTotal, setBusinessesTotal] = useState(0);
  const [services, setServices]           = useState<ApiService[]>([]);
  const [servicesTotal, setServicesTotal] = useState(0);

  const load = useCallback(async () => {
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const [c, b, s] = await Promise.all([
        campaignService.list({ search: query, limit: RESULTS_LIMIT }),
        businessService.listBusinesses({ search: query, limit: RESULTS_LIMIT }),
        serviceService.listPublic({ search: query, limit: RESULTS_LIMIT }),
      ]);
      setCampaigns(c.campaigns); setCampaignsTotal(c.total);
      setBusinesses(b.businesses); setBusinessesTotal(b.total);
      setServices(s.items); setServicesTotal(s.total);
    } catch (err) {
      setError(err instanceof OfflineError ? t('search.errorMessage') : (err instanceof Error ? err.message : t('search.errorMessage')));
    } finally {
      setLoading(false);
    }
  }, [query, t]);

  useEffect(() => { void load(); }, [load]);

  const tabs = [
    { key: 'opportunities' as const, label: t('search.tabOpportunities'), count: campaignsTotal },
    { key: 'businesses' as const,    label: t('search.tabBusinesses'),    count: businessesTotal },
    { key: 'services' as const,      label: t('search.tabServices'),      count: servicesTotal },
  ];

  const activeCount = tab === 'opportunities' ? campaignsTotal : tab === 'businesses' ? businessesTotal : servicesTotal;

  let rows: Row[] = [];
  if (tab === 'opportunities') rows = campaigns.map((campaign) => ({ kind: 'campaign', campaign }));
  else if (tab === 'businesses') rows = businesses.map((business) => ({ kind: 'business', business }));
  else rows = services.map((service) => ({ kind: 'service', service }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
        <View style={styles.header}>
          <BackButton />
          <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>{query}</Text>
        </View>

        <View style={{ marginTop: 4 }}>
          <TabSlider tabs={tabs} active={tab} onChange={(key) => setTab(key as Tab)} justify />
        </View>

        <Animated.View style={[styles.panel, panelStyle]}>
          {loading ? (
            <View style={styles.list}>
              {[0, 1, 2].map((i) => <ListRowSkeleton key={i} />)}
            </View>
          ) : error ? (
            <ErrorState
              title={t('search.errorTitle')}
              message={error}
              actionLabel={t('search.retry')}
              onAction={() => void load()}
            />
          ) : rows.length === 0 ? (
            <EmptyState icon="search" title={t('search.emptyTitle')} subtitle={t('search.emptySub')} />
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(row) => row.kind === 'campaign' ? `c-${row.campaign.id}` : row.kind === 'business' ? `b-${row.business.id}` : `s-${row.service.id}`}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                if (item.kind === 'campaign') return <CampaignListItem campaign={item.campaign} />;
                if (item.kind === 'business') return <BusinessResultCard item={item.business} />;
                return <ServiceResultCard item={item.service} />;
              }}
              ListFooterComponent={
                <Text style={[styles.count, { color: C.textSecondary }]}>{t('search.resultsCount', { n: activeCount })}</Text>
              }
            />
          )}
        </Animated.View>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panel:     { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md },
  title:     { flex: 1, fontSize: 18, fontFamily: F.bold },
  count:     { fontSize: 13, fontFamily: F.medium, textAlign: 'center', marginTop: 4 },
  list:      { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
});
