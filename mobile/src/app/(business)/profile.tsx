import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/utilities/constants';

const MOCK_STATS = [
  { label: 'Campaigns', value: '3' },
  { label: 'Proposals', value: '15' },
  { label: 'Hired', value: '8' },
];

const MENU_ITEMS = [
  { icon: '🏢', label: 'Company Details', sub: 'Update your business info' },
  { icon: '💳', label: 'Billing & Plans', sub: 'Manage subscription' },
  { icon: '🔔', label: 'Notifications', sub: 'Email and push preferences' },
  { icon: '🔒', label: 'Privacy & Security', sub: 'Password, 2FA' },
  { icon: '❓', label: 'Help & Support', sub: 'FAQs, contact us' },
];

export default function BusinessProfileScreen() {
  const { user, logout } = useAuth();

  const initials = (user?.name ?? 'B')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const firstName = user?.name?.split(' ')[0] ?? 'Business';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Hero header ── */}
        <View style={styles.hero}>
          <View style={styles.heroBubble1} />
          <View style={styles.heroBubble2} />

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Pressable style={styles.editBadge}>
              <Text style={styles.editBadgeIcon}>✏️</Text>
            </Pressable>
          </View>

          <Text style={styles.heroName}>{user?.name ?? '—'}</Text>
          <Text style={styles.heroEmail}>{user?.email ?? '—'}</Text>

          <View style={styles.heroBadgeRow}>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedIcon}>✓</Text>
              <Text style={styles.verifiedText}>Verified Business</Text>
            </View>
          </View>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsCard}>
          {MOCK_STATS.map((s, i) => (
            <View key={s.label} style={[styles.statItem, i < MOCK_STATS.length - 1 && styles.statDivider]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick actions ── */}
        <View style={styles.quickRow}>
          <Pressable
            style={styles.quickBtn}
            onPress={() => router.push('/create-campaign')}>
            <Text style={styles.quickIcon}>➕</Text>
            <Text style={styles.quickLabel}>New Campaign</Text>
          </Pressable>
          <Pressable style={styles.quickBtn}>
            <Text style={styles.quickIcon}>📊</Text>
            <Text style={styles.quickLabel}>Analytics</Text>
          </Pressable>
          <Pressable style={styles.quickBtn}>
            <Text style={styles.quickIcon}>📁</Text>
            <Text style={styles.quickLabel}>Drafts</Text>
          </Pressable>
        </View>

        {/* ── Account section ── */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.menuCard}>
          <View style={styles.menuRow}>
            <Text style={styles.menuIcon}>👤</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuRowLabel}>Full Name</Text>
              <Text style={styles.menuRowSub}>{user?.name ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.menuDivider} />
          <View style={styles.menuRow}>
            <Text style={styles.menuIcon}>📧</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuRowLabel}>Email</Text>
              <Text style={styles.menuRowSub}>{user?.email ?? '—'}</Text>
            </View>
          </View>
          <View style={styles.menuDivider} />
          <View style={styles.menuRow}>
            <Text style={styles.menuIcon}>🏷️</Text>
            <View style={styles.menuInfo}>
              <Text style={styles.menuRowLabel}>Account Type</Text>
              <Text style={styles.menuRowSub}>Business</Text>
            </View>
          </View>
        </View>

        {/* ── Settings section ── */}
        <Text style={styles.sectionLabel}>SETTINGS</Text>
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <View key={item.label}>
              <Pressable
                style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuRowLabel}>{item.label}</Text>
                  <Text style={styles.menuRowSub}>{item.sub}</Text>
                </View>
                <Text style={styles.menuChevron}>›</Text>
              </Pressable>
              {i < MENU_ITEMS.length - 1 && <View style={styles.menuDivider} />}
            </View>
          ))}
        </View>

        {/* ── Logout ── */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
          onPress={logout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.version}>CreatorMarket v1.0.0</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  /* Hero */
  hero: {
    backgroundColor: COLORS.brinjal1,
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 36,
    overflow: 'hidden',
  },
  heroBubble1: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -80,
    right: -60,
  },
  heroBubble2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -40,
    left: -40,
  },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#fff' },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  editBadgeIcon: { fontSize: 13 },
  heroName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  heroEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 14,
  },
  heroBadgeRow: { flexDirection: 'row', gap: 8 },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  verifiedIcon: { fontSize: 11, color: '#4ADE80', fontWeight: '700' },
  verifiedText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  /* Stats */
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statDivider: {
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.brinjal1, marginBottom: 2 },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },

  /* Quick actions */
  quickRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 12,
    marginBottom: 28,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  quickIcon: { fontSize: 22 },
  quickLabel: { fontSize: 11, fontWeight: '600', color: COLORS.text },

  /* Section label */
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    marginBottom: 10,
  },

  /* Menu card */
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  menuRowPressed: { backgroundColor: COLORS.background },
  menuIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  menuInfo: { flex: 1 },
  menuRowLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  menuRowSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  menuChevron: { fontSize: 20, color: COLORS.border, fontWeight: '300' },
  menuDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 58 },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    height: 52,
  },
  logoutIcon: { fontSize: 18 },
  logoutText: { fontSize: 15, fontWeight: '700', color: COLORS.error },

  version: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.border,
    marginBottom: 32,
  },
});
