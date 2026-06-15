import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';

const SOCIAL_FIELDS = [
  { id: 'website',   icon: '🌐', label: 'Website',   placeholder: 'https://yourbusiness.com' },
  { id: 'facebook',  icon: '💬', label: 'Facebook',  placeholder: 'https://facebook.com/yourpage' },
  { id: 'instagram', icon: '📸', label: 'Instagram', placeholder: '@yourhandle' },
  { id: 'tiktok',    icon: '🎵', label: 'TikTok',    placeholder: '@yourhandle' },
];

const SERVICES = [
  { id: 'video',  emoji: '🎬', label: 'Video Promotion',       desc: 'YouTube, TikTok, Reels' },
  { id: 'review', emoji: '⭐', label: 'Product Review',        desc: 'Honest reviews & unboxing' },
  { id: 'social', emoji: '📱', label: 'Social Media Marketing', desc: 'Instagram, Facebook, Twitter' },
];

export default function PresenceGoalScreen() {
  const C = useAppColors();
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>(
    Object.fromEntries(SOCIAL_FIELDS.map((f) => [f.id, '']))
  );
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      router.back();
    }, 900);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backArrow, { color: C.brinjal1 }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Presence & Goal</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          <Text style={[styles.sectionHint, { color: C.textSecondary }]}>
            Add your online links and tell us what kind of creator support you need.
          </Text>

          {/* Online Presence */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: C.text }]}>Online Presence</Text>
              <Text style={[styles.optionalTag, { color: C.textSecondary }]}>Optional</Text>
            </View>
            <View style={styles.socialList}>
              {SOCIAL_FIELDS.map((field) => (
                <View key={field.id} style={[styles.socialRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Text style={styles.socialIcon}>{field.icon}</Text>
                  <TextInput
                    style={[styles.socialInput, { color: C.text }]}
                    value={socialLinks[field.id]}
                    onChangeText={(t) => setSocialLinks((prev) => ({ ...prev, [field.id]: t }))}
                    placeholder={field.placeholder}
                    placeholderTextColor={C.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType={field.id === 'website' || field.id === 'facebook' ? 'url' : 'default'}
                  />
                </View>
              ))}
            </View>
          </View>

          {/* Services */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: C.text }]}>I need help with</Text>
              <Text style={[styles.optionalTag, { color: C.textSecondary }]}>Optional</Text>
            </View>
            <Text style={[styles.fieldSub, { color: C.textSecondary }]}>Select all that apply</Text>
            <View style={styles.serviceList}>
              {SERVICES.map((svc) => {
                const isSelected = selectedServices.includes(svc.id);
                return (
                  <Pressable
                    key={svc.id}
                    style={[
                      styles.serviceCard,
                      { backgroundColor: C.surface, borderColor: C.border },
                      isSelected && { borderColor: C.brinjal1, backgroundColor: C.primaryLight },
                    ]}
                    onPress={() => toggleService(svc.id)}>
                    <View style={[styles.serviceIconWrap, { backgroundColor: isSelected ? C.brinjal1 : C.background }]}>
                      <Text style={styles.serviceEmoji}>{svc.emoji}</Text>
                    </View>
                    <View style={styles.serviceInfo}>
                      <Text style={[styles.serviceLabel, { color: isSelected ? C.brinjal1 : C.text }]}>{svc.label}</Text>
                      <Text style={[styles.serviceDesc, { color: C.textSecondary }]}>{svc.desc}</Text>
                    </View>
                    <View style={[styles.serviceCheck, { borderColor: isSelected ? C.brinjal1 : C.border, backgroundColor: isSelected ? C.brinjal1 : 'transparent' }]}>
                      {isSelected && <Text style={styles.serviceCheckMark}>✓</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            style={[styles.saveBtn, { backgroundColor: saved ? C.active : C.brinjal1, shadowColor: C.brinjal1 }]}
            onPress={handleSave}>
            <Text style={styles.saveBtnText}>{saved ? '✓ Saved' : 'Save Changes'}</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, width: 36 },
  backArrow: { fontSize: 28, lineHeight: 30 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },
  sectionHint: { fontSize: 13, lineHeight: 19, marginBottom: 20 },
  fieldGroup: { marginBottom: 24 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  fieldLabel: { fontSize: 14, fontWeight: '700' },
  optionalTag: { fontSize: 12, fontWeight: '500' },
  fieldSub: { fontSize: 12, marginTop: -6, marginBottom: 10 },
  socialList: { gap: 10 },
  socialRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, height: 50, gap: 10 },
  socialIcon: { fontSize: 18 },
  socialInput: { flex: 1, fontSize: 14 },
  serviceList: { gap: 10 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1.5, padding: 14 },
  serviceIconWrap: { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  serviceEmoji: { fontSize: 22 },
  serviceInfo: { flex: 1, gap: 3 },
  serviceLabel: { fontSize: 15, fontWeight: '700' },
  serviceDesc: { fontSize: 12 },
  serviceCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  serviceCheckMark: { color: '#fff', fontSize: 12, fontWeight: '800' },
  saveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
