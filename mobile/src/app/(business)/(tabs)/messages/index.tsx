import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TabSlider } from '@/components/TabSlider';
import { messagingEvents } from '@/lib/messagingEvents';
import { getSocket } from '@/lib/socket';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage, type TFn } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { chatService } from '@/services/chat';
import { F } from '@/utilities/constants';
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
  text: { color: '#fff', fontWeight: '800', fontFamily: F.extrabold },
});

// ── Pending Card (business sent, waiting for creator to accept) ───────────────

function PendingCard({ conv }: { conv: Conversation }) {
  const C = useAppColors();
  const { t } = useLanguage();

  return (
    <View style={[s.reqCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[s.reqStripe, { backgroundColor: '#F59E0B' }]} />

      <View style={s.reqTop}>
        <Avatar name={conv.participantName} size={48} />
        <View style={s.reqInfo}>
          <View style={s.reqNameRow}>
            <Text style={[s.reqName, { color: C.text }]} numberOfLines={1}>{conv.participantName}</Text>
            <View style={[s.waitBadge, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time-outline" size={10} color="#92400E" />
              <Text style={[s.waitBadgeTxt, { color: '#92400E' }]}>Pending</Text>
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

      <View style={[s.waitingNote, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
        <Ionicons name="hourglass-outline" size={13} color="#92400E" />
        <Text style={[s.waitingNoteTxt, { color: '#92400E' }]}>
          Waiting for {conv.participantName} to respond
        </Text>
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
        {
          backgroundColor: C.surface,
          borderColor: hasUnread ? 'rgba(14,165,233,0.3)' : C.border,
          shadowColor: hasUnread ? ACCENT : '#000',
          shadowOpacity: hasUnread ? 0.14 : 0.06,
          opacity: pressed ? 0.93 : 1,
        },
      ]}
      onPress={() =>
        router.push({
          pathname: '/(business)/messages/[id]' as never,
          params: { id: conv.id, name: conv.participantName, status: conv.status, campaignTitle: conv.campaignTitle ?? '' },
        })
      }>
      {hasUnread && <View style={s.stripe} />}

      <View style={s.avatarWrap}>
        {hasUnread && <View style={[s.avatarRing, { borderColor: ACCENT }]} pointerEvents="none" />}
        <Avatar name={conv.participantName} size={50} />
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
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

type Tab = 'chats' | 'pending';

export default function BusinessChatListScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [tab, setTab]               = useState<Tab>('chats');
  const [pending, setPending]       = useState<Conversation[]>([]);
  const [chats, setChats]           = useState<Conversation[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [pend, accepted] = await Promise.all([
        chatService.getConversations('BUSINESS', 'PENDING'),
        chatService.getConversations('BUSINESS', 'ACCEPTED'),
      ]);
      setPending(pend);
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
    const onUpdate = () => void load(true);
    socket?.on('conversation:update', onUpdate);
    socket?.on('message:new', onUpdate);
    return () => {
      unsub();
      socket?.off('conversation:update', onUpdate);
      socket?.off('message:new', onUpdate);
    };
  }, []);

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
              {pending.length > 0
                ? pending.length !== 1
                  ? `${pending.length} pending responses`
                  : '1 pending response'
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
          { key: 'chats',   label: t('messages.tabMessages'), count: totalUnread,   color: '#4f46e5' },
          { key: 'pending', label: 'Pending',                 count: pending.length, color: '#4f46e5' },
        ]}
        active={tab}
        onChange={(key) => setTab(key as Tab)}
      />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      ) : tab === 'pending' ? (
        <FlatList
          data={pending}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <PendingCard conv={item} />}
          contentContainerStyle={[s.reqList, pending.length === 0 && s.listEmpty]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="paper-plane-outline" size={34} color={ACCENT} />
              </View>
              <Text style={[s.emptyTitle, { color: C.text }]}>No pending requests</Text>
              <Text style={[s.emptyHint, { color: C.textSecondary }]}>
                Requests you've sent to creators will appear here
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ChatCard conv={item} />}
          contentContainerStyle={[s.chatList, chats.length === 0 && s.listEmpty]}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="chatbubbles-outline" size={34} color={ACCENT} />
              </View>
              <Text style={[s.emptyTitle, { color: C.text }]}>{t('messages.noConversationsYet')}</Text>
              <Text style={[s.emptyHint, { color: C.textSecondary }]}>{t('messages.visitCreatorProfile')}</Text>
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

  // Header
  gradientHeader: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  header:         { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  heading:        { fontSize: 22, fontWeight: '800', fontFamily: F.extrabold, color: '#fff' },
  headingSub:     { fontSize: 13, fontFamily: F.regular, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  // Pending list
  reqList:   { padding: 16, gap: 12, paddingBottom: 40 },
  listEmpty: { flexGrow: 1 },

  // Pending card
  reqCard:     { borderRadius: 18, borderWidth: 1.5, padding: 14, gap: 12, shadowRadius: 6, shadowOpacity: 0.07, shadowOffset: { width: 0, height: 2 }, elevation: 2, overflow: 'hidden' },
  reqStripe:   { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
  reqTop:      { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  reqInfo:     { flex: 1, gap: 4 },
  reqNameRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqName:     { flex: 1, fontSize: 15, fontWeight: '700', fontFamily: F.bold },
  waitBadge:   { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  waitBadgeTxt:{ fontSize: 10, fontWeight: '700', fontFamily: F.bold },
  reqTime:     { fontSize: 11, fontFamily: F.regular },
  reqMsgBox:   { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  reqMsg:      { flex: 1, fontSize: 13, lineHeight: 19, fontFamily: F.regular },
  waitingNote: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: StyleSheet.hairlineWidth },
  waitingNoteTxt: { flex: 1, fontSize: 12, fontFamily: F.medium, fontWeight: '500' },

  // Chat list
  chatList: { padding: 16, paddingTop: 12, paddingBottom: 40 },
  sep:      { height: 10 },

  // Chat card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingRight: 14,
    paddingLeft: 10,
    gap: 12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
  },
  stripe:         { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: ACCENT, borderTopLeftRadius: 18, borderBottomLeftRadius: 18 },
  avatarWrap:     { position: 'relative' },
  avatarRing:     { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 29, borderWidth: 2 },
  avatarBadge:    { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  avatarBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800', fontFamily: F.extrabold, lineHeight: 12 },
  content:        { flex: 1, gap: 3 },
  rowTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name:           { flex: 1, fontSize: 15, fontFamily: F.semibold },
  nameUnread:     { fontFamily: F.bold, fontWeight: '700' },
  time:           { fontSize: 11, fontFamily: F.regular, flexShrink: 0 },
  timeUnread:     { fontFamily: F.semibold, fontWeight: '600' },
  campaignPill:    { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  campaignPillTxt: { fontSize: 10, fontWeight: '600', fontFamily: F.semibold, maxWidth: 180 },
  rowBottom:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  preview:        { flex: 1, fontSize: 13, fontFamily: F.regular },
  previewUnread:  { fontFamily: F.medium },

  // Empty
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 12 },
  emptyIcon:  { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', fontFamily: F.bold, textAlign: 'center' },
  emptyHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
});
