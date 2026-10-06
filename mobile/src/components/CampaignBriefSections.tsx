import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { F, RADIUS, SCREEN_GUTTER, SHADOW, SPACING, lineHeightFor } from '@/utilities/constants';
import type { CampaignBrief, CampaignLocation, DeliverableItem, LocationScope } from '@/services/guidedCampaign';
import { BRIEF_SECTIONS, sectionFilled, shownPlatform, type BriefFieldDef } from '@/features/business/guided/briefSections';

/**
 * Everything the guided creator captures beyond the basics, for reading on
 * campaign-detail (business owner and creators alike): where creators should
 * be, deliverables per creator, timeline, and the advanced brief. Mirrors
 * web/src/app/events/CampaignBriefSections.tsx. Renders nothing for older
 * campaigns that have none of it.
 */
export interface BriefSource {
  locations?: CampaignLocation[];
  locationScope?: LocationScope;
  locationType?: 'ONSITE' | 'REMOTE' | null;
  location?: string | null;
  deliverableItems?: DeliverableItem[];
  brief?: CampaignBrief;
  startDate?: string | null;
  applicationDeadline?: string | null;
  deadline?: string;
}

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

function Card({ title, children }: { title: string; children: ReactNode }) {
  const C = useAppColors();
  return (
    <View style={[s.card, { backgroundColor: C.surface }]}>
      <Text style={[s.label, { color: C.textSecondary }]}>{title}</Text>
      {children}
    </View>
  );
}

export function CampaignBriefSections({ c }: { c: BriefSource }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const items = c.deliverableItems ?? [];
  const brief = c.brief ?? {};
  const locations = c.locations?.length ? c.locations : [];
  const sections = BRIEF_SECTIONS.filter((sec) => sectionFilled(brief, sec.key));
  const showWhere = locations.length > 1 || c.locationScope === 'NATIONWIDE';

  return (
    <>
      {/* Multiple places or nationwide — the single Location row can't say it. */}
      {showWhere ? (
        <Card title={t('guided.dWhere')}>
          {locations.length ? (
            <View style={s.wrap}>
              {locations.map((l) => (
                <View key={l.name} style={[s.pill, { borderColor: C.border }]}>
                  <FontAwesome5 name="map-marker-alt" size={11} color={C.brinjal1} />
                  <Text style={[s.body, { color: C.text }]}>{l.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[s.body, { color: C.text }]}>{t('guided.scopeNationwide')}</Text>
          )}
          <Text style={[s.small, { color: C.textSecondary }]}>{c.locationType === 'ONSITE' ? t('guided.creatorsVisitYou') : t('guided.dRemoteOk')}</Text>
        </Card>
      ) : null}

      {items.length ? (
        <Card title={t('guided.dDeliverables')}>
          {items.map((d, i) => {
            const p = shownPlatform(d.type, d.platform);
            return (
              <View key={i} style={s.itemRow}>
                <FontAwesome5 name="film" size={13} color={C.brinjal1} />
                <Text style={[s.body, { color: C.text, flex: 1 }]}>
                  <Text style={{ fontFamily: F.semibold }}>{d.quantity}×</Text> {t(`guided.deliv_${d.type}`)}
                </Text>
                {p ? <View style={[s.tag, { backgroundColor: C.primaryLight }]}><Text style={[s.small, { color: C.brinjal1, fontFamily: F.semibold }]}>{p}</Text></View> : null}
              </View>
            );
          })}
          <Text style={[s.small, { color: C.textSecondary }]}>{t('guided.dPerCreator')}</Text>
        </Card>
      ) : null}

      {c.startDate || c.applicationDeadline ? (
        <Card title={t('guided.dTimeline')}>
          {c.startDate ? <Line label={t('guided.startOn')} value={fmt(c.startDate)} /> : null}
          {c.applicationDeadline ? <Line label={t('guided.applyBy')} value={fmt(c.applicationDeadline)} /> : null}
          {c.deadline ? <Line label={t('guided.finishBy')} value={fmt(c.deadline)} /> : null}
        </Card>
      ) : null}

      {sections.map((sec) => (
        <Card key={sec.key} title={t(sec.title)}>
          {sec.fields.map((f) => {
            const v = (brief[sec.key] as Record<string, unknown> | undefined)?.[f.key];
            if (v == null || v === '' || (Array.isArray(v) && v.length === 0)) return null;
            return (
              <View key={f.key} style={{ gap: 4 }}>
                <Text style={[s.body, { color: C.text, fontFamily: F.semibold }]}>{t(f.label)}</Text>
                <FieldValue def={f} value={v} />
              </View>
            );
          })}
        </Card>
      ))}
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  const C = useAppColors();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md }}>
      <Text style={[s.body, { color: C.textSecondary }]}>{label}</Text>
      <Text style={[s.body, { color: C.text, fontFamily: F.semibold }]}>{value}</Text>
    </View>
  );
}

function FieldValue({ def, value }: { def: BriefFieldDef; value: unknown }) {
  const C = useAppColors();
  const { t } = useLanguage();
  if (def.kind === 'list') {
    return (
      <View style={{ gap: 4 }}>
        {(value as string[]).map((v) => (
          <View key={v} style={{ flexDirection: 'row', gap: 8 }}>
            {def.key === 'dos'
              ? <FontAwesome5 name="check" size={12} color={C.active} style={{ marginTop: 4 }} />
              : def.key === 'donts'
                ? <FontAwesome5 name="times" size={12} color={C.error} style={{ marginTop: 4 }} />
                : <Text style={[s.body, { color: C.textSecondary }]}>•</Text>}
            <Text style={[s.body, { color: C.textSecondary, flex: 1 }]}>{def.key === 'mentions' && !v.startsWith('@') ? `@${v}` : v}</Text>
          </View>
        ))}
      </View>
    );
  }
  let text: string;
  if (def.kind === 'bool') text = value ? t('guided.yes') : t('guided.no');
  else if (def.kind === 'tiers') text = (value as string[]).map((tier) => t(`guided.tier_${tier}`)).join(', ');
  else if (def.kind === 'date') text = fmt(value as string);
  else if (def.key === 'minEngagementRate') text = `${String(value)}%`;
  else if (def.key === 'licensingDays' || def.key === 'exclusivityDays') text = t('guided.daysCount', { count: Number(value) });
  else text = String(value);
  return <Text style={[s.body, { color: C.textSecondary }]}>{text}</Text>;
}

const s = StyleSheet.create({
  card:    { marginHorizontal: SCREEN_GUTTER, marginTop: 12, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: 12, ...SHADOW.card },
  label:   { fontSize: 13, lineHeight: lineHeightFor(13), textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontFamily: F.bold },
  body:    { fontSize: 14, lineHeight: lineHeightFor(14), fontFamily: F.regular },
  small:   { fontSize: 12, lineHeight: lineHeightFor(12), fontFamily: F.regular },
  wrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tag:     { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
});
