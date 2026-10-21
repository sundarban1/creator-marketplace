// Shared creator-side competition UI — mobile counterparts of
// web/src/app/competitions/parts.tsx (card, stage timeline, prizes, entry preview).
import type { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import type { CompetitionCard, JoinedCompetition, MySubmission, PublicPrize, PublicStage } from '@/services/competition';
import { withAlpha } from '@/utilities/color';
import { F, RADIUS, SHADOW, SPACING, lineHeightFor } from '@/utilities/constants';
import {
  competitionStatusBadge, creatorStatusBadge, formatNpt, npr, stageStatusBadge, timeLeft, toneColor, type Tone,
} from './format';

const ORANGE = '#EA580C';
const VIOLET = '#7C3AED';

export function Badge({ label, tone, dot }: { label: string; tone: Tone; dot?: boolean }) {
  const color = toneColor(tone);
  return (
    <View style={[s.badge, { backgroundColor: withAlpha(color, 0.12) }]}>
      {dot && <View style={[s.dot, { backgroundColor: color }]} />}
      <Text style={[s.badgeText, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function TypeBadge() {
  const { t } = useLanguage();
  return (
    <View style={[s.badge, { backgroundColor: withAlpha(ORANGE, 0.12) }]}>
      <FontAwesome5 name="trophy" size={9} color={ORANGE} />
      <Text style={[s.badgeText, { color: ORANGE }]}>{t('comp.typeBadge')}</Text>
    </View>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const C = useAppColors();
  return (
    <View style={[s.section, { backgroundColor: C.surface, borderColor: C.border }]}>
      <Text style={[s.sectionTitle, { color: C.text }]}>{title}</Text>
      {children}
    </View>
  );
}

export function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  const C = useAppColors();
  return (
    <View style={s.infoRow}>
      <Text style={[s.infoLabel, { color: C.textSecondary }]}>{label}</Text>
      {typeof value === 'string' ? <Text style={[s.infoValue, { color: C.text }]}>{value}</Text> : value}
    </View>
  );
}

function Cover({ uri, style }: { uri: string | null; style: object }) {
  return uri ? (
    <Image source={{ uri }} style={style} contentFit="cover" />
  ) : (
    <View style={[style, s.coverFallback, { backgroundColor: withAlpha(ORANGE, 0.1) }]}>
      <FontAwesome5 name="trophy" size={30} color={withAlpha(ORANGE, 0.6)} />
    </View>
  );
}

/** Discover/Results card — same content as web's CompetitionCard. */
export function CompetitionCardItem({ c, onPress }: { c: CompetitionCard; onPress: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const status = competitionStatusBadge(c.status, t);
  const reg = timeLeft(c.registrationDeadline, t);
  const cta = c.status === 'COMPLETED' ? t('comp.ctaViewResults')
    : c.joined ? t('comp.ctaViewProgress')
    : c.registrationOpen ? t('comp.ctaJoin') : t('comp.ctaView');

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={c.title}
      style={({ pressed }) => [s.card, SHADOW.card, { backgroundColor: C.surface, borderColor: C.border, opacity: pressed ? 0.92 : 1 }]}>
      <View>
        <Cover uri={c.coverImageUrl} style={s.cardCover} />
        <View style={s.coverBadgeRight}><TypeBadge /></View>
        {c.joined && (
          <View style={s.joinedPill}>
            <FontAwesome5 name="check-circle" solid size={10} color="#fff" />
            <Text style={s.joinedText}>{t('comp.joinedBadge')}</Text>
          </View>
        )}
      </View>
      <View style={s.cardBody}>
        <View style={s.rowWrap}>
          <Badge label={status.label} tone={status.tone} dot />
          {c.currentStage && c.status === 'ACTIVE' && (
            <Text style={[s.meta, { color: C.textSecondary }]} numberOfLines={1}>
              {c.currentStage.name} · {stageStatusBadge(c.currentStage.status, t).label}
            </Text>
          )}
        </View>
        <Text style={[s.cardTitle, { color: C.text }]} numberOfLines={2}>{c.title}</Text>
        {!!c.organizer.name && (
          <View style={s.orgRow}>
            {c.organizer.logoUrl
              ? <Image source={{ uri: c.organizer.logoUrl }} style={s.orgLogo} />
              : <View style={[s.orgLogo, { backgroundColor: C.primaryLight }]} />}
            <Text style={[s.meta, { color: C.textSecondary }]} numberOfLines={1}>{c.organizer.name}</Text>
          </View>
        )}
        {(c.prizePool || c.prizeHighlights.length > 0) && (
          <View style={s.prizeRow}>
            <FontAwesome5 name="trophy" size={12} color={ORANGE} style={{ marginTop: 3 }} />
            <Text style={[s.prizeText, { color: C.text }]} numberOfLines={2}>
              {c.prizePool ? t('comp.prizePool', { amount: npr(c.prizePool.amount) }) : c.prizeHighlights.map((p) => p.title).join(' · ')}
            </Text>
          </View>
        )}
        <View style={s.rowWrap}>
          <View style={s.iconMeta}>
            <FontAwesome5 name="users" size={11} color={C.textSecondary} />
            <Text style={[s.meta, { color: C.textSecondary }]}>{t('comp.participants', { n: c.participantCount })}</Text>
          </View>
          {c.registrationOpen && (
            <View style={s.iconMeta}>
              <FontAwesome5 name="clock" size={11} color={reg.urgent ? C.error : C.textSecondary} />
              <Text style={[s.meta, { color: reg.urgent ? C.error : C.textSecondary }, reg.urgent && { fontFamily: F.semibold }]}>
                {t('comp.registrationCloses', { when: reg.label })}
              </Text>
            </View>
          )}
        </View>
        <View style={s.ctaRow}>
          <Text style={[s.cta, { color: ORANGE }]}>{cta}</Text>
          <FontAwesome5 name="arrow-right" size={11} color={ORANGE} />
        </View>
      </View>
    </Pressable>
  );
}

/** "My competitions" row — same content as web's JoinedRow. */
export function JoinedRow({ j, onPress }: { j: JoinedCompetition; onPress: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const badge = creatorStatusBadge(j.status, t);
  const stage = j.currentStage && ['OPEN', 'UPCOMING'].includes(j.currentStage.status) ? j.currentStage : null;
  const left = stage ? timeLeft(stage.status === 'UPCOMING' ? stage.opensAt : stage.deadline, t) : null;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={j.competition.title}
      style={({ pressed }) => [s.joinedCard, SHADOW.card, { backgroundColor: C.surface, borderColor: C.border, opacity: pressed ? 0.92 : 1 }]}>
      <Cover uri={j.competition.coverImageUrl} style={s.joinedThumb} />
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <View style={s.rowWrap}>
          <Badge label={badge.label} tone={badge.tone} dot />
        </View>
        <Text style={[s.cardTitle, { color: C.text }]} numberOfLines={2}>{j.competition.title}</Text>
        <Text style={[s.meta, { color: C.textSecondary }]} numberOfLines={1}>
          {j.currentStage ? t('comp.stageOf', { name: j.currentStage.name, n: j.currentStage.order, total: j.competition.stageCount }) : ''}
          {j.competition.organizer.name ? `${j.currentStage ? ' · ' : ''}${j.competition.organizer.name}` : ''}
        </Text>
        <Text style={[s.small, { color: C.text }]}>{badge.hint}</Text>
        {stage && left && !left.past && (
          <View style={s.iconMeta}>
            <FontAwesome5 name="clock" size={11} color={left.urgent ? C.error : C.textSecondary} />
            <Text style={[s.meta, { color: left.urgent ? C.error : C.textSecondary }]}>
              {stage.status === 'UPCOMING' ? t('comp.opensOn', { when: formatNpt(stage.opensAt) }) : t('comp.deadlineOn', { when: formatNpt(stage.deadline) })}
            </Text>
          </View>
        )}
        {j.latestResult?.decision && (
          <Text style={[s.meta, { color: C.textSecondary }]}>
            {t('comp.latestResult', { stage: j.latestResult.stageName, result: j.latestResult.decision === 'ADVANCE' ? t('comp.outcomeAdvanced') : t('comp.outcomeNotSelected') })}
          </Text>
        )}
        {j.awards.length > 0 && <Text style={[s.small, { color: ORANGE, fontFamily: F.semibold }]}>🏆 {j.awards.map((a) => a.title).join(', ')}</Text>}
        <View style={s.ctaRow}>
          <Text style={[s.cta, { color: C.brinjal1 }]}>{j.status === 'SUBMISSION_REQUIRED' ? t('comp.ctaSubmit') : t('comp.ctaViewProgress')}</Text>
          <FontAwesome5 name="arrow-right" size={11} color={C.brinjal1} />
        </View>
      </View>
    </Pressable>
  );
}

export type TimelineStage = PublicStage & { outcome?: 'ADVANCE' | 'NOT_SELECTED' | null; submitted?: boolean; locked?: boolean; reviewRound?: boolean };

export function StageTimeline({ stages, currentId }: { stages: TimelineStage[]; currentId?: string | null }) {
  const C = useAppColors();
  const { t } = useLanguage();
  return (
    <View style={{ gap: 8 }}>
      {stages.map((st, i) => {
        const badge = stageStatusBadge(st.status, t);
        const done = st.status === 'RESULTS_PUBLISHED' || st.status === 'CLOSED';
        const icon = st.outcome === 'NOT_SELECTED' ? 'times-circle' : st.outcome === 'ADVANCE' || done ? 'check-circle' : st.locked ? 'lock' : st.status === 'OPEN' ? 'play-circle' : 'circle';
        const iconColor = st.outcome === 'NOT_SELECTED' ? C.textSecondary : done || st.outcome === 'ADVANCE' ? toneColor('positive') : st.status === 'OPEN' ? ORANGE : C.textSecondary;
        const isCurrent = st.id === currentId;
        return (
          <View key={st.id} style={[s.stageRow, { borderColor: isCurrent ? withAlpha(ORANGE, 0.45) : C.border, backgroundColor: isCurrent ? withAlpha(ORANGE, 0.05) : 'transparent' }]}>
            <FontAwesome5 name={icon} solid={icon !== 'circle'} size={15} color={iconColor} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, gap: 3 }}>
              <View style={s.rowWrap}>
                <Text style={[s.stageName, { color: C.text }]}>{i + 1}. {st.name}</Text>
                <Badge label={badge.label} tone={badge.tone} />
                {st.advanceLimit ? <Text style={[s.meta, { color: C.textSecondary }]}>{t('comp.topN', { n: st.advanceLimit })}</Text> : null}
              </View>
              <Text style={[s.meta, { color: C.textSecondary }]}>
                {st.reviewRound ? t('comp.reviewRoundLine') : st.status === 'UPCOMING' ? t('comp.opensOn', { when: formatNpt(st.opensAt) }) : t('comp.deadlineOn', { when: formatNpt(st.deadline) })}
              </Text>
              {st.outcome ? (
                <Text style={[s.meta, { fontFamily: F.semibold, color: st.outcome === 'ADVANCE' ? toneColor('positive') : C.textSecondary }]}>
                  {st.outcome === 'ADVANCE' ? t('comp.outcomeAdvanced') : t('comp.outcomeNotSelected')}
                </Text>
              ) : st.submitted !== undefined && st.status !== 'UPCOMING' && !st.reviewRound ? (
                <Text style={[s.meta, { color: st.submitted ? toneColor('positive') : C.textSecondary }]}>
                  {st.submitted ? t('comp.entrySubmitted') : t('comp.entryNotSubmitted')}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function PrizeList({ prizes, pool }: { prizes: PublicPrize[]; pool?: { amount: number } | null }) {
  const C = useAppColors();
  const { t } = useLanguage();
  if (!prizes.length) return <Text style={[s.small, { color: C.textSecondary }]}>{t('comp.noPrizes')}</Text>;
  return (
    <View>
      {prizes.map((p, i) => (
        <View key={p.id ?? i} style={[s.prizeItem, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.border }]}>
          <FontAwesome5 name="award" size={14} color={p.kind === 'PLACEMENT' ? ORANGE : VIOLET} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[s.prizeTitle, { color: C.text }]}>
              {p.title}{p.recipientCount > 1 ? <Text style={{ fontFamily: F.regular, color: C.textSecondary }}> × {p.recipientCount}</Text> : null}
            </Text>
            {!!p.description && <Text style={[s.meta, { color: C.textSecondary }]}>{p.description}</Text>}
            {!!p.notes && <Text style={[s.meta, { color: C.textSecondary, fontStyle: 'italic' }]}>{p.notes}</Text>}
          </View>
          {p.amount != null && (
            <Text style={[s.prizeTitle, { color: C.text }]}>
              {npr(p.amount)}{p.recipientCount > 1 ? <Text style={{ fontFamily: F.regular, fontSize: 12, color: C.textSecondary }}> {t('comp.each')}</Text> : null}
            </Text>
          )}
        </View>
      ))}
      {pool && (
        <View style={[s.poolRow, { borderTopColor: C.border }]}>
          <Text style={[s.small, { color: C.textSecondary }]}>{t('comp.totalAdvertised')}</Text>
          <Text style={[s.small, { color: C.text, fontFamily: F.semibold }]}>{npr(pool.amount)}</Text>
        </View>
      )}
      <Text style={[s.meta, { color: C.textSecondary, marginTop: 8 }]}>{t('comp.prizeDisclaimer')}</Text>
    </View>
  );
}

export function SubmissionPreview({ sub }: { sub: Pick<MySubmission, 'method' | 'videoUrl' | 'externalUrl' | 'caption'> }) {
  const C = useAppColors();
  const url = sub.externalUrl ?? sub.videoUrl;
  if (!url) return null;
  let host = url;
  const m = /^https?:\/\/(?:www\.)?([^/?#]+)/i.exec(url);
  if (m) host = m[1];
  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={() => void Linking.openURL(url)} accessibilityRole="link"
        style={[s.linkBox, { borderColor: C.border, backgroundColor: C.surface }]}>
        <FontAwesome5 name={sub.method === 'VIDEO_UPLOAD' ? 'video' : 'link'} size={14} color={C.brinjal1} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.small, { color: C.text, fontFamily: F.semibold }]}>{host}</Text>
          <Text style={[s.meta, { color: C.textSecondary }]} numberOfLines={1}>{url}</Text>
        </View>
        <FontAwesome5 name="external-link-alt" size={12} color={C.textSecondary} />
      </Pressable>
      {!!sub.caption && <Text style={[s.small, { color: C.textSecondary }]}>{sub.caption}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  badge:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  dot:       { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontFamily: F.semibold },
  section:   { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: F.bold, lineHeight: lineHeightFor(15) },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  infoLabel: { fontSize: 13, fontFamily: F.regular, flexShrink: 0 },
  infoValue: { fontSize: 13, fontFamily: F.medium, flexShrink: 1, textAlign: 'right' },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  card:      { borderWidth: 1, borderRadius: RADIUS.lg, overflow: 'hidden' },
  cardCover: { width: '100%', aspectRatio: 16 / 9 },
  coverBadgeRight: { position: 'absolute', top: 10, right: 10, backgroundColor: '#fff', borderRadius: RADIUS.full },
  joinedPill: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(17,24,39,0.75)' },
  joinedText: { color: '#fff', fontSize: 11, fontFamily: F.semibold },
  cardBody:  { padding: SPACING.lg, gap: 8 },
  rowWrap:   { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontFamily: F.bold, lineHeight: lineHeightFor(16) },
  orgRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orgLogo:   { width: 18, height: 18, borderRadius: 9 },
  prizeRow:  { flexDirection: 'row', gap: 6 },
  prizeText: { flex: 1, fontSize: 14, fontFamily: F.semibold, lineHeight: lineHeightFor(14) },
  iconMeta:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta:      { fontSize: 12, fontFamily: F.regular, lineHeight: lineHeightFor(12) },
  small:     { fontSize: 13, fontFamily: F.regular, lineHeight: lineHeightFor(13) },
  ctaRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  cta:       { fontSize: 13, fontFamily: F.semibold },
  joinedCard: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: RADIUS.lg, padding: 12 },
  joinedThumb: { width: 72, height: 72, borderRadius: RADIUS.md },
  stageRow:  { flexDirection: 'row', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10 },
  stageName: { fontSize: 13, fontFamily: F.semibold },
  prizeItem: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  prizeTitle: { fontSize: 14, fontFamily: F.semibold },
  poolRow:   { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 2 },
  linkBox:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10 },
});
