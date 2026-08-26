import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { Button } from '@/components/Button';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { BottomSheet } from '@/components/BottomSheet';
import { walletService, type PayoutMethodInput, type PayoutMethodType } from '@/services/wallet';
import { NEPAL_CLASS_A_BANKS, isKnownBank } from '@/utilities/nepalBanks';
import { PAYMENT_METHOD_IMAGES } from '@/utilities/paymentMethods';
import { F, RADIUS, SCREEN_GUTTER, SPACING } from '@/utilities/constants';

const TYPE_VISUAL: Record<PayoutMethodType, {
  icon: keyof typeof FontAwesome5.glyphMap;
  labelKey: string;
  image?: ImageSourcePropType;
}> = {
  BANK:   { icon: 'university', labelKey: 'payoutMethods.typeBank' },
  ESEWA:  { icon: 'wallet',     labelKey: 'payoutMethods.typeEsewa',  image: PAYMENT_METHOD_IMAGES.esewa },
  KHALTI: { icon: 'wallet',     labelKey: 'payoutMethods.typeKhalti', image: PAYMENT_METHOD_IMAGES.khalti },
};

function isPayoutMethodType(v: string | undefined): v is PayoutMethodType {
  return v === 'BANK' || v === 'ESEWA' || v === 'KHALTI';
}

export default function PayoutMethodFormScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const { id, type: typeParam } = useLocalSearchParams<{ id?: string; type?: string }>();
  const isEdit = !!id;

  const [type, setType] = useState<PayoutMethodType>(isPayoutMethodType(typeParam) ? typeParam : 'BANK');
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  // `bankName` holds a Class A bank name unless the creator picked "Other bank",
  // in which case it's whatever they type into the revealed free-text field.
  const [bankIsOther, setBankIsOther] = useState(false);
  const [bankSheetOpen, setBankSheetOpen] = useState(false);
  const [accountNumber, setAccountNumber] = useState('');
  const [branch, setBranch] = useState('');
  const [walletId, setWalletId] = useState('');
  const [label, setLabel] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    walletService.listPayoutMethods()
      .then((methods) => {
        if (cancelled) return;
        const existing = methods.find((m) => m.id === id);
        if (!existing) { toast.error(t('payoutMethods.notFound')); router.back(); return; }
        setType(existing.type);
        setAccountName(existing.accountName);
        setBankName(existing.bankName ?? '');
        setBankIsOther(!!existing.bankName && !isKnownBank(existing.bankName));
        setAccountNumber(existing.accountNumber ?? '');
        setBranch(existing.branch ?? '');
        setWalletId(existing.walletId ?? '');
        setLabel(existing.label ?? '');
        setIsDefault(existing.isDefault);
      })
      .catch((err) => { toast.error(err instanceof Error ? err.message : t('payoutMethods.loadFailed')); router.back(); })
      .finally(() => { if (!cancelled) setLoadingExisting(false); });
    return () => { cancelled = true; };
  }, [id, t, toast]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!accountName.trim()) errs.accountName = t('payoutMethods.errNameRequired');
    if (type === 'BANK') {
      if (!bankName.trim()) errs.bankName = t('payoutMethods.errBankNameRequired');
      if (!accountNumber.trim()) errs.accountNumber = t('payoutMethods.errAccountNumberRequired');
    } else if (!walletId.trim()) {
      errs.walletId = t('payoutMethods.errWalletIdRequired');
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const base = { accountName: accountName.trim(), label: label.trim() || undefined, isDefault };
      const payload: PayoutMethodInput = type === 'BANK'
        ? { ...base, type, bankName: bankName.trim(), accountNumber: accountNumber.trim(), branch: branch.trim() || undefined }
        : { ...base, type, walletId: walletId.trim() };
      if (isEdit && id) await walletService.updatePayoutMethod(id, payload);
      else await walletService.createPayoutMethod(payload);
      toast.success(isEdit ? t('payoutMethods.updateSuccess') : t('payoutMethods.createSuccess'));
      router.back();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('payoutMethods.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  const typeVisual = TYPE_VISUAL[type];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={isEdit ? t('payoutMethods.editTitle') : t('payoutMethods.addTitle')} backFallback="/(creator)/payout-methods" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <MaxWidthContainer>
          {loadingExisting ? null : (
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <View>
                <Text style={[styles.label, { color: C.text }]}>{t('payoutMethods.typeLabel')}</Text>
                <View style={[styles.typeStatic, { borderColor: C.border, backgroundColor: C.surface }]}>
                  {typeVisual.image ? (
                    <View style={styles.typeStaticLogoWrap}>
                      <Image source={typeVisual.image} style={styles.typeStaticLogo} resizeMode="contain" />
                    </View>
                  ) : (
                    <View style={[styles.typeStaticIcon, { backgroundColor: C.primaryLight }]}>
                      <FontAwesome5 name={typeVisual.icon} solid size={13} color={C.brinjal1} />
                    </View>
                  )}
                  <Text style={[styles.typeStaticText, { color: C.text }]}>{t(typeVisual.labelKey)}</Text>
                </View>
              </View>

              <TextInputWithLabel
                label={t('payoutMethods.accountNameLabel')}
                value={accountName}
                onChangeText={setAccountName}
                placeholder={t('payoutMethods.accountNamePlaceholder')}
                error={errors.accountName}
                maxLength={120}
              />

              {type === 'BANK' ? (
                <>
                  <View>
                    <Text style={[styles.fieldLabel, { color: C.text }]}>{t('payoutMethods.bankNameLabel')}</Text>
                    <Pressable
                      style={[styles.select, { backgroundColor: C.surface, borderColor: errors.bankName && !bankIsOther ? '#EF4444' : C.border }]}
                      onPress={() => setBankSheetOpen(true)}
                      accessibilityRole="button"
                      accessibilityLabel={t('payoutMethods.bankNameLabel')}>
                      <FontAwesome5 name="university" solid size={14} color={C.textSecondary} />
                      <Text
                        style={[styles.selectText, { color: bankIsOther || bankName ? C.text : C.textSecondary }]}
                        numberOfLines={1}>
                        {bankIsOther ? t('payoutMethods.otherBank') : (bankName || t('payoutMethods.bankNameSelect'))}
                      </Text>
                      <FontAwesome5 name="chevron-down" size={12} color={C.textSecondary} />
                    </Pressable>
                    {errors.bankName && !bankIsOther && (
                      <Text style={styles.fieldError}>{errors.bankName}</Text>
                    )}
                  </View>
                  {bankIsOther && (
                    <TextInputWithLabel
                      label={t('payoutMethods.otherBankLabel')}
                      value={bankName}
                      onChangeText={setBankName}
                      placeholder={t('payoutMethods.bankNamePlaceholder')}
                      error={errors.bankName}
                      maxLength={120}
                    />
                  )}
                  <TextInputWithLabel
                    label={t('payoutMethods.accountNumberLabel')}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder={t('payoutMethods.accountNumberPlaceholder')}
                    error={errors.accountNumber}
                    keyboardType="number-pad"
                    maxLength={40}
                  />
                  <TextInputWithLabel
                    label={t('payoutMethods.branchLabel')}
                    value={branch}
                    onChangeText={setBranch}
                    placeholder={t('payoutMethods.branchPlaceholder')}
                    maxLength={120}
                  />
                </>
              ) : (
                <TextInputWithLabel
                  label={type === 'ESEWA' ? t('payoutMethods.walletIdLabelEsewa') : t('payoutMethods.walletIdLabelKhalti')}
                  value={walletId}
                  onChangeText={setWalletId}
                  placeholder={t('payoutMethods.walletIdPlaceholder')}
                  error={errors.walletId}
                  keyboardType="number-pad"
                  maxLength={40}
                />
              )}

              <TextInputWithLabel
                label={t('payoutMethods.labelLabel')}
                value={label}
                onChangeText={setLabel}
                placeholder={t('payoutMethods.labelPlaceholder')}
                maxLength={60}
              />

              <Pressable
                style={styles.defaultToggle}
                onPress={() => setIsDefault((v) => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isDefault }}>
                <View style={[styles.checkbox, { borderColor: isDefault ? C.brinjal1 : C.border, backgroundColor: isDefault ? C.brinjal1 : 'transparent' }]}>
                  {isDefault && <FontAwesome5 name="check" solid size={12} color="#fff" />}
                </View>
                <Text style={[styles.defaultToggleText, { color: C.text }]}>{t('payoutMethods.setDefault')}</Text>
              </Pressable>

              <Button
                label={isEdit ? t('payoutMethods.saveBtn') : t('payoutMethods.createBtn')}
                onPress={handleSubmit}
                loading={submitting}
              />
            </ScrollView>
          )}
        </MaxWidthContainer>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={bankSheetOpen}
        onClose={() => setBankSheetOpen(false)}
        title={t('payoutMethods.bankNameSheetTitle')}
        scrollable
        maxHeightPct={0.75}>
        {NEPAL_CLASS_A_BANKS.map((bank) => {
          const selected = !bankIsOther && bankName === bank;
          return (
            <Pressable
              key={bank}
              style={[styles.bankOption, { borderBottomColor: C.border }]}
              onPress={() => { setBankName(bank); setBankIsOther(false); setBankSheetOpen(false); setErrors((e) => ({ ...e, bankName: '' })); }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}>
              <Text style={[styles.bankOptionText, { color: selected ? C.brinjal1 : C.text }]}>{bank}</Text>
              {selected && <FontAwesome5 name="check" size={14} color={C.brinjal1} />}
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.bankOption, { borderBottomColor: C.border }]}
          onPress={() => { setBankName(''); setBankIsOther(true); setBankSheetOpen(false); setErrors((e) => ({ ...e, bankName: '' })); }}
          accessibilityRole="radio"
          accessibilityState={{ selected: bankIsOther }}>
          <Text style={[styles.bankOptionText, { color: bankIsOther ? C.brinjal1 : C.text, fontFamily: F.semibold }]}>
            {t('payoutMethods.otherBank')}
          </Text>
          {bankIsOther && <FontAwesome5 name="check" size={14} color={C.brinjal1} />}
        </Pressable>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.lg, gap: 18, paddingBottom: SPACING.xxxl },
  label: { fontSize: 14, fontFamily: F.semibold, marginBottom: 8 },

  typeStatic: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10 },
  typeStaticLogoWrap: { width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  typeStaticLogo: { width: 32, height: 32 },
  typeStaticIcon: { width: 40, height: 40, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  typeStaticText: { fontSize: 14, fontFamily: F.semibold },

  fieldLabel: { fontSize: 13, fontFamily: F.semibold, marginBottom: 8 },
  fieldError: { fontSize: 12, color: '#EF4444', fontFamily: F.medium, marginTop: 6 },
  select: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: RADIUS.md, paddingHorizontal: 14, minHeight: 50 },
  selectText: { flex: 1, fontSize: 15, lineHeight: 23, fontFamily: F.regular },
  bankOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  bankOptionText: { flex: 1, fontSize: 15, lineHeight: 23, fontFamily: F.regular },

  defaultToggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: RADIUS.sm, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  defaultToggleText: { fontSize: 14, fontFamily: F.medium },
});
