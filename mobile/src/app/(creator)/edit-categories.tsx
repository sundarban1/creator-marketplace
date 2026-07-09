import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { BackButton } from '@/components/BackButton';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { useToast } from '@/components/Toast';
import { creatorService } from '@/services/creator';
import { useCategories } from '@/hooks/useCategories';
import { F } from '@/utilities/constants';

const MAX = 5;

export default function EditCategoriesScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const { categories: catOptions } = useCategories('CREATOR');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    creatorService
      .getProfile()
      .then((p) => setCategories(p.categories ?? []))
      .catch(() => toast.error(t('editCategories.loadError')))
      .finally(() => setLoading(false));
  }, []);

  function toggle(cat: string) {
    setCategories((prev) => {
      if (prev.includes(cat)) return prev.filter((c) => c !== cat);
      if (prev.length >= MAX) {
        toast.warning(t('editCategories.maxWarning', { max: MAX }));
        return prev;
      }
      return [...prev, cat];
    });
  }

  async function handleSave() {
    if (categories.length === 0) {
      toast.warning(t('editCategories.noSelection'));
      return;
    }
    setSaving(true);
    try {
      await creatorService.updateProfile({ categories });
      toast.success(t('editCategories.savedSuccess'));
      router.back();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('editCategories.saveError'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={['#F97316', '#EF4444', '#EC4899']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.gradientTopBar}>
        <View style={s.topBar}>
          <BackButton fallback="/(creator)/profile" />
          <Text style={[s.topTitle, { color: '#fff' }]}>{t('editCategories.title')}</Text>
          <Pressable
            style={[s.saveBtn, { backgroundColor: saving ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.25)' }]}
            onPress={handleSave}
            disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveBtnTxt}>{t('editCategories.save')}</Text>}
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}>

        <View style={s.hint}>
          <Text style={[s.hintTxt, { color: C.textSecondary }]}>
            {t('editCategories.hint', { max: MAX })}
          </Text>
          <Text style={[s.counter, { color: categories.length >= MAX ? C.brinjal1 : C.textSecondary }]}>
            {categories.length}/{MAX}
          </Text>
        </View>

        <View style={s.chips}>
          {Array.from(new Set([...catOptions.map((c) => c.name), ...categories])).map((cat) => {
            const active = categories.includes(cat);
            const disabled = !active && categories.length >= MAX;
            const meta = catOptions.find((c) => c.name === cat);
            return (
              <Pressable
                key={cat}
                onPress={() => toggle(cat)}
                disabled={disabled}
                style={[
                  s.chip,
                  { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface },
                  disabled && { opacity: 0.35 },
                ]}>
                {meta && <FontAwesome5 name={meta.icon} size={12} color={active ? meta.color : C.textSecondary} />}
                <Text style={[s.chipTxt, { color: active ? C.brinjal1 : C.text, fontWeight: active ? '700' : '500' }]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gradientTopBar: { overflow: 'hidden', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  topBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  topTitle:  { fontSize: 20, fontWeight: '700', fontFamily: F.bold, lineHeight: 24 },
  saveBtn:   { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, minWidth: 56, alignItems: 'center' },
  saveBtnTxt:{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  content:   { padding: 20, paddingBottom: 48 },
  hint:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  hintTxt:   { fontSize: 13, flex: 1, fontFamily: F.regular },
  counter:   { fontSize: 13, fontWeight: '700', marginLeft: 8, fontFamily: F.bold },
  chips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipTxt:   { fontSize: 14, fontFamily: F.medium },
});
