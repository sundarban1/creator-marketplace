import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { Skeleton } from '@/components/Skeleton';
import { useSupportContacts } from '@/services/siteInfo';
import { F, MIN_TOUCH_TARGET, RADIUS, SPACING } from '@/utilities/constants';
import {
  buildMailtoUrl,
  buildTelUrl,
  buildWhatsAppUrl,
  formatSupportPhone,
  getPhoneSupportStatus,
  normalizeSupportEmail,
  normalizeSupportPhone,
  supportEmailBody,
  supportWhatsAppMessage,
  SUPPORT_EMAIL_SUBJECT,
  type SupportContext,
} from '@/utilities/supportContact';

const WHATSAPP_GREEN = '#25D366';
/** Darker WhatsApp-family green — white text on it passes WCAG AA (5:1). */
const WHATSAPP_ACTION = '#15803D';

/**
 * The three support channels, in fixed order: WhatsApp (24/7, primary) →
 * phone (9 AM–5 PM Kathmandu) → email. Used inside the Contact Support sheet
 * and inline at the top of Settings → Support. Contact details come from the
 * admin's site-info settings; a missing/invalid one disables only its channel.
 */
export function SupportChannels({ context }: { context: SupportContext }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const { data, isPending, isError, refetch, isFetching } = useSupportContacts();
  const [phoneStatus, setPhoneStatus] = useState(() => getPhoneSupportStatus());
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One timer that fires at the next 9:00/17:00 Kathmandu boundary (re-armed
  // by the state change) + a re-check when the app returns to the foreground.
  useEffect(() => {
    const refresh = () => setPhoneStatus(getPhoneSupportStatus());
    const timer = setTimeout(refresh, phoneStatus.msUntilChange + 250);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => { clearTimeout(timer); sub.remove(); };
  }, [phoneStatus]);

  useEffect(() => () => { if (copiedTimer.current) clearTimeout(copiedTimer.current); }, []);

  if (isPending) {
    return (
      <View style={s.list} accessibilityLabel={t('supportContact.loading')} accessibilityState={{ busy: true }}>
        <Skeleton width="100%" height={148} radius={RADIUS.lg} />
        <Skeleton width="100%" height={92} radius={RADIUS.lg} />
        <Skeleton width="100%" height={64} radius={RADIUS.lg} />
      </View>
    );
  }

  const phone = normalizeSupportPhone(data?.supportPhone);
  const email = normalizeSupportEmail(data?.email);
  // Dedicated WhatsApp number when the admin set one, else the support line.
  const whatsappUrl = buildWhatsAppUrl(data?.whatsapp || data?.supportPhone, supportWhatsAppMessage(context));
  const telUrl = buildTelUrl(data?.supportPhone);
  const mailtoUrl = buildMailtoUrl(data?.email, SUPPORT_EMAIL_SUBJECT, supportEmailBody(context));
  const canCall = !!telUrl && phoneStatus.available;

  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  // Alert (not Toast) for failures — it renders above the sheet's Modal.
  const open = (url: string, fallback?: { value: string; message: string }) => {
    Linking.openURL(url).catch(() => {
      if (fallback) {
        void Clipboard.setStringAsync(fallback.value);
        Alert.alert(t('supportContact.openFailedTitle'), fallback.message);
      } else {
        Alert.alert(t('supportContact.openFailedTitle'), t('supportContact.openFailedGeneric'));
      }
    });
  };

  return (
    <View style={s.list}>
      {/* 1 — WhatsApp (primary) */}
      <View style={[s.card, { borderColor: WHATSAPP_GREEN + '55', backgroundColor: WHATSAPP_GREEN + '12' }]}>
        <View style={s.cardHead}>
          <View style={[s.iconTile, { backgroundColor: WHATSAPP_GREEN }]}>
            <FontAwesome5 name="whatsapp" size={22} color="#fff" brand />
          </View>
          <View style={s.cardText}>
            <Text style={[s.title, { color: C.text }]}>{t('supportContact.whatsappTitle')}</Text>
            {whatsappUrl ? (
              <StatusLine on label={t('supportContact.whatsappStatus')} />
            ) : null}
            <Text style={[s.desc, { color: C.textSecondary }]}>
              {whatsappUrl ? t('supportContact.whatsappDesc') : t('supportContact.whatsappUnavailable')}
            </Text>
          </View>
        </View>
        {whatsappUrl && (
          <Pressable
            onPress={() => open(whatsappUrl)}
            accessibilityRole="link"
            accessibilityLabel={`${t('supportContact.whatsappAction')}, ${t('supportContact.whatsappTitle')}`}
            style={({ pressed }) => [s.primaryBtn, { backgroundColor: WHATSAPP_ACTION, opacity: pressed ? 0.85 : 1 }]}>
            <FontAwesome5 name="whatsapp" size={17} color="#fff" brand />
            <Text style={s.primaryBtnText}>{t('supportContact.whatsappAction')}</Text>
          </Pressable>
        )}
      </View>

      {/* 2 — Phone (9 AM–5 PM Kathmandu) */}
      <Pressable
        disabled={!canCall}
        onPress={() => telUrl && phone && open(telUrl, {
          value: phone,
          message: t('supportContact.callFailed', { number: formatSupportPhone(phone) }),
        })}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canCall }}
        accessibilityLabel={[
          t('supportContact.phoneTitle'),
          telUrl ? t(phoneStatus.labelKey) : t('supportContact.phoneUnavailable'),
        ].join(', ')}
        style={({ pressed }) => [s.card, s.row, { borderColor: C.border, backgroundColor: pressed ? C.primaryLight : C.surface }]}>
        <View style={[s.iconTile, { backgroundColor: C.primaryLight, opacity: canCall ? 1 : 0.6 }]}>
          <FontAwesome5 name="phone-alt" size={17} color={C.brinjal1} solid />
        </View>
        <View style={s.cardText}>
          <Text style={[s.title, { color: C.text }]}>{t('supportContact.phoneTitle')}</Text>
          {telUrl ? (
            <>
              <StatusLine on={phoneStatus.available} label={t(phoneStatus.labelKey)} />
              <Text style={[s.desc, { color: C.textSecondary }]}>
                {phoneStatus.available || !whatsappUrl ? t('supportContact.phoneDesc') : t('supportContact.phoneClosedHint')}
              </Text>
              {phone && phoneStatus.available && (
                <Pressable
                  onPress={() => copy(phone)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={copied ? t('supportContact.copied') : t('supportContact.copyNumber')}
                  style={s.numberRow}>
                  <Text style={[s.number, { color: C.text }]} selectable>{formatSupportPhone(phone)}</Text>
                  <FontAwesome5 name={copied ? 'check' : 'copy'} size={12} color={copied ? C.active : C.textPlaceholder} solid={copied} />
                </Pressable>
              )}
            </>
          ) : (
            <Text style={[s.desc, { color: C.textSecondary }]}>{t('supportContact.phoneUnavailable')}</Text>
          )}
        </View>
        {canCall && (
          <View style={[s.callChip, { backgroundColor: C.brinjal1 }]}>
            <Text style={s.callChipText}>{t('supportContact.phoneAction')}</Text>
          </View>
        )}
      </Pressable>

      {/* 3 — Email (secondary, last) */}
      <Pressable
        disabled={!mailtoUrl}
        onPress={() => mailtoUrl && email && open(mailtoUrl, {
          value: email,
          message: t('supportContact.emailFailed', { email }),
        })}
        accessibilityRole="link"
        accessibilityState={{ disabled: !mailtoUrl }}
        accessibilityLabel={`${t('supportContact.emailTitle')}, ${mailtoUrl ? t('supportContact.emailAction') : t('supportContact.emailUnavailable')}`}
        style={({ pressed }) => [s.card, s.row, { borderColor: C.border, backgroundColor: pressed ? C.primaryLight : C.surface }]}>
        <View style={[s.iconTile, { backgroundColor: C.primaryLight, opacity: mailtoUrl ? 1 : 0.6 }]}>
          <FontAwesome5 name="envelope" size={17} color={C.brinjal1} solid />
        </View>
        <View style={s.cardText}>
          <Text style={[s.title, { color: C.text }]}>{t('supportContact.emailTitle')}</Text>
          <Text style={[s.desc, { color: C.textSecondary }]}>
            {mailtoUrl ? t('supportContact.emailDesc') : t('supportContact.emailUnavailable')}
          </Text>
        </View>
        {mailtoUrl && <FontAwesome5 name="chevron-right" size={14} color={C.textPlaceholder} solid />}
      </Pressable>

      {isError && (
        <Pressable
          onPress={() => refetch()}
          disabled={isFetching}
          accessibilityRole="button"
          style={[s.retry, { borderColor: C.border }]}>
          <FontAwesome5 name="redo" size={12} color={C.brinjal1} solid />
          <Text style={[s.retryText, { color: C.brinjal1 }]}>{t('supportContact.retry')}</Text>
        </Pressable>
      )}

      <Text style={[s.footer, { color: C.textSecondary }]}>{t('supportContact.footer')}</Text>
    </View>
  );
}

/** Dot + text — the text itself carries the state, never colour alone. */
function StatusLine({ on, label }: { on: boolean; label: string }) {
  const C = useAppColors();
  return (
    <View style={s.status}>
      <View style={[s.dot, { backgroundColor: on ? C.active : C.closed }]} />
      <Text style={[s.statusText, { color: C.text }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  list: { gap: SPACING.md },
  card: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, minHeight: 72 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  cardText: { flex: 1, minWidth: 0 },
  iconTile: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: F.bold, fontSize: 15, lineHeight: 22 },
  desc: { fontFamily: F.regular, fontSize: 13, lineHeight: 20, marginTop: 2 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: F.medium, fontSize: 12.5, lineHeight: 19 },
  primaryBtn: {
    marginTop: SPACING.md, minHeight: 50, borderRadius: RADIUS.full,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
  },
  primaryBtnText: { color: '#fff', fontFamily: F.bold, fontSize: 15, lineHeight: 22 },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, alignSelf: 'flex-start' },
  number: { fontFamily: F.medium, fontSize: 13.5, lineHeight: 20, fontVariant: ['tabular-nums'] },
  callChip: { borderRadius: RADIUS.full, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  callChipText: { color: '#fff', fontFamily: F.bold, fontSize: 13, lineHeight: 19 },
  retry: {
    minHeight: MIN_TOUCH_TARGET, borderWidth: 1, borderRadius: RADIUS.full,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
  },
  retryText: { fontFamily: F.bold, fontSize: 13.5, lineHeight: 20 },
  footer: { fontFamily: F.regular, fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: SPACING.sm },
});
