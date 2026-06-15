import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import { notificationService } from '@/services/notifications';
import type { AppNotification } from '@/types';

const TYPE_ICON: Record<AppNotification['type'], string> = {
  proposal_accepted: '✅',
  proposal_rejected: '❌',
  proposal_received: '📩',
  new_message: '💬',
  campaign_deadline: '⏰',
  campaign_closed: '🔒',
  new_campaign: '🎯',
  payment_released: '💸',
};

function getGroup(timestamp: string): 'Today' | 'This Week' | 'Earlier' {
  const diffDays = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return 'Today';
  if (diffDays < 7) return 'This Week';
  return 'Earlier';
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function NotificationItem({ item, onPress }: { item: AppNotification; onPress: (id: string) => void }) {
  const C = useAppColors();
  return (
    <Pressable
      style={[styles.item, { backgroundColor: item.isRead ? C.surface : C.primaryLight, borderBottomColor: C.border }]}
      onPress={() => onPress(item.id)}>
      {!item.isRead && <View style={[styles.accentBar, { backgroundColor: C.brinjal1 }]} />}
      <View style={[styles.iconWrap, { backgroundColor: C.background }]}>
        <Text style={styles.icon}>{TYPE_ICON[item.type]}</Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: C.text }]}>{item.title}</Text>
        <Text style={[styles.itemBody, { color: C.textSecondary }]} numberOfLines={2}>{item.body}</Text>
        <Text style={[styles.itemTime, { color: C.closed }]}>{timeAgo(item.timestamp)}</Text>
      </View>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const C = useAppColors();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationService.getNotifications().then((data) => { setNotifications(data); setLoading(false); });
  }, []);

  async function handleMarkAll() {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function handlePress(id: string) {
    await notificationService.markAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    const n = notifications.find((n) => n.id === id);
    if (!n) return;
    const isCreator = user?.role === 'CREATOR';
    if (n.type === 'new_message') {
      router.push(isCreator ? '/(creator)/messages/' : '/(business)/messages/');
    } else if (['proposal_accepted', 'proposal_rejected', 'new_campaign', 'campaign_deadline', 'campaign_closed', 'payment_released'].includes(n.type)) {
      if (isCreator) router.push('/(creator)/proposals');
    } else if (n.type === 'proposal_received') {
      if (!isCreator) router.push('/(business)/');
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const groups = ['Today', 'This Week', 'Earlier'] as const;
  const grouped = groups
    .map((g) => ({ group: g, items: notifications.filter((n) => getGroup(n.timestamp) === g) }))
    .filter((g) => g.items.length > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.heading, { color: C.text }]}>{t('notifications.heading')}</Text>
          {unreadCount > 0 && (
            <Text style={[styles.subheading, { color: C.textSecondary }]}>
              {t('notifications.unread', { count: unreadCount })}
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Pressable onPress={handleMarkAll} style={[styles.markAllBtn, { borderColor: C.brinjal1 }]}>
            <Text style={[styles.markAllText, { color: C.brinjal1 }]}>{t('notifications.markAllRead')}</Text>
          </Pressable>
        )}
      </View>
      {loading ? (
        <Text style={[styles.empty, { color: C.textSecondary }]}>{t('common.loading')}</Text>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(g) => g.group}
          renderItem={({ item: g }) => (
            <View>
              <Text style={[styles.groupLabel, { color: C.textSecondary }]}>{g.group}</Text>
              {g.items.map((n) => <NotificationItem key={n.id} item={n} onPress={handlePress} />)}
            </View>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={[styles.empty, { color: C.textSecondary }]}>{t('notifications.allCaughtUp')}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  heading: { fontSize: 22, fontWeight: '700' },
  subheading: { fontSize: 13, marginTop: 2 },
  markAllBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  markAllText: { fontSize: 12, fontWeight: '600' },
  list: { paddingBottom: 32 },
  groupLabel: { fontSize: 12, fontWeight: '700', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  item: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, gap: 12 },
  accentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 18 },
  itemContent: { flex: 1, gap: 3 },
  itemTitle: { fontSize: 14, fontWeight: '600' },
  itemBody: { fontSize: 13, lineHeight: 18 },
  itemTime: { fontSize: 11 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
