import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { AppModal } from '@/components/AppModal';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useRefetchOnFocusIfStale } from '@/hooks/useRefetchOnFocusIfStale';
import { STALE } from '@/lib/queryClient';
import { serviceRequestService, type ApiServiceRequestReceived } from '@/services/serviceRequest';
import { OfflineError } from '@/lib/api';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';

const EMPTY_REQUESTS: ApiServiceRequestReceived[] = [];
const REQUESTS_KEY = ['serviceRequests', 'received'] as const;

type ModalState = {
  visible: boolean;
  status: 'ACCEPTED' | 'DECLINED';
  request: ApiServiceRequestReceived | null;
  submitting: boolean;
};

const INITIAL_MODAL: ModalState = { visible: false, status: 'ACCEPTED', request: null, submitting: false };

// §33/34 — provider-side inbox for requests businesses have sent about a
// specific Service (distinct from Opportunity applications/invitations).
export default function ServiceRequestsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [modal, setModal]     = useState<ModalState>(INITIAL_MODAL);

  const requestsQuery = useQuery({
    queryKey: REQUESTS_KEY,
    queryFn: () => serviceRequestService.listReceived(),
    staleTime: STALE.list,
  });
  useRefetchOnFocusIfStale(requestsQuery);
  const requests = requestsQuery.data ?? EMPTY_REQUESTS;
  const loading = requestsQuery.isPending;
  const error = requestsQuery.isError
    ? (requestsQuery.error instanceof OfflineError
        ? t('serviceRequests.errorMessage')
        : (requestsQuery.error instanceof Error ? requestsQuery.error.message : t('serviceRequests.errorMessage')))
    : null;

  function openRespond(request: ApiServiceRequestReceived, status: 'ACCEPTED' | 'DECLINED') {
    setModal({ visible: true, status, request, submitting: false });
  }

  async function confirmRespond() {
    if (!modal.request) return;
    setModal((m) => ({ ...m, submitting: true }));
    try {
      await serviceRequestService.respond(modal.request.id, modal.status);
      queryClient.setQueryData<ApiServiceRequestReceived[]>(REQUESTS_KEY, (prev) =>
        prev?.map((r) => (r.id === modal.request!.id ? { ...r, status: modal.status } : r)));
      setModal(INITIAL_MODAL);
    } catch (err) {
      setModal((m) => ({ ...m, submitting: false }));
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('serviceRequests.respondFailed'));
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={t('serviceRequests.title')} />
      <MaxWidthContainer>
        {loading ? (
          <View style={styles.list}>
            {[0, 1, 2].map((i) => <ListRowSkeleton key={i} withBadge />)}
          </View>
        ) : error ? (
          <ErrorState
            title={t('serviceRequests.errorTitle')}
            message={error}
            actionLabel={t('invitations.retry')}
            onAction={() => requestsQuery.refetch()}
          />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => (
              <RequestCard
                item={item}
                onAccept={() => openRespond(item, 'ACCEPTED')}
                onDecline={() => openRespond(item, 'DECLINED')}
              />
            )}
            contentContainerStyle={[styles.list, requests.length === 0 && styles.listEmpty]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="inbox"
                title={t('serviceRequests.emptyTitle')}
                subtitle={t('serviceRequests.emptySub')}
              />
            }
          />
        )}
      </MaxWidthContainer>

      <AppModal
        visible={modal.visible}
        type={modal.status === 'ACCEPTED' ? 'success' : 'danger'}
        icon={modal.status === 'ACCEPTED' ? 'check-circle' : 'times-circle'}
        title={modal.status === 'ACCEPTED' ? t('serviceRequests.acceptTitle') : t('serviceRequests.declineTitle')}
        body={
          modal.request
            ? (modal.status === 'ACCEPTED'
                ? t('serviceRequests.acceptBody', { business: modal.request.business.businessName ?? '', service: modal.request.service.name })
                : t('serviceRequests.declineBody', { business: modal.request.business.businessName ?? '', service: modal.request.service.name }))
            : ''
        }
        confirmLabel={modal.status === 'ACCEPTED' ? t('invitations.accept') : t('invitations.decline')}
        loading={modal.submitting}
        onConfirm={confirmRespond}
        onCancel={() => setModal(INITIAL_MODAL)}
      />
    </SafeAreaView>
  );
}

function RequestCard({ item, onAccept, onDecline }: {
  item: ApiServiceRequestReceived;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const initials = (item.business.businessName ?? 'B').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.raised]}>
      <View style={styles.cardHeader}>
        {item.business.logoUrl ? (
          <Image source={{ uri: item.business.logoUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.avatarText, { color: C.brinjal1 }]}>{initials}</Text>
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={[styles.businessName, { color: C.textSecondary }]} numberOfLines={1}>{item.business.businessName}</Text>
          <Text style={[styles.campaignTitle, { color: C.text }]} numberOfLines={2}>{item.service.name}</Text>
        </View>
        {item.status !== 'PENDING' && (
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'ACCEPTED' ? '#F0FDF4' : '#FEF2F2' }]}>
            <Text style={[styles.statusBadgeText, { color: item.status === 'ACCEPTED' ? '#16A34A' : '#DC2626' }]}>
              {item.status === 'ACCEPTED' ? t('invitations.statusAccepted') : t('invitations.statusDeclined')}
            </Text>
          </View>
        )}
      </View>

      {item.budget != null && (
        <View style={styles.metaRow}>
          <FontAwesome5 name="money-bill-wave" solid size={12} color={C.textSecondary} />
          <Text style={[styles.metaText, { color: C.textSecondary }]}>
            {t('serviceRequests.proposedBudget', { amount: item.budget.toLocaleString() })}
          </Text>
        </View>
      )}

      <Text style={[styles.message, { color: C.textSecondary, borderTopColor: C.border }]}>
        &ldquo;{item.message}&rdquo;
      </Text>

      {item.status === 'PENDING' && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.declineBtn, { borderColor: C.border, backgroundColor: C.background }]}
            onPress={onDecline}>
            <FontAwesome5 name="times-circle" solid size={15} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>{t('invitations.decline')}</Text>
          </Pressable>
          <Pressable
            style={[styles.acceptBtn, { backgroundColor: C.brinjal1 }]}
            onPress={onAccept}>
            <FontAwesome5 name="check-circle" solid size={15} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>{t('invitations.accept')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
  listEmpty: { flexGrow: 1 },

  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.lg, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: RADIUS.full },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 15, fontFamily: F.bold },
  headerText: { flex: 1, gap: 2 },
  businessName: { fontSize: 12, fontFamily: F.medium },
  campaignTitle: { fontSize: 15, fontFamily: F.bold, lineHeight: 23 },
  statusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontFamily: F.bold },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 13, fontFamily: F.regular },

  message: { fontSize: 13, fontFamily: F.regular, fontStyle: 'italic', lineHeight: 20, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 2 },
  declineBtn: { flex: 1, flexDirection: 'row', gap: 6, height: 44, borderRadius: RADIUS.md, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  acceptBtn:  { flex: 1, flexDirection: 'row', gap: 6, height: 44, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  actionText: { fontSize: 14, fontFamily: F.semibold },
});
