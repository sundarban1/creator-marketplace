import { useState } from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Animated,
  InputAccessoryView,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useKeyboardOffset } from '@/hooks/useKeyboardOffset';
import { F } from '@/utilities/constants';

const METHOD_META: Record<string, { icon: string; label: string; color: string }> = {
  esewa:   { icon: 'wallet',          label: 'eSewa',   color: '#60BB46' },
  khalti:  { icon: 'money-check-alt', label: 'Khalti',  color: '#5C2D91' },
  fonepay: { icon: 'credit-card',     label: 'FonePay', color: '#003087' },
};

// decimal-pad has no "Done" key on iOS at all, so the keyboard has no way to
// dismiss itself without this accessory toolbar.
const AMOUNT_ACCESSORY_ID = 'withdraw-amount-done';

type Props = {
  visible: boolean;
  onClose: () => void;
  availableBalance: number;
  paymentMethods: string[];
  onWithdraw: (amount: number, method: string) => Promise<void>;
  onManageMethods: () => void;
};

export function WithdrawModal({ visible, onClose, availableBalance, paymentMethods, onWithdraw, onManageMethods }: Props) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [method, setMethod] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const keyboardOffset = useKeyboardOffset();

  function handleClose() {
    Keyboard.dismiss();
    setMethod(null);
    setAmountText('');
    setError('');
    onClose();
  }

  async function handleSubmit() {
    Keyboard.dismiss();
    const amount = parseFloat(amountText);
    if (!method) { setError(t('wallet.errorNoMethod')); return; }
    if (!amountText || isNaN(amount) || amount <= 0) { setError(t('wallet.errorInvalidAmount')); return; }
    if (amount > availableBalance) { setError(t('wallet.errorInsufficientBalance')); return; }

    setError('');
    setSubmitting(true);
    try {
      await onWithdraw(amount, method);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('wallet.withdrawError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} style={styles.backdrop} onPress={handleClose} />
      <Animated.View style={[styles.sheet, { backgroundColor: C.surface, transform: [{ translateY: keyboardOffset }] }]}>
        <View style={[styles.handle, { backgroundColor: C.border }]} />

        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>{t('wallet.modalTitle')}</Text>
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.body}>
          {paymentMethods.length === 0 ? (
            <View style={styles.emptyMethods}>
              <Text style={[styles.emptyMethodsText, { color: C.textSecondary }]}>{t('wallet.noPaymentMethodsHint')}</Text>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => { handleClose(); onManageMethods(); }}>
                <Text style={[styles.manageLink, { color: C.brinjal1 }]}>{t('wallet.managePaymentMethods')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={[styles.label, { color: C.textSecondary }]}>{t('wallet.selectMethod')}</Text>
              <View style={styles.methodRow}>
                {paymentMethods.map((m) => {
                  const meta = METHOD_META[m] ?? { icon: 'credit-card', label: m, color: C.brinjal1 };
                  const active = method === m;
                  return (
                    <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                      key={m}
                      style={[
                        styles.methodChip,
                        { borderColor: active ? meta.color : C.border, backgroundColor: active ? `${meta.color}15` : C.background },
                      ]}
                      onPress={() => setMethod(m)}>
                      <FontAwesome5 name={meta.icon} size={16} color={meta.color} />
                      <Text style={[styles.methodLabel, { color: active ? meta.color : C.text }]}>{meta.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: C.textSecondary, marginTop: 16 }]}>{t('wallet.amountLabel')}</Text>
              <View style={[styles.amountRow, { backgroundColor: C.background, borderColor: C.border }]}>
                <Text style={[styles.currencyPrefix, { color: C.textSecondary }]}>Rs.</Text>
                <TextInput
                  style={[styles.amountInput, { color: C.text }]}
                  value={amountText}
                  onChangeText={(v) => { setAmountText(v.replace(/[^0-9.]/g, '')); setError(''); }}
                  placeholder={t('wallet.amountPlaceholder')}
                  placeholderTextColor={C.textSecondary}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  inputAccessoryViewID={Platform.OS === 'ios' ? AMOUNT_ACCESSORY_ID : undefined}
                />
              </View>
              <Text style={[styles.availableHint, { color: C.textSecondary }]}>
                {t('wallet.availableHint', { amount: availableBalance.toLocaleString() })}
              </Text>

              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </>
          )}
        </View>
        </TouchableWithoutFeedback>

        {Platform.OS === 'ios' && (
          <InputAccessoryView nativeID={AMOUNT_ACCESSORY_ID}>
            <View style={[styles.accessoryBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
              <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }} onPress={() => Keyboard.dismiss()} hitSlop={8}>
                <Text style={[styles.accessoryDoneText, { color: C.brinjal1 }]}>{t('wallet.keyboardDone')}</Text>
              </Pressable>
            </View>
          </InputAccessoryView>
        )}

        {paymentMethods.length > 0 && (
          <View style={[styles.footer, { borderTopColor: C.border }]}>
            <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: C.brinjal1, shadowColor: C.brinjal1, opacity: submitting ? 0.7 : 1 },
                pressed && { opacity: 0.88 },
              ]}
              disabled={submitting}
              onPress={handleSubmit}>
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.submitBtnText}>{t('wallet.withdrawBtn', { amount: amountText || '0' })}</Text>}
            </Pressable>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:    { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 20 },
  handle:   { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title:    { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  body:     { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 4 },
  footer:   { padding: 20, borderTopWidth: 1 },

  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: F.bold, marginBottom: 8 },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodChip: { flex: 1, alignItems: 'center', gap: 4, borderRadius: 12, borderWidth: 1.5, paddingVertical: 12 },
  methodLabel: { fontSize: 12, fontWeight: '600', fontFamily: F.semibold },

  amountRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, height: 52, gap: 8 },
  currencyPrefix: { fontSize: 15, fontFamily: F.semibold },
  amountInput: { flex: 1, fontSize: 18, fontFamily: F.bold },
  availableHint: { fontSize: 12, fontFamily: F.regular, marginTop: 6 },
  errorText: { fontSize: 12, color: '#EF4444', fontFamily: F.medium, marginTop: 8 },

  emptyMethods: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyMethodsText: { fontSize: 13, fontFamily: F.regular, textAlign: 'center' },
  manageLink: { fontSize: 13, fontFamily: F.semibold },

  submitBtn: { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: F.bold },

  accessoryBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  accessoryDoneText: { fontSize: 15, fontWeight: '700', fontFamily: F.semibold },
});
