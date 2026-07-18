import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
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
import { TabSlider } from '@/components/TabSlider';
import { EmptyState } from '@/components/EmptyState';
import { SwipeableChatRow } from '@/components/SwipeableChatRow';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { messagingEvents } from '@/lib/messagingEvents';
import { getSocket } from '@/lib/socket';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { chatService } from '@/services/chat';
import { GRADIENTS, F, RADIUS, SHADOW } from '@/utilities/constants';
import { TabColors } from '@/utilities/tabColors';
import type { ApiMessage } from '@/lib/api';
import type { Conversation } from '@/types';

const ACCENT = '#0EA5E9';
const PAGE_SIZE = 20;

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

function Avatar({ name, imageUrl, size = 50 }: { name: string; imageUrl?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (imageUrl && !failed) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        onError={() => setFailed(true)}
      />
    );
  }
  const color = avatarColor(name);
  return (
    <View style={[av.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[av.text, { fontSize: size * 0.36 }]}>{initials(name)}</Text>
    </View>
  );
}
const av = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  text: { color: '#fff', fontFamily: F.bold },
});

// ── Pending Card (business sent, waiting for creator to accept) ───────────────

function PendingCard({ conv }: { conv: Conversation }) {
  const C = useAppColors();
  const { t } = useLanguage();

  return (
    <View style={[s.reqCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[s.reqStripe, { backgroundColor: '#F59E0B' }]} />

      <View style={s.reqTop}>
        <Avatar name={conv.participantName} imageUrl={conv.participantAvatar} size={48} />
        <View style={s.reqInfo}>
          <View style={s.reqNameRow}>
            <Text style={[s.reqName, { color: C.text }]} numberOfLines={1}>{conv.participantName}</Text>
            <View style={[s.waitBadge, { backgroundColor: TabColors.warning.bg }]}>
              <Ionicons name="time-outline" size={10} color={TabColors.warning.color} />
              <Text style={[s.waitBadgeTxt, { color: TabColors.warning.color }]}>{t('messages.statusPending')}</Text>
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

      {(conv.requestMessage || conv.lastMessage) ? (
        <View style={[s.reqMsgBox, { backgroundColor: C.background, borderColor: C.border }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={C.textSecondary} style={{ marginTop: 2 }} />
          <Text style={[s.reqMsg, { color: C.text }]} numberOfLines={3}>
            {conv.requestMessage || conv.lastMessage}
          </Text>
        </View>
      ) : null}

      <View style={[s.waitingNote, { backgroundColor: TabColors.warning.bg, borderColor: TabColors.warning.color + '40' }]}>
        <Ionicons name="hourglass-outline" size={13} color={TabColors.warning.color} />
        <Text style={[s.waitingNoteTxt, { color: TabColors.warning.color }]}>
          {t('messages.waitingForResponse', { name: conv.participantName })}
        </Text>
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
            pathname: '/(business)/messages/[id]' as never,
            params: { id: conv.id, name: conv.participantName, avatar: conv.participantAvatar ?? '', userId: conv.participantUserId ?? '', status: conv.status, campaignTitle: conv.campaignTitle ?? '' },
          })
        }>
        {hasUnread && <View style={s.stripe} />}

        <View style={s.avatarWrap}>
          {hasUnread && <View style={[s.avatarRing, { borderColor: ACCENT }]} pointerEvents="none" />}
          <Avatar name={conv.participantName} imageUrl={conv.participantAvatar} size={50} />
          {hasUnread && (
            <View style={[s.avatarBadge, { backgroundColor: ACCENT }]}>
              <Text style={s.avatarBadgeTxt}>{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={s.content}>
          <View style={s.rowTop}>
            <Text style={[s.name, { color: C.text }, hasUnread && s.nameUnread]} numberOfLines={1}>
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
            {!hasUnread && <Ionicons name="checkmark-done-outline" size={14} color={C.textSecondary} />}
          </View>
        </View>
      </Pressable>
    </SwipeableChatRow>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Tab = 'chats' | 'pending';
type TabState = { items: Conversation[]; page: number; total: number; loadingMore: boolean; loaded: boolean };
const emptyTabState = (): TabState => ({ items: [], page: 0, total: 0, loadingMore: false, loaded: false });

export default function BusinessChatListScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab]               = useState<Tab>('chats');
  const [tabData, setTabData]       = useState<Record<Tab, TabState>>({ chats: emptyTabState(), pending: emptyTabState() });
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');
  const loadingMoreRef = useRef(false);
  const listRef = useRef<FlatList<Conversation>>(null);
  useScrollToTopOnTabPress('messages', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

  async function loadTab(tabKey: Tab, page: number, replace: boolean) {
    if (!replace) setTabData((prev) => ({ ...prev, [tabKey]: { ...prev[tabKey], loadingMore: true } }));
    const status = tabKey === 'pending' ? 'PENDING' : 'ACCEPTED';
    const { conversations, total } = await chatService.getConversations('BUSINESS', status, { page, limit: PAGE_SIZE });
    setTabData((prev) => {
      const prevItems = replace ? [] : prev[tabKey].items;
      const seen = new Set(prevItems.map((c) => c.id));
      const merged = [...prevItems, ...conversations.filter((c) => !seen.has(c.id))];
      return { ...prev, [tabKey]: { items: merged, page, total, loadingMore: false, loaded: true } };
    });
  }

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      await Promise.all([loadTab('pending', 1, true), loadTab('chats', 1, true)]);
      setError('');
    } catch (e) {
      // Only surface errors from user-visible (non-silent) loads — a transient
      // failure during a background socket-triggered refresh shouldn't blow
      // away an already-populated, still-valid list.
      if (!silent) setError(e instanceof Error ? e.message : t('messages.loadFailedSub'));
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
      loadingMoreRef.current = false;
    }
  }

  function loadMore() {
    const state = tabData[tab];
    if (loadingMoreRef.current || state.loadingMore || state.items.length >= state.total) return;
    loadingMoreRef.current = true;
    void loadTab(tab, state.page + 1, false).finally(() => { loadingMoreRef.current = false; });
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

    const onMessageNew = (data: { conversationId: string; message: ApiMessage }) => {
      setTabData((prev) => {
        const idx = prev.chats.items.findIndex((c) => c.id === data.conversationId);
        if (idx === -1) { void load(true); return prev; }
        const updated = [...prev.chats.items];
        const conv = { ...updated[idx]! };
        conv.lastMessage = data.message.content;
        conv.lastMessageTime = data.message.createdAt;
        if (data.message.senderId !== user?.id) {
          conv.unreadCount = (conv.unreadCount ?? 0) + 1;
        }
        updated.splice(idx, 1);
        updated.unshift(conv);
        return { ...prev, chats: { ...prev.chats, items: updated } };
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
    setTabData((prev) => ({
      ...prev,
      chats: { ...prev.chats, items: prev.chats.items.filter((c) => c.id !== conversationId), total: Math.max(0, prev.chats.total - 1) },
    }));
  }

  const pending = tabData.pending.items;
  const chats   = tabData.chats.items;
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
              {tabData.pending.total > 0
                ? t(tabData.pending.total !== 1 ? 'messages.pendingRequests' : 'messages.pendingRequest', { n: tabData.pending.total })
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
          { key: 'chats',   label: t('messages.tabMessages'),        count: totalUnread,          color: TabColors.brand.color },
          { key: 'pending', label: t('messages.tabPendingRequests'), count: tabData.pending.total, color: TabColors.warning.color },
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
          icon="alert-circle-outline"
          title={t('messages.loadFailedTitle')}
          subtitle={error}
          action={{ label: t('messages.retry'), onPress: () => load() }}
        />
      ) : tab === 'pending' ? (
        <FlatList
          ref={listRef}
          data={pending}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <PendingCard conv={item} />}
          contentContainerStyle={[s.reqList, pending.length === 0 && s.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadTab('pending', 1, true).finally(() => setRefreshing(false)); }} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={tabData.pending.loadingMore ? <View style={s.footerLoading}><ActivityIndicator size="small" color={ACCENT} /></View> : null}
          ListEmptyComponent={
            <EmptyState
              faIcon="paper-plane"
              title={t('messages.noPendingRequestsTitle')}
              subtitle={t('messages.noPendingRequestsSub')}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadTab('chats', 1, true).finally(() => setRefreshing(false)); }} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={tabData.chats.loadingMore ? <View style={s.footerLoading}><ActivityIndicator size="small" color={ACCENT} /></View> : null}
          ListEmptyComponent={
            <EmptyState
              faIcon="comment-dots"
              title={t('messages.noConversationsYet')}
              subtitle={t('messages.visitCreatorProfile')}
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

  // Pending list
  reqList:   { padding: 16, gap: 12, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },
  footerLoading: { paddingVertical: 20 },

  // Pending card
  reqCard:     { borderRadius: RADIUS.md, borderWidth: 1.5, padding: 14, gap: 12, ...SHADOW.card, overflow: 'hidden' },
  reqStripe:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: RADIUS.md, borderBottomLeftRadius: RADIUS.md },
  reqTop:      { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  reqInfo:     { flex: 1, gap: 4 },
  reqNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqName:     { flex: 1, fontSize: 15, fontFamily: F.bold },
  waitBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 3 },
  waitBadgeTxt:{ fontSize: 10, fontFamily: F.bold },
  reqTime:     { fontSize: 11, fontFamily: F.regular },
  reqMsgBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: RADIUS.md, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  reqMsg:      { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: F.regular },
  waitingNote: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 9, borderWidth: StyleSheet.hairlineWidth },
  waitingNoteTxt: { flex: 1, fontSize: 12, fontFamily: F.medium, },

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
  stripe:         { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, backgroundColor: ACCENT, borderRadius: RADIUS.full },
  avatarWrap:     { position: 'relative' },
  avatarRing:     { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: RADIUS.full, borderWidth: 2 },
  avatarBadge:    { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: RADIUS.full, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  avatarBadgeTxt: { color: '#fff', fontSize: 10, fontFamily: F.bold, lineHeight: 12 },
  content:        { flex: 1, gap: 3 },
  rowTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name:           { flex: 1, fontSize: 15, fontFamily: F.semibold },
  nameUnread:     { fontFamily: F.bold, },
  time:           { fontSize: 11, fontFamily: F.regular, flexShrink: 0 },
  timeUnread:     { fontFamily: F.semibold, },
  campaignPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  campaignPillTxt: { fontSize: 10, fontFamily: F.semibold, maxWidth: 180 },
  rowBottom:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  preview:        { flex: 1, fontSize: 13, fontFamily: F.regular },
  previewUnread:  { fontFamily: F.medium },

});
