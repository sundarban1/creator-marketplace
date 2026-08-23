import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { PageHeader } from '@/features/creator/components/PageHeader';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { AppModal } from '@/components/AppModal';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { TextInputWithLabel } from '@/components/TextInputWithLabel';
import { ChipGroup } from '@/features/business/components/CampaignFormControls';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useToast } from '@/components/Toast';
import {
  creatorService,
  type ApiAssignment,
  type ApiProviderMember,
  type ProviderMemberRole,
  type ProviderType,
} from '@/services/creator';
import { OfflineError } from '@/lib/api';
import { F, RADIUS, SHADOW, lineHeightFor } from '@/utilities/constants';

// OWNER is missing on purpose — the provider account itself is the owner, so
// the API rejects it (see provider-member.schema.ts).
const ACCESS_ROLES: Exclude<ProviderMemberRole, 'OWNER'>[] = ['MEMBER', 'MANAGER', 'ADMIN'];

type RemoveState = { visible: boolean; member: ApiProviderMember | null; submitting: boolean };
const NO_REMOVE: RemoveState = { visible: false, member: null, submitting: false };

export default function TeamScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();

  const [providerType, setProviderType] = useState<ProviderType | null>(null);
  // §7 — an ADMIN of someone else's team manages their roster from this same
  // screen. null means "my own provider account"; the API takes the same shape
  // (omitted providerId = my own team).
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null);
  const [members, setMembers]         = useState<ApiProviderMember[]>([]);
  const [memberships, setMemberships] = useState<ApiProviderMember[]>([]);
  // §16 "Assigned work" — bookings a team handed to this provider. Available to
  // every provider type, since an INDIVIDUAL is exactly who gets assigned.
  const [assignments, setAssignments] = useState<ApiAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [remove, setRemove] = useState<RemoveState>(NO_REMOVE);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async (providerId?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      // The roster call is only valid for a TEAM/AGENCY (or for an ADMIN of
      // another team), so the profile has to be read first — an INDIVIDUAL with
      // no adminships still sees the invitations half.
      const profile = await creatorService.getProfile();
      setProviderType(profile.providerType);
      const target = providerId ?? null;
      const ownCanHaveMembers = profile.providerType === 'TEAM' || profile.providerType === 'AGENCY';
      const [invites, roster, assigned] = await Promise.all([
        creatorService.listMyMemberships(),
        target || ownCanHaveMembers
          ? creatorService.listTeamMembers(target ?? undefined)
          : Promise.resolve([] as ApiProviderMember[]),
        creatorService.listMyAssignments().catch(() => [] as ApiAssignment[]),
      ]);
      setMemberships(invites);
      setMembers(roster);
      setAssignments(assigned);
    } catch (err) {
      setError(err instanceof OfflineError
        ? t('team.errorMessage')
        : (err instanceof Error ? err.message : t('team.errorMessage')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { void load(activeProviderId); }, [load, activeProviderId]));

  const pendingInvites = useMemo(() => memberships.filter((m) => m.status === 'PENDING'), [memberships]);
  const acceptedCount  = useMemo(() => members.filter((m) => m.status === 'ACCEPTED').length, [members]);

  // Teams this provider has actually joined, split by whether they can manage
  // them — the API only lets an ACCEPTED ADMIN touch someone else's roster.
  const joined = useMemo(() => memberships.filter((m) => m.status === 'ACCEPTED'), [memberships]);
  const adminOf = useMemo(
    () => joined.filter((m) => m.accessRole === 'ADMIN' || m.accessRole === 'OWNER'),
    [joined],
  );
  const memberOnlyOf = useMemo(
    () => joined.filter((m) => m.accessRole !== 'ADMIN' && m.accessRole !== 'OWNER'),
    [joined],
  );

  // The switcher only earns its space once there's more than one roster to
  // choose between.
  const ownCanHaveMembers = providerType === 'TEAM' || providerType === 'AGENCY';
  const rosterOptions = useMemo(() => [
    ...(ownCanHaveMembers ? [{ id: null as string | null, label: t('team.myTeamOption') }] : []),
    ...adminOf.map((m) => ({ id: m.providerId, label: m.provider?.fullName ?? t('team.unknownProvider') })),
  ], [ownCanHaveMembers, adminOf, t]);

  // A roster is manageable when it's your own team, or one you're an admin of
  // and currently have selected.
  const canHaveMembers = ownCanHaveMembers || activeProviderId !== null;
  const activeLabel = rosterOptions.find((o) => o.id === activeProviderId)?.label ?? '';

  async function respond(id: string, status: 'ACCEPTED' | 'DECLINED') {
    setRespondingId(id);
    try {
      const updated = await creatorService.respondToMembership(id, status);
      setMemberships((prev) =>
        status === 'DECLINED'
          ? prev.filter((m) => m.id !== id)
          : prev.map((m) => (m.id === id ? { ...m, ...updated } : m)));
      // Either answer removes the row from the pending list, so say what happened.
      toast.success(status === 'ACCEPTED' ? t('team.acceptedToast') : t('team.declinedToast'));
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('team.respondFailed'));
    } finally {
      setRespondingId(null);
    }
  }

  async function changeRole(member: ApiProviderMember, accessRole: Exclude<ProviderMemberRole, 'OWNER'>) {
    const previous = members;
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, accessRole } : m)));
    try {
      await creatorService.updateTeamMember(member.id, { accessRole });
    } catch (err) {
      setMembers(previous);
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('team.updateFailed'));
    }
  }

  async function confirmRemove() {
    if (!remove.member) return;
    setRemove((r) => ({ ...r, submitting: true }));
    try {
      await creatorService.removeTeamMember(remove.member.id);
      setMembers((prev) => prev.filter((m) => m.id !== remove.member!.id));
      setRemove(NO_REMOVE);
    } catch (err) {
      setRemove((r) => ({ ...r, submitting: false }));
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('team.removeFailed'));
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <PageHeader title={t('team.title')} />
      <MaxWidthContainer>
        {loading ? (
          <View style={styles.list}>{[0, 1, 2].map((i) => <ListRowSkeleton key={i} withBadge />)}</View>
        ) : error ? (
          <ErrorState title={t('team.errorTitle')} message={error} actionLabel={t('team.retry')} onAction={load} />
        ) : (
          <FlatList
            data={members}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <MemberRow
                item={item}
                onChangeRole={(role) => changeRole(item, role)}
                onRemove={() => setRemove({ visible: true, member: item, submitting: false })}
              />
            )}
            ListHeaderComponent={
              <View style={styles.header}>
                {/* Invitations to join someone else's team — visible to every
                    provider type, since an Individual is exactly who gets invited. */}
                {pendingInvites.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: C.text }]}>{t('team.invitesSection')}</Text>
                    {pendingInvites.map((invite) => (
                      <InviteRow
                        key={invite.id}
                        item={invite}
                        busy={respondingId === invite.id}
                        onAccept={() => respond(invite.id, 'ACCEPTED')}
                        onDecline={() => respond(invite.id, 'DECLINED')}
                      />
                    ))}
                  </View>
                )}

                {/* §16 — work a team assigned to this provider. */}
                {assignments.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: C.text }]}>{t('assign.assignedSection')}</Text>
                    {assignments.map((a) => (
                      <View key={a.id} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                        <View style={styles.cardHeader}>
                          <Avatar url={a.application?.creator?.avatarUrl} name={a.application?.creator?.fullName} />
                          <View style={styles.headerText}>
                            <Text style={[styles.name, { color: C.text }]} numberOfLines={2}>
                              {a.application?.campaign?.title ?? ''}
                            </Text>
                            <Text style={[styles.meta, { color: C.textSecondary }]} numberOfLines={1}>
                              {[t('assign.assignedBy', { team: a.application?.creator?.fullName ?? '' }), a.note]
                                .filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Teams joined as a plain member — read-only, since the API
                    only lets an ADMIN manage someone else's roster. */}
                {memberOnlyOf.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: C.text }]}>{t('team.memberOfSection')}</Text>
                    {memberOnlyOf.map((m) => (
                      <View key={m.id} style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                        <View style={styles.cardHeader}>
                          <Avatar url={m.provider?.avatarUrl} name={m.provider?.fullName} />
                          <View style={styles.headerText}>
                            <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
                              {m.provider?.fullName ?? t('team.unknownProvider')}
                            </Text>
                            <Text style={[styles.meta, { color: C.textSecondary }]} numberOfLines={1}>
                              {[m.jobRole, t(`team.role${m.accessRole}`)].filter(Boolean).join(' · ')}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Which roster is on screen — only shown once there's a choice. */}
                {rosterOptions.length > 1 && (
                  <View style={styles.switcherRow}>
                    {rosterOptions.map((opt) => {
                      const active = opt.id === activeProviderId;
                      return (
                        <Pressable
                          key={opt.id ?? 'own'}
                          onPress={() => setActiveProviderId(opt.id)}
                          accessibilityRole="tab"
                          accessibilityState={{ selected: active }}
                          style={[styles.switcherChip, {
                            borderColor: active ? C.brinjal1 : C.border,
                            backgroundColor: active ? C.primaryLight : C.surface,
                          }]}>
                          <Text
                            numberOfLines={1}
                            style={[styles.switcherText, { color: active ? C.brinjal1 : C.textSecondary }]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {canHaveMembers && (
                  <View style={styles.rosterHeader}>
                    <Text style={[styles.sectionTitle, { color: C.text }]} numberOfLines={1}>
                      {activeProviderId
                        ? t('team.managingSection', { name: activeLabel, n: acceptedCount })
                        : t('team.rosterSection', { n: acceptedCount })}
                    </Text>
                    <Pressable
                      style={[styles.inviteBtn, { backgroundColor: C.brinjal1 }]}
                      onPress={() => setInviteOpen(true)}
                      accessibilityRole="button"
                      accessibilityLabel={t('team.inviteCta')}>
                      <FontAwesome5 name="user-plus" solid size={12} color="#fff" />
                      <Text style={styles.inviteBtnText}>{t('team.inviteCta')}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            }
            ListEmptyComponent={
              canHaveMembers ? (
                <EmptyState
                  icon="users"
                  title={t('team.emptyTitle')}
                  subtitle={t('team.emptySub')}
                />
              ) : pendingInvites.length === 0 && joined.length === 0 && assignments.length === 0 ? (
                <EmptyState
                  icon="user"
                  title={t('team.individualTitle')}
                  subtitle={t('team.individualSub')}
                />
              ) : null
            }
            contentContainerStyle={[styles.list, members.length === 0 && styles.listEmpty]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </MaxWidthContainer>

      <InviteSheet
        visible={inviteOpen}
        providerId={activeProviderId}
        onClose={() => setInviteOpen(false)}
        onInvited={(member) => { setMembers((prev) => [member, ...prev]); setInviteOpen(false); }}
      />

      <AppModal
        visible={remove.visible}
        type="danger"
        icon="user-times"
        title={t('team.removeTitle')}
        body={t('team.removeBody', { name: remove.member?.member?.fullName ?? '' })}
        confirmLabel={t('team.removeConfirm')}
        cancelLabel={t('common.cancel')}
        loading={remove.submitting}
        onConfirm={confirmRemove}
        onCancel={() => setRemove(NO_REMOVE)}
      />
    </SafeAreaView>
  );
}

// ─── Invite sheet ─────────────────────────────────────────────────────────────

function InviteSheet({ visible, providerId, onClose, onInvited }: {
  visible: boolean;
  /** null when inviting into your own team — the API reads an omitted
   *  providerId as exactly that. */
  providerId: string | null;
  onClose: () => void;
  onInvited: (member: ApiProviderMember) => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const toast = useToast();
  const [byPhone, setByPhone] = useState(false);
  const [contact, setContact] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [accessRole, setAccessRole] = useState<Exclude<ProviderMemberRole, 'OWNER'>>('MEMBER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setByPhone(false); setContact(''); setJobRole(''); setAccessRole('MEMBER'); setError('');
  }

  async function submit() {
    if (!contact.trim()) { setError(t('team.contactRequired')); return; }
    setSubmitting(true);
    setError('');
    try {
      const member = await creatorService.inviteTeamMember({
        ...(providerId ? { providerId } : {}),
        ...(byPhone ? { phone: contact.trim() } : { email: contact.trim() }),
        ...(jobRole.trim() ? { jobRole: jobRole.trim() } : {}),
        accessRole,
      });
      reset();
      onInvited(member);
      toast.success(t('team.inviteSentToast', { name: member.member?.fullName ?? '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('team.inviteFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={() => { reset(); onClose(); }}
      title={t('team.inviteTitle')}
      subtitle={t('team.inviteSub')}
    >
      <View style={styles.sheet}>
        <View style={styles.toggleRow}>
          {[false, true].map((phoneMode) => (
            <Pressable
              key={String(phoneMode)}
              style={[styles.toggle, {
                borderColor: byPhone === phoneMode ? C.brinjal1 : C.border,
                backgroundColor: byPhone === phoneMode ? C.primaryLight : C.surface,
              }]}
              onPress={() => { setByPhone(phoneMode); setContact(''); setError(''); }}>
              <Text style={[styles.toggleText, { color: byPhone === phoneMode ? C.brinjal1 : C.textSecondary }]}>
                {phoneMode ? t('team.byPhone') : t('team.byEmail')}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInputWithLabel
          label={byPhone ? t('team.phoneLabel') : t('team.emailLabel')}
          leftIcon={byPhone ? 'phone' : 'envelope'}
          value={contact}
          onChangeText={(v) => { setContact(v); setError(''); }}
          placeholder={byPhone ? t('team.phonePlaceholder') : t('team.emailPlaceholder')}
          keyboardType={byPhone ? 'phone-pad' : 'email-address'}
          autoCapitalize="none"
          autoCorrect={false}
          hint={t('team.contactHint')}
        />

        <TextInputWithLabel
          label={t('team.jobRoleLabel')}
          leftIcon="briefcase"
          value={jobRole}
          onChangeText={setJobRole}
          placeholder={t('team.jobRolePlaceholder')}
          hint={t('team.jobRoleHint')}
        />

        <View style={{ gap: 6 }}>
          <Text style={[styles.fieldLabel, { color: C.text }]}>{t('team.accessRoleLabel')}</Text>
          <ChipGroup
            options={ACCESS_ROLES.map((r) => t(`team.role${r}`))}
            value={t(`team.role${accessRole}`)}
            onChange={(label) => {
              const match = ACCESS_ROLES.find((r) => t(`team.role${r}`) === label);
              if (match) setAccessRole(match);
            }}
            colors={C}
          />
          <Text style={[styles.fieldHint, { color: C.textSecondary }]}>{t(`team.roleHint${accessRole}`)}</Text>
        </View>

        {error ? <Text style={[styles.error, { color: C.error }]}>{error}</Text> : null}

        <Button label={t('team.sendInvite')} onPress={submit} loading={submitting} fullWidth />
      </View>
    </BottomSheet>
  );
}

// ─── Rows ─────────────────────────────────────────────────────────────────────

function Avatar({ url, name }: { url?: string | null; name?: string | null }) {
  const C = useAppColors();
  const initials = (name ?? '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return url ? (
    <Image source={{ uri: url }} style={styles.avatar} />
  ) : (
    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: C.primaryLight }]}>
      <Text style={[styles.avatarText, { color: C.brinjal1 }]}>{initials}</Text>
    </View>
  );
}

function MemberRow({ item, onChangeRole, onRemove }: {
  item: ApiProviderMember;
  onChangeRole: (role: Exclude<ProviderMemberRole, 'OWNER'>) => void;
  onRemove: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const pending = item.status === 'PENDING';

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }, SHADOW.raised]}>
      <Pressable style={styles.cardHeader} onPress={() => setExpanded((e) => !e)}>
        <Avatar url={item.member?.avatarUrl} name={item.member?.fullName} />
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
            {item.member?.fullName ?? t('team.unknownMember')}
          </Text>
          <Text style={[styles.meta, { color: C.textSecondary }]} numberOfLines={1}>
            {[item.jobRole, t(`team.role${item.accessRole}`)].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {pending && (
          <View style={[styles.statusBadge, { backgroundColor: '#FFF7ED' }]}>
            <Text style={[styles.statusText, { color: '#C2410C' }]}>{t('team.statusPending')}</Text>
          </View>
        )}
        <FontAwesome5 name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={C.textSecondary} />
      </Pressable>

      {expanded && (
        <View style={[styles.cardBody, { borderTopColor: C.border }]}>
          <Text style={[styles.fieldLabel, { color: C.text }]}>{t('team.accessRoleLabel')}</Text>
          <ChipGroup
            options={ACCESS_ROLES.map((r) => t(`team.role${r}`))}
            value={t(`team.role${item.accessRole}`)}
            onChange={(label) => {
              const match = ACCESS_ROLES.find((r) => t(`team.role${r}`) === label);
              if (match && match !== item.accessRole) onChangeRole(match);
            }}
            colors={C}
          />
          <Pressable style={styles.removeRow} onPress={onRemove} accessibilityRole="button">
            <FontAwesome5 name="user-times" solid size={13} color="#DC2626" />
            <Text style={[styles.removeText, { color: '#DC2626' }]}>
              {pending ? t('team.cancelInvite') : t('team.removeMember')}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function InviteRow({ item, busy, onAccept, onDecline }: {
  item: ApiProviderMember;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.brinjal1 }, SHADOW.raised]}>
      <View style={styles.cardHeader}>
        <Avatar url={item.provider?.avatarUrl} name={item.provider?.fullName} />
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: C.text }]} numberOfLines={1}>
            {item.provider?.fullName ?? t('team.unknownProvider')}
          </Text>
          <Text style={[styles.meta, { color: C.textSecondary }]} numberOfLines={2}>
            {item.jobRole
              ? t('team.invitedAsRole', { role: item.jobRole })
              : t('team.invitedNoRole')}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button label={t('team.decline')} onPress={onDecline} variant="secondary" size="small" disabled={busy} />
        <Button label={t('team.accept')} onPress={onAccept} loading={busy} size="small" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 48, gap: 12 },
  listEmpty: { flexGrow: 1 },

  header: { gap: 12 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 15, fontFamily: F.bold, lineHeight: lineHeightFor(15) },
  rosterHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 },
  inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: RADIUS.full },
  inviteBtnText: { color: '#fff', fontSize: 13, fontFamily: F.semibold },
  switcherRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  switcherChip: { paddingHorizontal: 12, minHeight: 36, justifyContent: 'center', borderRadius: RADIUS.full, borderWidth: 1.5, maxWidth: '100%' },
  switcherText: { fontSize: 13, fontFamily: F.semibold },

  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: RADIUS.full },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontFamily: F.bold },
  headerText: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontFamily: F.bold, lineHeight: lineHeightFor(15) },
  meta: { fontSize: 12.5, fontFamily: F.regular, lineHeight: lineHeightFor(12.5) },
  statusBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontFamily: F.bold },

  cardBody: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, gap: 8 },
  removeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  removeText: { fontSize: 13.5, fontFamily: F.semibold },

  actions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },

  sheet: { gap: 16, paddingBottom: 8 },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggle: { flex: 1, minHeight: 42, borderRadius: RADIUS.md, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  toggleText: { fontSize: 14, fontFamily: F.semibold },
  fieldLabel: { fontSize: 13.5, fontFamily: F.semibold, lineHeight: lineHeightFor(13.5) },
  fieldHint: { fontSize: 12, fontFamily: F.regular, lineHeight: lineHeightFor(12) },
  error: { fontSize: 13, fontFamily: F.medium, lineHeight: lineHeightFor(13) },
});
