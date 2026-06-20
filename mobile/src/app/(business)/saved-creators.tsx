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
import { creatorService, type SavedCreatorItem } from '@/services/creator';
import { F } from '@/utilities/constants';

function Avatar({ name, size = 48, C }: { name: string; size?: number; C: ReturnType<typeof useAppColors> }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={[av.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: C.brinjal1 }]}>
      <Text style={[av.text, { fontSize: size * 0.35, color: '#fff', fontWeight: '700' }]}>{initials}</Text>
    </View>
  );
}
const av = StyleSheet.create({ wrap: { justifyContent: 'center', alignItems: 'center' }, text: {} });

function formatFollowers(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function CreatorCard({ item, onRemove }: { item: SavedCreatorItem; onRemove: () => void }) {
  const C = useAppColors();
  const { creator } = item;
  const name = creator.fullName ?? 'Creator';
  const topAccount = creator.socialAccounts.sort((a, b) => b.followers - a.followers)[0];

  return (
    <View style={[s.card, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Pressable
        style={s.cardMain}
        onPress={() => router.push({ pathname: '/(business)/creator-detail', params: { id: creator.id } })}>
        <Avatar name={name} C={C} />
        <View style={s.info}>
          <View style={s.nameRow}>
            <Text style={[s.name, { color: C.text }]} numberOfLines={1}>{name}</Text>
            {creator.isVerified && (
              <View style={[s.verifiedBadge, { backgroundColor: '#E6F4EA' }]}>
                <Text style={s.verifiedText}>✓</Text>
              </View>
            )}
          </View>
          {creator.location ? (
            <Text style={[s.location, { color: C.textSecondary }]} numberOfLines={1}>📍 {creator.location}</Text>
          ) : null}
          {topAccount ? (
            <Text style={[s.followers, { color: C.textSecondary }]}>
              {topAccount.platform} · {formatFollowers(topAccount.followers)} followers
            </Text>
          ) : null}
          {creator.categories.length > 0 && (
            <Text style={[s.categories, { color: C.brinjal1 }]} numberOfLines={1}>
              {creator.categories.slice(0, 3).join(' · ')}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.border} />
      </Pressable>

      <View style={[s.divider, { backgroundColor: C.border }]} />

      <Pressable style={s.removeRow} onPress={onRemove}>
        <Ionicons name="bookmark-outline" size={15} color="#EF4444" />
        <Text style={s.removeText}>Remove from saved</Text>
      </Pressable>
    </View>
  );
}

export default function SavedCreatorsScreen() {
  const C = useAppColors();
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
      <LinearGradient colors={['#4F46E5', '#7C3AED', '#9333EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.gradientHeader}>
        <View style={s.header}>
          <Pressable style={s.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <View>
            <Text style={s.heading}>Saved Creators</Text>
            {items.length > 0 && (
              <Text style={s.subheading}>{items.length} creator{items.length !== 1 ? 's' : ''} saved</Text>
            )}
          </View>
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
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
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>🔖</Text>
              <Text style={[s.emptyTitle, { color: C.text }]}>No saved creators yet</Text>
              <Text style={[s.emptyHint, { color: C.textSecondary }]}>
                Visit a creator's profile and tap the bookmark icon to save them here.
              </Text>
              <Pressable
                style={[s.emptyBtn, { backgroundColor: C.brinjal1 }]}
                onPress={() => router.push('/(business)/explore-creators')}>
                <Text style={s.emptyBtnText}>Browse Creators</Text>
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
  gradientHeader: { borderBottomLeftRadius: 20, borderBottomRightRadius: 20, overflow: 'hidden' },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
  backBtn:   { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },
  heading:   { fontSize: 20, fontWeight: '800', color: '#fff', fontFamily: F.extrabold },
  subheading:{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2, fontFamily: F.regular },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:   { padding: 16, gap: 12, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },

  card:     { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  info:     { flex: 1, gap: 3 },
  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name:     { fontSize: 15, fontWeight: '700', fontFamily: F.bold, flex: 1 },
  verifiedBadge: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  verifiedText:  { fontSize: 10, fontWeight: '700', color: '#2E7D32', fontFamily: F.bold },
  location:  { fontSize: 12, fontFamily: F.regular },
  followers: { fontSize: 12, fontFamily: F.regular },
  categories:{ fontSize: 11, fontWeight: '600', fontFamily: F.semibold },

  divider:    { height: 1 },
  removeRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  removeText: { fontSize: 13, fontWeight: '600', color: '#EF4444', fontFamily: F.semibold },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '700', fontFamily: F.bold },
  emptyHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
  emptyBtn:   { borderRadius: 14, paddingHorizontal: 28, paddingVertical: 12, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: F.bold },
});
