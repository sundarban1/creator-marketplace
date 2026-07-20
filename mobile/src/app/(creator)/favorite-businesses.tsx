import { router, useFocusEffect } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { businessService, type BusinessListItem } from '@/services/business';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { SavedListCard } from '@/components/SavedListCard';
import { F, RADIUS } from '@/utilities/constants';

function BusinessCard({ item, onRemove }: { item: BusinessListItem; onRemove: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const name = item.businessName ?? 'Business';
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <SavedListCard
      avatarInitials={initials}
      accentColor="#F97316"
      name={name}
      verified={item.isVerified}
      onPress={() => router.push({ pathname: '/(creator)/business-detail', params: { id: item.id } })}
      removeLabel={t('favoriteBrands.removeConfirm')}
      removeIcon={<FontAwesome5 name="heart" solid size={13} color="#EF4444" />}
      onRemove={onRemove}
    >
      {item.categories.length > 0 && (
        <Text style={[s.categories, { color: C.brinjal1 }]} numberOfLines={1}>
          {item.categories.slice(0, 3).join(' · ')}
        </Text>
      )}
      {item.description ? (
        <Text style={[s.desc, { color: C.textSecondary }]} numberOfLines={2}>{item.description}</Text>
      ) : null}
      <Text style={[s.campaigns, { color: C.textSecondary }]}>
        {item._count.campaigns !== 1
          ? t('favoriteBrands.campaignsPlural', { count: item._count.campaigns })
          : t('favoriteBrands.campaigns', { count: item._count.campaigns })}
      </Text>
    </SavedListCard>
  );
}

export default function FavoriteBusinessesScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [items, setItems]     = useState<BusinessListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toggle }            = useFavoriteBusinesses();

  async function load() {
    setLoading(true);
    try {
      const data = await businessService.getFavoriteBusinesses();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function handleRemove(businessId: string) {
    setItems((prev) => prev.filter((i) => i.id !== businessId));
    try {
      await toggle(businessId);
    } catch {
      load();
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={t('favoriteBrands.title')} />

      {loading ? (
        <View style={s.list}>
          {[0, 1, 2, 3, 4].map((i) => <ListRowSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <BusinessCard item={item} onRemove={() => handleRemove(item.id)} />
          )}
          contentContainerStyle={[s.list, items.length === 0 && s.listEmpty]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <FontAwesome5 name="heart" size={40} color={C.textSecondary} style={s.emptyIcon} />
              <Text style={[s.emptyTitle, { color: C.text }]}>{t('favoriteBrands.empty')}</Text>
              <Text style={[s.emptyHint, { color: C.textSecondary }]}>
                {t('favoriteBrands.emptySub')}
              </Text>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                style={[
                  s.emptyBtn,
                  {
                    backgroundColor: '#F97316', shadowColor: '#F97316',
                    shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
                  },
                ]}
                onPress={() => router.push('/(creator)/explore-businesses')}>
                <Text style={s.emptyBtnText}>{t('favoriteBrands.browseCTA')}</Text>
              </Pressable>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:   { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 12 },
  listEmpty: { flexGrow: 1 },

  categories:{ fontSize: 11, fontFamily: F.semibold },
  desc:      { fontSize: 12, fontFamily: F.regular, lineHeight: 17 },
  campaigns: { fontSize: 12, fontFamily: F.regular },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyIcon:  { marginBottom: 2 },
  emptyTitle: { fontSize: 18, fontFamily: F.bold },
  emptyHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
  emptyBtn:   { borderRadius: RADIUS.full, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: F.bold },
});
