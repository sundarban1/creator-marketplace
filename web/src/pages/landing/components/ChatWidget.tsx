import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { visitorChatApi, type VisitorMessage } from '../lib/visitorChatApi';
import { connectVisitorSocket, disconnectVisitorSocket } from '../lib/visitorSocket';
import { useLandingLanguage } from '../context/LanguageContext';

const STORAGE_KEY = 'kolab_visitor_chat';

interface StoredSession {
  chatId: string;
  token: string;
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function saveSession(session: StoredSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function addMessage(prev: VisitorMessage[], message: VisitorMessage): VisitorMessage[] {
  if (prev.some((m) => m.id === message.id)) return prev;
  return [...prev, message];
}

export function ChatWidget() {
  const { d } = useLandingLanguage();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<StoredSession | null>(loadSession);
  const [messages, setMessages] = useState<VisitorMessage[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [form, setForm] = useState({ name: '', contact: '' });
  const [formError, setFormError] = useState('');
  const [starting, setStarting] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Fetch history whenever the active chat changes (covers both restoring an
  // existing session on first load and switching to a freshly-started chat).
  useEffect(() => {
    if (!session) return;
    visitorChatApi.getMessages(session.chatId, session.token)
      .then(setMessages)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.chatId]);

  // (Re)connect the socket whenever we have a session — kept alive regardless
  // of whether the panel is open, so the unread badge updates in the background.
  useEffect(() => {
    if (!session) return;
    const socket = connectVisitorSocket(session.token);
    socketRef.current = socket;

    socket.on('visitor-chat:message', ({ message }: { message: VisitorMessage }) => {
      setMessages((prev) => addMessage(prev, message));
      if (message.sender === 'ADMIN') setHasUnread((u) => !open || u);
    });

    return () => {
      disconnectVisitorSocket();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  function toggleOpen() {
    setOpen((v) => {
      const next = !v;
      if (next) {
        setHasUnread(false);
        if (session) void visitorChatApi.markSeen(session.chatId, session.token).catch(() => {});
      }
      return next;
    });
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const contact = form.contact.trim();
    if (!name) return setFormError(d.chatWidget.errorNameRequired);
    if (!contact) return setFormError(d.chatWidget.errorContactRequired);

    setFormError('');
    setStarting(true);
    const isEmail = contact.includes('@');
    try {
      const { chat, token } = await visitorChatApi.start({
        name,
        ...(isEmail ? { email: contact } : { phone: contact }),
      });
      const next = { chatId: chat.id, token };
      saveSession(next);
      setSession(next);
      setMessages([]);
    } catch {
      setFormError(d.chatWidget.errorGeneric);
    } finally {
      setStarting(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!session || sending) return;
    const content = draft.trim();
    if (!content) return;

    setSending(true);
    setDraft('');
    try {
      const message = await visitorChatApi.sendMessage(session.chatId, session.token, content);
      setMessages((prev) => addMessage(prev, message));
    } catch {
      setDraft(content);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-[min(480px,70vh)] w-[min(340px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-2xl sm:w-[min(380px,calc(100vw-2.5rem))]"
          >
            <div className="flex items-center justify-between bg-ink px-5 py-4 text-white">
              <div>
                <p className="font-serif text-base italic">{d.chatWidget.headerTitle}</p>
                <p className="text-xs text-white/50">{d.chatWidget.headerSubtitle}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label={d.chatWidget.closeAriaLabel} className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {!session ? (
              <form onSubmit={handleStart} className="flex flex-1 flex-col justify-center gap-3 p-6">
                <p className="mb-1 text-sm text-ink-soft">{d.chatWidget.introText}</p>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={d.chatWidget.namePlaceholder}
                  className="rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-violet focus:outline-none"
                />
                <input
                  value={form.contact}
                  onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                  placeholder={d.chatWidget.contactPlaceholder}
                  className="rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-violet focus:outline-none"
                />
                {formError && <p className="text-xs text-red-500">{formError}</p>}
                <button
                  type="submit"
                  disabled={starting}
                  className="mt-1 rounded-xl bg-gradient-to-r from-violet to-brand-orange py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet disabled:opacity-60"
                >
                  {starting ? d.chatWidget.starting : d.chatWidget.startChat}
                </button>
              </form>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto p-4">
                  {messages.length === 0 && (
                    <p className="mt-6 text-center text-xs text-ink-soft/60">{d.chatWidget.emptyMessages}</p>
                  )}
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === 'VISITOR' ? 'justify-end' : 'justify-start'}`}>
                      <span
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                          m.sender === 'VISITOR' ? 'bg-gradient-to-br from-violet to-violet-dark text-white' : 'bg-paper-dim text-ink'
                        }`}
                      >
                        {m.content}
                      </span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-ink/10 p-3">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={d.chatWidget.messagePlaceholder}
                    className="flex-1 rounded-full border border-ink/15 px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:border-violet focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    aria-label={d.chatWidget.sendAriaLabel}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet to-brand-orange text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet disabled:opacity-50"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={toggleOpen}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        aria-label={open ? d.chatWidget.closeAriaLabel : d.chatWidget.openAriaLabel}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet to-brand-orange text-white shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {hasUnread && !open && (
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500" />
        )}
      </motion.button>
    </div>
  );
}
