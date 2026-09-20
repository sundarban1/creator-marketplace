import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FontAwesome5 } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { SectionCard, ChipGroup } from '@/features/business/components/CampaignFormControls';
import { DatePickerField } from '@/features/business/components/DatePickerField';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { promotionService, type PromotionDiscountType } from '@/services/rewards';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

const DISCOUNT_TYPE_KEYS: PromotionDiscountType[] = ['PERCENTAGE', 'FIXED'];

export default function CreatePromotionScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { id: promotionId } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!promotionId;
  const seededRef = useRef(false);

  const promotionQuery = useQuery({
    queryKey: ['promotions', 'detail', promotionId],
    queryFn: () => promotionService.getById(promotionId!),
    enabled: isEditing,
  });

  const [title, setTitle] = useState('');
  const [discountType, setDiscountType] = useState<PromotionDiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [minSpend, setMinSpend] = useState('');
  const [validFrom, setValidFrom] = useState<Date | null>(null);
  const [validUntil, setValidUntil] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<'draft' | 'publish' | 'save' | null>(null);

  useEffect(() => {
    if (seededRef.current || !promotionQuery.data) return;
    seededRef.current = true;
    const p = promotionQuery.data;
    setTitle(p.title);
    setDiscountType(p.discountType);
    setDiscountValue(String(p.discountValue));
    setMinSpend(p.minSpend ? String(p.minSpend) : '');
    setValidFrom(new Date(p.validFrom));
    setValidUntil(new Date(p.validUntil));
  }, [promotionQuery.data]);

  const discountTypeLabels: Record<PromotionDiscountType, string> = {
    PERCENTAGE: t('promotions.discountTypePercentage'),
    FIXED: t('promotions.discountTypeFixed'),
  };

  const discountNum = Number(discountValue) || 0;
  const previewDiscount = discountType === 'PERCENTAGE'
    ? `${discountNum || 0}% OFF`
    : `Rs. ${(discountNum || 0).toLocaleString()} OFF`;

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (title.trim().length < 3) next.title = t('promotions.validationTitleRequired');
    if (!discountValue || discountNum <= 0) next.discountValue = t('promotions.validationDiscountRequired');
    if (!validFrom || !validUntil) next.dates = t('promotions.validationDatesRequired');
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave(mode: 'draft' | 'publish' | 'save') {
    if (!validate()) return;
    setSaving(mode);
    try {
      const payload = {
        title: title.trim(),
        discountType,
        discountValue: discountNum,
        minSpend: minSpend ? Number(minSpend) : undefined,
        validFrom: validFrom!.toISOString(),
        validUntil: validUntil!.toISOString(),
      };
      if (isEditing) {
        await promotionService.update(promotionId!, payload);
        toast.success(promotionQuery.data?.status === 'ACTIVE' ? t('promotions.updateSuccessPaused') : t('promotions.updateSuccess'));
      } else {
        const created = await promotionService.create(payload);
        if (mode === 'publish') {
          await promotionService.publish(created.id);
        }
        toast.success(t('promotions.createSuccess'));
      }
      await queryClient.invalidateQueries({ queryKey: ['promotions', 'mine'] });
      router.replace('/(business)/promotions');
    } catch (err: any) {
      toast.error(err?.message || (isEditing ? t('promotions.updateError') : t('promotions.createError')));
    } finally {
      setSaving(null);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
        <PageHeader title={isEditing ? t('promotions.editHeaderTitle') : t('promotions.createHeaderTitle')} backFallback="/(business)/promotions" />

        {isEditing && promotionQuery.data?.status === 'ACTIVE' && (
          <View style={[styles.activeNote, { backgroundColor: C.surface, borderColor: C.border }]}>
            <FontAwesome5 name="info-circle" solid size={13} color={C.textSecondary} />
            <Text style={[styles.activeNoteText, { color: C.textSecondary }]}>{t('promotions.editActiveWillPauseNote')}</Text>
          </View>
        )}

        {isEditing && promotionQuery.isPending ? (
          <View style={styles.content}>
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} width="100%" height={90} radius={RADIUS.lg} />)}
          </View>
        ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <SectionCard title={t('promotions.titleLabel')} icon="tag" colors={C}>
              <TextInputWithLabel
                label={t('promotions.titleLabel')}
                placeholder={t('promotions.titlePlaceholder')}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
              {!!errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </SectionCard>

            <SectionCard title={t('promotions.discountTypeLabel')} icon="percentage" colors={C}>
              <ChipGroup
                options={DISCOUNT_TYPE_KEYS.map((k) => discountTypeLabels[k])}
                value={discountTypeLabels[discountType]}
                onChange={(label) => setDiscountType(DISCOUNT_TYPE_KEYS.find((k) => discountTypeLabels[k] === label) ?? 'PERCENTAGE')}
                colors={C}
              />
              <TextInputWithLabel
                label={t('promotions.discountValueLabel')}
                placeholder={discountType === 'PERCENTAGE' ? '10' : '500'}
                value={discountValue}
                onChangeText={setDiscountValue}
                keyboardType="number-pad"
                leftIcon={discountType === 'PERCENTAGE' ? 'percentage' : 'money-bill-wave'}
              />
              {!!errors.discountValue && <Text style={styles.errorText}>{errors.discountValue}</Text>}
            </SectionCard>

            <SectionCard title={t('promotions.minSpendLabel')} icon="receipt" colors={C}>
              <TextInputWithLabel
                label={t('promotions.minSpendLabel')}
                placeholder="500"
                value={minSpend}
                onChangeText={setMinSpend}
                keyboardType="number-pad"
              />
            </SectionCard>

            <SectionCard title={t('promotions.validFromLabel')} icon="calendar-alt" colors={C}>
              <View style={styles.dateRow}>
                <View style={{ flex: 1 }}>
                  <DatePickerField label={t('promotions.validFromLabel')} value={validFrom} onChange={setValidFrom} />
                </View>
                <View style={{ flex: 1 }}>
                  <DatePickerField
                    label={t('promotions.validUntilLabel')}
                    value={validUntil}
                    onChange={setValidUntil}
                    minDate={validFrom ?? undefined}
                  />
                </View>
              </View>
              {!!errors.dates && <Text style={styles.errorText}>{errors.dates}</Text>}
            </SectionCard>

            {/* Preview */}
            <Text style={[styles.previewLabel, { color: C.textSecondary }]}>{t('promotions.previewTitle')}</Text>
            <View style={[styles.previewCard, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.card]}>
              <Text style={[styles.previewDiscount, { color: C.brinjal1 }]}>{previewDiscount}</Text>
              <Text style={[styles.previewForCreators, { color: C.textSecondary }]}>{t('promotions.forCreators')}</Text>
              {!!title && <Text style={[styles.previewTitleText, { color: C.text }]} numberOfLines={1}>{title}</Text>}
            </View>

            <View style={styles.actions}>
              {isEditing ? (
                <Button label={t('promotions.saveChangesButton')} onPress={() => handleSave('save')} loading={saving === 'save'} disabled={!!saving} />
              ) : (
                <>
                  <Button label={t('promotions.publishNowButton')} onPress={() => handleSave('publish')} loading={saving === 'publish'} disabled={!!saving} />
                  <Button label={t('promotions.saveDraftButton')} variant="secondary" onPress={() => handleSave('draft')} loading={saving === 'draft'} disabled={!!saving} />
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
  dateRow: { flexDirection: 'row', gap: SPACING.sm },
  errorText: { fontSize: 12, color: '#EF4444', fontFamily: F.medium },

  activeNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    marginHorizontal: SCREEN_GUTTER, marginTop: SPACING.sm, padding: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1,
  },
  activeNoteText: { flex: 1, fontSize: FONT_SIZE.xs, fontFamily: F.regular, lineHeight: 16 },

  previewLabel: { fontSize: 11, letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: F.bold, marginTop: 8 },
  previewCard: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: 3 },
  previewDiscount: { fontSize: FONT_SIZE.xl, fontFamily: F.extrabold },
  previewForCreators: { fontSize: FONT_SIZE.sm, fontFamily: F.semibold },
  previewTitleText: { fontSize: FONT_SIZE.sm, fontFamily: F.regular, marginTop: 4 },

  actions: { gap: SPACING.sm, marginTop: SPACING.md },
});
