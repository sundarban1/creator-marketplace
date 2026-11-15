import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useBlocks } from '@/context/BlockContext';
import { blockService, type BlockedUser } from '@/services/safety';
import { F, MIN_TOUCH_TARGET, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';

// Settings → Help & Safety → Blocked users. Name, photo, date blocked, and
// Unblock (with confirmation). Unblocking restores normal interaction; it does
// not restore anything Kolab moderators removed.
export default function BlockedUsersScreen() {
  const C = useAppColors();
  const { t, language } = useLanguage();
  const blocks = useBlocks();
  const [busy, setBusy] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['blockedUsers'], queryFn: () => blockService.list() });

  function confirmUnblock(u: BlockedUser) {
    Alert.alert(t('safety.unblockTitle', { name: u.name }), t('safety.unblockBody'), [
      { text: t('safety.cancel'), style: 'cancel' },
      {
        text: t('safety.unblock'),
        onPress: async () => {
          setBusy(u.userId);
          try {
            await blocks.unblock(u.userId); // invalidates every query, incl. this list
          } catch (e) {
            Alert.alert(t('safety.unblockFailed'), e instanceof Error ? e.message : undefined);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  const items = query.data ?? [];
  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={t('safety.blockedUsers')} backFallback="/help-safety" />
      {query.isPending ? (
        <View style={s.center}><ActivityIndicator color={C.brinjal1} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(u) => u.userId}
          contentContainerStyle={items.length ? s.list : s.emptyWrap}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={C.brinjal1} />}
          ListEmptyComponent={<EmptyState faIcon="ban" title={t('safety.blockedEmpty')} />}
          renderItem={({ item: u }) => (
            <View style={[s.row, { backgroundColor: C.surface, borderColor: C.border }]}>
              {u.avatarUrl ? (
                <ExpoImage source={{ uri: u.avatarUrl }} style={s.avatar} contentFit="cover" />
              ) : (
                <View style={[s.avatar, s.avatarFallback, { backgroundColor: C.border }]}>
                  <Text style={[s.initial, { color: C.text }]}>{(u.name || '?').charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.name, { color: C.text }]} numberOfLines={1}>{u.name}</Text>
                <Text style={[s.meta, { color: C.textSecondary }]}>
                  {t('safety.blockedOn', { date: new Date(u.blockedAt).toLocaleDateString(language === 'ne' ? 'ne-NP' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) })}
                </Text>
              </View>
              <Pressable
                onPress={() => confirmUnblock(u)}
                disabled={busy === u.userId}
                style={({ pressed }) => [s.unblockBtn, { borderColor: C.border, opacity: pressed ? 0.7 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={`${t('safety.unblock')} ${u.name}`}>
                {busy === u.userId ? <ActivityIndicator size="small" color={C.brinjal1} /> : <Text style={[s.unblockTxt, { color: C.text }]}>{t('safety.unblock')}</Text>}
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SCREEN_GUTTER, gap: SPACING.sm },
  emptyWrap: { flexGrow: 1, justifyContent: 'center', padding: SCREEN_GUTTER },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 16, fontFamily: F.bold },
  name: { fontSize: 15, fontFamily: F.semibold },
  meta: { fontSize: 12, fontFamily: F.regular, marginTop: 2 },
  unblockBtn: { minHeight: MIN_TOUCH_TARGET - 8, minWidth: 92, paddingHorizontal: 14, borderRadius: RADIUS.full, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  unblockTxt: { fontSize: 13, fontFamily: F.semibold },
});
