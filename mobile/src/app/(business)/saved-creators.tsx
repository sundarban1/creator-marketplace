import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
import { creatorService, type SavedCreatorItem } from '@/services/creator';
import { EmptyState } from '@/components/EmptyState';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { SavedListCard } from '@/components/SavedListCard';
import { GRADIENTS, F, RADIUS } from '@/utilities/constants';

function formatFollowers(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function CreatorCard({ item, onRemove }: { item: SavedCreatorItem; onRemove: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { creator } = item;
  const name = creator.fullName ?? 'Creator';
  const topAccount = creator.socialAccounts.sort((a, b) => b.followers - a.followers)[0];
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <SavedListCard
      avatarInitials={initials}
      accentColor={C.brinjal1}
      name={name}
      verified={creator.isVerified}
      onPress={() => router.push({ pathname: '/(business)/creator-detail', params: { id: creator.id } })}
      removeLabel={t('savedCreators.removeFromSaved')}
      removeIcon={<Ionicons name="bookmark-outline" size={15} color="#EF4444" />}
      onRemove={onRemove}
    >
      {creator.location ? (
        <View style={s.locationRow}>
          <Ionicons name="location" size={10} color={C.textSecondary} />
          <Text style={[s.location, { color: C.textSecondary }]} numberOfLines={1}>{creator.location}</Text>
        </View>
      ) : null}
      {topAccount ? (
        <Text style={[s.followers, { color: C.textSecondary }]}>
          {topAccount.platform} · {formatFollowers(topAccount.followers)} {t('savedCreators.followersSuffix')}
        </Text>
      ) : null}
      {creator.categories.length > 0 && (
        <Text style={[s.categories, { color: C.brinjal1 }]} numberOfLines={1}>
          {creator.categories.slice(0, 3).join(' · ')}
        </Text>
      )}
    </SavedListCard>
  );
}

export default function SavedCreatorsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [items, setItems]     = useState<SavedCreatorItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await creatorService.getSavedCreators();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function handleRemove(creatorId: string) {
    setItems((prev) => prev.filter((i) => i.creator.id !== creatorId));
    try {
      await creatorService.toggleSaveCreator(creatorId);
    } catch {
      load(); // re-sync on error
    }
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={GRADIENTS.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.gradientHeader}>
        <View style={s.header}>
          <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View style={{ alignItems: 'center', gap: 2 }}>
            <Text style={s.heading}>{t('savedCreators.title')}</Text>
            {items.length > 0 && (
              <Text style={s.subheading}>
                {items.length !== 1
                  ? t('savedCreators.creatorsSaved', { n: items.length })
                  : t('savedCreators.creatorSaved', { n: items.length })}
              </Text>
            )}
          </View>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={s.list}>
          {[0, 1, 2, 3, 4].map((i) => <ListRowSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <CreatorCard item={item} onRemove={() => handleRemove(item.creator.id)} />
          )}
          contentContainerStyle={[s.list, items.length === 0 && s.listEmpty]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              faIcon="bookmark"
              title={t('savedCreators.empty')}
              subtitle={t('savedCreators.emptySub')}
              action={{ label: t('savedCreators.browseCTA'), onPress: () => router.push('/(business)/explore-creators') }}
            />
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

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  location:  { fontSize: 12, fontFamily: F.regular },
  followers: { fontSize: 12, fontFamily: F.regular },
  categories:{ fontSize: 11, fontFamily: F.semibold },
});
