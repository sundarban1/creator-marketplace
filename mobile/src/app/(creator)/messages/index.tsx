import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { messagingEvents } from '@/lib/messagingEvents';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppColors } from '@/context/ThemeContext';
import { chatService } from '@/services/chat';
import { F } from '@/utilities/constants';
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

// ── Request Row ────────────────────────────────────────────────────────────────

function RequestRow({ conv, onRespond }: { conv: Conversation; onRespond: () => void }) {
  const C = useAppColors();
  const [acting, setActing] = useState<'accept' | 'decline' | null>(null);

  async function respond(action: 'accept' | 'decline') {
    setActing(action);
    try {
      await chatService.respondToRequest(conv.id, action);
      onRespond();
      messagingEvents.refresh();
    } finally {
      setActing(null);
    }
  }

  return (
    <View style={[s.requestCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={s.requestTop}>
        <Avatar name={conv.participantName} size={42} C={C} />
        <View style={s.requestInfo}>
          <Text style={[s.requestName, { color: C.text }]}>{conv.participantName}</Text>
          {conv.campaignTitle && (
            <Text style={[s.requestCampaign, { color: C.brinjal1 }]} numberOfLines={1}>
              {conv.campaignTitle}
            </Text>
          )}
          <Text style={[s.requestTime, { color: C.textSecondary }]}>
            {new Date(conv.lastMessageTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      {conv.requestMessage ? (
        <View style={[s.requestMsgBox, { backgroundColor: C.background }]}>
          <Text style={[s.requestMsg, { color: C.text }]} numberOfLines={3}>{conv.requestMessage}</Text>
        </View>
      ) : (
        <Text style={[s.requestMsgEmpty, { color: C.textSecondary }]}>Wants to connect with you</Text>
      )}

      <View style={s.requestActions}>
        <Pressable
          style={[s.declineBtn, { borderColor: C.border }]}
          onPress={() => respond('decline')}
          disabled={acting !== null}>
          <Text style={[s.declineTxt, { color: C.textSecondary }]}>
            {acting === 'decline' ? '…' : 'Decline'}
          </Text>
        </Pressable>
        <Pressable
          style={[s.acceptBtn, { backgroundColor: C.brinjal1 }]}
          onPress={() => respond('accept')}
          disabled={acting !== null}>
          <Text style={s.acceptTxt}>
            {acting === 'accept' ? '…' : 'Accept'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Chat Row ──────────────────────────────────────────────────────────────────

function ChatRow({ conv }: { conv: Conversation }) {
  const C = useAppColors();
  const time = new Date(conv.lastMessageTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <Pressable
      style={({ pressed }) => [s.chatRow, { backgroundColor: pressed ? C.background : C.surface, borderBottomColor: C.border }]}
      onPress={() => router.push({ pathname: '/(creator)/messages/[id]', params: { id: conv.id, name: conv.participantName, status: conv.status } })}>
      <Avatar name={conv.participantName} C={C} />
      <View style={s.chatContent}>
        <View style={s.chatTop}>
          <Text style={[s.chatName, { color: C.text }]}>{conv.participantName}</Text>
          <Text style={[s.chatTime, { color: C.textSecondary }]}>{time}</Text>
        </View>
        {conv.campaignTitle && (
          <Text style={[s.chatCampaign, { color: C.brinjal1 }]} numberOfLines={1}>{conv.campaignTitle}</Text>
        )}
        <Text style={[s.chatLast, { color: C.textSecondary }]} numberOfLines={1}>{conv.lastMessage}</Text>
      </View>
      {conv.unreadCount > 0 && (
        <View style={[s.badge, { backgroundColor: C.brinjal1 }]}>
          <Text style={s.badgeTxt}>{conv.unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

type Tab = 'requests' | 'chats';

export default function CreatorMessagesScreen() {
  const { user } = useAuth();
  const C        = useAppColors();
  const [tab, setTab]           = useState<Tab>('requests');
  const [requests, setRequests] = useState<Conversation[]>([]);
  const [chats, setChats]       = useState<Conversation[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [pending, accepted] = await Promise.all([
        chatService.getConversations('CREATOR', 'PENDING'),
        chatService.getConversations('CREATOR', 'ACCEPTED'),
      ]);
      setRequests(pending);
      setChats(accepted);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 15000);
    // Reload conversations whenever a markSeen fires from the chat screen
    const unsub = messagingEvents.subscribe(() => void load(true));
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      unsub();
    };
  }, []);

  // On focus: propagate badge refresh to layout AND reload rows so unreadCount clears
  useFocusEffect(useCallback(() => {
    messagingEvents.refresh();
    void load(true);
  }, []));

  const tabCount = requests.length;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient colors={['#0EA5E9', '#6366F1']} start={{x:0,y:0}} end={{x:1,y:1}} style={s.gradientHeader}>
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.heading, { color: '#fff' }]}>Messages</Text>
        </View>

        {/* Tabs */}
        <View style={[s.tabs, { borderBottomColor: 'rgba(255,255,255,0.3)' }]}>
          {(['requests', 'chats'] as Tab[]).map((t) => (
            <Pressable key={t} style={[s.tab, tab === t && { borderBottomColor: '#fff', borderBottomWidth: 2 }]} onPress={() => setTab(t)}>
              <Text style={[s.tabTxt, { color: tab === t ? '#fff' : 'rgba(255,255,255,0.65)', fontWeight: tab === t ? '700' : '500' }]}>
                {t === 'requests' ? 'Requests' : 'Messages'}
              </Text>
              {t === 'requests' && tabCount > 0 && (
                <View style={[s.tabBadge, { backgroundColor: '#F97316' }]}>
                  <Text style={s.tabBadgeTxt}>{tabCount}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* Content */}
      {tab === 'requests' ? (
        <FlatList
          data={loading ? [] : requests}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <RequestRow conv={item} onRespond={() => load()} />}
          contentContainerStyle={s.requestList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? null : (
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>💬</Text>
                <Text style={[s.emptyTitle, { color: C.text }]}>No requests yet</Text>
                <Text style={[s.emptyHint, { color: C.textSecondary }]}>Businesses can send you a message request from your profile.</Text>
              </View>
            )
          }
        />
      ) : (
        <FlatList
          data={loading ? [] : chats}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ChatRow conv={item} />}
          contentContainerStyle={s.chatList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? null : (
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>✉️</Text>
                <Text style={[s.emptyTitle, { color: C.text }]}>No conversations yet</Text>
                <Text style={[s.emptyHint, { color: C.textSecondary }]}>Accepted requests will appear here.</Text>
              </View>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  gradientHeader: { paddingBottom: 0, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' },
  header:       { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
  heading:      { fontSize: 22, fontWeight: '800', fontFamily: F.extrabold },

  tabs:      { flexDirection: 'row', borderBottomWidth: 1 },
  tab:       { flex: 1, alignItems: 'center', paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabTxt:    { fontSize: 14, fontFamily: F.medium },
  tabBadge:  { borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  tabBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800', fontFamily: F.extrabold },

  // Requests
  requestList: { padding: 16, gap: 12, paddingBottom: 40 },
  requestCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  requestTop:  { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  requestInfo: { flex: 1, gap: 3 },
  requestName: { fontSize: 15, fontWeight: '700', fontFamily: F.bold },
  requestCampaign: { fontSize: 12, fontWeight: '600', fontFamily: F.semibold },
  requestTime: { fontSize: 11, fontFamily: F.regular },
  requestMsgBox:   { borderRadius: 10, padding: 12 },
  requestMsg:      { fontSize: 14, lineHeight: 20, fontFamily: F.regular },
  requestMsgEmpty: { fontSize: 13, fontStyle: 'italic', fontFamily: F.regular },
  requestActions:  { flexDirection: 'row', gap: 10 },
  declineBtn: { flex: 1, borderRadius: 10, borderWidth: 1.5, height: 42, justifyContent: 'center', alignItems: 'center' },
  declineTxt: { fontSize: 14, fontWeight: '600', fontFamily: F.semibold },
  acceptBtn:  { flex: 2, borderRadius: 10, height: 42, justifyContent: 'center', alignItems: 'center' },
  acceptTxt:  { fontSize: 14, fontWeight: '700', color: '#fff', fontFamily: F.bold },

  // Chats
  chatList:    { paddingBottom: 40 },
  chatRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14, borderBottomWidth: 1 },
  chatContent: { flex: 1, gap: 3 },
  chatTop:     { flexDirection: 'row', justifyContent: 'space-between' },
  chatName:    { fontSize: 15, fontWeight: '600', fontFamily: F.semibold },
  chatTime:    { fontSize: 11, fontFamily: F.regular },
  chatCampaign:{ fontSize: 11, fontWeight: '500', fontFamily: F.medium },
  chatLast:    { fontSize: 13, fontFamily: F.regular },
  badge:       { borderRadius: 12, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeTxt:    { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: F.bold },

  // Empty
  empty:      { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: '700', fontFamily: F.bold },
  emptyHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
});
