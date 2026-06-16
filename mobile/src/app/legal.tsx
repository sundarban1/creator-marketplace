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

const META: Record<LegalSlug, { title: string; icon: keyof typeof Ionicons.glyphMap }> = {
  'terms':          { title: 'Terms of Service',  icon: 'document-text-outline' },
  'privacy-policy': { title: 'Privacy Policy',    icon: 'shield-checkmark-outline' },
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

  const [doc, setDoc]       = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    legalService
      .getDocument(slug)
      .then(setDoc)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [slug]);

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
          <Pressable
            style={[styles.retryBtn, { backgroundColor: C.brinjal1 }]}
            onPress={() => { setLoading(true); legalService.getDocument(slug).then(setDoc).catch((e) => setError(e instanceof Error ? e.message : 'Failed to load')).finally(() => setLoading(false)); }}>
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

          {/* Sections */}
          {doc.sections.map((section, i) => (
            <View key={section.id} style={[styles.section, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={[styles.sectionHeader, { borderBottomColor: C.border }]}>
                <View style={[styles.sectionIndex, { backgroundColor: `${C.brinjal1}18` }]}>
                  <Text style={[styles.sectionIndexText, { color: C.brinjal1 }]}>{i + 1}</Text>
                </View>
                {section.icon ? (
                  <Text style={styles.sectionIconEmoji}>{section.icon}</Text>
                ) : null}
                <Text style={[styles.sectionTitle, { color: C.text }]}>{section.title}</Text>
              </View>
              <Text style={[styles.sectionBody, { color: C.textSecondary }]}>{section.body}</Text>
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: C.textSecondary }]}>
              © 2026 CreatorMarket · All rights reserved
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
  headerTitle:  { fontSize: 17, fontWeight: '700' },

  errorText:    { fontSize: 15, textAlign: 'center', fontWeight: '500' },
  retryBtn:     { borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, marginTop: 4 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  updatedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, marginBottom: 4 },
  updatedText:{ fontSize: 12, fontWeight: '500' },

  section:       { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1 },
  sectionIndex:  { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  sectionIndexText: { fontSize: 12, fontWeight: '800' },
  sectionIconEmoji: { fontSize: 18 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', flex: 1 },
  sectionBody:   { fontSize: 14, lineHeight: 22, padding: 14, paddingTop: 12 },

  footer:     { alignItems: 'center', paddingTop: 8 },
  footerText: { fontSize: 11 },
});
