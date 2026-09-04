import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { Button } from '@/components/Button';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { portfolioService } from '@/services/portfolio';
import { STALE } from '@/lib/queryClient';
import { pickAndUpload } from '@/utilities/uploadImage';
import { F, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';

export default function PortfolioFormScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const queryClient = useQueryClient();

  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState('');

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Same shared cache portfolio.tsx populates — editing an item just visited
  // there resolves instantly instead of a fresh fetch.
  const portfolioListQuery = useQuery({
    queryKey: ['portfolio', 'mine'],
    queryFn: () => portfolioService.listMine(),
    staleTime: STALE.profile,
    enabled: isEdit,
  });
  const loadingExisting = isEdit && portfolioListQuery.isPending;

  // Seed the form fields once, the first time the item is available — a
  // background refetch of the shared list must never overwrite in-progress edits.
  const seededRef = useRef(false);
  function seedFromExisting() {
    if (portfolioListQuery.isError) {
      Alert.alert(t('common.error'), t('portfolioForm.loadFailed'));
      router.back();
      return;
    }
    const existing = portfolioListQuery.data?.find((i) => i.id === id);
    if (!existing) { Alert.alert(t('common.error'), t('portfolioForm.notFound')); router.back(); return; }
    setDescription(existing.description ?? '');
    setMediaUrl(existing.mediaUrl);
    setExternalUrl(existing.externalUrl ?? '');
  }
  useEffect(() => {
    if (!isEdit || seededRef.current || portfolioListQuery.isPending) return;
    seededRef.current = true;
    seedFromExisting();
  // seedFromExisting is a stable closure guarded by seededRef — including it
  // here would just re-run this on every render (fresh closure identity).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id, t, portfolioListQuery.isPending, portfolioListQuery.isError, portfolioListQuery.data]);

  async function handlePickMedia() {
    if (uploading) return;
    setUploading(true);
    try {
      const result = await pickAndUpload('portfolio-item');
      if (result?.url) setMediaUrl(result.url);
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('portfolioForm.uploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!mediaUrl && !externalUrl.trim()) errs.media = t('portfolioForm.errMediaOrLinkRequired');
    if (externalUrl.trim() && !/^https?:\/\/.+/.test(externalUrl.trim())) errs.externalUrl = t('portfolioForm.errInvalidUrl');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        description: description.trim() || undefined,
        mediaUrl: mediaUrl ?? undefined,
        mediaType: mediaUrl ? ('IMAGE' as const) : undefined,
        externalUrl: externalUrl.trim() || undefined,
      };
      if (isEdit && id) await portfolioService.update(id, payload);
      else await portfolioService.create(payload);
      void queryClient.invalidateQueries({ queryKey: ['portfolio', 'mine'] });
      router.back();
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('portfolioForm.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={isEdit ? t('portfolioForm.editTitle') : t('portfolioForm.addTitle')} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <MaxWidthContainer>
          {loadingExisting ? null : (
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <View>
                <Text style={[styles.label, { color: C.text }]}>{t('portfolioForm.mediaLabel')}</Text>
                <Pressable
                  style={[styles.mediaPicker, { backgroundColor: C.surface, borderColor: errors.media ? C.error : C.border }]}
                  onPress={handlePickMedia}
                  disabled={uploading}>
                  {mediaUrl ? (
                    <>
                      <Image source={{ uri: mediaUrl }} style={styles.mediaPreview} resizeMode="cover" />
                      <Pressable style={styles.mediaClear} onPress={() => setMediaUrl(null)} hitSlop={8}>
                        <FontAwesome5 name="times" solid size={14} color="#fff" />
                      </Pressable>
                    </>
                  ) : (
                    <View style={styles.mediaEmpty}>
                      <FontAwesome5 name={uploading ? 'spinner' : 'camera'} solid size={22} color={C.textSecondary} />
                      <Text style={[styles.mediaEmptyText, { color: C.textSecondary }]}>
                        {uploading ? t('portfolioForm.uploading') : t('portfolioForm.mediaPlaceholder')}
                      </Text>
                    </View>
                  )}
                </Pressable>
                {errors.media && <Text style={[styles.errorText, { color: C.error }]}>{errors.media}</Text>}
              </View>

              <TextInputWithLabel
                label={t('portfolioForm.externalUrlLabel')}
                value={externalUrl}
                onChangeText={setExternalUrl}
                placeholder={t('portfolioForm.externalUrlPlaceholder')}
                error={errors.externalUrl}
                autoCapitalize="none"
                keyboardType="url"
              />

              <TextInputWithLabel
                label={t('portfolioForm.descriptionLabel')}
                value={description}
                onChangeText={setDescription}
                placeholder={t('portfolioForm.descriptionPlaceholder')}
                multiline
                numberOfLines={4}
                maxLength={1000}
                style={{ height: 100, textAlignVertical: 'top' }}
              />

              <Button
                label={isEdit ? t('serviceForm.saveBtn') : t('portfolioForm.addBtn')}
                onPress={handleSubmit}
                loading={submitting}
              />
            </ScrollView>
          )}
        </MaxWidthContainer>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.lg, gap: 18, paddingBottom: SPACING.xxxl },
  label: { fontSize: 14, fontFamily: F.semibold, marginBottom: 8 },
  errorText: { fontSize: 12, fontFamily: F.regular, marginTop: 6 },

  mediaPicker: { width: '100%', aspectRatio: 16 / 9, borderRadius: RADIUS.md, borderWidth: 1.5, overflow: 'hidden' },
  mediaPreview: { width: '100%', height: '100%' },
  mediaEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  mediaEmptyText: { fontSize: 13 },
  mediaClear: {
    position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: RADIUS.full,
    backgroundColor: 'rgba(17,24,39,0.65)', justifyContent: 'center', alignItems: 'center',
  },
});
