import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { fetchConversations, respondToRequest, type Conversation } from '../api/chat';
import { PageHeader } from '../ui/PageHeader';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { Alert } from '../ui/Alert';
import { cn } from '../ui/cn';

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Shared by /business/messages and /creator/messages — same conversation shape either way. */
export function ChatListPage() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const base = location.pathname.startsWith('/business') ? '/business' : '/creator';
  const conversations = useAsync((s) => fetchConversations({}, s), []);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  // A "Message" button elsewhere links here with ?campaign=<id> — jump
  // straight into the matching thread once the list has loaded.
  const jumpCampaignId = searchParams.get('campaign');
  const jumpTarget = jumpCampaignId
    ? conversations.data?.items.find((c) => c.campaignId === jumpCampaignId)
    : undefined;
  useEffect(() => {
    if (jumpTarget) navigate(`${base}/messages/${jumpTarget.id}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTarget?.id]);

  async function respond(id: string, action: 'accept' | 'decline') {
    setBusyId(id);
    setError('');
    try {
      await respondToRequest(id, action);
      conversations.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusyId('');
    }
  }

  if (conversations.loading || jumpTarget) {
    return (
      <div className="mx-auto max-w-2xl">
        <Skeleton className="h-8 w-1/2" />
        <div className="mt-5 space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  // A conversation CLOSEs once its payment is released or refunded — the
  // collaboration is over, so (mirroring mobile) it drops out of the inbox
  // entirely rather than lingering as a dead thread. It reopens on the next
  // proposal-accept or fresh message request.
  const items = (conversations.data?.items ?? []).filter((c) => c.status !== 'CLOSED');

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('chat.title')} />
      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      {items.length === 0 ? (
        <EmptyState variant="empty" title={t('chat.emptyTitle')} description={t('chat.emptyBody')} />
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <ConversationRow
              key={c.id}
              c={c}
              base={base}
              busy={busyId === c.id}
              onAccept={() => respond(c.id, 'accept')}
              onDecline={() => respond(c.id, 'decline')}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ConversationRow({
  c,
  base,
  busy,
  onAccept,
  onDecline,
}: {
  c: Conversation;
  base: string;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const t = useT();
  const name = c.otherParty?.fullName ?? '—';
  const preview = c.messages?.[0]?.content ?? c.requestMessage ?? '';
  const unread = c.unreadCount > 0;

  const inner = (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
      <Avatar name={name} src={c.otherParty?.avatarUrl} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('truncate text-[14px]', unread ? 'font-semibold text-ink' : 'font-medium text-ink')}>{name}</p>
          {c.lastMessageAt && <span className="flex-shrink-0 text-[11px] text-ink-soft">{timeAgo(c.lastMessageAt)}</span>}
        </div>
        {c.campaign?.title && <p className="truncate text-[12px] text-violet-dark">{c.campaign.title}</p>}
        {preview && <p className={cn('truncate text-[13px]', unread ? 'font-medium text-ink' : 'text-ink-soft')}>{preview}</p>}
      </div>
      {unread && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-brand" aria-hidden />}
    </div>
  );

  if (c.status === 'PENDING') {
    return (
      <li className="rounded-xl border border-line-strong bg-violet/[0.03] p-3.5">
        <div className="flex items-center gap-3">
          <Avatar name={name} src={c.otherParty?.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{name}</p>
            <p className="text-[12px] font-medium text-violet-dark">{t('chat.messageRequest')}</p>
            {c.requestMessage && <p className="mt-1 text-[13px] text-ink-soft">{c.requestMessage}</p>}
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={onAccept}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            <Check size={13} /> {t('chat.accept')}
          </button>
          <button
            onClick={onDecline}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg border border-line-strong px-3 py-1.5 text-[12px] font-semibold text-ink-soft disabled:opacity-60"
          >
            <X size={13} /> {t('chat.decline')}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link to={`${base}/messages/${c.id}`}>{inner}</Link>
    </li>
  );
}
