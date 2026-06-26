import { router, useFocusEffect } from 'expo-router';
import { messagingEvents } from '@/lib/messagingEvents';
import { getSocket } from '@/lib/socket';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage, type TFn } from '@/context/LanguageContext';
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

// ── Conversation Row ──────────────────────────────────────────────────────────

function ConversationRow({ conv }: { conv: Conversation }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const hasUnread = conv.unreadCount > 0;

  const statusCfg = {
    PENDING:  { labelKey: 'messages.statusPending',  bg: '#FEF3C7', color: '#92400E' },
    ACCEPTED: { labelKey: 'messages.statusActive',   bg: '#DCFCE7', color: '#166534' },
    DECLINED: { labelKey: 'messages.statusDeclined', bg: '#FEE2E2', color: '#991B1B' },
  }[conv.status];

  return (
    <Pressable
      style={({ pressed }) => [
        s.row,
        { backgroundColor: pressed ? C.background : C.surface, borderBottomColor: C.border },
      ]}
      onPress={() =>
        router.push({
          pathname: '/(business)/messages/[id]',
          params: { id: conv.id, name: conv.participantName, status: conv.status },
        })
      }>
      {/* Unread indicator stripe */}
      <View style={[s.unreadStripe, { backgroundColor: hasUnread ? '#7C3AED' : 'transparent' }]} />

      <Avatar name={conv.participantName} size={48} />

      <View style={s.content}>
        <View style={s.rowTop}>
          <Text style={[s.name, { color: C.text, fontWeight: hasUnread ? '700' : '600' }]} numberOfLines={1}>
            {conv.participantName}
          </Text>
          <Text style={[s.time, { color: hasUnread ? C.brinjal1 : C.textSecondary, fontWeight: hasUnread ? '600' : '400' }]}>
            {formatTime(conv.lastMessageTime, t)}
          </Text>
        </View>

        {conv.campaignTitle ? (
          <View style={[styles.campaignPill, { backgroundColor: C.primaryLight }]}>
            <Ionicons name="briefcase-outline" size={10} color={C.brinjal1} />
            <Text style={[styles.campaignPillText, { color: C.brinjal1 }]} numberOfLines={1}>{conv.campaignTitle}</Text>
          </View>
        ) : null}

        <View style={s.rowBottom}>
          <Text
            style={[s.lastMsg, { color: hasUnread ? C.text : C.textSecondary, fontWeight: hasUnread ? '500' : '400' }]}
            numberOfLines={1}>
            {conv.lastMessage || t('messages.noMessagesYet')}
          </Text>
          <View style={s.rowMeta}>
            {hasUnread && (
              <View style={[s.unreadBadge, { backgroundColor: '#7C3AED' }]}>
                <Text style={s.unreadBadgeTxt}>{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</Text>
              </View>
            )}
            <View style={[s.statusPill, { backgroundColor: statusCfg.bg }]}>
              <Text style={[s.statusTxt, { color: statusCfg.color }]}>{t(statusCfg.labelKey)}</Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function BusinessChatListScreen() {
  const C = useAppColors();
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [query, setQuery]                 = useState('');
  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const all = await chatService.getConversations('BUSINESS');
      setConversations(
        all.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()),
      );
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const socket = getSocket();
    const onUpdate = () => void load(true);
    socket?.on('conversation:update', onUpdate);
    socket?.on('message:new', onUpdate);
    return () => {
      socket?.off('conversation:update', onUpdate);
      socket?.off('message:new', onUpdate);
    };
  }, []);

  useFocusEffect(() => { messagingEvents.refresh(); });

  const filtered = query.trim()
    ? conversations.filter((c) => c.participantName.toLowerCase().includes(query.toLowerCase()))
    : conversations;

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);

  return (
    <SafeAreaView style={[s.container, { backgroundColor: C.background }]} edges={['top']}>
      <LinearGradient
        colors={['#1e1b4b', '#4338ca', '#7c3aed']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.gradientHeader}>
        <View style={[s.decCircle1, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
        <View style={[s.decCircle2, { backgroundColor: 'rgba(255,255,255,0.05)' }]} />
        <View style={s.header}>
          <View>
            <Text style={s.heading}>{t('messages.heading')}</Text>
            <Text style={s.headingSub}>
              {totalUnread > 0
                ? totalUnread !== 1
                  ? t('messages.unreadMessages', { n: totalUnread })
                  : t('messages.unreadMessage', { n: totalUnread })
                : t('messages.yourActiveConversations')}
            </Text>
          </View>
          {totalUnread > 0 && (
            <View style={[s.unreadPill, { backgroundColor: C.brinjal2 }]}>
              <Text style={s.unreadPillTxt}>{totalUnread}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={[s.searchRow, { backgroundColor: C.background }]}>
        <View style={[s.searchCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Ionicons name="search-outline" size={17} color={C.textSecondary} />
          <TextInput
            style={[s.searchInput, { color: C.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('messages.searchPlaceholder')}
            placeholderTextColor={C.textSecondary}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={C.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ConversationRow conv={item} />}
          contentContainerStyle={[s.list, filtered.length === 0 && s.listEmpty]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#7C3AED"
            />
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={[s.emptyIcon, { backgroundColor: C.primaryLight }]}>
                <Ionicons name="chatbubbles-outline" size={36} color={C.brinjal1} />
              </View>
              <Text style={[s.emptyTitle, { color: C.text }]}>
                {query.trim() ? t('messages.noResultsFor', { query }) : t('messages.noConversationsYet')}
              </Text>
              <Text style={[s.emptyHint, { color: C.textSecondary }]}>
                {query.trim()
                  ? t('messages.tryDifferentName')
                  : t('messages.visitCreatorProfile')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  campaignPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 },
  campaignPillText: { fontSize: 10, fontWeight: '600', fontFamily: F.semibold, maxWidth: 180 },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  gradientHeader: { paddingBottom: 16, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden' },
  decCircle1:     { position: 'absolute', width: 200, height: 200, borderRadius: 100, top: -70, right: -40 },
  decCircle2:     { position: 'absolute', width: 120, height: 120, borderRadius: 60, bottom: -35, left: 15 },
  header:         { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading:        { fontSize: 22, fontWeight: '800', fontFamily: F.extrabold, color: '#fff' },
  headingSub:     { fontSize: 13, fontFamily: F.regular, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  unreadPill:     { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  unreadPillTxt:  { color: '#fff', fontSize: 14, fontWeight: '800', fontFamily: F.extrabold },

  searchRow:  { paddingHorizontal: 20, paddingVertical: 12 },
  searchCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, height: 48, gap: 10 },
  searchInput:{ flex: 1, fontSize: 15, paddingVertical: 0, fontFamily: F.regular },

  list:      { paddingBottom: 32 },
  listEmpty: { flexGrow: 1 },

  row:          { flexDirection: 'row', alignItems: 'center', paddingRight: 20, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  unreadStripe: { width: 3, height: '100%', borderRadius: 2, position: 'absolute', left: 0 },
  content:      { flex: 1, gap: 2 },
  rowTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name:         { fontSize: 15, flex: 1, fontFamily: F.semibold },
  time:         { fontSize: 11, fontFamily: F.medium, flexShrink: 0 },
  rowBottom:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  lastMsg:      { flex: 1, fontSize: 13, fontFamily: F.regular },
  rowMeta:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unreadBadge:  { borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  unreadBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800', fontFamily: F.extrabold },
  statusPill:   { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  statusTxt:    { fontSize: 10, fontWeight: '700', fontFamily: F.bold },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 12 },
  emptyIcon:  { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', fontFamily: F.bold, textAlign: 'center' },
  emptyHint:  { fontSize: 13, textAlign: 'center', lineHeight: 20, fontFamily: F.regular },
});
