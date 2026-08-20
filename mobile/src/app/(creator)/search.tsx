import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '@/components/BackButton';
import { SearchInput } from '@/components/SearchInput';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { CategoryPillRow } from '@/components/CategoryPillRow';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useCategories } from '@/hooks/useCategories';
import { campaignService } from '@/services/campaign';
import { businessService, type BusinessListItem } from '@/services/business';
import { serviceService, type ApiService } from '@/services/service';
import type { Campaign } from '@/types';
import { storage } from '@/utilities/storage';
import { F, RECENT_SEARCHES_KEY } from '@/utilities/constants';

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
  const [suggestions, setSuggestions]         = useState<Suggestions>(EMPTY_SUGGESTIONS);
  const [suggestLoading, setSuggestLoading]   = useState(false);
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestedFor = useRef('');

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < SUGGEST_MIN_CHARS) {
      setSuggestions(EMPTY_SUGGESTIONS);
      setSuggestLoading(false);
      return;
    }
    setSuggestLoading(true);
    debounceRef.current = setTimeout(() => {
      requestedFor.current = trimmed;
      Promise.all([
        campaignService.list({ search: trimmed, limit: SUGGEST_LIMIT }).catch(() => ({ campaigns: [] as Campaign[] })),
        businessService.listBusinesses({ search: trimmed, limit: SUGGEST_LIMIT }).catch(() => ({ businesses: [] as BusinessListItem[] })),
        serviceService.listPublic({ search: trimmed, limit: SUGGEST_LIMIT }).catch(() => ({ items: [] as ApiService[] })),
      ]).then(([c, b, s]) => {
        // Drop the response if the user kept typing past it — avoids flicker
        // from an earlier, slower request landing after a newer one.
        if (requestedFor.current !== trimmed) return;
        setSuggestions({ campaigns: c.campaigns, businesses: b.businesses, services: s.items });
      }).finally(() => {
        if (requestedFor.current === trimmed) setSuggestLoading(false);
      });
    }, SUGGEST_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function runSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    void pushRecent(trimmed).then(setRecent);
    router.push({ pathname: '/(creator)/search-results', params: { q: trimmed } });
  }

  function clearRecent() {
    void storage.setJSON(RECENT_SEARCHES_KEY, []).then(() => setRecent([]));
  }

  const trimmedQuery = query.trim();
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
  header:    { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  scroll:    { paddingHorizontal: 20, paddingBottom: 40 },

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
