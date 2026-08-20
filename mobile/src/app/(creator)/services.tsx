import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { serviceService, type ApiService } from '@/services/service';
import { OfflineError } from '@/lib/api';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

const PRICING_MODEL_LABEL: Record<ApiService['pricingModel'], string> = {
  PER_PROJECT:  'servicesScreen.pricingPerProject',
  PER_HOUR:     'servicesScreen.pricingPerHour',
  PER_DAY:      'servicesScreen.pricingPerDay',
  PER_CAMPAIGN: 'servicesScreen.pricingPerCampaign',
  CUSTOM_QUOTE: 'servicesScreen.pricingCustomQuote',
};

export default function ServicesScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [services, setServices] = useState<ApiService[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiService | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setServices(await serviceService.listMine());
    } catch (err) {
      setError(
        err instanceof OfflineError
          ? t('servicesScreen.errorMessage')
          : (err instanceof Error ? err.message : t('servicesScreen.errorMessage'))
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await serviceService.remove(deleteTarget.id);
      setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      // Leave the confirm modal open with its loading state cleared so the
      // user can see it didn't go through and retry, rather than silently
      // closing on a failed delete.
    } finally {
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader
        title={t('servicesScreen.title')}
        rightSlot={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <Pressable
              hitSlop={10}
              onPress={() => router.push('/(creator)/service-requests')}
              accessibilityRole="button"
              accessibilityLabel={t('serviceRequests.title')}>
              <FontAwesome5 name="inbox" solid size={17} color={C.brinjal1} />
            </Pressable>
            <Pressable
              hitSlop={10}
              onPress={() => router.push('/(creator)/service-form')}
              accessibilityRole="button"
              accessibilityLabel={t('servicesScreen.addService')}>
              <FontAwesome5 name="plus" solid size={18} color={C.brinjal1} />
            </Pressable>
          </View>
        }
      />
      <MaxWidthContainer>
        {loading ? (
          <View style={styles.list}>
            {[0, 1, 2].map((i) => <ListRowSkeleton key={i} withBadge />)}
          </View>
        ) : error ? (
          <ErrorState
            title={t('servicesScreen.errorTitle')}
            message={error}
            actionLabel={t('invitations.retry')}
            onAction={load}
          />
        ) : (
          <FlatList
            data={services}
            keyExtractor={(s) => s.id}
            renderItem={({ item }) => (
              <ServiceCard
                item={item}
                onEdit={() => router.push({ pathname: '/(creator)/service-form', params: { id: item.id } })}
                onDelete={() => setDeleteTarget(item)}
              />
            )}
            contentContainerStyle={[styles.list, services.length === 0 && styles.listEmpty]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="briefcase"
                title={t('servicesScreen.emptyTitle')}
                subtitle={t('servicesScreen.emptySub')}
                action={{ label: t('servicesScreen.addService'), onPress: () => router.push('/(creator)/service-form') }}
              />
            }
          />
        )}
      </MaxWidthContainer>

      <AppModal
        visible={!!deleteTarget}
        type="danger"
        title={t('servicesScreen.deleteTitle')}
        body={deleteTarget ? t('servicesScreen.deleteBody', { name: deleteTarget.name }) : ''}
        confirmLabel={t('servicesScreen.delete')}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

function ServiceCard({ item, onEdit, onDelete }: {
  item: ApiService;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const statusActive = item.status === 'ACTIVE';

  return (
    <Pressable
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.raised]}
      onPress={onEdit}>
      <View style={styles.cardHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: `${item.category.color}1A` }]}>
          <FontAwesome5 name={item.category.icon as any} solid size={13} color={item.category.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.serviceName, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.categoryName, { color: C.textSecondary }]} numberOfLines={1}>{item.category.name}</Text>
        </View>
        {!statusActive && (
          <View style={[styles.statusBadge, { backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.statusBadgeText, { color: '#DC2626' }]}>{item.status}</Text>
          </View>
        )}
      </View>

      <Text style={[styles.description, { color: C.textSecondary }]} numberOfLines={2}>{item.description}</Text>

      <View style={styles.metaRow}>
        {item.startingPrice != null && (
          <Text style={[styles.price, { color: C.brinjal1 }]}>{`Rs. ${item.startingPrice.toLocaleString()}`}</Text>
        )}
        <Text style={[styles.pricingModel, { color: C.textSecondary }]}>{t(PRICING_MODEL_LABEL[item.pricingModel])}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, { borderColor: C.border }]} onPress={onEdit} hitSlop={6}>
          <FontAwesome5 name="edit" solid size={13} color={C.textSecondary} />
          <Text style={[styles.actionText, { color: C.textSecondary }]}>{t('servicesScreen.edit')}</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { borderColor: C.border }]} onPress={onDelete} hitSlop={6}>
          <FontAwesome5 name="trash-alt" solid size={13} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('servicesScreen.delete')}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48, gap: 14 },
  listEmpty: { flexGrow: 1 },

  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryBadge: { width: 36, height: 36, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1, gap: 2 },
  serviceName: { fontSize: 15, fontFamily: F.bold },
  categoryName: { fontSize: 12, fontFamily: F.medium },
  statusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontFamily: F.bold },

  description: { fontSize: 13, fontFamily: F.regular, lineHeight: 19 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  price: { fontSize: 14, fontFamily: F.bold },
  pricingModel: { fontSize: 12, fontFamily: F.regular },

  actions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  actionBtn: { flex: 1, flexDirection: 'row', gap: 6, height: 38, borderRadius: RADIUS.md, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 13, fontFamily: F.semibold },
});
