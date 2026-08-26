import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { AppModal } from '@/components/AppModal';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { walletService, type ApiPayoutMethod, type PayoutMethodType } from '@/services/wallet';
import { OfflineError } from '@/lib/api';
import { PAYMENT_METHOD_IMAGES } from '@/utilities/paymentMethods';
import { F, MIN_TOUCH_TARGET, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

const TYPE_META: Record<PayoutMethodType, {
  icon: keyof typeof FontAwesome5.glyphMap;
  labelKey: string;
  image?: ImageSourcePropType;
}> = {
  BANK:   { icon: 'university', labelKey: 'payoutMethods.typeBank' },
  ESEWA:  { icon: 'wallet',     labelKey: 'payoutMethods.typeEsewa',  image: PAYMENT_METHOD_IMAGES.esewa },
  KHALTI: { icon: 'wallet',     labelKey: 'payoutMethods.typeKhalti', image: PAYMENT_METHOD_IMAGES.khalti },
};

// One payout account per type: tapping a tile opens the add form for that type,
// or the edit form when an account of that type already exists.
const PICKER_ORDER: PayoutMethodType[] = ['KHALTI', 'ESEWA', 'BANK'];

function maskTail(value: string | null): string {
  if (!value) return '';
  const v = value.trim();
  return v.length <= 4 ? v : `•••• ${v.slice(-4)}`;
}

export default function PayoutMethodsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const [methods, setMethods] = useState<ApiPayoutMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiPayoutMethod | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMethods(await walletService.listPayoutMethods());
    } catch (err) {
      setError(err instanceof OfflineError
        ? t('payoutMethods.errorMessage')
        : (err instanceof Error ? err.message : t('payoutMethods.errorMessage')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await walletService.deletePayoutMethod(deleteTarget.id);
      setMethods((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('payoutMethods.saveFailed'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader
        title={t('payoutMethods.title')}
        backFallback="/(creator)/wallet"
      />
      <MaxWidthContainer>
        {loading ? (
          <View style={styles.list}>
            <PayoutTypePicker methods={[]} />
            {[0, 1].map((i) => <ListRowSkeleton key={i} withBadge />)}
          </View>
        ) : error ? (
          <ErrorState
            title={t('payoutMethods.errorTitle')}
            message={error}
            actionLabel={t('payoutMethods.retry')}
            onAction={load}
          />
        ) : (
          <FlatList
            data={methods}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <PayoutMethodCard
                item={item}
                onEdit={() => router.push({ pathname: '/(creator)/payout-method-form', params: { id: item.id } })}
                onDelete={() => setDeleteTarget(item)}
              />
            )}
            ListHeaderComponent={<PayoutTypePicker methods={methods} />}
            contentContainerStyle={[styles.list, methods.length === 0 && styles.listEmpty]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="money-check-alt"
                title={t('payoutMethods.emptyTitle')}
                subtitle={t('payoutMethods.emptySub')}
              />
            }
          />
        )}
      </MaxWidthContainer>

      <AppModal
        visible={!!deleteTarget}
        type="danger"
        title={t('payoutMethods.deleteTitle')}
        body={deleteTarget ? t('payoutMethods.deleteBody', { name: payoutLabel(deleteTarget, t) }) : ''}
        confirmLabel={t('payoutMethods.delete')}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

function payoutLabel(m: ApiPayoutMethod, t: (k: string) => string): string {
  return m.label?.trim() || t(TYPE_META[m.type].labelKey);
}

function PayoutTypePicker({ methods }: { methods: ApiPayoutMethod[] }) {
  const C = useAppColors();
  const { t } = useLanguage();

  return (
    <View style={styles.pickerRow}>
      {PICKER_ORDER.map((type) => {
        const meta = TYPE_META[type];
        const existing = methods.find((m) => m.type === type);
        const ctaColor = existing ? C.brinjal1 : C.textSecondary;
        return (
          <Pressable
            key={type}
            style={[styles.pickerTile, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={() => router.push(existing
              ? { pathname: '/(creator)/payout-method-form', params: { id: existing.id } }
              : { pathname: '/(creator)/payout-method-form', params: { type } })}
            accessibilityRole="button"
            accessibilityLabel={`${t(meta.labelKey)} — ${existing ? t('payoutMethods.edit') : t('payoutMethods.addDetails')}`}>
            <View style={[styles.pickerGlyph, meta.image ? styles.pickerGlyphLogo : { backgroundColor: C.primaryLight }]}>
              {meta.image
                ? <Image source={meta.image} style={styles.pickerLogo} resizeMode="contain" />
                : <FontAwesome5 name={meta.icon} solid size={18} color={C.brinjal1} />}
            </View>
            <Text style={[styles.pickerLabel, { color: C.text }]} numberOfLines={1}>{t(meta.labelKey)}</Text>
            <View style={styles.pickerCta}>
              <Text style={[styles.pickerCtaText, { color: ctaColor }]} numberOfLines={1}>
                {existing ? t('payoutMethods.edit') : t('payoutMethods.addDetails')}
              </Text>
              <FontAwesome5 name="chevron-right" size={9} color={ctaColor} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function PayoutMethodCard({ item, onEdit, onDelete }: {
  item: ApiPayoutMethod;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const meta = TYPE_META[item.type];
  const secondary = item.type === 'BANK'
    ? [item.bankName, maskTail(item.accountNumber)].filter(Boolean).join(' · ')
    : maskTail(item.walletId);

  return (
    <Pressable
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.raised]}
      onPress={onEdit}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconWrap, meta.image ? styles.iconWrapLogo : { backgroundColor: C.primaryLight }]}>
          {meta.image
            ? <Image source={meta.image} style={styles.cardLogo} resizeMode="contain" />
            : <FontAwesome5 name={meta.icon} solid size={15} color={C.brinjal1} />}
        </View>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={[styles.methodName, { color: C.text }]} numberOfLines={1}>
              {item.label?.trim() || t(meta.labelKey)}
            </Text>
            {item.isDefault && (
              <View style={[styles.defaultBadge, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.defaultBadgeText, { color: C.brinjal1 }]}>{t('payoutMethods.defaultBadge')}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.accountName, { color: C.textSecondary }]} numberOfLines={1}>
            {item.accountName}
          </Text>
          {!!secondary && (
            <Text style={[styles.secondary, { color: C.textSecondary }]} numberOfLines={1}>{secondary}</Text>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, { borderColor: C.border }]} onPress={onEdit} hitSlop={6}>
          <FontAwesome5 name="edit" solid size={13} color={C.textSecondary} />
          <Text style={[styles.actionText, { color: C.textSecondary }]}>{t('payoutMethods.edit')}</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { borderColor: C.border }]} onPress={onDelete} hitSlop={6}>
          <FontAwesome5 name="trash-alt" solid size={13} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('payoutMethods.delete')}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
  listEmpty: { flexGrow: 1 },

  pickerRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xs },
  pickerTile: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET * 2,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center',
    gap: 6,
  },
  pickerGlyph: { width: 52, height: 52, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  pickerGlyphLogo: { backgroundColor: '#FFFFFF' },
  pickerLogo: { width: 44, height: 44 },
  pickerLabel: { fontSize: 12, fontFamily: F.semibold, textAlign: 'center' },
  pickerCta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pickerCtaText: { fontSize: 11, fontFamily: F.medium },

  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  iconWrapLogo: { backgroundColor: '#FFFFFF' },
  cardLogo: { width: 40, height: 40 },
  headerText: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  methodName: { fontSize: 15, fontFamily: F.bold, flexShrink: 1 },
  defaultBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  defaultBadgeText: { fontSize: 10, fontFamily: F.bold },
  accountName: { fontSize: 13, fontFamily: F.medium },
  secondary: { fontSize: 12, fontFamily: F.regular },

  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', gap: 6, height: 38, borderRadius: RADIUS.md, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 13, fontFamily: F.semibold },
});
