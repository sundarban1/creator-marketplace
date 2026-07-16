import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, X, Send, ChevronLeft } from 'lucide-react';
import { api, type VisitorChat, type VisitorMessage } from '../lib/api';
import { getSocket } from '../lib/socket';

function addMessage(prev: VisitorMessage[], message: VisitorMessage): VisitorMessage[] {
  if (prev.some((m) => m.id === message.id)) return prev;
  return [...prev, message];
}

function timeAgo(iso: string | null): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isUnread(chat: VisitorChat): boolean {
  if (!chat.lastMessageAt) return false;
  if (!chat.adminSeenAt) return true;
  return new Date(chat.lastMessageAt) > new Date(chat.adminSeenAt);
}

export function AdminChatWidget() {
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<VisitorChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<VisitorMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.visitorChat.list().then((res) => setChats(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function upsertChat(chat: VisitorChat) {
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === chat.id);
        if (idx === -1) return [chat, ...prev];
        const next = [...prev];
        next[idx] = { ...next[idx], ...chat };
        return next;
      });
    }

    function handleNewChat({ chat }: { chat: VisitorChat }) {
      upsertChat(chat);
    }

    function handleMessage({ chatId, message }: { chatId: string; message: VisitorMessage }) {
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === chatId);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = { ...next[idx], lastMessageAt: message.createdAt };
        const [updated] = next.splice(idx, 1);
        return [updated!, ...next];
      });
      setActiveChatId((current) => {
        if (current === chatId) setMessages((prev) => addMessage(prev, message));
        return current;
      });
    }

    socket.on('visitor-chat:new', handleNewChat);
    socket.on('visitor-chat:message', handleMessage);
    return () => {
      socket.off('visitor-chat:new', handleNewChat);
      socket.off('visitor-chat:message', handleMessage);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function openChat(chatId: string) {
    setActiveChatId(chatId);
    setMessages([]);
    api.visitorChat.getMessages(chatId).then((res) => setMessages(res.data)).catch(() => {});
    api.visitorChat.markSeen(chatId).then(() => {
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, adminSeenAt: new Date().toISOString() } : c)));
    }).catch(() => {});
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChatId || sending) return;
    const content = draft.trim();
    if (!content) return;

    setSending(true);
    setDraft('');
    try {
      const res = await api.visitorChat.sendMessage(activeChatId, content);
      setMessages((prev) => addMessage(prev, res.data));
    } catch {
      setDraft(content);
    } finally {
      setSending(false);
    }
  }

  const activeChat = chats.find((c) => c.id === activeChatId) ?? null;
  const anyUnread = chats.some(isUnread);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-900 px-4 py-3 text-white">
              {activeChat && (
                <button onClick={() => setActiveChatId(null)} aria-label="Back to chat list" className="text-white/70 hover:text-white">
                  <ChevronLeft size={18} />
                </button>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">{activeChat ? activeChat.name : 'Visitor Chats'}</p>
                {activeChat && <p className="truncate text-xs text-white/50">{activeChat.email ?? activeChat.phone}</p>}
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-white/70 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {!activeChat ? (
              <div className="flex-1 overflow-y-auto">
                {chats.length === 0 ? (
                  <p className="p-6 text-center text-sm text-gray-400">No visitor chats yet</p>
                ) : (
                  chats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => openChat(chat.id)}
                      className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                        {chat.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-gray-800">{chat.name}</p>
                          <span className="flex-shrink-0 text-[10px] text-gray-400">{timeAgo(chat.lastMessageAt)}</span>
                        </div>
                        <p className="truncate text-xs text-gray-500">{chat.email ?? chat.phone}</p>
                      </div>
                      {isUnread(chat) && <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />}
                    </button>
                  ))
                )}
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto p-4">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                      <span
                        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                          m.sender === 'ADMIN' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {m.content}
                      </span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-gray-100 p-3">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a reply…"
                    className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    aria-label="Send"
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white disabled:opacity-50"
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
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        aria-label={open ? 'Close visitor chats' : 'Open visitor chats'}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-xl"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {anyUnread && !open && (
          <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-red-500" />
        )}
      </motion.button>
    </div>
  );
}
