import { router, useFocusEffect } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { businessService, type BusinessListItem } from '@/services/business';
import { useFavoriteBusinesses } from '@/hooks/useFavoriteBusinesses';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

function Avatar({ name, size = 48, C }: { name: string; size?: number; C: ReturnType<typeof useAppColors> }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={[av.wrap, { width: size, height: size, borderRadius: RADIUS.full, backgroundColor: '#F97316' }]}>
      <Text style={[av.text, { fontSize: size * 0.35, color: '#fff', fontWeight: '700' }]}>{initials}</Text>
    </View>
  );
}
const av = StyleSheet.create({ wrap: { justifyContent: 'center', alignItems: 'center' }, text: {} });

function BusinessCard({ item, onRemove }: { item: BusinessListItem; onRemove: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const name = item.businessName ?? 'Business';

  return (
    <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        style={s.cardMain}
        onPress={() => router.push({ pathname: '/(creator)/business-detail', params: { id: item.id } })}>
        <Avatar name={name} C={C} />
        <View style={s.info}>
          <View style={s.nameRow}>
            <Text style={[s.name, { color: C.text }]} numberOfLines={1}>{name}</Text>
            {item.isVerified && (
              <View style={[s.verifiedBadge, { backgroundColor: '#E6F4EA' }]}>
                <Ionicons name="checkmark" size={11} color="#16A34A" />
              </View>
            )}
          </View>
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
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.border} />
      </Pressable>

      <View style={[s.divider, { backgroundColor: C.border }]} />

      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={s.removeRow} onPress={onRemove}>
        <FontAwesome5 name="heart" solid size={13} color="#EF4444" />
        <Text style={s.removeText}>{t('favoriteBrands.removeConfirm')}</Text>
      </Pressable>
    </View>
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
      <LinearGradient colors={['#312e81', '#4f46e5', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.gradientHeader}>
        <View style={s.header}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={s.backBtn} hitSlop={4} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={s.heading}>{t('favoriteBrands.title')}</Text>
            {items.length > 0 && (
              <Text style={s.subheading}>
                {items.length !== 1
                  ? t('favoriteBrands.brandsSaved', { n: items.length })
                  : t('favoriteBrands.brandSaved', { n: items.length })}
              </Text>
            )}
          </View>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#F97316" />
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
                style={[s.emptyBtn, { backgroundColor: '#F97316' }]}
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
  gradientHeader: { paddingBottom: 14, borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg, overflow: 'hidden' },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 0 },
  backBtn:   { width: 38, height: 38, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  heading:   { fontSize: 20, color: '#fff', fontFamily: F.bold, lineHeight: 24 },
  subheading:{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontFamily: F.regular },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:   { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 12 },
  listEmpty: { flexGrow: 1 },

  card:     { borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden', ...SHADOW.card },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  info:     { flex: 1, gap: 3 },
  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name:     { fontSize: 15, fontFamily: F.bold, flex: 1 },
  verifiedBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 5, paddingVertical: 1 },
  verifiedText:  { fontSize: 10, color: '#2E7D32', fontFamily: F.bold },
  categories:{ fontSize: 11, fontFamily: F.semibold },
  desc:      { fontSize: 12, fontFamily: F.regular, lineHeight: 17 },
  campaigns: { fontSize: 12, fontFamily: F.regular },

  divider:    { height: 1 },
  removeRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  removeText: { fontSize: 13, color: '#EF4444', fontFamily: F.semibold },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyIcon:  { marginBottom: 2 },
  emptyTitle: { fontSize: 18, fontFamily: F.bold },
  emptyHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
  emptyBtn:   { borderRadius: RADIUS.md, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: F.bold },
});
