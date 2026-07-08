import { router } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { BackButton } from '@/components/BackButton';
import { useLanguage } from '@/context/LanguageContext';
import {
  ActivityIndicator,
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
import { useToast } from '@/components/Toast';
import { profileService } from '@/services/profile';
import { F } from '@/utilities/constants';

const SOCIAL_FIELDS: Array<{ id: string; icon: keyof typeof Ionicons.glyphMap; color: string; label: string; prefix: string; placeholder: string }> = [
  { id: 'facebook',  icon: 'logo-facebook',  color: '#1877F2', label: 'Facebook',  prefix: 'facebook.com/',         placeholder: 'yourpage' },
  { id: 'instagram', icon: 'logo-instagram', color: '#E1306C', label: 'Instagram', prefix: 'instagram.com/',        placeholder: 'yourhandle' },
  { id: 'tiktok',    icon: 'musical-notes',  color: '#010101', label: 'TikTok',    prefix: 'tiktok.com/@',          placeholder: 'yourhandle' },
  { id: 'linkedin',  icon: 'logo-linkedin',  color: '#0A66C2', label: 'LinkedIn',  prefix: 'linkedin.com/company/', placeholder: 'yourname' },
];

const SERVICES = [
  { id: 'video',  icon: 'video',        labelKey: 'presenceGoal.videoPromotion', descKey: 'presenceGoal.videoDesc' },
  { id: 'review', icon: 'star',         labelKey: 'presenceGoal.productReview',   descKey: 'presenceGoal.reviewDesc' },
  { id: 'social', icon: 'mobile-alt',   labelKey: 'presenceGoal.socialMedia',     descKey: 'presenceGoal.socialDesc' },
] as const;

export default function PresenceGoalScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const [handles, setHandles] = useState<Record<string, string>>(
    Object.fromEntries(SOCIAL_FIELDS.map((f) => [f.id, f.prefix]))
  );
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    profileService.getBusinessProfile()
      .then((p) => {
        const saved = p.socialLinks ?? {};
        setHandles((prev) => {
          const next = { ...prev };
          for (const f of SOCIAL_FIELDS) {
            const val = saved[f.id as keyof typeof saved];
            if (val) next[f.id] = val.startsWith(f.prefix) ? val : f.prefix + val;
          }
          return next;
        });
        setSelectedServices(p.presenceServices ?? []);
      })
      .catch(() => toast.error(t('presenceGoal.loadFailed')))
      .finally(() => setLoading(false));
  }, []);

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const cleanedHandles = Object.fromEntries(
        SOCIAL_FIELDS.map((f) => [f.id, handles[f.id] === f.prefix ? '' : handles[f.id]])
      );
      await profileService.updateBusinessProfile({ socialLinks: cleanedHandles, presenceServices: selectedServices });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        router.back();
      }, 900);
    } catch {
      toast.error(t('presenceGoal.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <LinearGradient colors={['#4F46E5', '#7C3AED', '#9333EA']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.gradientHeader}>
        <View style={styles.header}>
          <BackButton fallback="/(business)/" />
          <Text style={[styles.headerTitle, { color: '#fff' }]}>{t('presenceGoal.title')}</Text>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={[styles.flex, styles.loadingWrap]}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      ) : (
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          <Text style={[styles.sectionHint, { color: C.textSecondary }]}>
            {t('presenceGoal.hint')}
          </Text>

          {/* Online Presence */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: C.text }]}>{t('presenceGoal.onlinePresence')}</Text>
              <Text style={[styles.optionalTag, { color: C.textSecondary }]}>{t('presenceGoal.optional')}</Text>
            </View>
            <View style={styles.socialList}>
              {SOCIAL_FIELDS.map((field) => (
                <View key={field.id} style={[styles.socialRow, { backgroundColor: C.surface, borderColor: C.border }]}>
                  {/* Platform icon badge */}
                  <View style={[styles.iconBadge, { backgroundColor: field.color + '18' }]}>
                    <Ionicons name={field.icon} size={20} color={field.color} />
                  </View>
                  {/* Handle input — pre-filled with the platform's URL prefix */}
                  <TextInput
                    style={[styles.socialInput, { color: C.text }]}
                    value={handles[field.id]}
                    onChangeText={(t) => setHandles((prev) => ({ ...prev, [field.id]: t }))}
                    placeholder={field.prefix + field.placeholder}
                    placeholderTextColor={C.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="default"
                  />
                  {handles[field.id] !== field.prefix && (
                    <Pressable onPress={() => setHandles((prev) => ({ ...prev, [field.id]: field.prefix }))} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={C.textSecondary} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          </View>

          {/* Services */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.fieldLabel, { color: C.text }]}>{t('presenceGoal.needHelp')}</Text>
              <Text style={[styles.optionalTag, { color: C.textSecondary }]}>{t('presenceGoal.optional')}</Text>
            </View>
            <Text style={[styles.fieldSub, { color: C.textSecondary }]}>{t('presenceGoal.selectAll')}</Text>
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
                      <FontAwesome5 name={svc.icon} size={18} color={isSelected ? '#fff' : C.textSecondary} solid />
                    </View>
                    <View style={styles.serviceInfo}>
                      <Text style={[styles.serviceLabel, { color: isSelected ? C.brinjal1 : C.text }]}>{t(svc.labelKey)}</Text>
                      <Text style={[styles.serviceDesc, { color: C.textSecondary }]}>{t(svc.descKey)}</Text>
                    </View>
                    <View style={[styles.serviceCheck, { borderColor: isSelected ? C.brinjal1 : C.border, backgroundColor: isSelected ? C.brinjal1 : 'transparent' }]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            style={[styles.saveBtn, { backgroundColor: saved ? C.active : C.brinjal1, shadowColor: C.brinjal1 }]}
            disabled={saving}
            onPress={handleSave}>
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{saved ? t('presenceGoal.savedDone') : t('presenceGoal.saveChanges')}</Text>
            )}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  flex:            { flex: 1 },
  loadingWrap:     { justifyContent: 'center', alignItems: 'center' },
  gradientHeader:  { overflow: 'hidden', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle:     { fontSize: 20, fontWeight: '700', fontFamily: F.bold, lineHeight: 24 },
  scrollContent:   { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48 },
  sectionHint:     { fontSize: 13, lineHeight: 19, marginBottom: 20, fontFamily: F.regular },
  fieldGroup:      { marginBottom: 24 },
  labelRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  fieldLabel:      { fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  optionalTag:     { fontSize: 12, fontWeight: '500', fontFamily: F.medium },
  fieldSub:        { fontSize: 12, marginTop: -6, marginBottom: 10, fontFamily: F.regular },

  socialList:      { gap: 10 },
  socialRow:       { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, height: 54, gap: 8 },
  iconBadge:       { width: 34, height: 34, borderRadius: 9, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  prefix:          { fontSize: 13, fontFamily: F.medium, flexShrink: 0 },
  socialInput:     { flex: 1, fontSize: 14, fontFamily: F.regular },

  serviceList:      { gap: 10 },
  serviceCard:      { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1.5, padding: 14 },
  serviceIconWrap:  { width: 46, height: 46, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  serviceInfo:      { flex: 1, gap: 3 },
  serviceLabel:     { fontSize: 15, fontWeight: '700', fontFamily: F.bold },
  serviceDesc:      { fontSize: 12, fontFamily: F.regular },
  serviceCheck:     { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },

  saveBtn:     { borderRadius: 14, paddingVertical: 15, alignItems: 'center', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: F.bold },
});
