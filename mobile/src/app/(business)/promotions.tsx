import { router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/Skeleton';
import { TabSlider } from '@/components/TabSlider';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import { useRefetchOnFocusIfStale } from '@/hooks/useRefetchOnFocusIfStale';
import { STALE } from '@/lib/queryClient';
import { TabColors } from '@/utilities/tabColors';
import { promotionService, type ApiPromotionManage, type PromotionStatus } from '@/services/rewards';
import { F, FONT_SIZE, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const STATUS_STYLE: Record<PromotionStatus, { bg: string; color: string }> = {
  ACTIVE:  TabColors.positive,
  DRAFT:   TabColors.warning,
  PAUSED:  TabColors.closed,
  EXPIRED: TabColors.neutral,
};

const STATUS_ORDER: PromotionStatus[] = ['ACTIVE', 'DRAFT', 'PAUSED', 'EXPIRED'];
const EMPTY: ApiPromotionManage[] = [];

export default function PromotionsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<PromotionStatus>('ACTIVE');
  const [pausingId, setPausingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const promotionsQuery = useQuery({
    queryKey: ['promotions', 'mine'],
    queryFn: () => promotionService.listMine(),
    staleTime: STALE.list,
  });
  useRefetchOnFocusIfStale(promotionsQuery);

  const promotions = promotionsQuery.data ?? EMPTY;
  const filtered = useMemo(() => promotions.filter((p) => p.status === statusFilter), [promotions, statusFilter]);

  const tabs = STATUS_ORDER.map((s) => ({
    key: s,
    label: t(`promotions.tab${s}`),
    count: promotions.filter((p) => p.status === s).length,
    color: STATUS_STYLE[s].color,
  }));

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['promotions', 'mine'] });
  }

  function handlePause(promo: ApiPromotionManage) {
    Alert.alert(
      t('promotions.pauseConfirmTitle'),
      t('promotions.pauseConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('promotions.pauseConfirmButton'),
          style: 'destructive',
          onPress: async () => {
            setPausingId(promo.id);
            try {
              await promotionService.pause(promo.id);
              await refresh();
            } catch (err: any) {
              toast.error(err?.message || t('promotions.pauseError'));
            } finally {
              setPausingId(null);
            }
          },
        },
      ],
    );
  }

  async function handlePublish(promo: ApiPromotionManage) {
    setPublishingId(promo.id);
    try {
      await promotionService.publish(promo.id);
      toast.success(t('promotions.publishSuccess'));
      await refresh();
    } catch (err: any) {
      toast.error(err?.message || t('promotions.publishError'));
    } finally {
      setPublishingId(null);
    }
  }

  function handleEdit(promo: ApiPromotionManage) {
    router.push({ pathname: '/(business)/create-promotion', params: { id: promo.id } });
  }

  function handleDelete(promo: ApiPromotionManage) {
    Alert.alert(
      t('promotions.deleteConfirmTitle'),
      t('promotions.deleteConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('promotions.deleteConfirmButton'),
          style: 'destructive',
          onPress: async () => {
            setDeletingId(promo.id);
            try {
              await promotionService.remove(promo.id);
              toast.success(t('promotions.deleteSuccess'));
              await refresh();
            } catch (err: any) {
              toast.error(err?.message || t('promotions.deleteError'));
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
        <PageHeader
          title={t('promotions.headerTitle')}
          backFallback="/(business)/(tabs)"
          rightSlot={
            <Pressable hitSlop={8} onPress={() => router.push('/(business)/create-promotion')}>
              <FontAwesome5 name="plus-circle" solid size={22} color={C.brinjal1} />
            </Pressable>
          }
        />

        <View style={styles.tabsWrap}>
          <TabSlider tabs={tabs} active={statusFilter} onChange={(k) => setStatusFilter(k as PromotionStatus)} />
        </View>

        {promotionsQuery.isPending ? (
          <View style={styles.list}>
            {[0, 1, 2].map((i) => <Skeleton key={i} width="100%" height={130} radius={RADIUS.lg} />)}
          </View>
        ) : filtered.length === 0 ? (
          <EmptyState
            faIcon="tags"
            title={t('promotions.emptyTitle')}
            subtitle={t('promotions.emptyHint')}
            action={{ label: t('promotions.createButton'), onPress: () => router.push('/(business)/create-promotion') }}
          />
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {filtered.map((p) => (
              <PromotionRow
                key={p.id}
                promotion={p}
                pausing={pausingId === p.id}
                publishing={publishingId === p.id}
                deleting={deletingId === p.id}
                onPause={() => handlePause(p)}
                onPublish={() => handlePublish(p)}
                onEdit={() => handleEdit(p)}
                onDelete={() => handleDelete(p)}
              />
            ))}
          </ScrollView>
        )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const EDITABLE_STATUSES: PromotionStatus[] = ['DRAFT', 'PAUSED'];

function PromotionRow({
  promotion, pausing, publishing, deleting, onPause, onPublish, onEdit, onDelete,
}: {
  promotion: ApiPromotionManage;
  pausing: boolean;
  publishing: boolean;
  deleting: boolean;
  onPause: () => void;
  onPublish: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const style = STATUS_STYLE[promotion.status];
  const discount = promotion.discountType === 'PERCENTAGE'
    ? `${promotion.discountValue}% OFF`
    : `Rs. ${promotion.discountValue.toLocaleString()} OFF`;

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.card]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.discount, { color: C.brinjal1 }]} numberOfLines={1}>{discount}</Text>
          <Text style={[styles.title, { color: C.text }]} numberOfLines={1}>{promotion.title}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: style.bg }]}>
          <Text style={[styles.statusText, { color: style.color }]}>{t(`promotions.tab${promotion.status}`)}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Text style={[styles.statText, { color: C.textSecondary }]}>{t('promotions.redemptionsLabel', { n: promotion.redemptions })}</Text>
        <Text style={[styles.statText, { color: C.textSecondary }]}>{t('promotions.creditsEarnedLabel', { n: promotion.creditsEarned.toLocaleString() })}</Text>
        {promotion.status !== 'DRAFT' && (
          <Text style={[styles.statText, { color: C.textSecondary }]}>{t('promotions.endsLabel', { date: formatDate(promotion.validUntil) })}</Text>
        )}
      </View>

      {(promotion.status === 'ACTIVE' || promotion.status === 'DRAFT' || promotion.status === 'PAUSED') && (
        <View style={styles.actionsRow}>
          {promotion.status === 'ACTIVE' ? (
            <Pressable
              style={[styles.actionBtn, { borderColor: C.border }]}
              disabled={pausing}
              onPress={onPause}>
              <FontAwesome5 name="pause" solid size={12} color={C.textSecondary} />
              <Text style={[styles.actionBtnText, { color: C.textSecondary }]}>{t('promotions.pauseButton')}</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.actionBtn, { borderColor: C.brinjal1 }]}
              disabled={publishing}
              onPress={onPublish}>
              <FontAwesome5 name="bullhorn" solid size={12} color={C.brinjal1} />
              <Text style={[styles.actionBtnText, { color: C.brinjal1 }]}>{t('promotions.publishButton')}</Text>
            </Pressable>
          )}

          {(EDITABLE_STATUSES.includes(promotion.status) || promotion.status === 'ACTIVE') && (
            <Pressable
              style={[styles.actionBtn, { borderColor: C.border }]}
              disabled={deleting}
              onPress={onEdit}>
              <FontAwesome5 name="pen" solid size={12} color={C.textSecondary} />
              <Text style={[styles.actionBtnText, { color: C.textSecondary }]}>{t('common.edit')}</Text>
            </Pressable>
          )}
          {EDITABLE_STATUSES.includes(promotion.status) && (
            <Pressable
              style={[styles.actionBtn, { borderColor: TabColors.danger.color }]}
              disabled={deleting}
              onPress={onDelete}>
              <FontAwesome5 name="trash-alt" solid size={12} color={TabColors.danger.color} />
              <Text style={[styles.actionBtnText, { color: TabColors.danger.color }]}>{t('common.delete')}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsWrap: { paddingHorizontal: SCREEN_GUTTER, marginTop: 4, marginBottom: SPACING.sm },
  list: { paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxxl, gap: SPACING.md },

  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  discount: { fontSize: FONT_SIZE.lg, fontFamily: F.extrabold },
  title: { fontSize: FONT_SIZE.sm, fontFamily: F.medium, marginTop: 2 },
  statusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontFamily: F.bold },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statText: { fontSize: FONT_SIZE.xs, fontFamily: F.medium },

  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 14, paddingVertical: 8 },
  actionBtnText: { fontSize: FONT_SIZE.xs, fontFamily: F.bold },
});
