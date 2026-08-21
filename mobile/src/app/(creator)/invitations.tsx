import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { creatorService, type ApiCampaignInvitation } from '@/services/creator';
import { OfflineError } from '@/lib/api';
import { F, RADIUS, SHADOW } from '@/utilities/constants';

type ModalState = {
  visible: boolean;
  status: 'ACCEPTED' | 'DECLINED';
  invitation: ApiCampaignInvitation | null;
  submitting: boolean;
};

const INITIAL_MODAL: ModalState = { visible: false, status: 'ACCEPTED', invitation: null, submitting: false };

export default function InvitationsScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [invitations, setInvitations] = useState<ApiCampaignInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [modal, setModal]     = useState<ModalState>(INITIAL_MODAL);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await creatorService.listInvitations();
      setInvitations(data);
    } catch (err) {
      setError(
        err instanceof OfflineError
          ? t('invitations.errorMessage')
          : (err instanceof Error ? err.message : t('invitations.errorMessage'))
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function openRespond(invitation: ApiCampaignInvitation, status: 'ACCEPTED' | 'DECLINED') {
    setModal({ visible: true, status, invitation, submitting: false });
  }

  async function confirmRespond() {
    if (!modal.invitation) return;
    setModal((m) => ({ ...m, submitting: true }));
    try {
      const updated = await creatorService.respondToInvitation(modal.invitation.id, modal.status);
      setInvitations((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setModal(INITIAL_MODAL);
    } catch (err) {
      setModal((m) => ({ ...m, submitting: false }));
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('invitations.respondFailed'));
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={t('invitations.title')} />
      <MaxWidthContainer>
        {loading ? (
          <View style={styles.list}>
            {[0, 1, 2].map((i) => <ListRowSkeleton key={i} withBadge />)}
          </View>
        ) : error ? (
          <ErrorState
            title={t('invitations.errorTitle')}
            message={error}
            actionLabel={t('invitations.retry')}
            onAction={load}
          />
        ) : (
          <FlatList
            data={invitations}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <InvitationCard
                item={item}
                onAccept={() => openRespond(item, 'ACCEPTED')}
                onDecline={() => openRespond(item, 'DECLINED')}
              />
            )}
            contentContainerStyle={[styles.list, invitations.length === 0 && styles.listEmpty]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon="envelope-open-text"
                title={t('invitations.emptyTitle')}
                subtitle={t('invitations.emptySub')}
              />
            }
          />
        )}
      </MaxWidthContainer>

      <AppModal
        visible={modal.visible}
        type={modal.status === 'ACCEPTED' ? 'success' : 'danger'}
        icon={modal.status === 'ACCEPTED' ? 'check-circle' : 'times-circle'}
        title={modal.status === 'ACCEPTED' ? t('invitations.acceptTitle') : t('invitations.declineTitle')}
        body={
          modal.invitation
            ? (modal.status === 'ACCEPTED'
                ? t('invitations.acceptBody', { business: modal.invitation.business.businessName ?? '', campaign: modal.invitation.campaign.title })
                : t('invitations.declineBody', { business: modal.invitation.business.businessName ?? '', campaign: modal.invitation.campaign.title }))
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

function InvitationCard({ item, onAccept, onDecline }: {
  item: ApiCampaignInvitation;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const initials = (item.business.businessName ?? 'B').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const deadline = new Date(item.campaign.deadline).toLocaleDateString();

  return (
    <Pressable
      style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.raised]}
      onPress={() => router.push({ pathname: '/campaign-detail', params: { campaignId: item.campaignId } })}>
      <View style={styles.cardHeader}>
        {item.business.logoUrl ? (
          <Image source={{ uri: item.business.logoUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.avatarText, { color: C.brinjal1 }]}>{initials}</Text>
          </View>
        )}
        <View style={styles.headerText}>
          <Text style={[styles.businessName, { color: C.textSecondary }]} numberOfLines={1}>{item.business.businessName}</Text>
          <Text style={[styles.campaignTitle, { color: C.text }]} numberOfLines={2}>{item.campaign.title}</Text>
        </View>
        {item.status !== 'PENDING' && (
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'ACCEPTED' ? '#F0FDF4' : '#FEF2F2' }]}>
            <Text style={[styles.statusBadgeText, { color: item.status === 'ACCEPTED' ? '#16A34A' : '#DC2626' }]}>
              {item.status === 'ACCEPTED' ? t('invitations.statusAccepted') : t('invitations.statusDeclined')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.metaRow}>
        <FontAwesome5 name="money-bill-wave" solid size={12} color={C.textSecondary} />
        <Text style={[styles.metaText, { color: C.textSecondary }]}>
          {t('invitations.budgetRange', { min: item.campaign.budgetMin.toLocaleString(), max: item.campaign.budgetMax.toLocaleString() })}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <FontAwesome5 name="calendar-alt" solid size={12} color={C.textSecondary} />
        <Text style={[styles.metaText, { color: C.textSecondary }]}>{t('invitations.deadline', { date: deadline })}</Text>
      </View>

      {item.message ? (
        <Text style={[styles.message, { color: C.textSecondary, borderTopColor: C.border }]} numberOfLines={3}>
          &ldquo;{item.message}&rdquo;
        </Text>
      ) : null}

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
