import { router, useFocusEffect } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
// import { TabSlider } from '@/components/TabSlider'; // hidden for now
import { EmptyState } from '@/components/EmptyState';
import { ListRowSkeleton } from '@/components/ListRowSkeleton';
import { SwipeableChatRow } from '@/components/SwipeableChatRow';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRefetchOnFocusIfStale } from '@/hooks/useRefetchOnFocusIfStale';
import { useScrollToTopOnTabPress } from '@/hooks/useScrollToTopOnTabPress';
import { messagingEvents } from '@/lib/messagingEvents';
import { STALE } from '@/lib/queryClient';
import { getSocket } from '@/lib/socket';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { chatService } from '@/services/chat';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING } from '@/utilities/constants';
import { getConversationPreviewText } from '@/utilities/messagePreview';
import { MaxWidthContainer } from '@/components/MaxWidthContainer';
import { TabColors } from '@/utilities/tabColors';
import type { ApiMessage } from '@/lib/api';
import type { Conversation } from '@/types';

const ACCENT = '#0EA5E9';
const PAGE_SIZE = 20;
const EMPTY_CONVERSATIONS: Conversation[] = [];

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
              <FontAwesome5 name="clock" size={10} color={TabColors.warning.color} />
              <Text style={[s.waitBadgeTxt, { color: TabColors.warning.color }]}>{t('messages.statusPending')}</Text>
            </View>
          </View>
          {conv.campaignTitle ? (
            <View style={[s.campaignPill, { backgroundColor: '#E0F2FE' }]}>
              <FontAwesome5 name="briefcase" solid size={10} color={ACCENT} />
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
          <FontAwesome5 name="comment-alt" size={13} color={C.textSecondary} style={{ marginTop: 2 }} />
          <Text style={[s.reqMsg, { color: C.text }]} numberOfLines={3}>
            {conv.requestMessage || conv.lastMessage}
          </Text>
        </View>
      ) : null}

      <View style={[s.waitingNote, { backgroundColor: TabColors.warning.bg, borderColor: TabColors.warning.color + '40' }]}>
        <FontAwesome5 name="hourglass" solid size={13} color={TabColors.warning.color} />
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
      <Pressable
        style={({ pressed }) => [
          s.card,
          { backgroundColor: pressed ? C.surface : C.background },
        ]}
        onLongPress={handleLongPress}
        delayLongPress={400}
        onPress={() =>
          router.push({
            pathname: '/(business)/messages/[id]' as never,
            params: { id: conv.id, name: conv.participantName, avatar: conv.participantAvatar ?? '', userId: conv.participantUserId ?? '', participantId: conv.participantId, status: conv.status, campaignTitle: conv.campaignTitle ?? '' },
          })
        }>
        {/* Avatar — plain, no ring/stripe/badge clutter */}
        <Avatar name={conv.participantName} imageUrl={conv.participantAvatar} size={56} />

        {/* Content — two lines, Instagram-style: name, then preview · time */}
        <View style={s.content}>
          <Text style={[s.name, { color: C.text }, hasUnread && s.nameUnread]} numberOfLines={1}>
            {conv.participantName}
          </Text>

          <View style={s.rowBottom}>
            {conv.campaignTitle ? (
              <FontAwesome5 name="briefcase" solid size={12} color={hasUnread ? C.text : C.textSecondary} style={s.previewIcon} />
            ) : null}
            <Text
              style={[s.preview, { color: hasUnread ? C.text : C.textSecondary }, hasUnread && s.previewUnread]}
              numberOfLines={1}>
              {getConversationPreviewText(conv, t)}
            </Text>
            <Text style={[s.previewTime, { color: hasUnread ? C.text : C.textSecondary }, hasUnread && s.previewUnread]}>
              {' · ' + formatTime(conv.lastMessageTime, t)}
            </Text>
          </View>
        </View>

        {/* Unread indicator — single dot, no numeric badge */}
        {hasUnread && <View style={[s.unreadDot, { backgroundColor: ACCENT }]} />}
      </Pressable>
    </SwipeableChatRow>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Tab = 'chats' | 'pending';
type ConversationPage = { conversations: Conversation[]; total: number };

function flattenPages(pages: ConversationPage[] | undefined): Conversation[] {
  if (!pages) return EMPTY_CONVERSATIONS;
  const seen = new Set<string>();
  const out: Conversation[] = [];
  for (const p of pages) for (const c of p.conversations) {
    if (!seen.has(c.id)) { seen.add(c.id); out.push(c); }
  }
  return out;
}

export default function BusinessChatListScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // Tab slider hidden for now — screen locked to the 'chats' view.
  const [tab]                       = useState<Tab>('chats');
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList<Conversation>>(null);
  useScrollToTopOnTabPress('messages', () => listRef.current?.scrollToOffset({ offset: 0, animated: true }));

  // ── Data — cache-first, paginated (see queryClient.ts). Socket events below
  // patch the ACCEPTED cache in place instead of reloading the whole list.
  const pendingQuery = useInfiniteQuery({
    queryKey: ['conversations', 'business', 'PENDING'],
    queryFn: ({ pageParam }) => chatService.getConversations('PENDING', { page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.conversations.length, 0);
      return loaded < last.total ? all.length + 1 : undefined;
    },
    staleTime: STALE.list,
  });
  const chatsQuery = useInfiniteQuery({
    queryKey: ['conversations', 'business', 'ACCEPTED'],
    queryFn: ({ pageParam }) => chatService.getConversations('ACCEPTED', { page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.conversations.length, 0);
      return loaded < last.total ? all.length + 1 : undefined;
    },
    staleTime: STALE.list,
  });

  const pending = flattenPages(pendingQuery.data?.pages);
  const chats   = flattenPages(chatsQuery.data?.pages);
  const loading = pendingQuery.isPending || chatsQuery.isPending;
  // A query only reaches 'error' status when it has never had data (initial
  // load failed) — a background socket-triggered refetch failing leaves the
  // already-populated, still-valid list in place instead of blowing it away.
  const firstError = pendingQuery.error ?? chatsQuery.error;
  const error = (pendingQuery.isError || chatsQuery.isError)
    ? (firstError instanceof Error ? firstError.message : t('messages.loadFailedSub'))
    : '';
  const activeQuery = tab === 'pending' ? pendingQuery : chatsQuery;

  function loadMore() {
    if (activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) void activeQuery.fetchNextPage();
  }

  async function handleRefresh() {
    setRefreshing(true);
    await activeQuery.refetch();
    setRefreshing(false);
  }

  function refetchAll() {
    void pendingQuery.refetch();
    void chatsQuery.refetch();
  }

  // Auto-refresh the moment connectivity is restored after being offline.
  const { reconnectedAt } = useNetworkStatus();
  useEffect(() => {
    if (reconnectedAt) void queryClient.invalidateQueries({ queryKey: ['conversations', 'business'] });
  }, [reconnectedAt, queryClient]);

  useEffect(() => {
    const unsub = messagingEvents.subscribe(() =>
      void queryClient.invalidateQueries({ queryKey: ['conversations', 'business'] }));
    const socket = getSocket();

    const onMessageNew = (data: { conversationId: string; message: ApiMessage }) => {
      queryClient.setQueryData<{ pages: ConversationPage[]; pageParams: number[] }>(
        ['conversations', 'business', 'ACCEPTED'],
        (old) => {
          if (!old) return old;
          let movedConv: Conversation | null = null;
          const pages = old.pages.map((p) => {
            const idx = p.conversations.findIndex((c) => c.id === data.conversationId);
            if (idx === -1) return p;
            const conv = { ...p.conversations[idx]! };
            conv.lastMessage = data.message.content;
            conv.lastMessageType = data.message.type;
            conv.lastMessageAttachmentName = data.message.attachmentName;
            conv.lastMessageTime = data.message.createdAt;
            if (data.message.senderId !== user?.id) {
              conv.unreadCount = (conv.unreadCount ?? 0) + 1;
            }
            movedConv = conv;
            const rest = [...p.conversations];
            rest.splice(idx, 1);
            return { ...p, conversations: rest };
          });
          if (!movedConv) {
            void queryClient.invalidateQueries({ queryKey: ['conversations', 'business'] });
            return old;
          }
          const firstPage = pages[0]!;
          pages[0] = { ...firstPage, conversations: [movedConv, ...firstPage.conversations] };
          return { ...old, pages };
        },
      );
    };
    const onConvUpdate = () => void queryClient.invalidateQueries({ queryKey: ['conversations', 'business'] });

    socket?.on('conversation:update', onConvUpdate);
    socket?.on('message:new', onMessageNew);
    return () => {
      unsub();
      socket?.off('conversation:update', onConvUpdate);
      socket?.off('message:new', onMessageNew);
    };
  }, [user?.id, queryClient]);

  // Other screens (chat thread markSeen, accept/decline elsewhere) call
  // messagingEvents.refresh() to mean "something read-related changed" — kept
  // separate from this screen's own stale-refetch-on-focus below.
  useFocusEffect(useCallback(() => {
    messagingEvents.refresh();
  }, []));
  useRefetchOnFocusIfStale(pendingQuery, chatsQuery);

  function handleDeleteConversation(conversationId: string) {
    queryClient.setQueryData<{ pages: ConversationPage[]; pageParams: number[] }>(
      ['conversations', 'business', 'ACCEPTED'],
      (old) => {
        if (!old) return old;
        const pages = old.pages.map((p) => {
          const hadIt = p.conversations.some((c) => c.id === conversationId);
          return hadIt
            ? { ...p, conversations: p.conversations.filter((c) => c.id !== conversationId), total: Math.max(0, p.total - 1) }
            : p;
        });
        return { ...old, pages };
      },
    );
  }

  // const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0); // used by hidden tab slider

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <MaxWidthContainer>
      {/* ── Tab slider ── (hidden for now — Messages/Requests slider not shown in UI) */}
      {/* <View style={s.tabSliderWrap}>
        <TabSlider
          justify
          tabs={[
            { key: 'chats',   label: t('messages.tabMessages'),        count: totalUnread,          color: TabColors.positive.color },
            { key: 'pending', label: t('messages.tabPendingRequests'), count: tabData.pending.total, color: TabColors.warning.color },
          ]}
          active={tab}
          onChange={(key) => setTab(key as Tab)}
        />
      </View> */}

      {loading ? (
        <View style={s.reqList}>
          {[0, 1, 2, 3, 4].map((i) => <ListRowSkeleton key={i} />)}
        </View>
      ) : error ? (
        <EmptyState
          icon="exclamation-circle"
          title={t('messages.loadFailedTitle')}
          subtitle={error}
          action={{ label: t('messages.retry'), onPress: refetchAll }}
        />
      ) : tab === 'pending' ? (
        <FlatList
          ref={listRef}
          data={pending}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <PendingCard conv={item} />}
          contentContainerStyle={[s.reqList, pending.length === 0 && s.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          ListFooterComponent={pendingQuery.isFetchingNextPage ? <View style={s.footerLoading}><ActivityIndicator size="small" color={ACCENT} /></View> : null}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          ListFooterComponent={chatsQuery.isFetchingNextPage ? <View style={s.footerLoading}><ActivityIndicator size="small" color={ACCENT} /></View> : null}
          ListEmptyComponent={
            <EmptyState
              faIcon="comment-dots"
              title={t('messages.noConversationsYet')}
              subtitle={t('messages.visitCreatorProfile')}
            />
          }
        />
      )}
      </MaxWidthContainer>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  tabSliderWrap:  { paddingTop: 14 },

  // Pending list
  reqList:   { padding: 16, gap: 12, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },
  footerLoading: { paddingVertical: 20 },

  // Pending card
  reqCard:     { borderRadius: RADIUS.md, borderWidth: 1.5, padding: SPACING.lg, gap: 12, ...SHADOW.card, overflow: 'hidden' },
  reqStripe:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: RADIUS.md, borderBottomLeftRadius: RADIUS.md },
  reqTop:      { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  reqInfo:     { flex: 1, gap: 4 },
  reqNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqName:     { flex: 1, fontSize: 15, fontFamily: F.bold },
  waitBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 3 },
  waitBadgeTxt:{ fontSize: 10, fontFamily: F.bold },
  reqTime:     { fontSize: 11, fontFamily: F.regular },
  reqMsgBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: RADIUS.md, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  reqMsg:      { flex: 1, fontSize: 13, lineHeight: 20, fontFamily: F.regular },
  campaignPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2 },
  campaignPillTxt: { fontSize: 10, fontFamily: F.semibold, maxWidth: 180 },
  waitingNote: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: RADIUS.sm, paddingHorizontal: 12, paddingVertical: 9, borderWidth: StyleSheet.hairlineWidth },
  waitingNoteTxt: { flex: 1, fontSize: 12, fontFamily: F.medium, },

  // Chat list
  chatList: { paddingBottom: 40 },
  sep:      { height: StyleSheet.hairlineWidth, marginLeft: 90 },

  // Chat card — Instagram-style: plain avatar, name line, preview+time line, unread dot
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: SCREEN_GUTTER,
    gap: 14,
  },
  content:        { flex: 1, gap: 4 },
  name:           { fontSize: 15, fontFamily: F.semibold },
  nameUnread:     { fontFamily: F.bold, },
  rowBottom:      { flexDirection: 'row', alignItems: 'center' },
  previewIcon:    { marginRight: 4 },
  preview:        { flexShrink: 1, fontSize: 13, fontFamily: F.regular },
  previewTime:    { flexShrink: 0, fontSize: 13, fontFamily: F.regular },
  previewUnread:  { fontFamily: F.medium },
  unreadDot:      { width: 9, height: 9, borderRadius: RADIUS.full, flexShrink: 0 },

});
