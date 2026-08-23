import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '@/components/BackButton';
import { ExploreCardSkeleton } from '@/components/ExploreCardSkeleton';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useToast } from '@/components/Toast';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { CampaignListItem } from '@/features/creator/components/CampaignListItem';
import { useShortlistedCampaigns } from '@/hooks/useShortlistedCampaigns';
import { campaignService } from '@/services/campaign';
import type { Campaign } from '@/types';
import { F, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';

// Where the bookmark icon on every event card/detail leads. Reloads on focus
// rather than caching: un-shortlisting happens on the detail screen, so a
// stale list would still show an event the creator just dropped.
export default function ShortlistedEventsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const { shortlistedIds, reloadIds } = useShortlistedCampaigns();
  const [items, setItems]     = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { campaigns } = await campaignService.listShortlisted();
      setItems(campaigns);
    } catch {
      toast.error(t('shortlistedEvents.loadFailed'));
    } finally {
      setLoading(false);
    }
  // toast/t are stable enough for this one-shot loader; re-creating it on every
  // render would re-fire the focus effect below in a loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(useCallback(() => { void load(); void reloadIds(); }, [load])); // eslint-disable-line react-hooks/exhaustive-deps

  // Drop rows the creator un-shortlisted from a card in this very list, without
  // waiting for a refetch — the ids Set is the source of truth for that.
  const visible = items.filter((c) => shortlistedIds.has(c.id));

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
        <View style={[s.header, { borderBottomColor: C.border }]} accessibilityRole="header">
          <BackButton />
          <Text style={[s.headerTitle, { color: C.text }]} numberOfLines={1}>{t('shortlistedEvents.title')}</Text>
          {/* Balances the back button so the title stays optically centered */}
          <View style={s.headerSpacer} />
        </View>

        {loading ? (
          <View style={s.list}>
            {[0, 1, 2, 3].map((i) => <ExploreCardSkeleton key={i} />)}
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => <CampaignListItem campaign={item} />}
            contentContainerStyle={[s.list, visible.length === 0 && s.listEmpty]}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            ListEmptyComponent={
              <View style={s.empty}>
                <FontAwesome5 name="bookmark" size={40} color={C.textSecondary} style={s.emptyIcon} />
                <Text style={[s.emptyTitle, { color: C.text }]}>{t('shortlistedEvents.empty')}</Text>
                <Text style={[s.emptyHint, { color: C.textSecondary }]}>{t('shortlistedEvents.emptySub')}</Text>
                <Pressable
                  style={[s.emptyBtn, { backgroundColor: C.brinjal1 }]}
                  onPress={() => router.push('/(creator)/(tabs)/discover')}>
                  <Text style={s.emptyBtnText}>{t('shortlistedEvents.browseCTA')}</Text>
                </Pressable>
              </View>
            }
          />
        )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: F.bold, textAlign: 'center' },
  headerSpacer:{ width: 40 },

  list:      { padding: SCREEN_GUTTER, gap: SPACING.md },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },

  empty:        { alignItems: 'center', paddingHorizontal: SPACING.xl, gap: 6 },
  emptyIcon:    { marginBottom: 6, opacity: 0.5 },
  emptyTitle:   { fontSize: 16, fontFamily: F.bold, textAlign: 'center' },
  emptyHint:    { fontSize: 13, fontFamily: F.regular, textAlign: 'center' },
  emptyBtn:     { marginTop: 14, borderRadius: RADIUS.md, paddingHorizontal: 22, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: F.bold },
});
