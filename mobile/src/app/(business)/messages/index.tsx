import { router, useFocusEffect } from 'expo-router';
import { messagingEvents } from '@/lib/messagingEvents';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { chatService } from '@/services/chat';
import type { Conversation } from '@/types';

function Avatar({ name, size = 44, C }: { name: string; size?: number; C: ReturnType<typeof useAppColors> }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={[av.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: C.brinjal1 }]}>
      <Text style={[av.text, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}
const av = StyleSheet.create({ wrap: { justifyContent: 'center', alignItems: 'center' }, text: { color: '#fff', fontWeight: '700' } });

function ConversationRow({ conv }: { conv: Conversation }) {
  const C    = useAppColors();
  const time = new Date(conv.lastMessageTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const statusConfig = {
    PENDING:  { label: 'Pending',  bg: '#FEF3C7', color: '#92400E' },
    ACCEPTED: { label: 'Active',   bg: '#DCFCE7', color: '#166534' },
    DECLINED: { label: 'Declined', bg: '#FEE2E2', color: '#991B1B' },
  }[conv.status];

  return (
    <Pressable
      style={({ pressed }) => [s.row, { backgroundColor: pressed ? C.background : C.surface, borderBottomColor: C.border }]}
      onPress={() =>
        router.push({
          pathname: '/(business)/messages/[id]',
          params: { id: conv.id, name: conv.participantName, status: conv.status },
        })
      }>
      <Avatar name={conv.participantName} C={C} />
      <View style={s.content}>
        <View style={s.rowTop}>
          <Text style={[s.name, { color: C.text }]}>{conv.participantName}</Text>
          <Text style={[s.time, { color: C.textSecondary }]}>{time}</Text>
        </View>
        {conv.campaignTitle && (
          <Text style={[s.campaign, { color: C.brinjal1 }]} numberOfLines={1}>{conv.campaignTitle}</Text>
        )}
        <View style={s.rowBottom}>
          <Text style={[s.lastMsg, { color: C.textSecondary, flex: 1 }]} numberOfLines={1}>
            {conv.lastMessage || 'No messages yet'}
          </Text>
          <View style={[s.statusPill, { backgroundColor: statusConfig.bg }]}>
            <Text style={[s.statusTxt, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function BusinessChatListScreen() {
  const { user } = useAuth();
  const C        = useAppColors();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      // Load all non-declined conversations for business
      const [accepted, pending] = await Promise.all([
        chatService.getConversations('BUSINESS', 'ACCEPTED'),
        chatService.getConversations('BUSINESS', 'PENDING'),
      ]);
      setConversations([...accepted, ...pending]);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useFocusEffect(() => {
    messagingEvents.refresh();
  });

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <View style={s.header}>
        <Text style={[s.heading, { color: C.text }]}>Messages</Text>
      </View>

      <FlatList
        data={loading ? [] : conversations}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => <ConversationRow conv={item} />}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? null : (
            <View style={s.empty}>
              <Text style={s.emptyEmoji}>💬</Text>
              <Text style={[s.emptyTitle, { color: C.text }]}>No conversations yet</Text>
              <Text style={[s.emptyHint, { color: C.textSecondary }]}>
                Visit a creator's profile and tap "Message" to start a conversation.
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header:    { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  heading:   { fontSize: 22, fontWeight: '800' },
  list:      { paddingBottom: 32 },

  row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14, borderBottomWidth: 1 },
  content: { flex: 1, gap: 3 },
  rowTop:  { flexDirection: 'row', justifyContent: 'space-between' },
  name:    { fontSize: 15, fontWeight: '600' },
  time:    { fontSize: 11 },
  campaign:{ fontSize: 11, fontWeight: '500' },
  rowBottom:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lastMsg:     { fontSize: 13 },
  statusPill:  { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt:   { fontSize: 11, fontWeight: '700' },

  empty:      { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
