import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAppColors } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/Button';
import { LocationSearchModal } from '@/components/LocationSearchModal';
import { F, FONT_SIZE, MIN_TOUCH_TARGET, RADIUS, SCREEN_GUTTER, SPACING, lineHeightFor } from '@/utilities/constants';
import type { CampaignLocation, DeliverableItem, LocationScope, Provenance } from '@/services/guidedCampaign';
import type { CampaignRuleIssue } from '../utils/campaignRules';
import type { SaveStatus } from './useAutosave';
import { EXTRA_KINDS, MAX_CUSTOM_LABEL, SIMPLE_KINDS, deliverableLabel, resolveNewDeliverable, simplifyDeliverables } from './deliverableKinds';
import { FieldError } from '@/components/FieldError';

// Native building blocks of the guided creator — same roles as
// web/src/app/business/guided/parts.tsx.

// ── Layout ───────────────────────────────────────────────────────────────────

/** One step: heading, short explanation, optional example, scrollable body,
 *  and a footer pinned above the home indicator with one primary action. */
export function StepShell({ title, subtitle, example, header, children, footer }: {
  title?: string;
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
        {title ? <Text style={[st.title, { color: C.text }]}>{title}</Text> : null}
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
      {onBack ? <View style={{ flex: 1 }}><Button label={t('guided.back')} variant="secondary" icon="arrow-left" onPress={onBack} fullWidth /></View> : null}
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

export function ChoiceChips<T extends string>({ options, value, onChange, multi = false, max }: {
  options: { value: T; label: string; icon?: keyof typeof FontAwesome5.glyphMap }[];
  value: T | T[] | null;
  onChange: (v: T) => void;
  multi?: boolean;
  // multi only: once `max` are on, the rest are disabled until one is cleared.
  max?: number;
}) {
  const C = useAppColors();
  const on = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  const full = multi && max != null && Array.isArray(value) && value.length >= max;
  return (
    <View style={st.chipWrap} accessibilityRole={multi ? undefined : 'radiogroup'}>
      {options.map((o) => {
        const active = on(o.value);
        const disabled = full && !active;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            disabled={disabled}
            accessibilityRole={multi ? 'checkbox' : 'radio'}
            accessibilityState={multi ? { checked: active, disabled } : { selected: active }}
            style={({ pressed }) => [
              st.chip,
              { borderColor: active ? C.brinjal1 : C.border, backgroundColor: active ? C.primaryLight : C.surface, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
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

export function DeliverablesEditor({ items, onChange }: { items: DeliverableItem[]; onChange: (items: DeliverableItem[]) => void }) {
  const C = useAppColors();
  const { t } = useLanguage();
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Just what to make and how many — platforms are picked once for the
  // whole campaign. Legacy/AI types fold into these kinds (deliverableKinds).
  // The three core kinds always show (Kolab's suggestion fills them in);
  // anything added beyond them gets its own removable row.
  const simple = simplifyDeliverables(items);
  const qty = (kind: string) => simple.find((i) => i.type === kind)?.quantity ?? 0;
  const others = simple.filter((i) => !(SIMPLE_KINDS as readonly string[]).includes(i.type));
  const set = (kind: string, n: number) => {
    const next = simple.filter((i) => i.type !== kind);
    if (n > 0) next.push({ type: kind, platform: null, quantity: n });
    onChange(simplifyDeliverables(next) as DeliverableItem[]);
  };
  const add = (input: string) => {
    const r = resolveNewDeliverable(input, simple, t);
    if (!r) return;
    if ('duplicateOf' in r) { setError(t('guided.deliverableDuplicate', { label: r.duplicateOf })); return; }
    set(r.type, 1);
    setCustom('');
    setError(null);
    setAdding(false);
  };
  const rows = [
    ...SIMPLE_KINDS.map((k) => ({ kind: k as string, label: t(`guided.pick_${k}`), removable: false })),
    ...others.map((o) => ({ kind: o.type, label: deliverableLabel(o.type, t), removable: true })),
  ];
  const extras = EXTRA_KINDS.filter((k) => !qty(k));
  return (
    <View style={{ gap: SPACING.sm }}>
      <View style={[st.card, { borderColor: C.border, backgroundColor: C.surface, gap: 0, paddingVertical: 0 }]}>
        {rows.map((r, i) => (
          <View key={r.kind} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, paddingVertical: SPACING.sm, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: C.border }}>
            <Text numberOfLines={1} style={[st.body, { flex: 1, color: qty(r.kind) ? C.text : C.textSecondary, fontFamily: F.semibold }]}>{r.label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Stepper value={qty(r.kind)} onChange={(n) => set(r.kind, n)} min={r.removable ? 1 : 0} label={`${r.label} — ${t('guided.quantityPerCreator')}`} />
              {r.removable ? (
                <Pressable onPress={() => set(r.kind, 0)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${t('guided.remove')} ${r.label}`} style={{ width: MIN_TOUCH_TARGET, height: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' }}>
                  <FontAwesome5 name="trash-alt" size={13} color={C.error} />
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </View>
      <Text style={[st.small, { color: C.textSecondary }]}>{t('guided.quantityPerCreator')}</Text>

      {!adding ? (
        <LinkButton icon="plus" label={t('guided.addAnotherDeliverable')} onPress={() => setAdding(true)} />
      ) : (
        <View style={[st.card, { borderColor: C.border, backgroundColor: C.surface, gap: SPACING.sm }]}>
          {extras.length ? (
            <View style={st.chipWrap}>
              {extras.map((k) => (
                <Pressable key={k} onPress={() => add(k)} accessibilityRole="button" style={({ pressed }) => [st.chip, { borderColor: C.border, backgroundColor: C.surface, opacity: pressed ? 0.8 : 1 }]}>
                  <FontAwesome5 name="plus" size={11} color={C.textSecondary} />
                  <Text style={[st.chipTxt, { color: C.text }]}>{t(`guided.deliv_${k}`)}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' }}>
            <TextInput
              value={custom}
              maxLength={MAX_CUSTOM_LABEL}
              onChangeText={(v) => { setCustom(v); setError(null); }}
              onSubmitEditing={() => add(custom)}
              returnKeyType="done"
              placeholder={t('guided.addDeliverablePlaceholder')}
              placeholderTextColor={C.textPlaceholder}
              accessibilityLabel={t('guided.addAnotherDeliverable')}
              style={[st.input, { flex: 1, borderColor: error ? C.error : C.border, backgroundColor: C.surface, color: C.text }]}
            />
            <Button label={t('guided.add')} size="small" onPress={() => add(custom)} disabled={!custom.trim()} />
          </View>
          {error ? <FieldError message={error} /> : null}
          <LinkButton label={t('guided.cancel')} tone={C.textSecondary} onPress={() => { setAdding(false); setCustom(''); setError(null); }} />
        </View>
      )}
    </View>
  );
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
