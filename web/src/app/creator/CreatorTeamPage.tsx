import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, UserMinus, UsersRound } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import {
  fetchCreatorFullProfile,
  fetchMyMemberships,
  fetchTeamMembers,
  inviteTeamMember,
  removeTeamMember,
  respondToMembership,
  updateTeamMember,
  type AssignableMemberRole,
  type ProviderMember,
} from '../api/creator';
import { DashPageHeader } from './dash-ui/DashPageHeader';
import { DashCard, DashCardHeader } from './dash-ui/DashCard';
import { Alert } from '../ui/Alert';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Select } from '../ui/Select';
import { Skeleton } from '../ui/Skeleton';
import { StatusBadge } from '../ui/StatusBadge';
import { TextField } from '../ui/TextField';
import { confirmDialog } from '../ui/confirmDialog';
import { useToast } from '../ui/Toast';

// OWNER is missing on purpose — the provider account itself is the owner, so
// the API rejects it (see provider-member.schema.ts).
const ACCESS_ROLES: AssignableMemberRole[] = ['MEMBER', 'MANAGER', 'ADMIN'];

/**
 * My Team — web twin of mobile's (creator)/team.tsx. A TEAM provider manages
 * its roster (invite by email/phone, change access role, remove); an ADMIN of
 * someone else's team manages that roster from here too; and every creator
 * sees invitations to join other teams. Booking assignments stay dormant
 * (teams work from the shared account), same as mobile.
 */
export function CreatorTeamPage() {
  const t = useT();
  const toast = useToast();
  const profile = useAsync((s) => fetchCreatorFullProfile(s), []);
  const memberships = useAsync((s) => fetchMyMemberships(s), []);

  const ownCanHaveMembers = profile.data?.providerType === 'TEAM';
  const joined = useMemo(() => (memberships.data ?? []).filter((m) => m.status === 'ACCEPTED'), [memberships.data]);
  const adminOf = useMemo(() => joined.filter((m) => m.accessRole === 'ADMIN' || m.accessRole === 'OWNER'), [joined]);
  const memberOnlyOf = useMemo(() => joined.filter((m) => m.accessRole !== 'ADMIN' && m.accessRole !== 'OWNER'), [joined]);
  const pendingInvites = useMemo(() => (memberships.data ?? []).filter((m) => m.status === 'PENDING'), [memberships.data]);

  const rosterOptions = useMemo(
    () => [
      ...(ownCanHaveMembers ? [{ id: '', label: t('team.myTeamOption') }] : []),
      ...adminOf.map((m) => ({ id: m.providerId, label: m.provider?.fullName ?? t('team.unknownProvider') })),
    ],
    [ownCanHaveMembers, adminOf, t],
  );
  // '' = my own team (the API reads an omitted providerId that way).
  const [chosenRoster, setChosenRoster] = useState<string | null>(null);
  const activeRoster = chosenRoster ?? rosterOptions[0]?.id ?? null;
  const activeProviderId = activeRoster || null;
  const canManage = activeRoster !== null;

  const roster = useAsync(
    (s) => (canManage ? fetchTeamMembers(activeProviderId, s) : Promise.resolve([] as ProviderMember[])),
    [canManage, activeProviderId],
  );
  const members = roster.data ?? [];
  const acceptedCount = members.filter((m) => m.status === 'ACCEPTED').length;
  const activeLabel = rosterOptions.find((o) => o.id === activeRoster)?.label ?? '';

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  async function respond(id: string, status: 'ACCEPTED' | 'DECLINED') {
    setRespondingId(id);
    try {
      await respondToMembership(id, status);
      toast.success(status === 'ACCEPTED' ? t('team.acceptedToast') : t('team.declinedToast'));
      memberships.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('team.respondFailed'));
    } finally {
      setRespondingId(null);
    }
  }

  async function changeRole(member: ProviderMember, accessRole: AssignableMemberRole) {
    try {
      await updateTeamMember(member.id, { accessRole });
      roster.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('team.updateFailed'));
    }
  }

  async function remove(member: ProviderMember) {
    const ok = await confirmDialog({
      title: t('team.removeTitle'),
      message: t('team.removeBody', { name: member.member?.fullName ?? '' }),
      confirmLabel: t('team.removeConfirm'),
      tone: 'danger',
      action: () => removeTeamMember(member.id),
    });
    if (ok) roster.refresh();
  }

  const loading = profile.loading || memberships.loading;
  const loadError = profile.error ?? memberships.error ?? roster.error;

  return (
    <div>
      <DashPageHeader title={t('team.title')} />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ) : loadError ? (
        <EmptyState
          variant="error"
          title={t('team.errorTitle')}
          description={loadError.message || t('team.errorMessage')}
          action={{
            label: t('team.retry'),
            onClick: () => {
              profile.reload();
              memberships.reload();
              roster.reload();
            },
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Invitations to join someone else's team — visible to every provider. */}
          {pendingInvites.length > 0 && (
            <DashCard>
              <DashCardHeader title={t('team.invitesSection')} />
              <ul className="divide-y divide-ink/[0.05]">
                {pendingInvites.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Avatar name={m.provider?.fullName ?? '?'} src={m.provider?.avatarUrl} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-ink">{m.provider?.fullName ?? t('team.unknownProvider')}</p>
                      <p className="truncate text-[12.5px] text-ink-soft">
                        {m.jobRole ? t('team.invitedAsRole', { role: m.jobRole }) : t('team.invitedNoRole')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" disabled={respondingId === m.id} onClick={() => respond(m.id, 'DECLINED')}>
                        {t('team.decline')}
                      </Button>
                      <Button size="sm" loading={respondingId === m.id} onClick={() => respond(m.id, 'ACCEPTED')}>
                        {t('team.accept')}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </DashCard>
          )}

          {/* Teams joined as a plain member — read-only. */}
          {memberOnlyOf.length > 0 && (
            <DashCard>
              <DashCardHeader title={t('team.memberOfSection')} />
              <ul className="divide-y divide-ink/[0.05]">
                {memberOnlyOf.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-3">
                    <Avatar name={m.provider?.fullName ?? '?'} src={m.provider?.avatarUrl} size="sm" />
                    <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">
                      {m.provider?.fullName ?? t('team.unknownProvider')}
                    </p>
                    <span className="text-[12.5px] text-ink-soft">
                      {[m.jobRole, t(`team.role${m.accessRole}`)].filter(Boolean).join(' · ')}
                    </span>
                  </li>
                ))}
              </ul>
            </DashCard>
          )}

          {canManage ? (
            <DashCard>
              {rosterOptions.length > 1 && (
                <div className="mb-4 max-w-xs">
                  <Select
                    aria-label={t('team.title')}
                    value={activeRoster ?? ''}
                    onChange={(e) => setChosenRoster(e.target.value)}
                    options={rosterOptions.map((o) => ({ value: o.id, label: o.label }))}
                  />
                </div>
              )}
              <DashCardHeader
                title={
                  activeProviderId
                    ? t('team.managingSection', { name: activeLabel, n: acceptedCount })
                    : t('team.rosterSection', { n: acceptedCount })
                }
                action={
                  <Button size="sm" onClick={() => setInviteOpen(true)}>
                    <UserPlus size={14} />
                    {t('team.inviteCta')}
                  </Button>
                }
              />
              {roster.loading ? (
                <Skeleton className="h-24 w-full" />
              ) : members.length === 0 ? (
                <EmptyState
                  variant="empty"
                  size="sm"
                  icon={<UsersRound size={24} strokeWidth={1.75} />}
                  title={t('team.emptyTitle')}
                  description={t('team.emptySub')}
                />
              ) : (
                <ul className="divide-y divide-ink/[0.05]">
                  {members.map((m) => (
                    <MemberRow key={m.id} item={m} onChangeRole={(r) => changeRole(m, r)} onRemove={() => remove(m)} />
                  ))}
                </ul>
              )}
            </DashCard>
          ) : (
            <EmptyState
              variant="empty"
              icon={<UsersRound size={26} strokeWidth={1.75} />}
              title={t('team.individualTitle')}
              description={t('team.individualSub')}
              action={{ label: t('nav.settings'), href: '/creator/settings' }}
            />
          )}
        </div>
      )}

      <InviteModal
        open={inviteOpen}
        providerId={activeProviderId}
        onClose={() => setInviteOpen(false)}
        onInvited={() => {
          setInviteOpen(false);
          roster.refresh();
        }}
      />
    </div>
  );
}

function MemberRow({
  item,
  onChangeRole,
  onRemove,
}: {
  item: ProviderMember;
  onChangeRole: (role: AssignableMemberRole) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const pending = item.status === 'PENDING';
  const handle = item.member?.username ?? item.member?.id;

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Link to={handle ? `/creator/creators/${handle}` : '#'} className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80">
        <Avatar name={item.member?.fullName ?? '?'} src={item.member?.avatarUrl} size="md" />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-ink">{item.member?.fullName ?? t('team.unknownMember')}</p>
          {item.jobRole && <p className="truncate text-[12.5px] text-ink-soft">{item.jobRole}</p>}
        </div>
      </Link>
      {pending && <StatusBadge label={t('team.statusPending')} tone="warning" />}
      <div className="w-36">
        <Select
          aria-label={t('team.accessRoleLabel')}
          value={item.accessRole === 'OWNER' ? 'ADMIN' : item.accessRole}
          onChange={(e) => {
            const next = e.target.value as AssignableMemberRole;
            if (next !== item.accessRole) onChangeRole(next);
          }}
          options={ACCESS_ROLES.map((r) => ({ value: r, label: t(`team.role${r}`) }))}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={pending ? t('team.cancelInvite') : t('team.removeMember')}
        title={pending ? t('team.cancelInvite') : t('team.removeMember')}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-line-strong text-ink-soft hover:text-danger"
      >
        <UserMinus size={16} />
      </button>
    </li>
  );
}

function InviteModal({
  open,
  providerId,
  onClose,
  onInvited,
}: {
  open: boolean;
  /** null = my own team. */
  providerId: string | null;
  onClose: () => void;
  onInvited: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [by, setBy] = useState<'email' | 'phone'>('email');
  const [contact, setContact] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [accessRole, setAccessRole] = useState<AssignableMemberRole>('MEMBER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setBy('email');
    setContact('');
    setJobRole('');
    setAccessRole('MEMBER');
    setError('');
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!contact.trim()) {
      setError(t('team.contactRequired'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const member = await inviteTeamMember({
        ...(providerId ? { providerId } : {}),
        ...(by === 'phone' ? { phone: contact.trim() } : { email: contact.trim() }),
        ...(jobRole.trim() ? { jobRole: jobRole.trim() } : {}),
        accessRole,
      });
      toast.success(t('team.inviteSentToast', { name: member.member?.fullName ?? '' }));
      reset();
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('team.inviteFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (submitting) return;
        reset();
        onClose();
      }}
      title={t('team.inviteTitle')}
    >
      <form onSubmit={submit} className="space-y-4">
        <p className="text-[13px] text-ink-soft">{t('team.inviteSub')}</p>
        <SegmentedControl
          ariaLabel={t('team.inviteTitle')}
          value={by}
          onChange={(v) => {
            setBy(v);
            setContact('');
          }}
          options={[
            { value: 'email', label: t('team.byEmail') },
            { value: 'phone', label: t('team.byPhone') },
          ]}
        />
        <TextField
          label={by === 'phone' ? t('team.phoneLabel') : t('team.emailLabel')}
          type={by === 'phone' ? 'tel' : 'email'}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={by === 'phone' ? t('team.phonePlaceholder') : t('team.emailPlaceholder')}
          hint={t('team.contactHint')}
        />
        <TextField
          label={t('team.jobRoleLabel')}
          value={jobRole}
          onChange={(e) => setJobRole(e.target.value)}
          placeholder={t('team.jobRolePlaceholder')}
          hint={t('team.jobRoleHint')}
          maxLength={80}
        />
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink">{t('team.accessRoleLabel')}</p>
          <SegmentedControl
            ariaLabel={t('team.accessRoleLabel')}
            value={accessRole}
            onChange={setAccessRole}
            options={ACCESS_ROLES.map((r) => ({ value: r, label: t(`team.role${r}`) }))}
          />
          <p className="mt-2 text-[12.5px] text-ink-soft">{t(`team.roleHint${accessRole}`)}</p>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <Button type="submit" fullWidth loading={submitting}>
          {t('team.sendInvite')}
        </Button>
      </form>
    </Modal>
  );
}
