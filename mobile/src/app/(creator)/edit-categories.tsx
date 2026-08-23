import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/features/creator/components/PageHeader';
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
import { sortOtherLast, useCategories } from '@/hooks/useCategories';
import { CategoryChipGrid } from '@/components/CategoryChipGrid';
import { F, RADIUS } from '@/utilities/constants';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';

const MAX = 5;

export default function EditCategoriesScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  // BOTH-scope industry rows only, matching the onboarding step that first sets
  // this field — never the CREATOR-scope provider roles.
  const { categories: catOptions } = useCategories('BOTH');
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
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  function handleMaxReached() {
    toast.warning(t('editCategories.maxWarning', { max: MAX }));
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
      <MaxWidthContainer>
      <PageHeader
        title={t('editCategories.title')}
        backFallback="/(creator)/(tabs)/profile"
        rightSlot={
          <Pressable
            style={[s.saveBtn, { backgroundColor: saving ? C.brinjal1 + 'AA' : C.brinjal1 }]}
            onPress={handleSave}
            disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveBtnTxt}>{t('editCategories.save')}</Text>}
          </Pressable>
        }
      />

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

        <CategoryChipGrid
          categories={sortOtherLast(
            Array.from(new Set([...catOptions.map((c) => c.name), ...categories])).map(
              (name) => catOptions.find((c) => c.name === name) ?? { id: name, name }
            )
          )}
          selected={categories}
          onToggle={toggle}
          onMaxReached={handleMaxReached}
          max={MAX}
          variant="pill"
        />
      </ScrollView>
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  saveBtn:   { borderRadius: RADIUS.sm, paddingHorizontal: 16, paddingVertical: 8, minWidth: 56, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  saveBtnTxt:{ color: '#fff', fontSize: 14, fontFamily: F.bold },
  content:   { padding: 20, paddingBottom: 48 },
  hint:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  hintTxt:   { fontSize: 13, flex: 1, fontFamily: F.regular },
  counter:   { fontSize: 13, marginLeft: 8, fontFamily: F.bold },
});
