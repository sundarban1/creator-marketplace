import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { serviceRequestService, type ApiServiceRequestSent } from '@/services/serviceRequest';
import { OfflineError } from '@/lib/api';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

const STATUS_STYLE: Record<ApiServiceRequestSent['status'], { bg: string; color: string; labelKey: string }> = {
  PENDING:  { bg: '#FFFBEB', color: '#D97706', labelKey: 'businessServiceRequests.statusPending' },
  ACCEPTED: { bg: '#F0FDF4', color: '#16A34A', labelKey: 'businessServiceRequests.statusAccepted' },
  DECLINED: { bg: '#FEF2F2', color: '#DC2626', labelKey: 'businessServiceRequests.statusDeclined' },
};

// §33/34 — business-side view of requests sent about providers' Services
// (status tracking only; responding happens on the provider's side).
export default function BusinessServiceRequestsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [requests, setRequests] = useState<ApiServiceRequestSent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await serviceRequestService.listSent();
      setRequests(data);
    } catch (err) {
      setError(
        err instanceof OfflineError
          ? t('businessServiceRequests.errorMessage')
          : (err instanceof Error ? err.message : t('businessServiceRequests.errorMessage'))
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={t('businessServiceRequests.title')} />
      <MaxWidthContainer>
        {loading ? (
          <View style={styles.list}>
            {[0, 1, 2].map((i) => <ListRowSkeleton key={i} withBadge />)}
          </View>
        ) : error ? (
          <ErrorState
            title={t('businessServiceRequests.errorTitle')}
            message={error}
            actionLabel={t('invitations.retry')}
            onAction={load}
          />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => <RequestCard item={item} />}
            contentContainerStyle={[styles.list, requests.length === 0 && styles.listEmpty]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="paper-plane"
                title={t('businessServiceRequests.emptyTitle')}
                subtitle={t('businessServiceRequests.emptySub')}
              />
            }
          />
        )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

function RequestCard({ item }: { item: ApiServiceRequestSent }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const initials = (item.creator.fullName ?? 'P').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const st = STATUS_STYLE[item.status];

  return (
    <Pressable
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.raised]}
      onPress={() => router.push({ pathname: '/(business)/creator-detail', params: { id: item.creator.id } })}>
      <View style={styles.cardHeader}>
        {item.creator.avatarUrl ? (
          <Image source={{ uri: item.creator.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.avatarText, { color: C.brinjal1 }]}>{initials}</Text>
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={[styles.creatorName, { color: C.textSecondary }]} numberOfLines={1}>{item.creator.fullName}</Text>
          <Text style={[styles.serviceName, { color: C.text }]} numberOfLines={2}>{item.service.name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[styles.statusBadgeText, { color: st.color }]}>{t(st.labelKey)}</Text>
        </View>
      </View>

      {item.budget != null && (
        <View style={styles.metaRow}>
          <FontAwesome5 name="money-bill-wave" solid size={12} color={C.textSecondary} />
          <Text style={[styles.metaText, { color: C.textSecondary }]}>
            {t('businessServiceRequests.proposedBudget', { amount: item.budget.toLocaleString() })}
          </Text>
        </View>
      )}

      <Text style={[styles.message, { color: C.textSecondary, borderTopColor: C.border }]} numberOfLines={3}>
        &ldquo;{item.message}&rdquo;
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48, gap: 14 },
  listEmpty: { flexGrow: 1 },

  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: RADIUS.full },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontFamily: F.bold },
  headerText: { flex: 1, gap: 2 },
  creatorName: { fontSize: 12, fontFamily: F.medium },
  serviceName: { fontSize: 15, fontFamily: F.bold, lineHeight: 23 },
  statusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontFamily: F.bold },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, fontFamily: F.regular },

  message: { fontSize: 13, fontFamily: F.regular, fontStyle: 'italic', lineHeight: 20, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
});
