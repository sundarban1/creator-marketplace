import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { TabSlider } from '@/components/TabSlider';
import { EmptyState } from '@/components/EmptyState';
import { SwipeableChatRow } from '@/components/SwipeableChatRow';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import {
  ActivityIndicator,
  Alert,
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
import { GRADIENTS, F, RADIUS, SHADOW } from '@/utilities/constants';
import { TabColors } from '@/utilities/tabColors';
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

function Avatar({ name, imageUrl, size = 50, role }: { name: string; imageUrl?: string | null; size?: number; role?: 'CREATOR' | 'BUSINESS' }) {
  const [failed, setFailed] = useState(false);
  const badge = role && (
    <View style={[av.roleBadge, { backgroundColor: role === 'BUSINESS' ? '#2563EB' : '#059669' }]}>
      <Text style={av.roleBadgeTxt}>{role === 'BUSINESS' ? 'B' : 'C'}</Text>
    </View>
  );
  if (imageUrl && !failed) {
    return (
      <View style={{ width: size, height: size }}>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius: RADIUS.full }}
          contentFit="cover"
          onError={() => setFailed(true)}
        />
        {badge}
      </View>
    );
  }
  const color = avatarColor(name);
  return (
    <View style={{ width: size, height: size }}>
      <View style={[av.wrap, { width: size, height: size, borderRadius: RADIUS.full, backgroundColor: color }]}>
        <Text style={[av.text, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
      </View>
      {badge}
    </View>
  );
}
const av = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontFamily: F.bold },
  roleBadge: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff' },
  roleBadgeTxt: { color: '#fff', fontSize: 9, fontFamily: F.bold },
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
    <View style={[s.reqCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      {/* New badge stripe */}
      <View style={[s.reqStripe, { backgroundColor: ACCENT }]} />

      {/* Top: avatar + info + new badge */}
      <View style={s.reqTop}>
        <Avatar name={conv.participantName} imageUrl={conv.participantAvatar} size={48} role={conv.participantRole} />
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
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
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
        <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
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

function ChatCard({ conv, onDelete }: { conv: Conversation; onDelete: (id: string) => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const hasUnread = conv.unreadCount > 0;

  function handleLongPress() {
    Alert.alert(
      t('messages.deleteConversationTitle'),
      t('messages.deleteConversationBody', { name: conv.participantName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('messages.deleteConversationConfirm'),
          style: 'destructive',
          onPress: () => {
            chatService.deleteConversation(conv.id)
              .then(() => onDelete(conv.id))
              .catch(() => Alert.alert(t('common.error'), t('messages.deleteConversationFailed')));
          },
        },
      ],
    );
  }

  return (
    <SwipeableChatRow onDelete={handleLongPress} deleteLabel={t('messages.deleteConversationConfirm')}>
      <Pressable android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
        style={({ pressed }) => [
          s.card,
          { backgroundColor: pressed ? C.surface : C.background },
        ]}
        onLongPress={handleLongPress}
        delayLongPress={400}
        onPress={() =>
          router.push({
            pathname: '/(creator)/messages/[id]' as never,
            params: { id: conv.id, name: conv.participantName, avatar: conv.participantAvatar ?? '', userId: conv.participantUserId ?? '', status: conv.status, campaignTitle: conv.campaignTitle ?? '', participantRole: conv.participantRole },
          })
        }>
        {/* Left accent stripe */}
        {hasUnread && <View style={s.stripe} />}

        {/* Avatar + badge */}
        <View style={s.avatarWrap}>
          {hasUnread && <View style={[s.avatarRing, { borderColor: ACCENT }]} pointerEvents="none" />}
          <Avatar name={conv.participantName} imageUrl={conv.participantAvatar} size={50} />
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
    </SwipeableChatRow>
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
  const [error, setError]           = useState('');
  const listRef = useRef<FlatList<Conversation>>(null);
  useScrollToTopOnTabPress('messages', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [pending, accepted] = await Promise.all([
        chatService.getConversations('PENDING'),
        chatService.getConversations('ACCEPTED'),
      ]);
      setRequests(pending.conversations);
      setChats(accepted.conversations.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()));
      setError('');
    } catch (e) {
      // Only surface errors from user-visible (non-silent) loads — a transient
      // failure during a background socket-triggered refresh shouldn't blow
      // away an already-populated, still-valid list.
      if (!silent) setError(e instanceof Error ? e.message : t('messages.loadFailedSub'));
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }

  // Auto-refresh the moment connectivity is restored after being offline.
  const { reconnectedAt } = useNetworkStatus();
  useEffect(() => {
    if (reconnectedAt) void load(true);
  }, [reconnectedAt]);

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

  function handleDeleteConversation(conversationId: string) {
    setChats((prev) => prev.filter((c) => c.id !== conversationId));
  }

  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      {/* ── Gradient header ── */}
      <LinearGradient
        colors={GRADIENTS.hero}
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
          { key: 'chats',    label: t('messages.tabMessages'), count: totalUnread,      color: TabColors.brand.color },
          { key: 'requests', label: t('messages.tabRequests'), count: requests.length,  color: TabColors.warning.color },
        ]}
        active={tab}
        onChange={(key) => setTab(key as Tab)}
      />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : error ? (
        <EmptyState
          faIcon="exclamation-triangle"
          title={t('messages.loadFailedTitle')}
          subtitle={error}
          action={{ label: t('messages.retry'), onPress: () => load() }}
        />
      ) : tab === 'requests' ? (
        <FlatList
          ref={listRef}
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
          ref={listRef}
          data={chats}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ChatCard conv={item} onDelete={handleDeleteConversation} />}
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
  gradientHeader: { borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg, overflow: 'hidden' },
  header:         { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14 },
  heading:        { fontSize: 20, fontFamily: F.bold, color: '#fff', lineHeight: 24 },
  headingSub:     { fontSize: 13, fontFamily: F.regular, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Request list
  reqList:  { padding: 16, gap: 12, paddingBottom: 40 },
  listEmpty:{ flexGrow: 1 },

  // Request card
  reqCard:     { borderRadius: RADIUS.md, borderWidth: 1.5, padding: 14, gap: 12, ...SHADOW.card, overflow: 'hidden' },
  reqStripe:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: RADIUS.md, borderBottomLeftRadius: RADIUS.md },
  reqTop:      { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  reqInfo:     { flex: 1, gap: 4 },
  reqNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqName:     { flex: 1, fontSize: 15, fontFamily: F.bold },
  newBadge:    { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  newBadgeTxt: { fontSize: 10, fontFamily: F.bold },
  reqTime:     { fontSize: 11, fontFamily: F.regular },
  reqMsgBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: RADIUS.md, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  reqMsg:      { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: F.regular },
  reqMsgEmpty: { flex: 1, fontSize: 13, fontStyle: 'italic', fontFamily: F.regular },
  reqActions:  { flexDirection: 'row', gap: 10 },
  declineBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: RADIUS.md, borderWidth: 1.5, height: 44 },
  declineTxt:  { fontSize: 13, fontFamily: F.semibold },
  acceptBtn:   { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: RADIUS.md, height: 44 },
  acceptTxt:   { fontSize: 13, color: '#fff', fontFamily: F.bold },

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
  avatarRing:  { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: RADIUS.full, borderWidth: 2 },
  avatarBadge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  avatarBadgeTxt: { color: '#fff', fontSize: 10, fontFamily: F.bold, lineHeight: 12 },
  content:     { flex: 1, gap: 3 },
  rowTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name:        { flex: 1, fontSize: 15, fontFamily: F.semibold },
  nameUnread:  { fontFamily: F.bold, },
  time:        { fontSize: 11, fontFamily: F.regular, flexShrink: 0 },
  timeUnread:  { fontFamily: F.semibold, },
  campaignPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  campaignPillTxt: { fontSize: 10, fontFamily: F.semibold, maxWidth: 180 },
  rowBottom:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  preview:     { flex: 1, fontSize: 13, fontFamily: F.regular },
  previewUnread: { fontFamily: F.medium },

});
