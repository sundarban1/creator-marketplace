import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useAppAuth } from '../auth/AppAuthContext';
import { fetchMessages, fetchConversations, sendMessage, markSeen, type ChatMessage } from '../api/chat';
import { connectSocket } from '../lib/socket';
import { Avatar } from '../ui/Avatar';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { Alert } from '../ui/Alert';
import { cn } from '../ui/cn';

/** Shared by /business/messages/:id and /creator/messages/:id. */
export function ChatThreadPage() {
  const t = useT();
  const { id = '' } = useParams();
  const location = useLocation();
  const base = location.pathname.startsWith('/business') ? '/business' : '/creator';
  const { user } = useAppAuth();

  const conversations = useAsync((s) => fetchConversations({}, s), []);
  const conversation = conversations.data?.items.find((c) => c.id === id);
  const messagesQuery = useAsync((s) => fetchMessages(id, { limit: 100 }, s), [id]);

  // Messages that arrive after the initial load (my own sends + the other
  // party's socket-delivered ones) — kept separate from the fetched page and
  // merged at render time so nothing here copies async data into state via
  // an effect (that pattern re-renders needlessly and this codebase's lint
  // config specifically forbids it).
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    const map = new Map<string, ChatMessage>();
    for (const m of messagesQuery.data?.items ?? []) map.set(m.id, m);
    for (const m of liveMessages) map.set(m.id, m);
    return Array.from(map.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [messagesQuery.data, liveMessages]);

  useEffect(() => {
    if (!id) return;
    const socket = connectSocket();
    socket.emit('join:conversation', { conversationId: id });
    function onNew(payload: { conversationId: string; message: ChatMessage }) {
      if (payload.conversationId !== id) return;
      setLiveMessages((prev) => (prev.some((m) => m.id === payload.message.id) ? prev : [...prev, payload.message]));
    }
    socket.on('message:new', onNew);
    return () => {
      socket.emit('leave:conversation', { conversationId: id });
      socket.off('message:new', onNew);
    };
  }, [id]);

  useEffect(() => {
    if (id) markSeen(id).catch(() => {});
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText('');
    setSending(true);
    setError('');
    try {
      const msg = await sendMessage(id, content);
      setLiveMessages((prev) => [...prev, msg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setSending(false);
    }
  }

  if (conversations.loading || messagesQuery.loading) {
    return (
      <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col">
        <Skeleton className="h-8 w-1/2" />
        <div className="mt-5 space-y-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="ml-auto h-10 w-2/3" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <EmptyState variant="not-found" title={t('chat.notFoundTitle')} action={{ label: t('chat.title'), href: `${base}/messages` }} />
      </div>
    );
  }

  const name = conversation.otherParty?.fullName ?? '—';
  const isClosed = conversation.status === 'CLOSED';

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-2xl flex-col">
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <Link to={`${base}/messages`} className="text-ink-soft hover:text-ink">
          <ArrowLeft size={18} />
        </Link>
        <Avatar name={name} src={conversation.otherParty?.avatarUrl} size="md" />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">{name}</p>
          {isClosed ? (
            <p className="truncate text-[12px] text-ink-soft">{t('chat.collaborationClosed')}</p>
          ) : (
            conversation.campaign?.title && <p className="truncate text-[12px] text-ink-soft">{conversation.campaign.title}</p>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.length === 0 && <p className="py-10 text-center text-[13px] text-ink-soft">{t('chat.noMessagesYet')}</p>}
        {messages.map((m) => {
          if (m.type === 'SYSTEM') {
            return (
              <div key={m.id} className="flex justify-center">
                <span className="rounded-full bg-surface-dim px-3 py-1 text-[12px] text-ink-soft">{m.content}</span>
              </div>
            );
          }
          const mine = m.senderId === user?.id;
          return (
            <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed',
                  mine ? 'rounded-br-sm bg-brand text-white' : 'rounded-bl-sm bg-surface-dim text-ink',
                )}
              >
                {m.attachmentUrl && m.type === 'IMAGE' && (
                  <img src={m.attachmentUrl} alt="" className="mb-1.5 max-h-64 rounded-lg object-cover" />
                )}
                {m.attachmentUrl && m.type === 'FILE' && (
                  <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="underline">
                    {m.attachmentName ?? 'Attachment'}
                  </a>
                )}
                {m.content && <p className="whitespace-pre-line">{m.content}</p>}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <Alert tone="error" className="mb-2">{error}</Alert>}

      {!isClosed ? (
        <form onSubmit={onSend} className="flex items-center gap-2 border-t border-line pt-3">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('chat.placeholder')}
            className="h-11 flex-1 rounded-xl border border-line-strong bg-surface px-3.5 text-[14px] text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-brand/35"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            aria-label={t('chat.send')}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-white disabled:opacity-50"
          >
            <Send size={17} />
          </button>
        </form>
      ) : (
        <p className="border-t border-line pt-3 text-center text-[13px] text-ink-soft">
          {t('chat.collaborationClosed')}
        </p>
      )}
    </div>
  );
}
