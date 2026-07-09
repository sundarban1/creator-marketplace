import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { TabSlider } from '@/components/TabSlider';
import { EmptyState } from '@/components/EmptyState';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { messagingEvents } from '@/lib/messagingEvents';
import { getSocket } from '@/lib/socket';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { chatService } from '@/services/chat';
import { F } from '@/utilities/constants';
import type { ApiMessage } from '@/lib/api';
import type { Conversation } from '@/types';

const ACCENT = '#0EA5E9';

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

function formatTime(iso: string, t: TFn) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return t('messages.timeNow');
  if (diff < 3600000) return t('messages.timeMinutesAgo', { n: Math.floor(diff / 60000) });
  if (d.toDateString() === now.toDateString())
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return t('messages.timeYesterday');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 50 }: { name: string; size?: number }) {
  const color = avatarColor(name);
  return (
    <View style={[av.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[av.text, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
    </View>
  );
}
const av = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontWeight: '700', fontFamily: F.bold },
});

// ── Request Card ──────────────────────────────────────────────────────────────

function RequestCard({ conv, onRespond }: { conv: Conversation; onRespond: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
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
    <View style={[s.reqCard, { backgroundColor: C.surface, borderColor: C.border, shadowColor: '#000' }]}>
      {/* New badge stripe */}
      <View style={[s.reqStripe, { backgroundColor: ACCENT }]} />

      {/* Top: avatar + info + new badge */}
      <View style={s.reqTop}>
        <Avatar name={conv.participantName} size={48} />
        <View style={s.reqInfo}>
          <View style={s.reqNameRow}>
            <Text style={[s.reqName, { color: C.text }]} numberOfLines={1}>{conv.participantName}</Text>
            <View style={[s.newBadge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[s.newBadgeTxt, { color: '#92400E' }]}>New</Text>
            </View>
          </View>
          {conv.campaignTitle ? (
            <View style={[s.campaignPill, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="briefcase-outline" size={10} color={ACCENT} />
              <Text style={[s.campaignPillTxt, { color: ACCENT }]} numberOfLines={1}>{conv.campaignTitle}</Text>
            </View>
          ) : null}
          <Text style={[s.reqTime, { color: C.textSecondary }]}>
            {formatTime(conv.lastMessageTime, t)}
          </Text>
        </View>
      </View>

      {/* Message preview */}
      <View style={[s.reqMsgBox, { backgroundColor: C.background, borderColor: C.border }]}>
        <Ionicons
          name={conv.requestMessage ? 'chatbubble-ellipses-outline' : 'person-add-outline'}
          size={13}
          color={C.textSecondary}
          style={{ marginTop: 2 }}
        />
        <Text
          style={[conv.requestMessage ? s.reqMsg : s.reqMsgEmpty, { color: conv.requestMessage ? C.text : C.textSecondary }]}
          numberOfLines={3}>
          {conv.requestMessage || t('messages.wantsToConnect')}
        </Text>
      </View>

      {/* Actions */}
      <View style={s.reqActions}>
        <Pressable
          style={[s.declineBtn, { borderColor: C.border, backgroundColor: C.background }]}
          onPress={() => respond('decline')}
          disabled={acting !== null}>
          {acting === 'decline'
            ? <ActivityIndicator size="small" color="#EF4444" />
            : (
              <>
                <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                <Text style={[s.declineTxt, { color: '#EF4444' }]}>{t('messages.decline')}</Text>
              </>
            )}
        </Pressable>
        <Pressable
          style={[s.acceptBtn, { backgroundColor: ACCENT }]}
          onPress={() => respond('accept')}
          disabled={acting !== null}>
          {acting === 'accept'
            ? <ActivityIndicator size="small" color="#fff" />
            : (
              <>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={s.acceptTxt}>{t('messages.accept')}</Text>
              </>
            )}
        </Pressable>
      </View>
    </View>
  );
}

// ── Chat Card ─────────────────────────────────────────────────────────────────

function ChatCard({ conv }: { conv: Conversation }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const hasUnread = conv.unreadCount > 0;

  return (
    <Pressable
      style={({ pressed }) => [
        s.card,
        { backgroundColor: pressed ? C.surface : C.background },
      ]}
      onPress={() =>
        router.push({
          pathname: '/(creator)/messages/[id]' as never,
          params: { id: conv.id, name: conv.participantName, status: conv.status, campaignTitle: conv.campaignTitle ?? '' },
        })
      }>
      {/* Left accent stripe */}
      {hasUnread && <View style={s.stripe} />}

      {/* Avatar + badge */}
      <View style={s.avatarWrap}>
        {hasUnread && <View style={[s.avatarRing, { borderColor: ACCENT }]} pointerEvents="none" />}
        <Avatar name={conv.participantName} size={50} />
        {hasUnread && (
          <View style={[s.avatarBadge, { backgroundColor: ACCENT }]}>
            <Text style={s.avatarBadgeTxt}>{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={s.content}>
        <View style={s.rowTop}>
          <Text
            style={[s.name, { color: C.text }, hasUnread && s.nameUnread]}
            numberOfLines={1}>
            {conv.participantName}
          </Text>
          <Text style={[s.time, { color: hasUnread ? ACCENT : C.textSecondary }, hasUnread && s.timeUnread]}>
            {formatTime(conv.lastMessageTime, t)}
          </Text>
        </View>

        {conv.campaignTitle ? (
          <View style={[s.campaignPill, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="briefcase-outline" size={10} color={ACCENT} />
            <Text style={[s.campaignPillTxt, { color: ACCENT }]} numberOfLines={1}>{conv.campaignTitle}</Text>
          </View>
        ) : null}

        <View style={s.rowBottom}>
          <Text
            style={[s.preview, { color: hasUnread ? C.text : C.textSecondary }, hasUnread && s.previewUnread]}
            numberOfLines={1}>
            {conv.lastMessage || t('messages.noMessagesYet')}
          </Text>
          {!hasUnread && (
            <Ionicons name="checkmark-done-outline" size={14} color={C.textSecondary} />
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
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab]               = useState<Tab>('chats');
  const [requests, setRequests]     = useState<Conversation[]>([]);
  const [chats, setChats]           = useState<Conversation[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [pending, accepted] = await Promise.all([
        chatService.getConversations('CREATOR', 'PENDING'),
        chatService.getConversations('CREATOR', 'ACCEPTED'),
      ]);
      setRequests(pending);
      setChats(accepted.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()));
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const unsub = messagingEvents.subscribe(() => void load(true));
    const socket = getSocket();

    // Real-time: update conversation in-place instead of full reload
    const onMessageNew = (data: { conversationId: string; message: ApiMessage }) => {
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === data.conversationId);
        if (idx === -1) { void load(true); return prev; }
        const updated = [...prev];
        const conv = { ...updated[idx]! };
        conv.lastMessage = data.message.content;
        conv.lastMessageTime = data.message.createdAt;
        if (data.message.senderId !== user?.id) {
          conv.unreadCount = (conv.unreadCount ?? 0) + 1;
        }
        updated.splice(idx, 1);
        updated.unshift(conv);
        return updated;
      });
    };
    const onConvUpdate = () => void load(true);

    socket?.on('conversation:update', onConvUpdate);
    socket?.on('message:new', onMessageNew);
    return () => {
      unsub();
      socket?.off('conversation:update', onConvUpdate);
      socket?.off('message:new', onMessageNew);
    };
  }, [user?.id]);

  useFocusEffect(useCallback(() => {
    messagingEvents.refresh();
    void load(true);
  }, []));

  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* ── Gradient header ── */}
      <LinearGradient
        colors={['#312e81', '#4f46e5', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradientHeader}>

        <View style={s.header}>
          <View>
            <Text style={s.heading}>{t('messages.heading')}</Text>
            <Text style={s.headingSub}>
              {requests.length > 0
                ? requests.length !== 1
                  ? t('messages.pendingRequests', { n: requests.length })
                  : t('messages.pendingRequest', { n: requests.length })
                : totalUnread > 0
                ? t('messages.unreadCount', { n: totalUnread })
                : t('messages.yourConversations')}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Tab slider ── */}
      <TabSlider
        justify
        tabs={[
          { key: 'chats',    label: t('messages.tabMessages'), count: totalUnread,      color: '#4f46e5' },
          { key: 'requests', label: t('messages.tabRequests'), count: requests.length,  color: '#4f46e5' },
        ]}
        active={tab}
        onChange={(key) => setTab(key as Tab)}
      />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : tab === 'requests' ? (
        <FlatList
          data={requests}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <RequestCard conv={item} onRespond={() => load()} />}
          contentContainerStyle={[s.reqList, requests.length === 0 && s.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              faIcon="envelope-open"
              title={t('messages.noRequestsYet')}
              subtitle={t('messages.requestsFromBusinesses')}
            />
          }
        />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ChatCard conv={item} />}
          contentContainerStyle={[s.chatList, chats.length === 0 && s.listEmpty]}
          ItemSeparatorComponent={() => <View style={[s.sep, { backgroundColor: C.border }]} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              faIcon="comment-dots"
              title={t('messages.noConversationsYet')}
              subtitle={t('messages.acceptedRequestsHere')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  gradientHeader: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: 'hidden' },
  header:         { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  heading:        { fontSize: 20, fontWeight: '700', fontFamily: F.bold, color: '#fff', lineHeight: 24 },
  headingSub:     { fontSize: 13, fontFamily: F.regular, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Request list
  reqList:  { padding: 16, gap: 12, paddingBottom: 40 },
  listEmpty:{ flexGrow: 1 },

  // Request card
  reqCard:     { borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 12, shadowRadius: 6, shadowOpacity: 0.04, shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden' },
  reqStripe:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 14, borderBottomLeftRadius: 14 },
  reqTop:      { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  reqInfo:     { flex: 1, gap: 4 },
  reqNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqName:     { flex: 1, fontSize: 15, fontWeight: '700', fontFamily: F.bold },
  newBadge:    { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  newBadgeTxt: { fontSize: 10, fontWeight: '700', fontFamily: F.bold },
  reqTime:     { fontSize: 11, fontFamily: F.regular },
  reqMsgBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  reqMsg:      { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: F.regular },
  reqMsgEmpty: { flex: 1, fontSize: 13, fontStyle: 'italic', fontFamily: F.regular },
  reqActions:  { flexDirection: 'row', gap: 10 },
  declineBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, borderWidth: 1.5, height: 44 },
  declineTxt:  { fontSize: 13, fontWeight: '600', fontFamily: F.semibold },
  acceptBtn:   { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, height: 44 },
  acceptTxt:   { fontSize: 13, fontWeight: '700', color: '#fff', fontFamily: F.bold },

  // Chat list
  chatList: { paddingBottom: 40 },
  sep:      { height: StyleSheet.hairlineWidth, backgroundColor: 'transparent', marginLeft: 82 },

  // Chat card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  stripe:      { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, backgroundColor: ACCENT, borderRadius: 2 },
  avatarWrap:  { position: 'relative' },
  avatarRing:  { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 29, borderWidth: 2 },
  avatarBadge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  avatarBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700', fontFamily: F.bold, lineHeight: 12 },
  content:     { flex: 1, gap: 3 },
  rowTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name:        { flex: 1, fontSize: 15, fontFamily: F.semibold },
  nameUnread:  { fontFamily: F.bold, fontWeight: '700' },
  time:        { fontSize: 11, fontFamily: F.regular, flexShrink: 0 },
  timeUnread:  { fontFamily: F.semibold, fontWeight: '600' },
  campaignPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  campaignPillTxt: { fontSize: 10, fontWeight: '600', fontFamily: F.semibold, maxWidth: 180 },
  rowBottom:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  preview:     { flex: 1, fontSize: 13, fontFamily: F.regular },
  previewUnread: { fontFamily: F.medium },

});
