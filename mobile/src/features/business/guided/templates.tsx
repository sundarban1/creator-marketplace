import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { BottomSheet } from '@/components/BottomSheet';
import { SPACING } from '@/utilities/constants';
import { campaignService } from '@/services/campaign';
import { guidedCampaignService, type MyTemplate, type SystemTemplate } from '@/services/guidedCampaign';
import { Input, LinkButton, st } from './parts';

// Templates & "start from a previous campaign" (UX spec §23) — native
// counterpart of web/src/app/business/guided/templates.tsx.

export type StartSource = { source: 'system' | 'template' | 'campaign'; id: string };

// Backend template icons are FontAwesome-ish names; map to FA5 glyphs.
const ICONS: Record<string, keyof typeof FontAwesome5.glyphMap> = {
  utensils: 'utensils', rocket: 'rocket', store: 'store', 'calendar-check': 'calendar-check', video: 'video',
  hotel: 'hotel', 'graduation-cap': 'graduation-cap', star: 'star', bullhorn: 'bullhorn',
};

function TemplateCard({ icon, title, sub, busy, onPress, onDelete }: {
  icon: keyof typeof FontAwesome5.glyphMap; title: string; sub?: string | null; busy?: boolean; onPress: () => void; onDelete?: () => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={({ pressed }) => [st.row, { borderColor: C.border, backgroundColor: pressed ? C.primaryLight : C.surface, paddingVertical: SPACING.sm, alignItems: 'flex-start' }]}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
        {busy ? <ActivityIndicator size="small" color={C.brinjal1} /> : <FontAwesome5 name={icon} size={13} color={C.brinjal1} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[st.body, { color: C.text, fontWeight: '600' }]}>{title}</Text>
        {sub ? <Text style={[st.small, { color: C.textSecondary }]} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={8} style={st.iconBtn} accessibilityLabel={t('guided.tplDelete')}>
          <FontAwesome5 name="trash-alt" size={12} color={C.textSecondary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function SectionHeading({ text }: { text: string }) {
  const C = useAppColors();
  return <Text style={[st.small, { color: C.textSecondary, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 }]}>{text}</Text>;
}

/** Collapsed by default so the first screen stays one simple question (§3). */
export function StartFromTemplates({ onPick, busyId }: { onPick: (s: StartSource) => void; busyId: string | null }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [system, setSystem] = useState<SystemTemplate[]>([]);
  const [mine, setMine] = useState<MyTemplate[]>([]);
  const [previous, setPrevious] = useState<{ id: string; title: string; deliverables?: string }[]>([]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next || system.length) return;
    setLoading(true);
    try {
      const [tpl, past] = await Promise.all([
        guidedCampaignService.templates(),
        campaignService.listMy({ limit: 20 }).catch(() => ({ campaigns: [] as { id: string; title: string; status?: string; campaignType?: string; deliverables?: string }[] })),
      ]);
      setSystem(tpl.system);
      setMine(tpl.mine);
      setPrevious(past.campaigns.filter((c) => c.campaignType !== 'OPEN_EVENT' && c.status !== 'draft').slice(0, 5));
    } catch { /* section simply stays empty */ } finally { setLoading(false); }
  };

  const remove = (m: MyTemplate) => Alert.alert(t('guided.tplDelete'), t('guided.tplDeleteConfirm'), [
    { text: t('guided.cancel'), style: 'cancel' },
    { text: t('guided.tplDelete'), style: 'destructive', onPress: () => { guidedCampaignService.deleteTemplate(m.id).catch(() => undefined); setMine((xs) => xs.filter((x) => x.id !== m.id)); } },
  ]);

  return (
    <View>
      <LinkButton icon={open ? 'chevron-up' : 'th-large'} label={t('guided.tplBrowse')} onPress={toggle} tone={C.text} />
      {open ? (
        <View style={{ gap: SPACING.lg, marginTop: SPACING.sm }}>
          {loading ? <ActivityIndicator color={C.brinjal1} /> : null}
          {mine.length ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeading text={t('guided.tplMine')} />
              {mine.map((m) => <TemplateCard key={m.id} icon="bookmark" title={m.name} sub={m.summary} busy={busyId === m.id} onPress={() => onPick({ source: 'template', id: m.id })} onDelete={() => remove(m)} />)}
            </View>
          ) : null}
          {previous.length ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeading text={t('guided.tplPrevious')} />
              {previous.map((c) => <TemplateCard key={c.id} icon="history" title={c.title} sub={c.deliverables} busy={busyId === c.id} onPress={() => onPick({ source: 'campaign', id: c.id })} />)}
            </View>
          ) : null}
          {system.length ? (
            <View style={{ gap: SPACING.sm }}>
              <SectionHeading text={t('guided.tplKolab')} />
              {system.map((s) => <TemplateCard key={s.key} icon={ICONS[s.icon] ?? 'clone'} title={s.name} sub={s.summary} busy={busyId === s.key} onPress={() => onPick({ source: 'system', id: s.key })} />)}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** "Save as template" — name it, keep everything but the dates (§23). */
export function SaveTemplateButton({ campaignId, defaultName, beforeSave }: { campaignId: string | null; defaultName: string; beforeSave?: () => Promise<void> }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  if (!campaignId) return null;
  return (
    <>
      <LinkButton icon="bookmark" label={t('guided.tplSaveAs')} onPress={() => { setName(defaultName); setError(''); setSaved(false); setOpen(true); }} />
      <BottomSheet visible={open} onClose={() => (busy ? undefined : setOpen(false))} title={t('guided.tplSaveTitle')} maxHeightPct={0.6}>
        {saved ? (
          <View style={{ gap: SPACING.md }}>
            <Text style={[st.body, { color: C.text }]}>{t('guided.tplSaved')}</Text>
            <Button label={t('guided.done')} onPress={() => setOpen(false)} fullWidth />
          </View>
        ) : (
          <View style={{ gap: SPACING.md }}>
            <Text style={[st.small, { color: C.textSecondary }]}>{t('guided.tplSaveHint')}</Text>
            <Input value={name} onChangeText={setName} maxLength={80} placeholder={t('guided.tplName')} accessibilityLabel={t('guided.tplName')} />
            {error ? <Text style={[st.small, { color: C.error }]}>{error}</Text> : null}
            <Button
              label={t('guided.tplSave')}
              loading={busy}
              disabled={!name.trim()}
              fullWidth
              onPress={async () => {
                setBusy(true); setError('');
                try { await beforeSave?.(); await guidedCampaignService.saveTemplate(campaignId, name.trim()); setSaved(true); }
                catch (e) { setError(e instanceof Error ? e.message : t('guided.genericError')); }
                finally { setBusy(false); }
              }}
            />
          </View>
        )}
      </BottomSheet>
    </>
  );
}
