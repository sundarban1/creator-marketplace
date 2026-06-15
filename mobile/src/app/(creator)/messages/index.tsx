import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { chatService } from '@/services/chat';
import type { Conversation } from '@/types';

function Avatar({ name, size = 44, C }: { name: string; size?: number; C: ReturnType<typeof useAppColors> }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: C.brinjal1 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

function ConversationRow({ conv }: { conv: Conversation }) {
  const C = useAppColors();
  const time = new Date(conv.lastMessageTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? C.background : C.surface, borderBottomColor: C.border },
      ]}
      onPress={() => router.push({ pathname: '/(creator)/messages/[id]', params: { id: conv.id, name: conv.participantName } })}>
      <View style={styles.avatarWrap}>
        <Avatar name={conv.participantName} C={C} />
        {conv.isOnline && <View style={[styles.onlineDot, { backgroundColor: C.active, borderColor: C.surface }]} />}
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, { color: C.text }]}>{conv.participantName}</Text>
          <Text style={[styles.time, { color: C.textSecondary }]}>{time}</Text>
        </View>
        {conv.campaignTitle && (
          <Text style={[styles.campaign, { color: C.brinjal1 }]} numberOfLines={1}>{conv.campaignTitle}</Text>
        )}
        <Text style={[styles.lastMsg, { color: C.textSecondary }]} numberOfLines={1}>{conv.lastMessage}</Text>
      </View>
      {conv.unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: C.brinjal1 }]}>
          <Text style={styles.badgeText}>{conv.unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function ChatListScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const C = useAppColors();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = (user?.role ?? 'CREATOR') as 'CREATOR' | 'BUSINESS';
    chatService.getConversations(role).then((data) => { setConversations(data); setLoading(false); });
  }, [user?.role]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: C.text }]}>{t('messages.heading')}</Text>
        {totalUnread > 0 && (
          <View style={[styles.headerBadge, { backgroundColor: C.brinjal1 }]}>
            <Text style={styles.headerBadgeText}>{totalUnread}</Text>
          </View>
        )}
      </View>
      {loading ? (
        <Text style={[styles.empty, { color: C.textSecondary }]}>{t('common.loading')}</Text>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ConversationRow conv={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={[styles.empty, { color: C.textSecondary }]}>{t('messages.empty')}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  heading: { fontSize: 22, fontWeight: '700' },
  headerBadge: { borderRadius: 12, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  headerBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  list: { paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 14, borderBottomWidth: 1 },
  avatarWrap: { position: 'relative' },
  avatar: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  rowContent: { flex: 1, gap: 3 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '600' },
  time: { fontSize: 11 },
  campaign: { fontSize: 11, fontWeight: '500' },
  lastMsg: { fontSize: 13 },
  badge: { borderRadius: 12, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
