import { router } from 'expo-router';
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
import { useAppColors } from '@/context/ThemeContext';
import { useToast } from '@/components/Toast';
import { creatorService } from '@/services/creator';
import { F } from '@/utilities/constants';

const CAT_OPTIONS = [
  'Food', 'Travel', 'Fashion', 'Lifestyle', 'Beauty',
  'Fitness', 'Tech', 'Gaming', 'Education', 'Wellness',
  'Music', 'Photography', 'Sports', 'Film & TV',
  'Automotive', 'Finance', 'Parenting', 'Pets',
  'Sustainability', 'Mindfulness', 'Entertainment',
];

const MAX = 5;

export default function EditCategoriesScreen() {
  const C = useAppColors();
  const toast = useToast();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    creatorService
      .getProfile()
      .then((p) => setCategories(p.categories ?? []))
      .catch(() => toast.error('Could not load your profile. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  function toggle(cat: string) {
    setCategories((prev) => {
      if (prev.includes(cat)) return prev.filter((c) => c !== cat);
      if (prev.length >= MAX) {
        toast.warning(`You can select up to ${MAX} categories.`);
        return prev;
      }
      return [...prev, cat];
    });
  }

  async function handleSave() {
    if (categories.length === 0) {
      toast.warning('Please select at least one category.');
      return;
    }
    setSaving(true);
    try {
      await creatorService.updateProfile({ categories });
      toast.success('Categories saved!');
      router.back();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save. Please try again.');
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
          <Text style={[s.topTitle, { color: '#fff' }]}>Content Categories</Text>
          <Pressable
            style={[s.saveBtn, { backgroundColor: saving ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.25)' }]}
            onPress={handleSave}
            disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveBtnTxt}>Save</Text>}
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}>

        <View style={s.hint}>
          <Text style={[s.hintTxt, { color: C.textSecondary }]}>
            Select up to {MAX} categories that best describe your content.
          </Text>
          <Text style={[s.counter, { color: categories.length >= MAX ? C.brinjal1 : C.textSecondary }]}>
            {categories.length}/{MAX}
          </Text>
        </View>

        <View style={s.chips}>
          {Array.from(new Set([...CAT_OPTIONS, ...categories])).map((cat) => {
            const active = categories.includes(cat);
            const disabled = !active && categories.length >= MAX;
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
  topTitle:  { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  saveBtn:   { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, minWidth: 56, alignItems: 'center' },
  saveBtnTxt:{ color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: F.bold },
  content:   { padding: 20, paddingBottom: 48 },
  hint:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  hintTxt:   { fontSize: 13, flex: 1, fontFamily: F.regular },
  counter:   { fontSize: 13, fontWeight: '700', marginLeft: 8, fontFamily: F.bold },
  chips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipTxt:   { fontSize: 14, fontFamily: F.medium },
});
