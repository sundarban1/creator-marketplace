import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { messagingEvents } from '@/lib/messagingEvents';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { chatService } from '@/services/chat';
import { F } from '@/utilities/constants';
import type { Conversation } from '@/types';

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

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const color = avatarColor(name);
  return (
    <View style={[av.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[av.text, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
    </View>
  );
}
const av = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontWeight: '800', fontFamily: F.extrabold },
});

// ── Request Card ──────────────────────────────────────────────────────────────

function RequestCard({ conv, onRespond }: { conv: Conversation; onRespond: () => void }) {
  const C = useAppColors();
  const [acting, setActing] = useState<'accept' | 'decline' | null>(null);
  const color = avatarColor(conv.participantName);

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
    <View style={[s.reqCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      {/* Top row */}
      <View style={s.reqTop}>
        <Avatar name={conv.participantName} size={44} />
        <View style={s.reqInfo}>
          <Text style={[s.reqName, { color: C.text }]}>{conv.participantName}</Text>
          {conv.campaignTitle ? (
            <View style={[s.campaignPill, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="briefcase-outline" size={10} color="#7C3AED" />
              <Text style={s.campaignPillTxt} numberOfLines={1}>{conv.campaignTitle}</Text>
            </View>
          ) : null}
          <Text style={[s.reqTime, { color: C.textSecondary }]}>
            {formatTime(conv.lastMessageTime)}
          </Text>
        </View>
        <View style={[s.reqBadge, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[s.reqBadgeTxt, { color: '#92400E' }]}>New</Text>
        </View>
      </View>

      {/* Message preview */}
      {conv.requestMessage ? (
        <View style={[s.reqMsgBox, { backgroundColor: C.background, borderColor: C.border }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={C.textSecondary} style={{ marginTop: 2 }} />
          <Text style={[s.reqMsg, { color: C.text }]} numberOfLines={3}>{conv.requestMessage}</Text>
        </View>
      ) : (
        <View style={[s.reqMsgBox, { backgroundColor: C.background, borderColor: C.border }]}>
          <Ionicons name="person-add-outline" size={13} color={C.textSecondary} />
          <Text style={[s.reqMsgEmpty, { color: C.textSecondary }]}>Wants to connect with you</Text>
        </View>
      )}

      {/* Actions */}
      <View style={s.reqActions}>
        <Pressable
          style={[s.declineBtn, { borderColor: C.border, backgroundColor: C.background }]}
          onPress={() => respond('decline')}
          disabled={acting !== null}>
          {acting === 'decline'
            ? <ActivityIndicator size="small" color={C.textSecondary} />
            : (
              <>
                <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                <Text style={[s.declineTxt, { color: '#EF4444' }]}>Decline</Text>
              </>
            )}
        </Pressable>
        <Pressable
          style={[s.acceptBtn, { backgroundColor: color }]}
          onPress={() => respond('accept')}
          disabled={acting !== null}>
          {acting === 'accept'
            ? <ActivityIndicator size="small" color="#fff" />
            : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={s.acceptTxt}>Accept</Text>
              </>
            )}
        </Pressable>
      </View>
    </View>
  );
}

// ── Chat Row ──────────────────────────────────────────────────────────────────

function ChatRow({ conv }: { conv: Conversation }) {
  const C = useAppColors();
  const hasUnread = conv.unreadCount > 0;

  return (
    <Pressable
      style={({ pressed }) => [s.chatRow, { backgroundColor: pressed ? C.background : C.surface, borderBottomColor: C.border }]}
      onPress={() =>
        router.push({ pathname: '/(creator)/messages/[id]', params: { id: conv.id, name: conv.participantName, status: conv.status } })
      }>
      <View style={[s.unreadStripe, { backgroundColor: hasUnread ? '#0EA5E9' : 'transparent' }]} />
      <Avatar name={conv.participantName} size={48} />
      <View style={s.chatContent}>
        <View style={s.chatTop}>
          <Text style={[s.chatName, { color: C.text, fontWeight: hasUnread ? '700' : '600' }]} numberOfLines={1}>
            {conv.participantName}
          </Text>
          <Text style={[s.chatTime, { color: hasUnread ? '#0EA5E9' : C.textSecondary }]}>
            {formatTime(conv.lastMessageTime)}
          </Text>
        </View>
        {conv.campaignTitle ? (
          <View style={[s.campaignPill, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="briefcase-outline" size={10} color="#7C3AED" />
            <Text style={s.campaignPillTxt} numberOfLines={1}>{conv.campaignTitle}</Text>
          </View>
        ) : null}
        <View style={s.chatBottom}>
          <Text
            style={[s.chatLast, { color: hasUnread ? C.text : C.textSecondary, fontWeight: hasUnread ? '500' : '400' }]}
            numberOfLines={1}>
            {conv.lastMessage || 'No messages yet'}
          </Text>
          {hasUnread && (
            <View style={[s.unreadBadge, { backgroundColor: '#0EA5E9' }]}>
              <Text style={s.unreadBadgeTxt}>{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Tab = 'requests' | 'chats';

export default function CreatorMessagesScreen() {
  const C = useAppColors();
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
    const unsub = messagingEvents.subscribe(() => void load(true));
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      unsub();
    };
  }, []);

  useFocusEffect(useCallback(() => {
    messagingEvents.refresh();
    void load(true);
  }, []));

  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient
        colors={['#0c4a6e', '#0369a1', '#0EA5E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradientHeader}>
        <View style={[s.decCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[s.decCircle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />

        <View style={s.header}>
          <View>
            <Text style={s.heading}>Messages</Text>
            <Text style={s.headingSub}>
              {requests.length > 0
                ? `${requests.length} pending request${requests.length !== 1 ? 's' : ''}`
                : totalUnread > 0
                ? `${totalUnread} unread`
                : 'Your conversations'}
            </Text>
          </View>
        </View>

        {/* Tab bar inside gradient */}
        <View style={s.tabBar}>
          {(['requests', 'chats'] as Tab[]).map((t) => {
            const active = tab === t;
            const badge  = t === 'requests' ? requests.length : totalUnread;
            return (
              <Pressable
                key={t}
                style={[s.tab, active && s.tabActive]}
                onPress={() => setTab(t)}>
                <Text style={[s.tabTxt, { color: active ? '#fff' : 'rgba(255,255,255,0.65)', fontWeight: active ? '700' : '500' }]}>
                  {t === 'requests' ? 'Requests' : 'Messages'}
                </Text>
                {badge > 0 && (
                  <View style={[s.tabBadge, { backgroundColor: t === 'requests' ? '#F97316' : '#0EA5E9' }]}>
                    <Text style={s.tabBadgeTxt}>{badge}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#0EA5E9" />
        </View>
      ) : tab === 'requests' ? (
        <FlatList
          data={requests}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <RequestCard conv={item} onRespond={() => load()} />}
          contentContainerStyle={[s.requestList, requests.length === 0 && s.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0EA5E9" />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="mail-open-outline" size={34} color="#0EA5E9" />
              </View>
              <Text style={[s.emptyTitle, { color: C.text }]}>No requests yet</Text>
              <Text style={[s.emptyHint, { color: C.textSecondary }]}>
                Businesses can send you a message request from your profile.
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ChatRow conv={item} />}
          contentContainerStyle={[s.chatList, chats.length === 0 && s.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0EA5E9" />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="chatbubbles-outline" size={34} color="#0EA5E9" />
              </View>
              <Text style={[s.emptyTitle, { color: C.text }]}>No conversations yet</Text>
              <Text style={[s.emptyHint, { color: C.textSecondary }]}>Accepted requests will appear here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  gradientHeader: { borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden' },
  decCircle1:     { position: 'absolute', width: 180, height: 180, borderRadius: 90, top: -60, right: -30 },
  decCircle2:     { position: 'absolute', width: 110, height: 110, borderRadius: 55, bottom: -30, left: 10 },
  header:         { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  heading:        { fontSize: 22, fontWeight: '800', fontFamily: F.extrabold, color: '#fff' },
  headingSub:     { fontSize: 13, fontFamily: F.regular, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  tabBar:       { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  tab:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  tabActive:    { borderBottomWidth: 2, borderBottomColor: '#fff' },
  tabTxt:       { fontSize: 14, fontFamily: F.medium },
  tabBadge:     { borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  tabBadgeTxt:  { color: '#fff', fontSize: 10, fontWeight: '800', fontFamily: F.extrabold },

  // Request cards
  requestList: { padding: 16, gap: 12, paddingBottom: 40 },
  listEmpty:   { flexGrow: 1 },
  reqCard:     { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  reqTop:      { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  reqInfo:     { flex: 1, gap: 4 },
  reqName:     { fontSize: 15, fontWeight: '700', fontFamily: F.bold },
  reqTime:     { fontSize: 11, fontFamily: F.regular },
  reqBadge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  reqBadgeTxt: { fontSize: 10, fontWeight: '700', fontFamily: F.bold },
  campaignPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  campaignPillTxt: { fontSize: 10, fontWeight: '600', color: '#7C3AED', fontFamily: F.semibold, maxWidth: 160 },
  reqMsgBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 10, borderWidth: StyleSheet.hairlineWidth },
  reqMsg:      { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: F.regular },
  reqMsgEmpty: { flex: 1, fontSize: 13, fontStyle: 'italic', fontFamily: F.regular },
  reqActions:  { flexDirection: 'row', gap: 10 },
  declineBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, borderWidth: 1.5, height: 42 },
  declineTxt:  { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  acceptBtn:   { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 10, height: 42 },
  acceptTxt:   { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: F.bold },

  // Chat rows
  chatList:    { paddingBottom: 40 },
  chatRow:     { flexDirection: 'row', alignItems: 'center', paddingRight: 20, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  unreadStripe:{ width: 3, height: '100%', borderRadius: 2, position: 'absolute', left: 0 },
  chatContent: { flex: 1, gap: 3 },
  chatTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName:    { fontSize: 15, flex: 1, fontFamily: F.semibold },
  chatTime:    { fontSize: 11, fontFamily: F.medium },
  chatBottom:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chatLast:    { flex: 1, fontSize: 13, fontFamily: F.regular },
  unreadBadge: { borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  unreadBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800', fontFamily: F.extrabold },

  // Empty
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 12 },
  emptyIcon:  { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', fontFamily: F.bold, textAlign: 'center' },
  emptyHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
});
