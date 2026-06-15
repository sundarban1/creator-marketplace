import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppColors } from '@/context/ThemeContext';
import { CATEGORY_META, DEFAULT_META, cardBg } from '@/features/creator/data/filterOptions';
import { campaignService } from '@/services/campaign';
import type { Campaign } from '@/types';

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CampaignDetailScreen() {
  const { campaignId } = useLocalSearchParams<{ campaignId: string }>();
  const C = useAppColors();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!campaignId) return;
    campaignService.getById(campaignId)
      .then(setCampaign)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load campaign'))
      .finally(() => setLoading(false));
  }, [campaignId]);

  function handleApply() {
    if (!campaign) return;
    router.push({
      pathname: '/submit-proposal',
      params: { campaignId: campaign.id, campaignTitle: campaign.title, brand: campaign.brand },
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <Pressable style={styles.headerBackBtn} onPress={() => router.back()}>
            <Text style={[styles.headerBackIcon, { color: C.brinjal1 }]}>‹</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: C.text }]}>Campaign Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={C.brinjal1} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !campaign) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Text style={styles.notFoundIcon}>🔍</Text>
          <Text style={[styles.notFoundText, { color: C.textSecondary }]}>{error || 'Campaign not found'}</Text>
          <Pressable style={[styles.goBackBtn, { backgroundColor: C.brinjal1 }]} onPress={() => router.back()}>
            <Text style={styles.goBackBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const heroBg = cardBg(campaign.category);
  const catMeta = CATEGORY_META[campaign.category] ?? DEFAULT_META;
  const posted = daysAgo(campaign.createdAt);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable style={styles.headerBackBtn} onPress={() => router.back()}>
          <Text style={[styles.headerBackIcon, { color: C.brinjal1 }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>Campaign Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: heroBg }]}>
          <Text style={styles.heroIcon}>{catMeta.emoji}</Text>
          <View style={[styles.heroCatBadge, { backgroundColor: C.badgeFeatured }]}>
            <Text style={styles.heroBadgeText}>{campaign.category.toUpperCase()}</Text>
          </View>
          {campaign.isNew && (
            <View style={[styles.heroNewBadge, { backgroundColor: C.badgeNew }]}>
              <Text style={styles.heroBadgeText}>NEW</Text>
            </View>
          )}
          <View style={[styles.heroPosted, { backgroundColor: 'rgba(0,0,0,0.38)' }]}>
            <Text style={styles.heroPostedText}>
              {posted === 0 ? 'Posted today' : posted === 1 ? 'Posted yesterday' : `Posted ${posted} days ago`}
            </Text>
          </View>
        </View>

        {/* Title block */}
        <View style={[styles.titleBlock, { backgroundColor: C.surface, borderBottomColor: C.border }]}>
          <View style={styles.brandRow}>
            <View style={[styles.brandAvatar, { backgroundColor: C.brinjal1 }]}>
              <Text style={styles.brandAvatarText}>{campaign.brand[0]}</Text>
            </View>
            <Text style={[styles.brandName, { color: C.text }]}>{campaign.brand}</Text>
            <View style={[styles.verifiedBadge, { backgroundColor: C.active }]}>
              <Text style={styles.verifiedIcon}>✓</Text>
            </View>
            <View style={[styles.platformTag, { backgroundColor: C.primaryLight, marginLeft: 'auto' }]}>
              <Text style={[styles.platformTagText, { color: C.brinjal1 }]}>{campaign.platform}</Text>
            </View>
          </View>
          <Text style={[styles.campaignTitle, { color: C.text }]}>{campaign.title}</Text>
          <View style={styles.budgetRow}>
            <Text style={[styles.budget, { color: C.brinjal1 }]}>{campaign.budget}</Text>
            <View style={[styles.proposalsBadge, { backgroundColor: C.primaryLight }]}>
              <Text style={[styles.proposalsText, { color: C.brinjal1 }]}>
                {campaign.proposals} {campaign.proposals === 1 ? 'proposal' : 'proposals'}
              </Text>
            </View>
          </View>
        </View>

        {/* Details grid */}
        <View style={[styles.card, { backgroundColor: C.surface }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Campaign Details</Text>
          <View style={styles.detailsGrid}>
            <DetailRow icon="📅" label="Deadline" value={formatDeadline(campaign.deadline)} C={C} />
            <DetailRow icon="👥" label="Min Followers" value={campaign.minFollowers} C={C} />
            <DetailRow icon="🎬" label="Content Type" value={campaign.contentType} C={C} />
            <DetailRow icon="💳" label="Payment" value={campaign.paymentType} C={C} />
            {campaign.location ? <DetailRow icon="📍" label="Location" value={campaign.location} C={C} /> : null}
            <DetailRow icon="📊" label="Status" value={campaign.status ? campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1) : 'Active'} C={C} />
          </View>
        </View>

        {/* Description */}
        <View style={[styles.card, { backgroundColor: C.surface }]}>
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>About this Campaign</Text>
          <Text style={[styles.description, { color: C.text }]}>{campaign.description}</Text>
        </View>

        {/* Deliverables */}
        {campaign.deliverables ? (
          <View style={[styles.card, { backgroundColor: C.surface }]}>
            <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Deliverables</Text>
            {campaign.deliverables.split('+').map((d, i) => (
              <ReqItem key={i} text={d.trim()} C={C} />
            ))}
          </View>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.ctaBar, { backgroundColor: C.surface, borderTopColor: C.border }]}>
        <View style={styles.ctaInfo}>
          <Text style={[styles.ctaBudget, { color: C.text }]}>{campaign.budget}</Text>
          <Text style={[styles.ctaLabel, { color: C.textSecondary }]}>Estimated budget</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.applyBtn, { backgroundColor: C.brinjal1, shadowColor: C.brinjal1 }, pressed && { opacity: 0.88 }]}
          onPress={handleApply}>
          <Text style={styles.applyBtnText}>Submit Proposal</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value, C }: { icon: string; label: string; value: string; C: any }) {
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIcon, { backgroundColor: C.background }]}>
        <Text style={styles.detailIconText}>{icon}</Text>
      </View>
      <View style={styles.detailContent}>
        <Text style={[styles.detailLabel, { color: C.textSecondary }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: C.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function ReqItem({ text, C }: { text: string; C: any }) {
  return (
    <View style={styles.reqItem}>
      <View style={[styles.reqDot, { backgroundColor: C.brinjal1 }]} />
      <Text style={[styles.reqText, { color: C.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundIcon: { fontSize: 48 },
  notFoundText: { fontSize: 17, fontWeight: '600' },
  goBackBtn: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  goBackBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  headerBackBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerBackIcon: { fontSize: 28, lineHeight: 34 },
  headerTitle: { fontSize: 17, fontWeight: '700' },

  scroll: { paddingBottom: 20 },

  hero: { height: 180, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  heroIcon: { fontSize: 60, opacity: 0.75 },
  heroCatBadge: { position: 'absolute', top: 14, left: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroNewBadge: { position: 'absolute', top: 14, right: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  heroBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  heroPosted: { position: 'absolute', bottom: 12, right: 14, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  heroPostedText: { fontSize: 11, color: '#fff', fontWeight: '500' },

  titleBlock: { paddingHorizontal: 20, paddingVertical: 16, gap: 10, borderBottomWidth: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  brandAvatarText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  brandName: { fontSize: 14, fontWeight: '600' },
  verifiedBadge: { width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  verifiedIcon: { fontSize: 9, color: '#fff', fontWeight: '700' },
  platformTag: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  platformTagText: { fontSize: 12, fontWeight: '600' },
  campaignTitle: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  budget: { fontSize: 22, fontWeight: '800' },
  proposalsBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  proposalsText: { fontSize: 12, fontWeight: '600' },

  card: {
    marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  detailsGrid: { gap: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  detailIconText: { fontSize: 16 },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '600', marginTop: 1 },
  description: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  reqItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 4 },
  reqDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  reqText: { flex: 1, fontSize: 14, lineHeight: 20 },

  ctaBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderTopWidth: 1, gap: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 }, elevation: 8,
  },
  ctaInfo: { flex: 1 },
  ctaBudget: { fontSize: 18, fontWeight: '800' },
  ctaLabel: { fontSize: 11, marginTop: 1 },
  applyBtn: {
    borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14,
    shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  applyBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
