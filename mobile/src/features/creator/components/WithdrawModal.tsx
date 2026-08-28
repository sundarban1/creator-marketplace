import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { BottomSheet } from '@/components/BottomSheet';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { confirmSensitiveAction } from '@/services/biometric';
import type { ApiPayoutMethod, PayoutMethodType } from '@/services/wallet';
import { PAYMENT_METHOD_IMAGES } from '@/utilities/paymentMethods';
import { F, RADIUS } from '@/utilities/constants';

// decimal-pad has no "Done" key on iOS at all, so the keyboard has no way to
// dismiss itself without this accessory toolbar.
const AMOUNT_ACCESSORY_ID = 'withdraw-amount-done';

const TYPE_META: Record<PayoutMethodType, {
  icon: keyof typeof FontAwesome5.glyphMap;
  labelKey: string;
  image?: ImageSourcePropType;
}> = {
  BANK:   { icon: 'university', labelKey: 'payoutMethods.typeBank' },
  ESEWA:  { icon: 'wallet',     labelKey: 'payoutMethods.typeEsewa',  image: PAYMENT_METHOD_IMAGES.esewa },
  KHALTI: { icon: 'wallet',     labelKey: 'payoutMethods.typeKhalti', image: PAYMENT_METHOD_IMAGES.khalti },
};

function maskTail(value: string | null): string {
  if (!value) return '';
  const v = value.trim();
  return v.length <= 4 ? v : `•••• ${v.slice(-4)}`;
}

type Props = {
  visible: boolean;
  onClose: () => void;
  withdrawableBalance: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  dailyLimit: number;
  /** Headroom left against the daily limit (Rs.). */
  dailyWithdrawalLeft: number;
  /** True when today's requests leave no room for another — blocks new requests until tomorrow. */
  dailyLimitReached: boolean;
  /** True when a request is already in progress — only one is allowed at a time. */
  hasPendingWithdrawal: boolean;
  payoutMethods: ApiPayoutMethod[];
  onWithdraw: (amount: number, payoutMethodId: string) => Promise<void>;
  onManageMethods: () => void;
};

export function WithdrawModal({
  visible, onClose, withdrawableBalance = 0, minWithdrawal = 0, maxWithdrawal = 0,
  dailyLimit = 0, dailyWithdrawalLeft = 0, dailyLimitReached = false, hasPendingWithdrawal = false,
  payoutMethods, onWithdraw, onManageMethods,
}: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const method = payoutMethods.find((m) => m.id === selectedId)
    ?? (payoutMethods.length === 1 ? payoutMethods[0] : payoutMethods.find((m) => m.isDefault));

  function handleClose() {
    Keyboard.dismiss();
    setSelectedId(null);
    setAmountText('');
    setError('');
    onClose();
  }

  async function handleSubmit() {
    Keyboard.dismiss();
    const amount = parseFloat(amountText);
    if (hasPendingWithdrawal) { setError(t('wallet.errorPendingExists')); return; }
    if (dailyLimitReached) { setError(t('wallet.errorDailyLimitReached', { limit: dailyLimit.toLocaleString() })); return; }
    if (!method) { setError(t('wallet.errorNoMethod')); return; }
    if (!amountText || isNaN(amount) || amount <= 0) { setError(t('wallet.errorInvalidAmount')); return; }
    if (amount < minWithdrawal) { setError(t('wallet.errorBelowMinimum', { amount: minWithdrawal.toLocaleString() })); return; }
    if (maxWithdrawal > 0 && amount > maxWithdrawal) { setError(t('wallet.errorAboveMaximum', { amount: maxWithdrawal.toLocaleString() })); return; }
    if (amount > withdrawableBalance) { setError(t('wallet.errorInsufficientBalance')); return; }
    if (dailyLimit > 0 && amount > dailyWithdrawalLeft) {
      setError(t('wallet.errorDailyLimitLeft', { amount: dailyWithdrawalLeft.toLocaleString(), limit: dailyLimit.toLocaleString() }));
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const confirmation = await confirmSensitiveAction(
        t('wallet.confirmPrompt', { amount: amount.toLocaleString() }),
        t('wallet.confirmCancel'),
      );
      if (confirmation === 'cancelled') return;
      if (confirmation === 'failed') { setError(t('wallet.confirmFailed')); return; }

      await onWithdraw(amount, method.id);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('wallet.withdrawError'));
    } finally {
      setSubmitting(false);
    }
  }

  const hasMethods = payoutMethods.length > 0;
  // A new request can't be made right now: one is already in progress, or
  // today's requests have used up the daily limit.
  const blocked = hasPendingWithdrawal || dailyLimitReached;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={t('wallet.modalTitle')}
      maxHeightPct={0.85}
      contentContainerStyle={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }}
      footer={hasMethods ? (
        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: C.brinjal1, shadowColor: C.brinjal1, opacity: (submitting || blocked) ? 0.5 : 1 },
            pressed && { opacity: 0.88 },
          ]}
          disabled={submitting || blocked}
          onPress={handleSubmit}>
          {submitting
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.submitBtnText}>{t('wallet.submitWithdrawal')}</Text>}
        </Pressable>
      ) : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.body}>
          <Text style={[styles.requestNote, { color: C.active }]}>{t('wallet.requestNote')}</Text>
          {!hasMethods ? (
            <View style={styles.emptyMethods}>
              <Text style={[styles.emptyMethodsText, { color: C.textSecondary }]}>{t('wallet.noPayoutMethodsHint')}</Text>
              <Pressable onPress={() => { handleClose(); onManageMethods(); }}>
                <Text style={[styles.manageLink, { color: C.brinjal1 }]}>{t('payoutMethods.add')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {hasPendingWithdrawal ? (
                <View style={[styles.pendingBanner, { backgroundColor: C.draft + '1F', borderColor: C.draft }]}>
                  <FontAwesome5 name="clock" solid size={13} color={C.draft} />
                  <Text style={[styles.pendingText, { color: C.text }]}>{t('wallet.pendingBanner')}</Text>
                </View>
              ) : dailyLimitReached && (
                <View style={[styles.pendingBanner, { backgroundColor: C.draft + '1F', borderColor: C.draft }]}>
                  <FontAwesome5 name="calendar-times" solid size={13} color={C.draft} />
                  <Text style={[styles.pendingText, { color: C.text }]}>
                    {t('wallet.dailyLimitReachedBanner', { limit: dailyLimit.toLocaleString() })}
                  </Text>
                </View>
              )}

              <View style={[styles.availableCard, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.availableLabel, { color: C.brinjal1 }]}>{t('wallet.availableToWithdraw')}</Text>
                <Text style={[styles.availableValue, { color: C.brinjal1 }]}>Rs. {withdrawableBalance.toLocaleString()}</Text>
              </View>

              <View style={{ marginTop: 16 }}>
                <TextInputWithLabel
                  label={`${t('wallet.amountLabel')} (Rs.)`}
                  leftIcon="wallet"
                  value={amountText}
                  onChangeText={(v) => { setAmountText(v.replace(/[^0-9.]/g, '')); setError(''); }}
                  placeholder={t('wallet.amountPlaceholder')}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  inputAccessoryViewID={Platform.OS === 'ios' ? AMOUNT_ACCESSORY_ID : undefined}
                />
              </View>
              <View style={styles.limitsBox}>
                <Text style={[styles.limitRow, { color: C.textSecondary }]}>
                  • {t('wallet.limitMin', { amount: minWithdrawal.toLocaleString() })}
                </Text>
                {maxWithdrawal > 0 && (
                  <Text style={[styles.limitRow, { color: C.textSecondary }]}>
                    • {t('wallet.limitMax', { amount: maxWithdrawal.toLocaleString() })}
                  </Text>
                )}
                {dailyLimit > 0 && (
                  <Text style={[styles.limitRow, { color: C.textSecondary }]}>
                    • {t('wallet.limitDaily', { amount: dailyLimit.toLocaleString(), left: dailyWithdrawalLeft.toLocaleString() })}
                  </Text>
                )}
                <Text style={[styles.limitRow, { color: C.textSecondary }]}>• {t('wallet.limitOnePending')}</Text>
                <Text style={[styles.limitRow, { color: C.textSecondary }]}>• {t('wallet.limitAdminApproval')}</Text>
              </View>

              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: C.textSecondary }]}>{t('wallet.selectPayoutMethod')}</Text>
                <Pressable onPress={() => { handleClose(); onManageMethods(); }} hitSlop={8}>
                  <Text style={[styles.manageLink, { color: C.brinjal1 }]}>{t('payoutMethods.manage')}</Text>
                </Pressable>
              </View>
              <View style={{ gap: 8 }}>
                {payoutMethods.map((m) => {
                  const active = method?.id === m.id;
                  const secondary = m.type === 'BANK'
                    ? [m.bankName, maskTail(m.accountNumber)].filter(Boolean).join(' · ')
                    : maskTail(m.walletId);
                  const meta = TYPE_META[m.type];
                  return (
                    <Pressable
                      key={m.id}
                      style={[styles.methodRow, { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.background }]}
                      onPress={() => setSelectedId(m.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}>
                      <View style={[styles.methodGlyph, meta.image ? styles.methodGlyphLogo : { backgroundColor: C.primaryLight }]}>
                        {meta.image
                          ? <Image source={meta.image} style={styles.methodLogo} resizeMode="contain" />
                          : <FontAwesome5 name={meta.icon} solid size={16} color={active ? C.brinjal1 : C.textSecondary} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.methodName, { color: C.text }]} numberOfLines={1}>
                          {m.label?.trim() || t(meta.labelKey)}
                        </Text>
                        <Text style={[styles.methodSub, { color: C.textSecondary }]} numberOfLines={1}>
                          {[m.accountName, secondary].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      <View style={[styles.radioOuter, { borderColor: active ? C.brinjal1 : C.border }]}>
                        {active && <View style={[styles.radioInner, { backgroundColor: C.brinjal1 }]} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </>
          )}
        </View>
      </TouchableWithoutFeedback>

      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={AMOUNT_ACCESSORY_ID}>
          <View style={[styles.accessoryBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={8}>
              <Text style={[styles.accessoryDoneText, { color: C.brinjal1 }]}>{t('wallet.keyboardDone')}</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 4 },

  availableCard: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, gap: 2 },
  availableLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: F.bold },
  availableValue: { fontSize: 22, fontFamily: F.bold },

  requestNote: { fontSize: 13, fontFamily: F.bold, lineHeight: 20, marginBottom: 4 },
  label: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: F.bold },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },

  limitsBox: { marginTop: 8, gap: 3 },
  limitRow: { fontSize: 12, fontFamily: F.regular, lineHeight: 18 },

  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 4 },
  pendingText: { flex: 1, fontSize: 12.5, fontFamily: F.medium, lineHeight: 18 },

  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1.5, paddingVertical: 12, paddingHorizontal: 14 },
  methodGlyph: { width: 40, height: 40, borderRadius: RADIUS.sm, justifyContent: 'center', alignItems: 'center' },
  methodGlyphLogo: { backgroundColor: '#FFFFFF' },
  methodLogo: { width: 32, height: 32 },
  methodName: { fontSize: 13, fontFamily: F.semibold },
  methodSub: { fontSize: 11, fontFamily: F.regular, marginTop: 2 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },

  errorText: { fontSize: 12, color: '#EF4444', fontFamily: F.medium, marginTop: 8 },

  emptyMethods: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyMethodsText: { fontSize: 13, fontFamily: F.regular, textAlign: 'center' },
  manageLink: { fontSize: 13, fontFamily: F.semibold },

  submitBtn: { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  submitBtnText: { color: '#fff', fontSize: 15, fontFamily: F.bold },

  accessoryBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  accessoryDoneText: { fontSize: 15, fontFamily: F.semibold },
});
