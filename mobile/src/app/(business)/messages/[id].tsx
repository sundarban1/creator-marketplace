import { router, useLocalSearchParams } from 'expo-router';
import { messagingEvents } from '@/lib/messagingEvents';
import { BackButton } from '@/components/BackButton';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { chatService } from '@/services/chat';
import { F } from '@/utilities/constants';
import type { Message } from '@/types';

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function MessageBubble({ msg, isSent }: { msg: Message; isSent: boolean }) {
  const C = useAppColors();
  return (
    <View style={[s.bubbleWrap, isSent ? s.bubbleWrapSent : s.bubbleWrapReceived]}>
      <View style={[s.bubble, isSent
        ? { backgroundColor: C.brinjal1, borderBottomRightRadius: 4 }
        : { backgroundColor: C.surface,  borderBottomLeftRadius:  4 }]}>
        <Text style={[s.bubbleTxt, { color: isSent ? '#fff' : C.text }]}>{msg.text}</Text>
      </View>
      <Text style={[s.bubbleTime, { color: C.textSecondary }]}>{formatTime(msg.timestamp)}</Text>
    </View>
  );
}

export default function BusinessChatRoomScreen() {
  const { id, name, status: urlStatus } = useLocalSearchParams<{ id: string; name?: string; status?: string }>();
  const { user } = useAuth();
  const { t }    = useLanguage();
  const C        = useAppColors();

  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus]     = useState<'PENDING' | 'ACCEPTED' | 'DECLINED'>(
    (urlStatus as 'PENDING' | 'ACCEPTED' | 'DECLINED') ?? 'ACCEPTED',
  );
  const [text, setText]     = useState('');
  const [sending, setSending] = useState(false);
  const listRef    = useRef<FlatList>(null);
  const isSending  = useRef(false);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset everything when conversation changes (id is unique per conv via getId in layout)
  useEffect(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
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
      pollRef.current = setInterval(async () => {
        const msgs = await chatService.getMessages(id).catch(() => null);
        if (!msgs) return;
        setMessages((prev) => {
          if (msgs.length > prev.length) {
            chatService.markSeen(id).then(() => messagingEvents.refresh()).catch(() => null);
          }
          return msgs;
        });
      }, 4000);
    }

    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
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
        <View style={s.headerInfo}>
          <Text style={[s.headerName, { color: C.text }]} numberOfLines={1}>{name ?? 'Chat'}</Text>
          {isPending  && <Text style={[s.headerSub, { color: '#F59E0B' }]}>Request sent — waiting for acceptance</Text>}
          {isDeclined && <Text style={[s.headerSub, { color: '#EF4444' }]}>Request declined</Text>}
        </View>
      </View>

      {/* Pending notice */}
      {isPending && (
        <View style={[s.pendingBanner, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[s.pendingTxt, { color: '#92400E' }]}>
            ⏳  Your message request is waiting for {name ?? 'the creator'} to accept.
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
            <Text style={[s.empty, { color: C.textSecondary }]}>
              {isPending ? 'Your request will appear here once accepted.' : t('messages.startConversation')}
            </Text>
          }
        />

        {/* Input — shown only when ACCEPTED */}
        {status === 'ACCEPTED' && (
          <View style={[s.inputBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
            <TextInput
              style={[s.input, { borderColor: C.border, color: C.text, backgroundColor: C.background }]}
              value={text}
              onChangeText={setText}
              placeholder={t('messages.typePlaceholder')}
              placeholderTextColor={C.textSecondary}
              multiline
              maxLength={1000}
            />
            <Pressable
              style={[s.sendBtn, { backgroundColor: C.brinjal1 }, (!text.trim() || sending) && s.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}>
              <Text style={s.sendTxt}>↑</Text>
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

  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  headerInfo: { flex: 1, gap: 2 },
  headerName: { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  headerSub:  { fontSize: 12, fontFamily: F.regular },

  pendingBanner: { paddingHorizontal: 16, paddingVertical: 10 },
  pendingTxt:    { fontSize: 13, fontWeight: '500', lineHeight: 18, fontFamily: F.medium },

  msgList:     { padding: 16, gap: 10, flexGrow: 1 },
  bubbleWrap:  { maxWidth: '75%', gap: 3 },
  bubbleWrapSent:     { alignSelf: 'flex-end',   alignItems: 'flex-end' },
  bubbleWrapReceived: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble:     { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleTxt:  { fontSize: 15, lineHeight: 21, fontFamily: F.regular },
  bubbleTime: { fontSize: 11, paddingHorizontal: 4, fontFamily: F.regular },
  empty:      { textAlign: 'center', marginTop: 40, fontSize: 14, fontFamily: F.regular },

  inputBar:        { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, gap: 10 },
  input:           { flex: 1, minHeight: 40, maxHeight: 120, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, fontFamily: F.regular },
  sendBtn:         { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendTxt:         { color: '#fff', fontSize: 18, fontWeight: '700', fontFamily: F.bold },
});
