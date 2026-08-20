import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { Button } from '@/components/Button';
import { ChipGroup } from '@/features/business/components/CampaignFormControls';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { categoryService, type ApiCategory } from '@/services/category';
import { serviceService, type PricingModel } from '@/services/service';
import { F, RADIUS } from '@/utilities/constants';

const PRICING_MODELS: PricingModel[] = ['PER_PROJECT', 'PER_HOUR', 'PER_DAY', 'PER_CAMPAIGN', 'CUSTOM_QUOTE'];
const DELIVERY_PRESETS = ['1 day', '2-3 days', '1 week', '2 weeks'];
const MAX_INCLUDED = 10;

export default function ServiceFormScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  // Deliberately not the shared useCategories('CREATOR') hook — that widens
  // to "CREATOR or BOTH" (BOTH-scope rows are content niches like
  // "Restaurants", shared with the general profile/campaign category
  // pickers), which would put niches in a provider-*type* picker. Fetched
  // directly with strict=true instead, uncached — this screen is opened
  // rarely enough that the shared hook's cross-screen caching isn't worth
  // complicating for one caller's different filter.
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  useEffect(() => { categoryService.getCategories('CREATOR', true).then(setCategories).catch(() => {}); }, []);

  const [categoryKey, setCategoryKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('');
  const [pricingModel, setPricingModel] = useState<PricingModel>('PER_PROJECT');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [included, setIncluded] = useState<string[]>([]);
  const [newIncluded, setNewIncluded] = useState('');

  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    serviceService.listMine()
      .then((services) => {
        if (cancelled) return;
        const existing = services.find((s) => s.id === id);
        if (!existing) { Alert.alert(t('common.error'), t('serviceForm.notFound')); router.back(); return; }
        setCategoryKey(existing.category.key);
        setName(existing.name);
        setDescription(existing.description);
        setStartingPrice(existing.startingPrice != null ? String(existing.startingPrice) : '');
        setPricingModel(existing.pricingModel);
        setDeliveryTime(existing.deliveryTime ?? '');
        setIncluded(existing.whatsIncluded);
      })
      .catch((err) => { Alert.alert(t('common.error'), err instanceof Error ? err.message : t('serviceForm.loadFailed')); router.back(); })
      .finally(() => { if (!cancelled) setLoadingExisting(false); });
    return () => { cancelled = true; };
  }, [id, t]);

  function addIncluded() {
    const v = newIncluded.trim();
    if (!v || included.length >= MAX_INCLUDED || included.includes(v)) return;
    setIncluded([...included, v]);
    setNewIncluded('');
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!categoryKey) errs.category = t('serviceForm.errCategoryRequired');
    if (name.trim().length < 3 || name.trim().length > 100) errs.name = t('serviceForm.errNameLength');
    if (description.trim().length < 50 || description.trim().length > 1000) errs.description = t('serviceForm.errDescriptionLength');
    if (startingPrice.trim() && (isNaN(Number(startingPrice)) || Number(startingPrice) <= 0)) errs.startingPrice = t('serviceForm.errPriceInvalid');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    const category = categories.find((c) => c.key === categoryKey);
    if (!category) return;
    setSubmitting(true);
    try {
      const payload = {
        categoryId: category.id,
        name: name.trim(),
        description: description.trim(),
        startingPrice: startingPrice.trim() ? Number(startingPrice) : undefined,
        pricingModel,
        deliveryTime: deliveryTime.trim() || undefined,
        whatsIncluded: included,
      };
      if (isEdit && id) await serviceService.update(id, payload);
      else await serviceService.create(payload);
      router.back();
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('serviceForm.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={isEdit ? t('serviceForm.editTitle') : t('serviceForm.addTitle')} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <MaxWidthContainer>
          {loadingExisting ? null : (
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <View>
                <Text style={[styles.label, { color: C.text }]}>{t('serviceForm.categoryLabel')}</Text>
                <ChipGroup
                  options={categories.map((c) => c.name)}
                  value={categories.find((c) => c.key === categoryKey)?.name ?? ''}
                  onChange={(name) => setCategoryKey(categories.find((c) => c.name === name)?.key ?? '')}
                  colors={C}
                  error={errors.category}
                />
              </View>

              <View style={styles.fieldGroup}>
                <TextInputWithLabel
                  label={t('serviceForm.nameLabel')}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('serviceForm.namePlaceholder')}
                  error={errors.name}
                  maxLength={100}
                />
                <Text style={[styles.charCount, { color: C.textSecondary }]}>{name.length}/100</Text>
              </View>

              <View style={styles.fieldGroup}>
                <TextInputWithLabel
                  label={t('serviceForm.descriptionLabel')}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('serviceForm.descriptionPlaceholder')}
                  error={errors.description}
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                  style={{ height: 100, textAlignVertical: 'top' }}
                />
                <Text style={[styles.charCount, { color: C.textSecondary }]}>{description.length}/1000 ({t('serviceForm.minChars', { n: 50 })})</Text>
              </View>

              <TextInputWithLabel
                label={t('serviceForm.priceLabel')}
                value={startingPrice}
                onChangeText={setStartingPrice}
                placeholder={t('serviceForm.pricePlaceholder')}
                error={errors.startingPrice}
                keyboardType="numeric"
              />

              <View>
                <Text style={[styles.label, { color: C.text }]}>{t('serviceForm.pricingModelLabel')}</Text>
                <ChipGroup
                  options={PRICING_MODELS.map((m) => t(`servicesScreen.pricing${toLabelKey(m)}`))}
                  value={t(`servicesScreen.pricing${toLabelKey(pricingModel)}`)}
                  onChange={(label) => {
                    const m = PRICING_MODELS.find((pm) => t(`servicesScreen.pricing${toLabelKey(pm)}`) === label);
                    if (m) setPricingModel(m);
                  }}
                  colors={C}
                />
              </View>

              <View>
                <Text style={[styles.label, { color: C.text }]}>{t('serviceForm.deliveryLabel')}</Text>
                <ChipGroup
                  options={DELIVERY_PRESETS}
                  value={DELIVERY_PRESETS.includes(deliveryTime) ? deliveryTime : ''}
                  onChange={setDeliveryTime}
                  colors={C}
                />
                <View style={{ marginTop: 10 }}>
                  <TextInputWithLabel
                    label={t('serviceForm.deliveryCustomLabel')}
                    value={DELIVERY_PRESETS.includes(deliveryTime) ? '' : deliveryTime}
                    onChangeText={setDeliveryTime}
                    placeholder={t('serviceForm.deliveryCustomPlaceholder')}
                  />
                </View>
              </View>

              <View>
                <Text style={[styles.label, { color: C.text }]}>{t('serviceForm.includedLabel')}</Text>
                <View style={styles.chipWrap}>
                  {included.map((item) => (
                    <Pressable
                      key={item}
                      style={[styles.includedChip, { borderColor: C.brinjal1, backgroundColor: C.primaryLight }]}
                      onPress={() => setIncluded(included.filter((i) => i !== item))}>
                      <Text style={[styles.includedChipText, { color: C.brinjal1 }]} numberOfLines={1}>{item}</Text>
                      <FontAwesome5 name="times" solid size={12} color={C.brinjal1} />
                    </Pressable>
                  ))}
                </View>
                {included.length < MAX_INCLUDED && (
                  <View style={styles.addRow}>
                    <TextInput
                      style={[styles.addInput, { backgroundColor: C.surface, borderColor: C.border, color: C.text }]}
                      value={newIncluded}
                      onChangeText={setNewIncluded}
                      placeholder={t('serviceForm.includedPlaceholder')}
                      placeholderTextColor={C.textSecondary}
                      onSubmitEditing={addIncluded}
                    />
                    <Pressable style={[styles.addBtn, { backgroundColor: C.brinjal1 }]} onPress={addIncluded}>
                      <FontAwesome5 name="plus" solid size={16} color="#fff" />
                    </Pressable>
                  </View>
                )}
                <Text style={[styles.charCount, { color: C.textSecondary }]}>{included.length}/{MAX_INCLUDED}</Text>
              </View>

              <Button
                label={isEdit ? t('serviceForm.saveBtn') : t('serviceForm.createBtn')}
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

function toLabelKey(m: PricingModel): string {
  return { PER_PROJECT: 'PerProject', PER_HOUR: 'PerHour', PER_DAY: 'PerDay', PER_CAMPAIGN: 'PerCampaign', CUSTOM_QUOTE: 'CustomQuote' }[m];
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { padding: 16, gap: 18, paddingBottom: 48 },
  label: { fontSize: 14, fontFamily: F.semibold, marginBottom: 8 },
  fieldGroup: { gap: 4 },
  charCount: { fontSize: 11, fontFamily: F.regular, textAlign: 'right' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  includedChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.sm, borderWidth: 1.5, maxWidth: 220 },
  includedChipText: { fontSize: 13, fontFamily: F.medium, flexShrink: 1 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addInput: { flex: 1, borderRadius: RADIUS.sm, borderWidth: 1.5, paddingHorizontal: 12, height: 42, fontSize: 14, fontFamily: F.regular },
  addBtn: { width: 42, height: 42, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
});
