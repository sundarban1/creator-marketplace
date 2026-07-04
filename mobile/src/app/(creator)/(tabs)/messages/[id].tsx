import { router, useLocalSearchParams } from 'expo-router';
import { messagingEvents } from '@/lib/messagingEvents';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { chatService, toMessage } from '@/services/chat';
import { getSocket } from '@/lib/socket';
import { notificationService } from '@/services/notifications';
import { incomingMessageEvents } from '@/lib/incomingMessageEvents';
import { F } from '@/utilities/constants';
import type { Message } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#7C3AED', '#0EA5E9', '#059669', '#D97706', '#EC4899', '#06B6D4', '#EF4444'];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]!;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDateLabel(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type ListItem =
  | { _k: 'date';   label: string; id: string }
  | { _k: 'msg';    msg: Message; isSent: boolean; showAvatar: boolean; isLast: boolean; id: string }
  | { _k: 'typing'; id: string };

function buildItems(msgs: Message[], userId: string, typing: boolean): ListItem[] {
  const items: ListItem[] = [];
  let lastDate = '';
  for (let i = 0; i < msgs.length; i++) {
    const msg = msgs[i]!;
    const dateStr = new Date(msg.timestamp).toDateString();
    if (dateStr !== lastDate) {
      items.push({ _k: 'date', label: formatDateLabel(msg.timestamp), id: `d-${dateStr}-${msg.id}` });
      lastDate = dateStr;
    }
    const isSent = msg.senderId === userId;
    const nextMsg = msgs[i + 1];
    const showAvatar = !isSent && (!nextMsg || nextMsg.senderId !== msg.senderId);
    const isLast = i === msgs.length - 1;
    items.push({ _k: 'msg', msg, isSent, showAvatar, isLast, id: msg.id });
  }
  if (typing) items.push({ _k: 'typing', id: 'typing' });
  return items;
}

// ── Typing Indicator ──────────────────────────────────────────────────────────

function TypingDots({ avatarName, color }: { avatarName: string; color: string }) {
  const C = useAppColors();
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: -5, duration: 220, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0,  duration: 220, useNativeDriver: true }),
          Animated.delay(480 - delay),
        ])
      );
    const a1 = anim(d1, 0); const a2 = anim(d2, 160); const a3 = anim(d3, 320);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={td.row}>
      <View style={[td.mini, { backgroundColor: color }]}>
        <Text style={td.miniTxt}>{initials(avatarName)}</Text>
      </View>
      <View style={[td.bubble, { backgroundColor: C.surface, borderColor: C.border }]}>
        {[d1, d2, d3].map((d, i) => (
          <Animated.View key={i} style={[td.dot, { backgroundColor: C.textSecondary, transform: [{ translateY: d }] }]} />
        ))}
      </View>
    </View>
  );
}

const td = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  mini:    { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  miniTxt: { color: '#fff', fontSize: 10, fontFamily: F.extrabold },
  bubble:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  dot:     { width: 7, height: 7, borderRadius: 3.5 },
});

// ── Message Bubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  msg, isSent, showAvatar, isLast, personName, personColor,
}: {
  msg: Message; isSent: boolean; showAvatar: boolean; isLast: boolean;
  personName: string; personColor: string;
}) {
  const C = useAppColors();
  const isPending = msg.id.startsWith('temp-');

  return (
    <View style={[s.bubbleRow, isSent ? s.bubbleRowSent : s.bubbleRowReceived]}>
      {!isSent && (
        showAvatar
          ? <View style={[s.msgAvatar, { backgroundColor: personColor }]}>
              <Text style={s.msgAvatarTxt}>{initials(personName)}</Text>
            </View>
          : <View style={s.avatarSpacer} />
      )}
      <View style={[s.bubbleWrap, isSent ? s.bubbleWrapSent : s.bubbleWrapReceived]}>
        <View style={[
          s.bubble,
          isSent
            ? [s.bubbleSent, { backgroundColor: C.brinjal1, opacity: isPending ? 0.65 : 1 }]
            : [s.bubbleReceived, { backgroundColor: C.surface, borderColor: C.border }],
        ]}>
          <Text style={[s.bubbleTxt, { color: isSent ? '#fff' : C.text }]}>{msg.text}</Text>
        </View>
        <View style={s.bubbleMeta}>
          <Text style={[s.bubbleTime, { color: C.textSecondary }]}>{formatTime(msg.timestamp)}</Text>
          {isSent && (
            isPending
              ? <Ionicons name="time-outline" size={11} color={C.textSecondary} />
              : isLast
              ? <Ionicons name="checkmark-done" size={12} color={C.brinjal1} />
              : <Ionicons name="checkmark" size={12} color={C.textSecondary} />
          )}
        </View>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CreatorChatRoomScreen() {
  const { id, name, status: urlStatus, focusInput, campaignTitle } = useLocalSearchParams<{
    id: string; name?: string; status?: string; focusInput?: string; campaignTitle?: string;
  }>();
  const { user } = useAuth();
  const { t }    = useLanguage();
  const C        = useAppColors();

  const [messages, setMessages]       = useState<Message[]>([]);
  const [status, setStatus]           = useState<'PENDING' | 'ACCEPTED' | 'DECLINED'>(
    (urlStatus as 'PENDING' | 'ACCEPTED' | 'DECLINED') ?? 'ACCEPTED',
  );
  const [text, setText]               = useState('');
  const [acting, setActing]           = useState<'accept' | 'decline' | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const listRef         = useRef<FlatList>(null);
  const inputRef        = useRef<TextInput>(null);
  const isSending       = useRef(false);
  const typingTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingEmitted = useRef(false);
  const seenTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);

  const personName  = name ?? 'Chat';
  const personColor = avatarColor(personName);

  const hasScrolled = useRef(false);

  function scrollToBottom(animated = true) {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 80);
  }

  function markSeen() {
    if (seenTimer.current) clearTimeout(seenTimer.current);
    seenTimer.current = setTimeout(() => {
      chatService.markSeen(id)
        .then(() => {
          messagingEvents.refresh();
          notificationService.markReadByRef(id).catch(() => null);
        })
        .catch(() => null);
    }, 800);
  }

  // Load messages
  useEffect(() => {
    setMessages([]);
    setText('');
    hasScrolled.current = false;
    const convStatus = (urlStatus as 'PENDING' | 'ACCEPTED' | 'DECLINED') ?? 'ACCEPTED';
    setStatus(convStatus);
    if (!id) return;
    chatService.getMessages(id).then((msgs) => {
      setMessages(msgs);
    });
    if (convStatus === 'ACCEPTED') markSeen();
    if (focusInput === 'true' && convStatus === 'ACCEPTED') {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [id]);

  // Incoming messages via NotificationContext's forwarded socket event bus
  useEffect(() => {
    if (!id) return;
    return incomingMessageEvents.subscribe((data) => {
      if (data.conversationId !== id) return;
      const incoming = toMessage(data.message);
      setMessages((prev) => {
        // Replace matching temp message from current user, or append if new
        const withoutTemp = prev.filter(
          (m) => !(m.id.startsWith('temp-') && m.senderId === incoming.senderId)
        );
        if (withoutTemp.some((m) => m.id === incoming.id)) return withoutTemp;
        return [...withoutTemp, incoming];
      });
      scrollToBottom();
      markSeen();
    });
  }, [id]);

  // Socket: typing indicators + room presence
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !id) return;
    socket.emit('join:conversation', { conversationId: id });

    const onTypingStart = (data: { conversationId: string }) => { if (data.conversationId === id) setOtherTyping(true); };
    const onTypingStop  = (data: { conversationId: string }) => { if (data.conversationId === id) setOtherTyping(false); };
    const onReconnect   = () => { socket.emit('join:conversation', { conversationId: id }); };

    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop',  onTypingStop);
    socket.on('connect',      onReconnect);

    return () => {
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop',  onTypingStop);
      socket.off('connect',      onReconnect);
      socket.emit('leave:conversation', { conversationId: id });
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (seenTimer.current)   clearTimeout(seenTimer.current);
    };
  }, [id]);

  useEffect(() => {
    if (otherTyping) scrollToBottom();
  }, [otherTyping]);

  function handleTextChange(val: string) {
    setText(val);
    const socket = getSocket();
    if (!socket) return;
    if (!val.trim()) {
      if (isTypingEmitted.current) { socket.emit('typing:stop', { conversationId: id }); isTypingEmitted.current = false; }
      if (typingTimer.current) clearTimeout(typingTimer.current);
      return;
    }
    if (!isTypingEmitted.current) { socket.emit('typing:start', { conversationId: id }); isTypingEmitted.current = true; }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: id });
      isTypingEmitted.current = false;
    }, 2000);
  }

  async function handleRespond(action: 'accept' | 'decline') {
    setActing(action);
    try {
      await chatService.respondToRequest(id, action);
      setStatus(action === 'accept' ? 'ACCEPTED' : 'DECLINED');
      if (action === 'accept') { markSeen(); }
      else { messagingEvents.refresh(); router.back(); }
    } finally {
      setActing(null);
    }
  }

  function handleSend() {
    if (!text.trim() || isSending.current) return;
    const content = text.trim();
    isSending.current = true;
    const socket = getSocket();

    // Stop typing indicator
    if (socket && isTypingEmitted.current) {
      socket.emit('typing:stop', { conversationId: id });
      isTypingEmitted.current = false;
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);

    // Optimistic update — show message immediately
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId, conversationId: id,
      senderId: user?.id ?? '', text: content,
      timestamp: new Date().toISOString(), status: 'sending',
    };
    setMessages((prev) => [...prev, optimistic]);
    setText('');
    scrollToBottom();

    if (socket?.connected) {
      socket.emit('message:send', { conversationId: id, content });
      // The server echoes message:new back; the subscriber above replaces the temp message
      isSending.current = false;
    } else {
      chatService.sendMessage(id, content)
        .then((msg) => {
          setMessages((prev) => {
            const without = prev.filter((m) => m.id !== tempId);
            return without.some((m) => m.id === msg.id) ? without : [...without, msg];
          });
        })
        .catch(() => {
          // Remove optimistic on failure
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        })
        .finally(() => { isSending.current = false; });
    }
  }

  const isPending  = status === 'PENDING';
  const isDeclined = status === 'DECLINED';
  const listItems  = buildItems(messages, user?.id ?? '', otherTyping);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* ── Header ── */}
      <LinearGradient colors={['#4c1d95', '#6d28d9', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <Pressable style={s.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(creator)/messages' as never)}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={[s.headerAvatar, { backgroundColor: personColor }]}>
          <Text style={s.headerAvatarTxt}>{initials(personName)}</Text>
        </View>
        <View style={s.headerInfo}>
          <Text style={s.headerName} numberOfLines={1}>{personName}</Text>
          {otherTyping
            ? <Text style={[s.headerSub, { color: '#C4B5FD' }]}>typing…</Text>
            : isPending
            ? <Text style={[s.headerSub, { color: '#FCD34D' }]}>⏳ {t('messages.requestPending')}</Text>
            : isDeclined
            ? <Text style={[s.headerSub, { color: '#FCA5A5' }]}>{t('messages.requestDeclined')}</Text>
            : <Text style={[s.headerSub, { color: '#86EFAC' }]}>{t('messages.active')}</Text>}
        </View>
      </LinearGradient>

      {/* ── Campaign banner ── */}
      {!!campaignTitle && (
        <View style={[s.campaignBar, { backgroundColor: C.primaryLight, borderBottomColor: C.border }]}>
          <Ionicons name="briefcase-outline" size={13} color={C.brinjal1} />
          <Text style={[s.campaignBarTxt, { color: C.brinjal1 }]} numberOfLines={1}>{campaignTitle}</Text>
        </View>
      )}

      {/* ── Accept / Decline bar for PENDING ── */}
      {isPending && (
        <View style={[s.requestBar, { backgroundColor: '#FEF3C7', borderBottomColor: '#FDE68A' }]}>
          <View style={s.requestBarTop}>
            <Ionicons name="briefcase-outline" size={14} color="#92400E" />
            <Text style={[s.requestBarTxt, { color: '#92400E' }]}>
              {t('messages.requestFrom', { name: personName })}
            </Text>
          </View>
          <View style={s.requestBarActions}>
            <Pressable
              style={[s.declineBtn, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}
              onPress={() => handleRespond('decline')}
              disabled={acting !== null}>
              {acting === 'decline'
                ? <ActivityIndicator size="small" color="#EF4444" />
                : <><Ionicons name="close-circle-outline" size={15} color="#EF4444" /><Text style={[s.declineTxt, { color: '#EF4444' }]}>{t('messages.decline')}</Text></>}
            </Pressable>
            <Pressable
              style={[s.acceptBtn, { backgroundColor: C.brinjal1 }]}
              onPress={() => handleRespond('accept')}
              disabled={acting !== null}>
              {acting === 'accept'
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Ionicons name="checkmark-circle-outline" size={15} color="#fff" /><Text style={s.acceptTxt}>{t('messages.accept')}</Text></>}
            </Pressable>
          </View>
        </View>
      )}

      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          style={[s.flex, { backgroundColor: C.background }]}
          data={listItems}
          keyExtractor={(item) => item.id}
          onContentSizeChange={() => {
            if (!hasScrolled.current && listItems.length > 0) {
              listRef.current?.scrollToEnd({ animated: false });
              hasScrolled.current = true;
            }
          }}
          renderItem={({ item }) => {
            if (item._k === 'date') {
              return (
                <View style={s.dateSepWrap}>
                  <View style={[s.dateSep, { backgroundColor: C.border }]} />
                  <View style={[s.datePill, { backgroundColor: C.surface }]}>
                    <Text style={[s.dateTxt, { color: C.textSecondary }]}>{item.label}</Text>
                  </View>
                  <View style={[s.dateSep, { backgroundColor: C.border }]} />
                </View>
              );
            }
            if (item._k === 'typing') return <TypingDots avatarName={personName} color={personColor} />;
            return (
              <MessageBubble
                msg={item.msg} isSent={item.isSent}
                showAvatar={item.showAvatar} isLast={item.isLast}
                personName={personName} personColor={personColor}
              />
            );
          }}
          contentContainerStyle={[s.msgList, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <View style={[s.emptyIcon, { backgroundColor: C.primaryLight }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={36} color={C.brinjal1} />
              </View>
              <Text style={[s.emptyTitle, { color: C.text }]}>
                {isPending ? t('messages.requestPending') : t('messages.startConversation')}
              </Text>
              <Text style={[s.emptyHint, { color: C.textSecondary }]}>
                {isPending ? t('messages.acceptRequest') : t('messages.sendFirstMessage')}
              </Text>
            </View>
          }
        />

        {/* ── Input bar ── */}
        {status === 'ACCEPTED' && (
          <View style={[s.inputBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
            <View style={[s.inputWrap, { borderColor: C.border, backgroundColor: C.background }]}>
              <TextInput
                ref={inputRef}
                style={[s.input, { color: C.text }]}
                value={text}
                onChangeText={handleTextChange}
                placeholder={t('messages.typePlaceholder')}
                placeholderTextColor={C.textSecondary}
                multiline
                maxLength={1000}
                returnKeyType="default"
              />
              {text.length > 900 && (
                <Text style={[s.charCount, { color: C.textSecondary }]}>{1000 - text.length}</Text>
              )}
            </View>
            <Pressable
              style={[s.sendBtn, { backgroundColor: text.trim() ? C.brinjal1 : C.border }]}
              onPress={handleSend}
              disabled={!text.trim()}>
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  flex:      { flex: 1 },

  // Header
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  backBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerAvatar:    { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  headerAvatarTxt: { color: '#fff', fontSize: 14, fontFamily: F.extrabold },
  headerInfo:      { flex: 1 },
  headerName:      { color: '#fff', fontSize: 16, fontFamily: F.bold },
  headerSub:       { fontSize: 11, fontFamily: F.medium, marginTop: 1 },

  // Campaign banner
  campaignBar:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  campaignBarTxt: { flex: 1, fontSize: 12, fontFamily: F.semibold },

  // Request bar
  requestBar:        { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  requestBarTop:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  requestBarTxt:     { flex: 1, fontSize: 13, fontFamily: F.semibold },
  requestBarActions: { flexDirection: 'row', gap: 10 },
  declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, borderWidth: 1.5, height: 40 },
  declineTxt: { fontSize: 13, fontFamily: F.semibold },
  acceptBtn:  { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, height: 40 },
  acceptTxt:  { fontSize: 13, color: '#fff', fontFamily: F.bold },

  // Message list
  msgList: { padding: 12, paddingBottom: 8, gap: 2 },

  // Date separator
  dateSepWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 16, gap: 8 },
  dateSep:     { flex: 1, height: StyleSheet.hairlineWidth },
  datePill:    { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  dateTxt:     { fontSize: 11, fontFamily: F.medium },

  // Bubbles
  bubbleRow:         { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginVertical: 1, paddingHorizontal: 4 },
  bubbleRowSent:     { justifyContent: 'flex-end' },
  bubbleRowReceived: { justifyContent: 'flex-start' },
  msgAvatar:    { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  msgAvatarTxt: { color: '#fff', fontSize: 10, fontFamily: F.extrabold },
  avatarSpacer: { width: 28 },
  bubbleWrap:         { maxWidth: '75%' },
  bubbleWrapSent:     { alignItems: 'flex-end' },
  bubbleWrapReceived: { alignItems: 'flex-start' },
  bubble:         { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleSent:     { borderBottomRightRadius: 4 },
  bubbleReceived: { borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  bubbleTxt:  { fontSize: 15, lineHeight: 22, fontFamily: F.regular },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3, paddingHorizontal: 2 },
  bubbleTime: { fontSize: 10, fontFamily: F.regular },

  // Empty
  emptyWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 10, paddingHorizontal: 32 },
  emptyIcon:  { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontFamily: F.bold, textAlign: 'center' },
  emptyHint:  { fontSize: 13, fontFamily: F.regular, textAlign: 'center', lineHeight: 19 },

  // Input
  inputBar:  { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, paddingBottom: 16, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  inputWrap: { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8, justifyContent: 'center' },
  input:     { fontSize: 15, fontFamily: F.regular, paddingVertical: 2 },
  charCount: { fontSize: 10, fontFamily: F.regular, textAlign: 'right', marginTop: 2 },
  sendBtn:   { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
