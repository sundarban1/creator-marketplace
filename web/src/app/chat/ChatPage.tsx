import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, X, Send, Smile, Paperclip, FileText, Play, Loader2, MessageCircle } from 'lucide-react';
import { useT } from '../i18n';
import { useAsync } from '../lib/useAsync';
import { useAppAuth } from '../auth/AppAuthContext';
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  sendAttachmentWithProgress,
  markSeen,
  respondToRequest,
  type Conversation,
  type ChatMessage,
} from '../api/chat';
import { connectSocket } from '../lib/socket';
import { Avatar } from '../ui/Avatar';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { Alert } from '../ui/Alert';
import { cn } from '../ui/cn';
import { CHAT_EMOJIS } from './chatEmojis';
import { CHAT_FILE_ACCEPT, validateChatFile } from './chatAttachments';
import { AttachmentPreviewModal, type AttachmentPreview } from './AttachmentPreviewModal';

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/**
 * Instagram-web-style inbox, shared by /business/messages(/:id) and
 * /creator/messages(/:id) — a single component (not two route-swapped pages)
 * so the conversation list stays mounted while a thread opens next to it.
 * Below `lg` there's no room for both panes, so it falls back to the old
 * list-then-thread navigation (thread pane takes over the screen, with a
 * back arrow to the list).
 */
export function ChatPage() {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const base = location.pathname.startsWith('/business') ? '/business' : '/creator';

  const conversations = useAsync((s) => fetchConversations({}, s), []);
  const [busyId, setBusyId] = useState('');
  const [listError, setListError] = useState('');

  // A "Message" button elsewhere links here with ?campaign=<id> — jump
  // straight into the matching thread once the list has loaded.
  const jumpCampaignId = !id ? searchParams.get('campaign') : null;
  const jumpTarget = jumpCampaignId
    ? conversations.data?.items.find((c) => c.campaignId === jumpCampaignId)
    : undefined;
  useEffect(() => {
    if (jumpTarget) navigate(`${base}/messages/${jumpTarget.id}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTarget?.id]);

  async function respond(conversationId: string, action: 'accept' | 'decline') {
    setBusyId(conversationId);
    setListError('');
    try {
      await respondToRequest(conversationId, action);
      conversations.reload();
    } catch (err) {
      setListError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusyId('');
    }
  }

  if (conversations.loading || jumpTarget) {
    return (
      <div className="mx-auto max-w-6xl">
        <Skeleton className="h-8 w-1/3" />
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
  // proposal-accept or fresh message request. (A direct link to a closed
  // thread — e.g. from a notification — still opens it; only the list rail
  // hides it.)
  const items = (conversations.data?.items ?? []).filter((c) => c.status !== 'CLOSED');
  const activeConversation = id ? conversations.data?.items.find((c) => c.id === id) : undefined;

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-6xl overflow-hidden rounded-2xl border border-line bg-surface">
      <div
        className={cn(
          'flex-col border-r border-line lg:flex lg:w-[360px] lg:flex-shrink-0',
          id ? 'hidden lg:flex' : 'flex w-full',
        )}
      >
        <div className="flex-shrink-0 border-b border-line px-5 py-4">
          <h1 className="text-[17px] font-semibold text-ink">{t('chat.title')}</h1>
        </div>

        {listError && <Alert tone="error" className="mx-4 mt-3">{listError}</Alert>}

        {items.length === 0 ? (
          <EmptyState variant="empty" title={t('chat.emptyTitle')} description={t('chat.emptyBody')} className="px-4" />
        ) : (
          <ul className="flex-1 overflow-y-auto py-1">
            {items.map((c) => (
              <ConversationRow
                key={c.id}
                c={c}
                base={base}
                active={c.id === id}
                busy={busyId === c.id}
                onAccept={() => respond(c.id, 'accept')}
                onDecline={() => respond(c.id, 'decline')}
              />
            ))}
          </ul>
        )}
      </div>

      <div className={cn('min-w-0 flex-1 flex-col lg:flex', id ? 'flex' : 'hidden')}>
        {!id ? (
          <EmptyThreadPane />
        ) : activeConversation ? (
          <ConversationThread key={id} conversation={activeConversation} base={base} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              variant="not-found"
              title={t('chat.notFoundTitle')}
              action={{ label: t('chat.title'), href: `${base}/messages` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyThreadPane() {
  const t = useT();
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink">
          <MessageCircle size={30} strokeWidth={1.5} className="text-ink" />
        </div>
        <h2 className="mt-4 text-[18px] font-semibold text-ink">{t('chat.selectConversationTitle')}</h2>
        <p className="mt-1.5 max-w-[240px] text-[13px] text-ink-soft">{t('chat.selectConversationBody')}</p>
      </div>
    </div>
  );
}

function ConversationRow({
  c,
  base,
  active,
  busy,
  onAccept,
  onDecline,
}: {
  c: Conversation;
  base: string;
  active: boolean;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const t = useT();
  const name = c.otherParty?.fullName ?? '—';
  const preview = c.messages?.[0]?.content ?? c.requestMessage ?? '';
  const unread = c.unreadCount > 0;

  const inner = (
    <div className={cn('flex items-center gap-3 px-4 py-3 transition-colors', active ? 'bg-violet/[0.07]' : 'hover:bg-surface-dim')}>
      <Avatar name={name} src={c.otherParty?.avatarUrl} size="lg" />
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
      <li className={cn('border-b border-line/60 px-4 py-3', active && 'bg-violet/[0.07]')}>
        <div className="flex items-center gap-3">
          <Avatar name={name} src={c.otherParty?.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{name}</p>
            <p className="text-[12px] font-medium text-violet-dark">{t('chat.messageRequest')}</p>
            {c.requestMessage && <p className="mt-1 truncate text-[13px] text-ink-soft">{c.requestMessage}</p>}
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

// Optimistic (not-yet-confirmed) send — extends the server shape with a local
// upload fraction. `id` is `temp-<ts>` while pending, same convention as
// mobile's useChatConversation (`msg.id.startsWith('temp-')`).
type LocalMessage = ChatMessage & { uploadProgress?: number };

function ConversationThread({ conversation, base }: { conversation: Conversation; base: string }) {
  const t = useT();
  const { user } = useAppAuth();
  const id = conversation.id;

  const messagesQuery = useAsync((s) => fetchMessages(id, { limit: 100 }, s), [id]);

  // Messages that arrive after the initial load (my own sends + the other
  // party's socket-delivered ones) — kept separate from the fetched page and
  // merged at render time so nothing here copies async data into state via
  // an effect (that pattern re-renders needlessly and this codebase's lint
  // config specifically forbids it).
  const [liveMessages, setLiveMessages] = useState<LocalMessage[]>([]);
  const [text, setText] = useState('');
  // Single in-flight guard shared by text sends and attachment uploads —
  // mirrors mobile's useChatConversation isSending ref, which blocks either
  // kind of send while the other is in progress.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [preview, setPreview] = useState<AttachmentPreview | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messages = useMemo(() => {
    const map = new Map<string, LocalMessage>();
    for (const m of messagesQuery.data?.items ?? []) map.set(m.id, m);
    for (const m of liveMessages) map.set(m.id, m);
    return Array.from(map.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [messagesQuery.data, liveMessages]);

  useEffect(() => {
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
    markSeen(id).catch(() => {});
  }, [id]);

  // Scrolls only the messages panel itself — never scrollIntoView(), which
  // walks up the ancestor chain and can nudge the outer page/document scroll
  // too if this panel isn't fully settled in the viewport yet (e.g. right
  // after navigating into a thread).
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (!emojiOpen) return;
    const onClick = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setEmojiOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [emojiOpen]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const content = text.trim();
    if (!content) return;
    setText('');
    setBusy(true);
    setError('');
    try {
      const msg = await sendMessage(id, content);
      setLiveMessages((prev) => [...prev, msg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      setBusy(false);
    }
  }

  function insertEmoji(emoji: string) {
    setText((prev) => prev + emoji);
  }

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || busy) return;

    // Same allowlist + 20MB cap as mobile's pickDocumentAttachment() and the
    // backend's uploadChatFile multer config — the backend re-checks regardless.
    const validation = validateChatFile(file);
    if (!validation.ok) {
      setError(validation.reason === 'size' ? t('chat.attachmentTooLarge') : t('chat.attachmentUnsupportedType'));
      return;
    }

    const caption = text.trim();
    setText('');
    setError('');
    setBusy(true);

    const tempId = `temp-${Date.now()}`;
    const localUrl = URL.createObjectURL(file);
    const isImage = file.type.startsWith('image/');
    const optimistic: LocalMessage = {
      id: tempId,
      conversationId: id,
      senderId: user?.id ?? '',
      content: caption,
      type: isImage ? 'IMAGE' : 'FILE',
      attachmentUrl: localUrl,
      attachmentName: file.name,
      attachmentThumbnailUrl: null,
      attachmentSize: file.size,
      attachmentFormat: file.type,
      attachmentStatus: 'PROCESSING',
      createdAt: new Date().toISOString(),
      uploadProgress: 0,
    };
    setLiveMessages((prev) => [...prev, optimistic]);

    try {
      const msg = await sendAttachmentWithProgress(id, file, caption || undefined, (fraction) => {
        setLiveMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, uploadProgress: fraction } : m)));
      });
      setLiveMessages((prev) => {
        const without = prev.filter((m) => m.id !== tempId);
        return without.some((m) => m.id === msg.id) ? without : [...without, msg];
      });
    } catch (err) {
      setLiveMessages((prev) => prev.filter((m) => m.id !== tempId));
      setError(err instanceof Error ? err.message : t('common.somethingWrong'));
    } finally {
      URL.revokeObjectURL(localUrl);
      setBusy(false);
    }
  }

  const name = conversation.otherParty?.fullName ?? '—';
  const isClosed = conversation.status === 'CLOSED';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-line px-5 py-4">
        <Link to={`${base}/messages`} className="text-ink-soft hover:text-ink lg:hidden">
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

      {messagesQuery.loading ? (
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="ml-auto h-10 w-2/3" />
          <Skeleton className="h-10 w-1/2" />
        </div>
      ) : (
        <div ref={messagesRef} className="flex-1 scroll-smooth space-y-3 overflow-y-auto px-5 py-4">
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
            const uploading = m.attachmentStatus === 'PROCESSING';
            const pct = Math.round((m.uploadProgress ?? 0) * 100);
            return (
              <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed',
                    mine ? 'rounded-br-sm bg-brand text-white' : 'rounded-bl-sm bg-surface-dim text-ink',
                  )}
                >
                  {m.attachmentUrl && m.type === 'IMAGE' && (
                    <button
                      type="button"
                      onClick={() => !uploading && setPreview({ kind: 'image', url: m.attachmentUrl!, name: m.attachmentName })}
                      className="relative mb-1.5 block overflow-hidden rounded-lg"
                    >
                      <img src={m.attachmentUrl} alt="" className="max-h-64 w-full object-cover" />
                      {uploading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 px-3">
                          <Loader2 size={20} className="animate-spin text-white" />
                          <span className="text-[11px] font-semibold text-white">{pct}%</span>
                          <div className="h-1 w-24 overflow-hidden rounded-full bg-white/30">
                            <div className="h-full bg-white transition-[width]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}
                    </button>
                  )}

                  {m.attachmentUrl && m.type === 'VIDEO' && (
                    <button
                      type="button"
                      onClick={() =>
                        !uploading &&
                        setPreview({ kind: 'video', url: m.attachmentUrl!, thumbnail: m.attachmentThumbnailUrl, name: m.attachmentName })
                      }
                      className="relative mb-1.5 block h-40 w-56 max-w-full overflow-hidden rounded-lg bg-black/10"
                    >
                      {m.attachmentThumbnailUrl && (
                        <img src={m.attachmentThumbnailUrl} alt="" className="h-full w-full object-cover" />
                      )}
                      {!uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <Play size={30} className="fill-white text-white" />
                        </div>
                      )}
                      {uploading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 px-3">
                          <Loader2 size={20} className="animate-spin text-white" />
                          <span className="text-[11px] font-semibold text-white">{pct}%</span>
                          <div className="h-1 w-24 overflow-hidden rounded-full bg-white/30">
                            <div className="h-full bg-white transition-[width]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}
                    </button>
                  )}

                  {m.attachmentUrl && m.type === 'FILE' && (
                    <button
                      type="button"
                      onClick={() => !uploading && setPreview({ kind: 'file', url: m.attachmentUrl!, name: m.attachmentName })}
                      className={cn(
                        'mb-1.5 flex w-full max-w-[220px] items-center gap-2 rounded-lg px-2.5 py-2 text-left',
                        mine ? 'bg-white/15' : 'bg-surface',
                      )}
                    >
                      {uploading ? (
                        <Loader2 size={20} className="flex-shrink-0 animate-spin" />
                      ) : (
                        <FileText size={20} className="flex-shrink-0" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">{m.attachmentName ?? 'Attachment'}</span>
                        {uploading && (
                          <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-current/20">
                            <span className="block h-full bg-current transition-[width]" style={{ width: `${pct}%` }} />
                          </span>
                        )}
                      </span>
                    </button>
                  )}

                  {m.content && <p className="whitespace-pre-line">{m.content}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <Alert tone="error" className="mx-5 mb-2">{error}</Alert>}

      {!isClosed ? (
        <form onSubmit={onSend} className="flex flex-shrink-0 items-center gap-1.5 border-t border-line px-5 py-3">
          <div ref={emojiRef} className="relative">
            <button
              type="button"
              onClick={() => setEmojiOpen((v) => !v)}
              aria-label={t('chat.emoji')}
              className={cn(
                'flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-ink-soft hover:bg-surface-dim hover:text-ink',
                emojiOpen && 'bg-surface-dim text-ink',
              )}
            >
              <Smile size={19} />
            </button>

            {emojiOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-xl">
                <div className="grid grid-cols-8 gap-0.5">
                  {CHAT_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-[17px] hover:bg-surface-dim"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            aria-label={t('chat.attach')}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-ink-soft hover:bg-surface-dim hover:text-ink disabled:opacity-50"
          >
            <Paperclip size={18} />
          </button>
          <input ref={fileInputRef} type="file" accept={CHAT_FILE_ACCEPT} onChange={onFileChange} className="hidden" />

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('chat.placeholder')}
            className="h-11 flex-1 rounded-xl border border-line-strong bg-surface px-3.5 text-[14px] text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-brand/35"
          />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            aria-label={t('chat.send')}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand text-white disabled:opacity-50"
          >
            <Send size={17} />
          </button>
        </form>
      ) : (
        <p className="flex-shrink-0 border-t border-line px-5 py-3 text-center text-[13px] text-ink-soft">
          {t('chat.collaborationClosed')}
        </p>
      )}

      <AttachmentPreviewModal preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
