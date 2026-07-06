import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BackButton } from '@/components/BackButton';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { legalService, type LegalDocument, type LegalSlug } from '@/services/legal';
import { F } from '@/utilities/constants';

const META: Record<LegalSlug, { title: string; icon: keyof typeof Ionicons.glyphMap }> = {
  'terms':          { title: 'Terms of Service', icon: 'document-text-outline' },
  'privacy-policy': { title: 'Privacy Policy',   icon: 'shield-checkmark-outline' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function LegalScreen() {
  const { type } = useLocalSearchParams<{ type: LegalSlug }>();
  const C = useAppColors();

  const slug = (type as LegalSlug) ?? 'terms';
  const meta = META[slug] ?? META['terms'];

  const [doc,     setDoc]     = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  function toggleSection(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function loadDoc() {
    setLoading(true);
    setError('');
    setExpandedIds(new Set());
    legalService
      .getDocument(slug)
      .then(setDoc)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadDoc(); }, [slug]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: C.background }]} edges={['top', 'bottom']}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <BackButton />
        <View style={styles.headerCenter}>
          <Ionicons name={meta.icon} size={18} color={C.brinjal1} />
          <Text style={[styles.headerTitle, { color: C.text }]}>{meta.title}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={C.textSecondary} />
          <Text style={[styles.errorText, { color: C.textSecondary }]}>{error}</Text>
          <Pressable style={[styles.retryBtn, { backgroundColor: C.brinjal1 }]} onPress={loadDoc}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      ) : !doc || doc.sections.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="document-outline" size={48} color={C.textSecondary} />
          <Text style={[styles.errorText, { color: C.textSecondary }]}>No content available yet.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}>

          {/* Last updated */}
          {doc.lastUpdated && (
            <View style={[styles.updatedRow, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Ionicons name="time-outline" size={13} color={C.textSecondary} />
              <Text style={[styles.updatedText, { color: C.textSecondary }]}>
                Last updated {formatDate(doc.lastUpdated)}
              </Text>
            </View>
          )}

          {/* Accordion sections */}
          <View style={styles.sections}>
            {doc.sections.map((section, i) => {
              const open = expandedIds.has(section.id);
              return (
                <View key={section.id} style={[styles.accordionCard, { backgroundColor: C.surface, borderColor: open ? C.brinjal1 : C.border }]}>
                  <Pressable style={styles.accordionHeader} onPress={() => toggleSection(section.id)}>
                    <View style={[styles.indexBadge, { backgroundColor: `${C.brinjal1}18` }]}>
                      <Text style={[styles.indexText, { color: C.brinjal1 }]}>{i + 1}</Text>
                    </View>
                    {section.icon ? <Text style={styles.sectionEmoji}>{section.icon}</Text> : null}
                    <Text style={[styles.accordionTitle, { color: C.text }]}>{section.title}</Text>
                    <Ionicons
                      name={open ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={C.textSecondary}
                    />
                  </Pressable>
                  {open && (
                    <Text style={[styles.accordionBody, { color: C.textSecondary, borderTopColor: C.border }]}>
                      {section.body}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: C.textSecondary }]}>
              © 2026 kolabh · All rights reserved
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },

  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:  { fontSize: 17, fontWeight: '700', fontFamily: F.bold },

  errorText:    { fontSize: 15, textAlign: 'center', fontWeight: '500', fontFamily: F.medium },
  retryBtn:     { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, marginTop: 4 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, fontFamily: F.bold },

  scroll:   { padding: 16, paddingBottom: 40 },
  sections: { gap: 10 },

  updatedRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, marginBottom: 12 },
  updatedText: { fontSize: 12, fontWeight: '500', fontFamily: F.medium },

  accordionCard:   { borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  indexBadge:      { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  indexText:       { fontSize: 12, fontWeight: '700', fontFamily: F.bold },
  sectionEmoji:    { fontSize: 18 },
  accordionTitle:  { flex: 1, fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  accordionBody:   { fontSize: 14, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 14, paddingTop: 12, borderTopWidth: 1, fontFamily: F.regular },

  footer:     { alignItems: 'center', paddingTop: 20 },
  footerText: { fontSize: 11, fontFamily: F.regular },
});
