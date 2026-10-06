import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { BottomSheet } from '@/components/BottomSheet';
import { LocationSearchModal } from '@/components/LocationSearchModal';
import { F, FONT_SIZE, MIN_TOUCH_TARGET, RADIUS, SCREEN_GUTTER, SPACING, lineHeightFor } from '@/utilities/constants';
import type { CampaignLocation, DeliverableItem, LocationScope, Provenance } from '@/services/guidedCampaign';
import type { CampaignRuleIssue } from '../utils/campaignRules';
import type { SaveStatus } from './useAutosave';
import { DELIVERABLE_TYPES, shownPlatform } from './briefSections';

// Native building blocks of the guided creator — same roles as
// web/src/app/business/guided/parts.tsx.

// ── Layout ───────────────────────────────────────────────────────────────────

/** One step: heading, short explanation, optional example, scrollable body,
 *  and a footer pinned above the home indicator with one primary action. */
export function StepShell({ title, subtitle, example, header, children, footer }: {
  title: string;
  subtitle?: string;
  example?: string;
  header?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}) {
  const C = useAppColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md, paddingBottom: SPACING.xxl }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {header}
        <Text style={[st.title, { color: C.text }]}>{title}</Text>
        {subtitle ? <Text style={[st.subtitle, { color: C.textSecondary }]}>{subtitle}</Text> : null}
        {example ? <Text style={[st.example, { color: C.textPlaceholder }]}>{example}</Text> : null}
        <View style={{ marginTop: SPACING.xl, gap: SPACING.xl }}>{children}</View>
      </ScrollView>
      <View style={[st.footer, { borderTopColor: C.border, backgroundColor: C.background, paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
        {footer}
      </View>
    </View>
  );
}

export function Field({ label, optional, accessory, children }: { label: string; optional?: boolean; accessory?: ReactNode; children: ReactNode }) {
  const C = useAppColors();
  const { t } = useLanguage();
  return (
    <View>
      <View style={st.fieldHead}>
        <Text style={[st.fieldLabel, { color: C.text }]}>{label}</Text>
        {optional ? <Text style={[st.small, { color: C.textPlaceholder }]}>{t('guided.optional')}</Text> : null}
        {accessory}
      </View>
      {children}
    </View>
  );
}

export function FooterNav({ onBack, onNext, nextLabel, busy, disabled }: { onBack?: () => void; onNext: () => void; nextLabel?: string; busy?: boolean; disabled?: boolean }) {
  const { t } = useLanguage();
  return (
    <View style={{ flexDirection: 'row', gap: SPACING.md, alignItems: 'center' }}>
      {onBack ? <View style={{ flex: 1 }}><Button label={t('guided.back')} variant="ghost" onPress={onBack} /></View> : null}
      <View style={{ flex: 2 }}>
        <Button label={nextLabel ?? t('guided.continue')} onPress={onNext} loading={busy} disabled={disabled} fullWidth />
      </View>
    </View>
  );
}

// ── Progress (§21) ───────────────────────────────────────────────────────────

export function ProgressRail({ steps, current }: { steps: { key: string; label: string }[]; current: string }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const idx = Math.max(0, steps.findIndex((s) => s.key === current));
  const left = steps.length - 1 - idx;
  return (
    <View style={{ marginBottom: SPACING.lg }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: 6 }}>
        {steps.map((s, i) => (
          <View key={s.key} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= idx ? C.brinjal1 : C.border }} />
        ))}
      </View>
      <Text style={[st.small, { color: C.textSecondary }]}>
        {steps[idx]?.label} · {left <= 0 ? t('guided.progressLast') : left === 1 ? t('guided.progressAlmost') : t('guided.progressLeft', { count: left })}
      </Text>
    </View>
  );
}

export function SaveIndicator({ status }: { status: SaveStatus }) {
  const C = useAppColors();
  const { t } = useLanguage();
  if (status === 'idle') return null;
  const label = status === 'saving' ? t('guided.saving') : status === 'saved' ? t('guided.saved') : t('guided.savedOnDevice');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityLiveRegion="polite">
      {status === 'saving'
        ? <ActivityIndicator size="small" color={C.textSecondary} />
        : <FontAwesome5 name={status === 'saved' ? 'check' : 'cloud'} size={10} color={status === 'saved' ? C.active : C.draft} />}
      <Text style={[st.small, { color: C.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ── Choices ──────────────────────────────────────────────────────────────────

export function ChoiceChips<T extends string>({ options, value, onChange, multi = false }: {
  options: { value: T; label: string; icon?: keyof typeof FontAwesome5.glyphMap }[];
  value: T | T[] | null;
  onChange: (v: T) => void;
  multi?: boolean;
}) {
  const C = useAppColors();
  const on = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <View style={st.chipWrap} accessibilityRole={multi ? undefined : 'radiogroup'}>
      {options.map((o) => {
        const active = on(o.value);
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityState={multi ? { checked: active } : { selected: active }}
            style={({ pressed }) => [
              st.chip,
              { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface, opacity: pressed ? 0.8 : 1 },
            ]}>
            {o.icon ? <FontAwesome5 name={o.icon} size={12} color={active ? C.brinjal1 : C.textSecondary} /> : null}
            <Text style={[st.chipTxt, { color: active ? C.brinjal1 : C.text }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RecommendButton({ onPress, loading, label }: { onPress: () => void; loading?: boolean; label?: string }) {
  const C = useAppColors();
  const { t } = useLanguage();
  return (
    <Pressable onPress={onPress} disabled={loading} hitSlop={8} style={st.linkBtn} accessibilityRole="button">
      {loading ? <ActivityIndicator size="small" color={C.brinjal1} /> : <FontAwesome5 name="magic" size={12} color={C.brinjal1} />}
      <Text style={[st.linkTxt, { color: C.brinjal1 }]}>{label ?? t('guided.letKolabRecommend')}</Text>
    </Pressable>
  );
}

export function LinkButton({ label, icon, onPress, tone }: { label: string; icon?: keyof typeof FontAwesome5.glyphMap; onPress: () => void; tone?: string }) {
  const C = useAppColors();
  return (
    <Pressable onPress={onPress} hitSlop={8} style={st.linkBtn} accessibilityRole="button">
      {icon ? <FontAwesome5 name={icon} size={12} color={tone ?? C.brinjal1} /> : null}
      <Text style={[st.linkTxt, { color: tone ?? C.brinjal1 }]}>{label}</Text>
    </Pressable>
  );
}

/** Kolab's suggestion with a reason — assistance, never an error (§14). */
export function SuggestionNote({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  const C = useAppColors();
  return (
    <View style={[st.note, { backgroundColor: C.primaryLight, borderColor: C.border }]}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <FontAwesome5 name="magic" size={13} color={C.brinjal1} style={{ marginTop: 3 }} />
        <Text style={[st.body, { color: C.text, flex: 1 }]}>{children}</Text>
      </View>
      {actions ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.sm, paddingLeft: 21 }}>{actions}</View> : null}
    </View>
  );
}

/** "From your description" vs "Suggested by Kolab" (§30). Nothing for USER. */
export function ProvenanceTag({ value }: { value?: Provenance }) {
  const C = useAppColors();
  const { t } = useLanguage();
  if (!value || value === 'USER') return null;
  const extracted = value === 'AI_EXTRACTED';
  return (
    <View style={[st.tag, { backgroundColor: extracted ? '#DCFCE7' : C.primaryLight }]}>
      <Text style={[st.tagTxt, { color: extracted ? '#166534' : C.brinjal1 }]}>{extracted ? t('guided.fromYourWords') : t('guided.suggestedByKolab')}</Text>
    </View>
  );
}

export function IssueNote({ issue }: { issue?: CampaignRuleIssue }) {
  const C = useAppColors();
  const { t } = useLanguage();
  if (!issue) return null;
  const key = `guided.issue_${issue.code}`;
  const text = t(key);
  return <Text style={[st.small, { marginTop: 6, color: issue.severity === 'required' ? C.draft : C.textSecondary, fontFamily: F.medium }]}>{text === key ? issue.message : text}</Text>;
}

/** ⓘ Why are we asking? (§15–16). `label` swaps the trigger text (e.g.
 *  "What's the difference?"); `onRecommend` adds "Let Kolab recommend". */
export function WhyAsking({ text, label, onRecommend }: { text: string; label?: string; onRecommend?: () => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ width: '100%' }}>
      <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <FontAwesome5 name="info-circle" size={11} color={C.textSecondary} />
        <Text style={[st.small, { color: C.textSecondary }]}>{label ?? t('guided.whyAsking')}</Text>
      </Pressable>
      {open ? (
        <View style={{ marginTop: 6, backgroundColor: C.background, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.sm, padding: SPACING.sm, gap: 6 }}>
          <Text style={[st.small, { color: C.textSecondary }]}>{text}</Text>
          {onRecommend ? (
            <Pressable onPress={() => { setOpen(false); onRecommend(); }} hitSlop={6} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 }} accessibilityRole="button">
              <FontAwesome5 name="magic" size={11} color={C.brinjal1} />
              <Text style={[st.small, { color: C.brinjal1, fontFamily: F.semibold, flexShrink: 1 }]}>{t('guided.notSureRecommend')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ── Inputs ───────────────────────────────────────────────────────────────────

export function Input({ value, onChangeText, placeholder, multiline, keyboardType, maxLength, accessibilityLabel }: {
  value: string; onChangeText: (v: string) => void; placeholder?: string; multiline?: boolean;
  keyboardType?: 'default' | 'number-pad'; maxLength?: number; accessibilityLabel?: string;
}) {
  const C = useAppColors();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={C.textPlaceholder}
      multiline={multiline}
      keyboardType={keyboardType}
      maxLength={maxLength}
      accessibilityLabel={accessibilityLabel ?? placeholder}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[st.input, multiline && { minHeight: 110, paddingTop: 12 }, { borderColor: C.border, backgroundColor: C.surface, color: C.text }]}
    />
  );
}

export function ListInput({ values, onChange, placeholder, prefix }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string; prefix?: string }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim().replace(prefix ? new RegExp(`^\\${prefix}`) : /^$/, '');
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  };
  return (
    <View style={{ gap: SPACING.sm }}>
      {values.length ? (
        <View style={st.chipWrap}>
          {values.map((v) => (
            <Pressable key={v} onPress={() => onChange(values.filter((x) => x !== v))} accessibilityLabel={`${t('guided.remove')} ${v}`} style={[st.chip, { borderColor: C.border, backgroundColor: C.primaryLight }]}>
              <Text style={[st.chipTxt, { color: C.text }]}>{prefix}{v}</Text>
              <FontAwesome5 name="times" size={10} color={C.textSecondary} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
        <View style={{ flex: 1 }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            onBlur={add}
            returnKeyType="done"
            placeholder={placeholder}
            placeholderTextColor={C.textPlaceholder}
            style={[st.input, { borderColor: C.border, backgroundColor: C.surface, color: C.text }]}
          />
        </View>
        <Pressable onPress={add} accessibilityLabel={t('guided.add')} style={[st.squareBtn, { borderColor: C.border, backgroundColor: C.surface }]}>
          <FontAwesome5 name="plus" size={13} color={C.text} />
        </Pressable>
      </View>
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 50, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  const C = useAppColors();
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <View style={[st.stepper, { borderColor: C.border, backgroundColor: C.surface }]} accessibilityLabel={label}>
      <Pressable onPress={() => onChange(clamp(value - 1))} disabled={value <= min} style={st.stepBtn} accessibilityRole="button" accessibilityLabel={`${label} −`}>
        <FontAwesome5 name="minus" size={12} color={value <= min ? C.textPlaceholder : C.text} />
      </Pressable>
      <TextInput
        value={String(value)}
        onChangeText={(v) => onChange(clamp(Number(v.replace(/\D/g, '')) || min))}
        keyboardType="number-pad"
        style={[st.stepValue, { color: C.text }]}
        accessibilityLabel={label}
      />
      <Pressable onPress={() => onChange(clamp(value + 1))} disabled={value >= max} style={st.stepBtn} accessibilityRole="button" accessibilityLabel={`${label} +`}>
        <FontAwesome5 name="plus" size={12} color={value >= max ? C.textPlaceholder : C.text} />
      </Pressable>
    </View>
  );
}

// ── Location (§11–12) ────────────────────────────────────────────────────────

export function LocationPicker({ locationType, locationScope, locations, onChange }: {
  locationType: 'ONSITE' | 'REMOTE' | null;
  locationScope: LocationScope | null;
  locations: CampaignLocation[];
  onChange: (n: { locationType?: 'ONSITE' | 'REMOTE' | null; locationScope?: LocationScope | null; locations?: CampaignLocation[] }) => void;
}) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [searchOpen, setSearchOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const visits = locationType === 'ONSITE';
  const showPlaces = visits || locationScope === 'SPECIFIC';

  const pick = (name: string, lat: number, lng: number) => {
    const loc = { name, lat, lng };
    if (editing != null) onChange({ locations: locations.map((l, i) => (i === editing ? loc : l)), locationScope: 'SPECIFIC' });
    else if (!locations.some((l) => l.name.toLowerCase() === name.toLowerCase())) onChange({ locations: [...locations, loc], locationScope: 'SPECIFIC' });
    setEditing(null);
    setSearchOpen(false);
  };

  return (
    <View style={{ gap: SPACING.xl }}>
      <Field label={t('guided.visitQuestion')} accessory={<WhyAsking text={t('guided.whyVisit')} />}>
        <ChoiceChips<'YES' | 'NO'>
          value={locationType === 'ONSITE' ? 'YES' : locationType === 'REMOTE' ? 'NO' : null}
          onChange={(v) => onChange(v === 'YES'
            ? { locationType: 'ONSITE', locationScope: 'SPECIFIC' }
            : { locationType: 'REMOTE', locationScope: locationScope === 'SPECIFIC' && !locations.length ? 'ANYWHERE' : locationScope })}
          options={[{ value: 'YES', label: t('guided.visitYes') }, { value: 'NO', label: t('guided.visitNo') }]}
        />
      </Field>

      {locationType === 'REMOTE' ? (
        <Field label={t('guided.whereBased')}>
          <ChoiceChips<LocationScope>
            value={locationScope}
            onChange={(v) => onChange({ locationScope: v, ...(v !== 'SPECIFIC' ? { locations: [] } : {}) })}
            options={[
              { value: 'SPECIFIC', label: t('guided.scopeSpecific'), icon: 'map-marker-alt' },
              { value: 'NATIONWIDE', label: t('guided.scopeNationwide'), icon: 'flag' },
              { value: 'ANYWHERE', label: t('guided.scopeAnywhere'), icon: 'globe-asia' },
            ]}
          />
        </Field>
      ) : null}

      {showPlaces ? (
        <Field label={visits ? t('guided.whereVisit') : t('guided.whichPlaces')}>
          <View style={{ gap: SPACING.sm }}>
            {locations.map((l, i) => (
              <View key={`${l.name}-${i}`} style={[st.row, { borderColor: C.border, backgroundColor: C.surface }]}>
                <FontAwesome5 name="map-marker-alt" size={14} color={C.brinjal1} />
                <Text style={[st.body, { flex: 1, color: C.text, fontFamily: F.medium }]} numberOfLines={1}>{l.name}</Text>
                <Pressable onPress={() => { setEditing(i); setSearchOpen(true); }} hitSlop={8} style={st.iconBtn} accessibilityLabel={t('guided.changeLocation')}>
                  <FontAwesome5 name="pen" size={12} color={C.textSecondary} />
                </Pressable>
                <Pressable onPress={() => onChange({ locations: locations.filter((_, j) => j !== i) })} hitSlop={8} style={st.iconBtn} accessibilityLabel={t('guided.removeLocation')}>
                  <FontAwesome5 name="trash-alt" size={12} color={C.error} />
                </Pressable>
              </View>
            ))}
            <LinkButton icon="plus" label={locations.length ? t('guided.addAnotherLocation') : t('guided.addLocation')} onPress={() => { setEditing(null); setSearchOpen(true); }} />
            {!visits ? <LinkButton label={t('guided.noSpecificLocation')} onPress={() => onChange({ locationScope: 'ANYWHERE', locations: [] })} tone={C.textSecondary} /> : null}
          </View>
        </Field>
      ) : null}

      <LocationSearchModal
        visible={searchOpen}
        initialValue={editing != null ? locations[editing]?.name ?? '' : ''}
        onSelect={pick}
        onClose={() => { setSearchOpen(false); setEditing(null); }}
      />
    </View>
  );
}

// ── Deliverables (§8) ────────────────────────────────────────────────────────

export function DeliverablesEditor({ items, onChange, platforms }: { items: DeliverableItem[]; onChange: (items: DeliverableItem[]) => void; platforms: string[] }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [typeSheet, setTypeSheet] = useState<number | null>(null);
  const update = (i: number, patch: Partial<DeliverableItem>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const platformsFor = (type: string) => {
    const def = DELIVERABLE_TYPES.find((d) => d.type === type);
    const list = def?.platforms.length ? def.platforms : platforms;
    return Array.from(new Set(list.length ? list : ['Instagram', 'TikTok', 'YouTube', 'Facebook']));
  };
  const addItem = () => {
    const p = platforms[0] ?? 'Instagram';
    const type = /tiktok/i.test(p) ? 'TIKTOK_VIDEO' : /youtube/i.test(p) ? 'YOUTUBE_SHORT' : 'REEL';
    onChange([...items, { type, platform: p, quantity: 1 }]);
  };
  return (
    <View style={{ gap: SPACING.md }}>
      {items.map((it, i) => (
        <View key={i} style={[st.card, { borderColor: C.border, backgroundColor: C.surface }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <Pressable onPress={() => setTypeSheet(i)} style={[st.select, { borderColor: C.border, flex: 1 }]} accessibilityRole="button" accessibilityLabel={t('guided.deliverableType')}>
              <Text style={[st.body, { color: C.text, fontFamily: F.semibold, flex: 1 }]}>{t(`guided.deliv_${it.type}`)}</Text>
              <FontAwesome5 name="chevron-down" size={11} color={C.textSecondary} />
            </Pressable>
            <Pressable onPress={() => onChange(items.filter((_, j) => j !== i))} style={st.iconBtn} accessibilityLabel={t('guided.remove')}>
              <FontAwesome5 name="trash-alt" size={13} color={C.error} />
            </Pressable>
          </View>
          <ChoiceChips<string>
            value={it.platform ?? null}
            onChange={(p) => update(i, { platform: it.platform === p ? null : p })}
            options={platformsFor(it.type).map((p) => ({ value: p, label: p }))}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[st.small, { color: C.textSecondary }]}>{t('guided.quantityPerCreator')}</Text>
            <Stepper value={it.quantity} onChange={(n) => update(i, { quantity: n })} label={t('guided.quantityPerCreator')} />
          </View>
        </View>
      ))}
      <LinkButton icon="plus" label={t('guided.addDeliverable')} onPress={addItem} />

      <BottomSheet visible={typeSheet != null} onClose={() => setTypeSheet(null)} title={t('guided.deliverableType')} maxHeightPct={0.75}>
        <View style={{ gap: 4 }}>
          {DELIVERABLE_TYPES.map((d) => (
            <Pressable
              key={d.type}
              onPress={() => { if (typeSheet != null) update(typeSheet, { type: d.type, platform: platformsFor(d.type)[0] ?? null }); setTypeSheet(null); }}
              style={({ pressed }) => [st.sheetRow, { backgroundColor: pressed ? C.primaryLight : 'transparent' }]}>
              <Text style={[st.body, { color: C.text }]}>{t(`guided.deliv_${d.type}`)}</Text>
              {typeSheet != null && items[typeSheet]?.type === d.type ? <FontAwesome5 name="check" size={12} color={C.brinjal1} /> : null}
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

export function deliverableLine(d: DeliverableItem, t: (k: string) => string): string {
  const p = shownPlatform(d.type, d.platform);
  return `${d.quantity}× ${t(`guided.deliv_${d.type}`)}${p ? ` · ${p}` : ''}`;
}

export const st = StyleSheet.create({
  title:      { fontSize: 24, lineHeight: lineHeightFor(24), fontFamily: F.bold },
  subtitle:   { fontSize: FONT_SIZE.md, lineHeight: lineHeightFor(FONT_SIZE.md), fontFamily: F.regular, marginTop: 4 },
  example:    { fontSize: FONT_SIZE.sm, lineHeight: lineHeightFor(FONT_SIZE.sm), fontFamily: F.regular, fontStyle: 'italic', marginTop: 4 },
  footer:     { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md },
  fieldHead:  { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: SPACING.sm },
  fieldLabel: { fontSize: FONT_SIZE.md, lineHeight: lineHeightFor(FONT_SIZE.md), fontFamily: F.semibold },
  body:       { fontSize: FONT_SIZE.md, lineHeight: lineHeightFor(FONT_SIZE.md), fontFamily: F.regular },
  small:      { fontSize: FONT_SIZE.sm, lineHeight: lineHeightFor(FONT_SIZE.sm), fontFamily: F.regular },
  chipWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip:       { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: MIN_TOUCH_TARGET, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.full, borderWidth: 1.5 },
  chipTxt:    { fontSize: FONT_SIZE.sm + 1, lineHeight: lineHeightFor(FONT_SIZE.sm + 1), fontFamily: F.medium },
  linkBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: MIN_TOUCH_TARGET, alignSelf: 'flex-start' },
  linkTxt:    { fontSize: FONT_SIZE.sm + 1, lineHeight: lineHeightFor(FONT_SIZE.sm + 1), fontFamily: F.semibold },
  note:       { borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.md },
  tag:        { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2 },
  tagTxt:     { fontSize: FONT_SIZE.xs, lineHeight: lineHeightFor(FONT_SIZE.xs), fontFamily: F.semibold },
  input:      { minHeight: 48, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, fontSize: FONT_SIZE.md, fontFamily: F.regular },
  squareBtn:  { width: 48, height: 48, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepper:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIUS.full, alignSelf: 'flex-start' },
  stepBtn:    { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  stepValue:  { minWidth: 36, textAlign: 'center', fontSize: FONT_SIZE.md, fontFamily: F.semibold, paddingVertical: 0 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: RADIUS.md, paddingLeft: SPACING.md, minHeight: 52 },
  iconBtn:    { width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  card:       { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.md },
  select:     { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md },
  sheetRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: SPACING.md, borderRadius: RADIUS.sm },
});
