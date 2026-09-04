import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, InteractionManager, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '@/components/BackButton';
import { SearchInput } from '@/components/SearchInput';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { CategoryPillRow } from '@/components/CategoryPillRow';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCategories } from '@/hooks/useCategories';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { STALE } from '@/lib/queryClient';
import { campaignService } from '@/services/campaign';
import { businessService, type BusinessListItem } from '@/services/business';
import { serviceService, type ApiService } from '@/services/service';
import type { Campaign } from '@/types';
import { storage } from '@/utilities/storage';
import { F, RECENT_SEARCHES_KEY, SCREEN_GUTTER, SPACING } from '@/utilities/constants';

const MAX_RECENT   = 8;
const SUGGEST_MIN_CHARS = 3;
const SUGGEST_DEBOUNCE_MS = 400;
const SUGGEST_LIMIT = 3;

function loadRecent(): string[] {
  return storage.getJSON<string[]>(RECENT_SEARCHES_KEY) ?? [];
}

async function pushRecent(term: string): Promise<string[]> {
  const existing = loadRecent().filter((s) => s.toLowerCase() !== term.toLowerCase());
  const next = [term, ...existing].slice(0, MAX_RECENT);
  await storage.setJSON(RECENT_SEARCHES_KEY, next);
  return next;
}

type Suggestions = { campaigns: Campaign[]; businesses: BusinessListItem[]; services: ApiService[] };
const EMPTY_SUGGESTIONS: Suggestions = { campaigns: [], businesses: [], services: [] };

// Full-screen search landing — reached by tapping the read-only search bar on
// the creator home. Recent + popular searches surface immediately (no typing
// required), live suggestions appear once the query is long enough to be
// meaningful, and submitting (Enter, tapping a suggestion row, a recent
// entry, or a popular chip) hands off to search-results.tsx. Deliberately no
// voice/AI-parsing yet — staged as a follow-up phase.
export default function SearchScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const { categories: popularCategories } = useCategories('BUSINESS');
  const inputRef = useRef<TextInput>(null);

  // autoFocus fires mid stack-push transition, so the keyboard/cursor flash
  // and then lose focus once the navigator reclaims the responder chain —
  // focus only once the screen is actually settled instead.
  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => inputRef.current?.focus());
      return () => task.cancel();
    }, []),
  );

  const [query, setQuery]   = useState('');
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  const [debouncedQuery] = useDebouncedValue(query, SUGGEST_DEBOUNCE_MS);
  const trimmedQuery = query.trim();
  const debouncedTrimmed = debouncedQuery.trim();

  // Query-key-based de-dup replaces the old requestedFor ref guard — RQ
  // already drops/ignores a stale in-flight request once the key moves on.
  const suggestionsQuery = useQuery({
    queryKey: ['search', 'suggestions', debouncedTrimmed],
    queryFn: async (): Promise<Suggestions> => {
      const [c, b, s] = await Promise.all([
        campaignService.list({ search: debouncedTrimmed, limit: SUGGEST_LIMIT }).catch(() => ({ campaigns: [] as Campaign[] })),
        businessService.listBusinesses({ search: debouncedTrimmed, limit: SUGGEST_LIMIT }).catch(() => ({ businesses: [] as BusinessListItem[] })),
        serviceService.listPublic({ search: debouncedTrimmed, limit: SUGGEST_LIMIT }).catch(() => ({ items: [] as ApiService[] })),
      ]);
      return { campaigns: c.campaigns, businesses: b.businesses, services: s.items };
    },
    enabled: debouncedTrimmed.length >= SUGGEST_MIN_CHARS,
    staleTime: STALE.list,
  });
  const suggestions = suggestionsQuery.data ?? EMPTY_SUGGESTIONS;
  // Covers both "still debouncing past the threshold" (trimmedQuery hasn't
  // caught up to debouncedTrimmed yet) and "request in flight" — matches the
  // original's immediate spinner-on-keystroke rather than waiting out the
  // debounce with stale suggestions on screen.
  const suggestLoading = trimmedQuery.length >= SUGGEST_MIN_CHARS
    && (trimmedQuery !== debouncedTrimmed || suggestionsQuery.isFetching);

  function runSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    void pushRecent(trimmed).then(setRecent);
    router.push({ pathname: '/(creator)/search-results', params: { q: trimmed } });
  }

  function clearRecent() {
    void storage.setJSON(RECENT_SEARCHES_KEY, []).then(() => setRecent([]));
  }

  const showBrowse   = trimmedQuery.length < SUGGEST_MIN_CHARS;
  const hasSuggestions = suggestions.campaigns.length > 0 || suggestions.businesses.length > 0 || suggestions.services.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
        <View style={styles.header}>
          <BackButton />
          <View style={{ flex: 1 }}>
            <SearchInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder={t('search.placeholder')}
              onSubmitEditing={() => runSearch(query)}
            />
          </View>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {showBrowse ? (
            <>
              {recent.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: C.text }]}>{t('search.recentTitle')}</Text>
                    <Pressable onPress={clearRecent} hitSlop={8}>
                      <Text style={[styles.clearText, { color: C.brinjal1 }]}>{t('search.clearRecent')}</Text>
                    </Pressable>
                  </View>
                  {recent.map((term) => (
                    <Pressable
                      key={term}
                      style={({ pressed }) => [styles.recentRow, pressed && { opacity: 0.7 }]}
                      onPress={() => runSearch(term)}>
                      <FontAwesome5 name="history" size={15} color={C.textSecondary} />
                      <Text style={[styles.recentText, { color: C.text }]} numberOfLines={1}>{term}</Text>
                      <FontAwesome5 name="chevron-right" size={13} color={C.textSecondary} />
                    </Pressable>
                  ))}
                </View>
              )}

              {popularCategories.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: C.text }]}>{t('search.popularTitle')}</Text>
                  <View style={{ marginTop: 12 }}>
                    <CategoryPillRow
                      categories={popularCategories.slice(0, 10)}
                      activeLabels={[]}
                      onToggle={(label) => runSearch(label)}
                      wrap
                    />
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.section}>
              {suggestLoading ? (
                <ActivityIndicator color={C.brinjal1} style={{ marginTop: 8 }} />
              ) : (
                <>
                  {hasSuggestions && <Text style={[styles.sectionTitle, { color: C.text }]}>{t('search.suggestionsTitle')}</Text>}

                  {suggestions.campaigns.length > 0 && (
                    <View style={styles.suggestGroup}>
                      <Text style={[styles.groupLabel, { color: C.textSecondary }]}>{t('search.opportunitiesLabel')}</Text>
                      {suggestions.campaigns.map((c) => (
                        <Pressable
                          key={c.id}
                          style={({ pressed }) => [styles.suggestRow, pressed && { opacity: 0.7 }]}
                          onPress={() => router.push({ pathname: '/campaign-detail', params: { campaignId: c.id } })}>
                          <FontAwesome5 name="bullhorn" size={14} color={C.brinjal1} />
                          <Text style={[styles.suggestText, { color: C.text }]} numberOfLines={1}>{c.title}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {suggestions.businesses.length > 0 && (
                    <View style={styles.suggestGroup}>
                      <Text style={[styles.groupLabel, { color: C.textSecondary }]}>{t('search.businessesLabel')}</Text>
                      {suggestions.businesses.map((b) => (
                        <Pressable
                          key={b.id}
                          style={({ pressed }) => [styles.suggestRow, pressed && { opacity: 0.7 }]}
                          onPress={() => router.push({ pathname: '/(creator)/business-detail', params: { id: b.id } } as never)}>
                          <FontAwesome5 name="building" size={14} color={C.brinjal1} />
                          <Text style={[styles.suggestText, { color: C.text }]} numberOfLines={1}>{b.businessName}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {suggestions.services.length > 0 && (
                    <View style={styles.suggestGroup}>
                      <Text style={[styles.groupLabel, { color: C.textSecondary }]}>{t('search.servicesLabel')}</Text>
                      {suggestions.services.map((sv) => (
                        <Pressable
                          key={sv.id}
                          style={({ pressed }) => [styles.suggestRow, pressed && { opacity: 0.7 }]}
                          onPress={() => router.push({ pathname: '/(creator)/creator-detail', params: { id: sv.creatorProfileId } } as never)}>
                          <FontAwesome5 name="concierge-bell" size={14} color={C.brinjal1} />
                          <Text style={[styles.suggestText, { color: C.text }]} numberOfLines={1}>{sv.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  <Pressable
                    style={({ pressed }) => [styles.searchForRow, { borderTopColor: C.border }, pressed && { opacity: 0.7 }]}
                    onPress={() => runSearch(trimmedQuery)}>
                    <FontAwesome5 name="search" size={14} color={C.brinjal1} />
                    <Text style={[styles.searchForText, { color: C.brinjal1 }]} numberOfLines={1}>{t('search.searchFor', { query: trimmedQuery })}</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md },
  scroll:    { paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxxl },

  section:          { marginTop: 20 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle:     { fontSize: 15, fontFamily: F.bold },
  clearText:        { fontSize: 13, fontFamily: F.semibold },

  recentRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  recentText: { flex: 1, fontSize: 14, fontFamily: F.regular },

  suggestGroup: { marginTop: 14, gap: 2 },
  groupLabel:   { fontSize: 12, fontFamily: F.bold, letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 6 },
  suggestRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  suggestText:  { flex: 1, fontSize: 14, fontFamily: F.medium },

  searchForRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  searchForText: { flex: 1, fontSize: 14, fontFamily: F.semibold },
});
