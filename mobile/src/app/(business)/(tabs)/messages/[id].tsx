import { router, useLocalSearchParams } from 'expo-router';
import { messagingEvents } from '@/lib/messagingEvents';
import { BackButton } from '@/components/BackButton';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
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
import type { ApiMessage } from '@/lib/api';
import { F } from '@/utilities/constants';
import type { Message } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#7C3AED', '#0EA5E9', '#059669', '#D97706', '#EC4899', '#06B6D4', '#EF4444', '#8B5CF6'];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ── Message Bubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg, isSent }: { msg: Message; isSent: boolean }) {
  const C = useAppColors();
  return (
    <View style={[s.bubbleWrap, isSent ? s.bubbleWrapSent : s.bubbleWrapReceived]}>
      <View
        style={[
          s.bubble,
          isSent
            ? { backgroundColor: '#7C3AED', borderBottomRightRadius: 4 }
            : { backgroundColor: C.surface, borderBottomLeftRadius: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
        ]}>
        <Text style={[s.bubbleTxt, { color: isSent ? '#fff' : C.text }]}>{msg.text}</Text>
      </View>
      <Text style={[s.bubbleTime, { color: C.textSecondary }]}>{formatTime(msg.timestamp)}</Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function BusinessChatRoomScreen() {
  const { id, name, status: urlStatus, focusInput } = useLocalSearchParams<{ id: string; name?: string; status?: string; focusInput?: string }>();
  const { user } = useAuth();
  const { t }    = useLanguage();
  const C        = useAppColors();

  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus]     = useState<'PENDING' | 'ACCEPTED' | 'DECLINED'>(
    (urlStatus as 'PENDING' | 'ACCEPTED' | 'DECLINED') ?? 'ACCEPTED',
  );
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);
  const listRef    = useRef<FlatList>(null);
  const inputRef   = useRef<TextInput>(null);
  const isSending  = useRef(false);

  const personName  = name ?? 'Chat';
  const personColor = avatarColor(personName);

  useEffect(() => {
    setMessages([]);
    setText('');

    const convStatus = (urlStatus as 'PENDING' | 'ACCEPTED' | 'DECLINED') ?? 'ACCEPTED';
    setStatus(convStatus);

    if (!id) return;

    chatService.getMessages(id).then((msgs) => {
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    });

    if (convStatus === 'ACCEPTED') {
      chatService.markSeen(id).then(() => messagingEvents.refresh()).catch(() => null);
    }

    if (focusInput === 'true' && convStatus === 'ACCEPTED') {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [id]);

  // Real-time: append incoming messages via WebSocket instead of polling
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (data: { conversationId: string; message: ApiMessage }) => {
      if (data.conversationId !== id) return;
      const msg = toMessage(data.message);
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
      chatService.markSeen(id).then(() => messagingEvents.refresh()).catch(() => null);
    };
    socket.on('message:new', handler);
    return () => { socket.off('message:new', handler); };
  }, [id]);

  async function handleSend() {
    if (!text.trim() || isSending.current) return;
    isSending.current = true;
    setSending(true);
    try {
      const msg = await chatService.sendMessage(id, text.trim());
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } finally {
      isSending.current = false;
      setSending(false);
    }
  }

  const isPending  = status === 'PENDING';
  const isDeclined = status === 'DECLINED';

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <BackButton fallback="/(business)/messages" />
        {/* Mini avatar */}
        <View style={[s.headerAvatar, { backgroundColor: personColor }]}>
          <Text style={s.headerAvatarTxt}>{initials(personName)}</Text>
        </View>
        <View style={s.headerInfo}>
          <Text style={[s.headerName, { color: C.text }]} numberOfLines={1}>{personName}</Text>
          {isPending  && <Text style={[s.headerStatus, { color: '#D97706' }]}>{`⏳ ${t('messages.waitingResponse')}`}</Text>}
          {isDeclined && <Text style={[s.headerStatus, { color: '#EF4444' }]}>{t('messages.requestDeclined')}</Text>}
          {!isPending && !isDeclined && <Text style={[s.headerStatus, { color: '#16A34A' }]}>{t('messages.active')}</Text>}
        </View>
      </View>

      {/* Pending notice */}
      {isPending && (
        <View style={[s.pendingBanner, { backgroundColor: '#FEF3C7', borderBottomColor: '#FDE68A' }]}>
          <Ionicons name="time-outline" size={16} color="#92400E" />
          <Text style={[s.pendingTxt, { color: '#92400E' }]}>
            {t('messages.pendingNotice', { name: personName })}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <FlatList
          style={s.flex}
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble msg={item} isSent={item.senderId === user?.id} />}
          contentContainerStyle={s.msgList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <View style={[s.emptyIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={32} color="#7C3AED" />
              </View>
              <Text style={[s.emptyTxt, { color: C.textSecondary }]}>
                {isPending
                  ? t('messages.requestWillAppear')
                  : t('messages.startConversation')}
              </Text>
            </View>
          }
        />

        {/* Input bar — shown only when ACCEPTED */}
        {status === 'ACCEPTED' && (
          <View style={[s.inputBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
            <TextInput
              ref={inputRef}
              style={[s.input, { borderColor: C.border, color: C.text, backgroundColor: C.background }]}
              value={text}
              onChangeText={setText}
              placeholder={t('messages.typePlaceholder')}
              placeholderTextColor={C.textSecondary}
              multiline
              maxLength={1000}
            />
            <Pressable
              style={[s.sendBtn, { backgroundColor: text.trim() && !sending ? '#7C3AED' : C.border }]}
              onPress={handleSend}
              disabled={!text.trim() || sending}>
              {sending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="send" size={18} color="#fff" />}
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

  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  headerAvatar:    { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  headerAvatarTxt: { color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: F.extrabold },
  headerInfo:      { flex: 1, gap: 1 },
  headerName:      { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  headerStatus:    { fontSize: 11, fontFamily: F.medium },

  pendingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  pendingTxt:    { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18, fontFamily: F.medium },

  msgList:     { padding: 16, gap: 6, flexGrow: 1 },
  bubbleWrap:  { maxWidth: '78%', gap: 3 },
  bubbleWrapSent:     { alignSelf: 'flex-end',   alignItems: 'flex-end' },
  bubbleWrapReceived: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble:      { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleTxt:   { fontSize: 15, lineHeight: 22, fontFamily: F.regular },
  bubbleTime:  { fontSize: 10, paddingHorizontal: 4, fontFamily: F.regular },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  emptyTxt:  { textAlign: 'center', fontSize: 14, fontFamily: F.regular, paddingHorizontal: 32, lineHeight: 20 },

  inputBar:  { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  input:     { flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: F.regular },
  sendBtn:   { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
});
