import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { useAppColors } from '@/context/ThemeContext';
import type { Proposal } from '@/types';

const MOCK_PROPOSALS: Proposal[] = [
  { id: 'p1', campaignId: '1', campaignTitle: 'Summer Fashion Collection', brand: 'StyleCo', status: 'accepted', submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), coverLetter: 'I would love to collaborate on this campaign...', proposedRate: '1200' },
  { id: 'p2', campaignId: '2', campaignTitle: 'Fitness Supplement Launch', brand: 'GymGear Co', status: 'pending', submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), coverLetter: 'As a fitness creator with 15K followers...', proposedRate: '800' },
  { id: 'p3', campaignId: '4', campaignTitle: 'Mobile Gaming Campaign', brand: 'PixelPlay', status: 'rejected', submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), coverLetter: 'I am an avid gamer and content creator...', proposedRate: '500' },
];

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { t } = useLanguage();
  const C = useAppColors();

  const STATUS: Record<Proposal['status'], { bg: string; color: string }> = {
    pending:  { bg: '#FFF8E8', color: C.draft },
    accepted: { bg: '#EEF9F3', color: C.active },
    rejected: { bg: '#FFEAEA', color: C.error },
  };
  const sc = STATUS[proposal.status];
  const statusKey = `creator.proposals.status${proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}` as any;
  const date = new Date(proposal.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <View style={[styles.card, { backgroundColor: C.surface }]}>
      <View style={styles.cardTop}>
        <View style={styles.brandInfo}>
          <Text style={[styles.brand, { color: C.text }]}>{proposal.brand}</Text>
          <Text style={[styles.campaign, { color: C.textSecondary }]}>{proposal.campaignTitle}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.color }]}>{t(statusKey)}</Text>
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Text style={[styles.meta, { color: C.textSecondary }]}>{t('creator.proposals.submitted', { date })}</Text>
        <Text style={[styles.meta, { color: C.textSecondary }]}>{t('creator.proposals.rate', { amount: proposal.proposedRate })}</Text>
      </View>
    </View>
  );
}

export default function ProposalsScreen() {
  const { t } = useLanguage();
  const C = useAppColors();
  const pending = MOCK_PROPOSALS.filter((p) => p.status === 'pending').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: C.text }]}>{t('creator.proposals.heading')}</Text>
        <Text style={[styles.subheading, { color: C.textSecondary }]}>
          {t('creator.proposals.subheading', { total: MOCK_PROPOSALS.length, pending })}
        </Text>
      </View>
      <FlatList
        data={MOCK_PROPOSALS}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <ProposalCard proposal={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={[styles.empty, { color: C.textSecondary }]}>{t('creator.proposals.empty')}</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  heading: { fontSize: 22, fontWeight: '700' },
  subheading: { fontSize: 13, marginTop: 2 },
  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 32 },
  card: { borderRadius: 14, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3, gap: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brandInfo: { flex: 1, gap: 2 },
  brand: { fontSize: 15, fontWeight: '700' },
  campaign: { fontSize: 13 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardBottom: { flexDirection: 'row', gap: 16 },
  meta: { fontSize: 12 },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
