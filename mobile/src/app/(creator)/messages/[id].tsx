import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { chatService } from '@/services/chat';
import type { Message } from '@/types';

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function MessageBubble({ msg, isSent }: { msg: Message; isSent: boolean }) {
  const C = useAppColors();
  return (
    <View style={[styles.bubbleWrap, isSent ? styles.bubbleWrapSent : styles.bubbleWrapReceived]}>
      <View style={[styles.bubble, isSent ? { backgroundColor: C.brinjal1, borderBottomRightRadius: 4 } : { backgroundColor: C.surface, borderBottomLeftRadius: 4 }]}>
        <Text style={[styles.bubbleText, { color: isSent ? '#fff' : C.text }]}>{msg.text}</Text>
      </View>
      <Text style={[styles.bubbleTime, { color: C.textSecondary }]}>{formatTime(msg.timestamp)}</Text>
    </View>
  );
}

export default function ChatRoomScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { user } = useAuth();
  const { t } = useLanguage();
  const C = useAppColors();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const isSending = useRef(false);

  const participantName = name ?? 'Chat';

  useEffect(() => {
    chatService.getMessages(id).then((msgs) => setMessages(msgs));
  }, [id]);

  async function handleSend() {
    if (!text.trim() || !user || isSending.current) return;
    isSending.current = true;
    setSending(true);
    try {
      const msg = await chatService.sendMessage(id, text.trim(), user.id);
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
      setText('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } finally {
      isSending.current = false;
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: C.brinjal1 }]}>‹</Text>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: C.text }]}>{participantName}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <FlatList
          style={styles.flex}
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <MessageBubble msg={item} isSent={item.senderId === user?.id} />}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={[styles.empty, { color: C.textSecondary }]}>{t('messages.startConversation')}</Text>}
        />
        <View style={[styles.inputBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
          <TextInput
            style={[styles.input, { borderColor: C.border, color: C.text, backgroundColor: C.background }]}
            value={text}
            onChangeText={setText}
            placeholder={t('messages.typePlaceholder')}
            placeholderTextColor={C.textSecondary}
            multiline
            maxLength={1000}
          />
          <Pressable
            style={[styles.sendBtn, { backgroundColor: C.brinjal1 }, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}>
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 4 },
  backText: { fontSize: 28, lineHeight: 30 },
  headerInfo: { flex: 1, gap: 2 },
  headerName: { fontSize: 16, fontWeight: '700' },
  onlineLabel: { fontSize: 12 },
  messageList: { padding: 16, gap: 10, flexGrow: 1 },
  bubbleWrap: { maxWidth: '75%', gap: 3 },
  bubbleWrapSent: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubbleWrapReceived: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 11, paddingHorizontal: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, gap: 10 },
  input: { flex: 1, minHeight: 40, maxHeight: 120, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
