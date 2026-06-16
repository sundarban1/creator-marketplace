import { router, useLocalSearchParams } from 'expo-router';
import { messagingEvents } from '@/lib/messagingEvents';
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

export default function CreatorChatRoomScreen() {
  const { id, name, status: initStatus } = useLocalSearchParams<{ id: string; name?: string; status?: string }>();
  const { user } = useAuth();
  const { t }    = useLanguage();
  const C        = useAppColors();

  const [messages, setMessages]     = useState<Message[]>([]);
  const [status, setStatus]         = useState<'PENDING' | 'ACCEPTED' | 'DECLINED'>(
    (initStatus as any) ?? 'ACCEPTED',
  );
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const [acting, setActing]         = useState<'accept' | 'decline' | null>(null);
  const listRef   = useRef<FlatList>(null);
  const isSending = useRef(false);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  function startPolling() {
    pollRef.current = setInterval(async () => {
      const msgs = await chatService.getMessages(id).catch(() => null);
      if (msgs) setMessages(msgs);
    }, 4000);
  }

  useEffect(() => {
    chatService.getMessages(id).then((msgs) => {
      setMessages(msgs);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    });
    if (status === 'ACCEPTED') {
      chatService.markSeen(id).then(() => messagingEvents.refresh()).catch(() => null);
      startPolling();
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [id]);

  async function handleRespond(action: 'accept' | 'decline') {
    setActing(action);
    try {
      await chatService.respondToRequest(id, action);
      setStatus(action === 'accept' ? 'ACCEPTED' : 'DECLINED');
      if (action === 'accept') {
        chatService.markSeen(id).then(() => messagingEvents.refresh()).catch(() => null);
        startPolling();
      } else {
        messagingEvents.refresh();
        router.back();
      }
    } finally {
      setActing(null);
    }
  }

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

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backTxt, { color: C.brinjal1 }]}>‹</Text>
        </Pressable>
        <View style={s.headerInfo}>
          <Text style={[s.headerName, { color: C.text }]}>{name ?? 'Chat'}</Text>
          {status === 'PENDING' && (
            <Text style={[s.headerSub, { color: '#F59E0B' }]}>Request pending</Text>
          )}
        </View>
      </View>

      {/* Accept / Decline bar for PENDING */}
      {status === 'PENDING' && (
        <View style={[s.requestBar, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <Text style={[s.requestBarTxt, { color: C.text }]}>
            Wants to start a conversation with you
          </Text>
          <View style={s.requestBarActions}>
            <Pressable
              style={[s.declineBtn, { borderColor: C.border }]}
              onPress={() => handleRespond('decline')}
              disabled={acting !== null}>
              <Text style={[s.declineTxt, { color: C.textSecondary }]}>
                {acting === 'decline' ? '…' : 'Decline'}
              </Text>
            </Pressable>
            <Pressable
              style={[s.acceptBtn, { backgroundColor: C.brinjal1 }]}
              onPress={() => handleRespond('accept')}
              disabled={acting !== null}>
              <Text style={s.acceptTxt}>
                {acting === 'accept' ? '…' : 'Accept'}
              </Text>
            </Pressable>
          </View>
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
              {status === 'PENDING' ? 'Accept the request to start chatting.' : t('messages.startConversation')}
            </Text>
          }
        />

        {/* Input — only shown when ACCEPTED */}
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
  backBtn:    { padding: 4 },
  backTxt:    { fontSize: 28, lineHeight: 30 },
  headerInfo: { flex: 1, gap: 2 },
  headerName: { fontSize: 16, fontWeight: '700' },
  headerSub:  { fontSize: 12 },

  requestBar:        { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  requestBarTxt:     { fontSize: 13, fontWeight: '500' },
  requestBarActions: { flexDirection: 'row', gap: 10 },
  declineBtn: { flex: 1, borderRadius: 10, borderWidth: 1.5, height: 40, justifyContent: 'center', alignItems: 'center' },
  declineTxt: { fontSize: 13, fontWeight: '600' },
  acceptBtn:  { flex: 2, borderRadius: 10, height: 40, justifyContent: 'center', alignItems: 'center' },
  acceptTxt:  { fontSize: 13, fontWeight: '700', color: '#fff' },

  msgList:     { padding: 16, gap: 10, flexGrow: 1 },
  bubbleWrap:  { maxWidth: '75%', gap: 3 },
  bubbleWrapSent:     { alignSelf: 'flex-end',   alignItems: 'flex-end' },
  bubbleWrapReceived: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble:     { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleTxt:  { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 11, paddingHorizontal: 4 },
  empty:      { textAlign: 'center', marginTop: 40, fontSize: 14 },

  inputBar:       { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, gap: 10 },
  input:          { flex: 1, minHeight: 40, maxHeight: 120, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  sendBtn:        { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled:{ opacity: 0.4 },
  sendTxt:        { color: '#fff', fontSize: 18, fontWeight: '700' },
});
